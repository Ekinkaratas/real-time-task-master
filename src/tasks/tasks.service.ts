import {
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

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userService: UserService,
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
        },
      });

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
      const users = await this.userService.findIdByEmail(userEmails);

      if (!users.length)
        throw new NotFoundException('No users found for given emails');

      const assigneesConnect = users.map((user) => ({ id: user.id }));

      await this.prisma.task.update({
        where: { id: taskId },
        data: {
          assignees: {
            connect: assigneesConnect,
          },
        },
      });
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
        },
      }),
    );

    try {
      const updatedTasks = await this.prisma.$transaction(queryReOrder);

      return updatedTasks.sort((a, b) => a.order - b.order);
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
      await this.prisma.task.update({
        where: { id },
        data: {
          ...updateTaskDto,
        },
      });

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
      const users = this.userService.findIdByEmail([leadEmail]);

      const user = await users;

      if (!user || user.length === 0) {
        throw new NotFoundException('No user found for given email');
      }

      const leadId = user[0].id;

      await this.prisma.task.update({
        where: { id: taskId },
        data: {
          leadAssigneeId: leadId,
        },
      });

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
      await this.prisma.task.delete({ where: { id: taskId } });
      return true;
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2025'
      ) {
        throw new NotFoundException('Task to delete does not exist');
      }

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

      await this.prisma.task.update({
        where: { id: taskId },
        data: {
          assignees: {
            disconnect: assigneesdisconnect,
          },
        },
      });

      return this.getTaskById(taskId);
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2025'
      ) {
        throw new NotFoundException('Task not found');
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
