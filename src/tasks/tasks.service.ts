import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, TaskStatus } from '@prisma/client';
import {
  CreateTaskDto,
  ReOrderTaskDto,
  TaskResponseDto,
  UpdateTaskDto,
} from 'contracts/tasks';
import { PrismaService } from '../prisma/prisma.service';
import { UserService } from '../user/user.service';
import { BoardGateway } from '../events/board.gateway';
import { UserGateway } from '../events/user.gateway';

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userService: UserService,
    private readonly boardGateway: BoardGateway,
    private readonly userGateway: UserGateway,
  ) {}

  private async lastTask(columnsId: string) {
    return await this.prisma.task.findFirst({
      where: { columnId: columnsId },
      orderBy: { order: 'desc' },
      select: { order: true },
    });
  }

  async createTask(
    columnId: string,
    userId: string,
    createTaskDto: CreateTaskDto,
  ): Promise<TaskResponseDto> {
    try {
      const lastTask = await this.lastTask(columnId);
      const lastOrder = lastTask ? lastTask.order + 1 : 1;

      let assigneesConnect: { id: string }[] = [];
      let leadAssigneeId: string | undefined = undefined;

      if (
        createTaskDto.assigneeEmails &&
        createTaskDto.assigneeEmails.length > 0
      ) {
        const users = await this.userService.findIdByEmail(
          createTaskDto.assigneeEmails,
        );

        const leadEmail = createTaskDto.assigneeEmails[0];
        const leadUser = users.find((u) => u.email === leadEmail);

        leadAssigneeId = leadUser ? leadUser.id : users[0]?.id;

        assigneesConnect = users.map((user) => ({ id: user.id }));
      }

      const task = await this.prisma.task.create({
        data: {
          title: createTaskDto.title,
          priority: createTaskDto.priority,
          taskStatus: createTaskDto.status ?? TaskStatus.TODO,
          description: createTaskDto.description,
          order: lastOrder,
          columnId,
          creatorId: userId,

          ...(assigneesConnect.length > 0 && {
            assignees: {
              connect: assigneesConnect,
            },
          }),

          leadAssigneeId: leadAssigneeId,
        },

        include: {
          subtasks: {
            select: { id: true, title: true, isCompleted: true },
          },
          assignees: true,
          column: true,
        },
      });

      const boardId = task.column.boardId;

      this.boardGateway.broadcastTaskCreated(boardId, task);

      return task;
    } catch (e) {
      if (e instanceof HttpException) {
        throw e;
      }

      console.error('Error creating task:', e);
      throw new InternalServerErrorException(
        'A technical error occurred while creating the task.',
      );
    }
  }

  async addAssignees(
    taskId: string,
    userEmails: string[],
  ): Promise<TaskResponseDto> {
    try {
      const currentTask = await this.prisma.task.findUnique({
        where: { id: taskId },
        include: { column: true },
      });

      if (!currentTask) {
        throw new NotFoundException('Task not found');
      }

      const boardId = currentTask.column.boardId;

      const users = await this.userService.findIdByEmail(userEmails);
      if (!users.length) {
        throw new NotFoundException('No users found for given emails');
      }

      const userIds = users.map((user) => user.id);

      const validMembers = await this.prisma.boardMember.findMany({
        where: {
          boardId: boardId,
          userId: { in: userIds },
          status: 'ACCEPTED',
        },
      });

      if (validMembers.length !== userIds.length) {
        throw new BadRequestException(
          'Cannot assign task. One or more users are not active members of this board.',
        );
      }

      const assigneesConnect = userIds.map((id) => ({ id }));

      const task = await this.prisma.task.update({
        where: { id: taskId },
        data: {
          assignees: {
            connect: assigneesConnect,
          },
        },
        include: {
          column: true,
        },
      });

      this.boardGateway.broadcastTaskUpdate(boardId, task);

      for (const assignee of assigneesConnect) {
        this.userGateway.broadcastToUser(assignee.id, 'notification', {
          type: 'TASK_ASSIGNED',
          title: 'New Job Assignment! 🎯',
          message: `You have been assigned to the '${task.title}' task.`,
          boardId: boardId,
          taskId: task.id,
        });
      }

      return this.getTaskById(taskId);
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2025'
      ) {
        throw new NotFoundException('Task not found');
      }

      if (e instanceof HttpException) throw e;

      console.error('Error adding assignees task: ' + e);
      throw new InternalServerErrorException(
        'A technical error occurred while adding assignees the task.',
      );
    }
  }

  async getTaskById(id: string): Promise<TaskResponseDto> {
    try {
      return await this.prisma.task.findUniqueOrThrow({
        where: { id },
        include: {
          subtasks: {
            select: {
              id: true,
              isCompleted: true,
              title: true,
            },
          },
        },
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2025'
      ) {
        throw new NotFoundException('No task found by ID');
      }

      if (e instanceof HttpException) throw e;

      console.error('An error occurred while retrieving tasks by ID : ' + e);
      throw new InternalServerErrorException('A technical error occurred.');
    }
  }

  async getAllTasks(columnId: string): Promise<TaskResponseDto[]> {
    try {
      const tasks = await this.prisma.task.findMany({
        where: { columnId: columnId },
        include: {
          subtasks: {
            select: { id: true, title: true, isCompleted: true },
          },
          assignees: true,
        },
      });

      if (!tasks.length) throw new NotFoundException('No Task Found');

      return tasks;
    } catch (e) {
      if (e instanceof HttpException) throw e;

      console.error('Error while retrieving all tasks:' + e);
      throw new InternalServerErrorException('A technical error occurred.');
    }
  }

  async calculateTaskProgress(id: string): Promise<{ progress: number }> {
    try {
      const task = await this.prisma.task.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              subtasks: true,
            },
          },
          subtasks: {
            where: { isCompleted: true },
          },
        },
      });

      if (!task) {
        throw new NotFoundException('No Task Found');
      }

      const total = task._count.subtasks;
      const completedSubtask = task.subtasks.length;
      const progressPercentage =
        total === 0 ? 0 : Math.round((completedSubtask / total) * 100);

      return { progress: progressPercentage };
    } catch (e) {
      if (e instanceof HttpException) {
        throw e;
      }
      console.error('Error while retrieving tasks progress:' + e);
      throw new InternalServerErrorException('A technical error occurred.');
    }
  }

  async reOrder(reOrderDto: ReOrderTaskDto[]): Promise<TaskResponseDto[]> {
    const queryReOrder = reOrderDto.map((item) =>
      this.prisma.task.update({
        where: { id: item.id },
        data: {
          order: item.newOrder,
          ...(item.newColumnId && {
            columnId: item.newColumnId,
          }),
        },
        include: {
          subtasks: {
            select: {
              id: true,
              title: true,
              isCompleted: true,
            },
          },

          assignees: {
            select: { id: true, name: true, email: true },
          },
          column: {
            select: { boardId: true },
          },
        },
      }),
    );

    try {
      const updatedTasks = await this.prisma.$transaction(queryReOrder);

      const sortedTasks = updatedTasks.sort((a, b) => a.order - b.order);

      if (sortedTasks.length > 0) {
        const boardId = sortedTasks[0].column.boardId;
        this.boardGateway.broadcastTaskReordered(boardId, sortedTasks);
      }

      return sortedTasks;
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2025'
      ) {
        throw new NotFoundException(
          'One or more of the tasks to be updated could not be found..',
        );
      }

      if (e instanceof HttpException) {
        throw e;
      }

      console.error('An error occurred while sorting the tasks:', e);
      throw new InternalServerErrorException(
        'A technical error occurred during the sorting process..',
      );
    }
  }

  async updateTask(
    id: string,
    updateTaskDto: UpdateTaskDto,
  ): Promise<TaskResponseDto> {
    try {
      const task = await this.prisma.task.update({
        where: { id },
        data: {
          ...updateTaskDto,
        },
        include: {
          column: true,
        },
      });

      const boardId = task.column.boardId;

      this.boardGateway.broadcastTaskUpdate(boardId, task);

      return this.getTaskById(id);
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2025'
      ) {
        throw new NotFoundException('Task to update does not exist');
      }

      if (e instanceof HttpException) throw e;

      console.error('An error occurred during the update process: ' + e);
      throw new InternalServerErrorException('A technical error occurred.');
    }
  }

  async updateLead(
    taskId: string,
    leadEmail: string,
  ): Promise<TaskResponseDto> {
    try {
      const user = await this.userService.findIdByEmail([leadEmail]);

      if (!user || user.length === 0) {
        throw new NotFoundException('No user found for given email');
      }

      const leadId = user[0].id;

      const task = await this.prisma.task.update({
        where: { id: taskId },
        data: {
          leadAssigneeId: leadId,
        },
        include: {
          column: true,
        },
      });

      const boardId = task.column.boardId;

      this.boardGateway.broadcastTaskUpdate(boardId, task);

      return this.getTaskById(taskId);
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2025'
      ) {
        throw new NotFoundException('Task to update does not exist');
      }

      if (e instanceof HttpException) throw e;

      console.error('An error occurred during the update process: ' + e);
      throw new InternalServerErrorException('A technical error occurred.');
    }
  }

  async deleteTask(taskId: string): Promise<boolean> {
    try {
      const taskToDelete = await this.prisma.task.findUnique({
        where: { id: taskId },
        include: { column: true },
      });

      if (!taskToDelete)
        throw new NotFoundException('Task to delete does not exist');

      const boardId = taskToDelete.column.boardId;

      await this.prisma.task.delete({ where: { id: taskId } });

      this.boardGateway.broadcastTaskDeleted(boardId, taskId);

      return true;
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2025'
      ) {
        throw new NotFoundException('Task to delete does not exist');
      }

      if (e instanceof HttpException) throw e;

      console.error('An e occurred while deleting tasks by ID: ' + e);
      throw new InternalServerErrorException('A technical error occurred.');
    }
  }

  async deleteAssignees(taskId: string, userEmail: string[]) {
    try {
      const users = await this.userService.findIdByEmail(userEmail);

      if (!users.length)
        throw new NotFoundException('No users found for given emails');

      const assigneesdisconnect = users.map((u) => ({ id: u.id }));

      const task = await this.prisma.task.update({
        where: { id: taskId },
        data: {
          assignees: {
            disconnect: assigneesdisconnect,
          },
        },
        include: {
          column: true,
        },
      });

      const boardId = task.column.boardId;

      this.boardGateway.broadcastTaskUpdate(boardId, task);

      for (const assignee of assigneesdisconnect) {
        this.userGateway.broadcastToUser(assignee.id, 'notification', {
          type: 'TASK_UNASSIGNED',
          title: 'You have been dismissed from your position.',
          message: `You have been removed from the '${task.title}' task.`,
          boardId: boardId,
        });
      }

      return this.getTaskById(taskId);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2025') {
          throw new NotFoundException('Task or user relation not found');
        }
        if (e.code === 'P2003') {
          throw new ConflictException(
            'Cannot remove assignee due to a database constraint. This user might be strictly tied to this task.',
          );
        }
      }

      if (e instanceof HttpException) throw e;

      console.error('Error deleting assignees task: ' + e);
      throw new InternalServerErrorException(
        'A technical error occurred while deleting assignees the task.',
      );
    }
  }

  async getTasksByUser(
    userId: string,
    leadassigmentFlag?: boolean,
    priorityFlag?: boolean,
    firstHigh: boolean = true,
  ): Promise<TaskResponseDto[]> {
    try {
      const usertasks = await this.prisma.task.findMany({
        where: {
          assignees: {
            some: { id: userId },
          },

          ...(leadassigmentFlag === true && {
            leadAssigneeId: userId,
          }),
        },

        orderBy: {
          ...(priorityFlag
            ? { priority: firstHigh ? 'desc' : 'asc' }
            : { createdAt: 'desc' }),
        },

        include: {
          column: { select: { title: true, boardId: true } },
          subtasks: true,
          assignees: { select: { id: true, name: true, email: true } },
        },
      });

      return usertasks;
    } catch (e) {
      console.error('An error occurred while retrieving user tasks:', e);
      throw new InternalServerErrorException('A technical error occurred.');
    }
  }
}
