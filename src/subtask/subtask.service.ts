import {
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  CreateSubTaskDto,
  SubTasksResponseDto,
  UpdateSubTaskDto,
} from 'contracts/subtasks';
import { PrismaService } from '../prisma/prisma.service';
import { BoardGateway } from '../events/board.gateway';

@Injectable()
export class SubtaskService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: BoardGateway,
  ) {}

  async createSubtask(
    taskId: string,
    createSubTaskDto: CreateSubTaskDto,
  ): Promise<SubTasksResponseDto> {
    try {
      const subtask = await this.prisma.subtask.create({
        data: {
          ...createSubTaskDto,
          taskId,
        },
        include: {
          task: {
            select: { column: { select: { boardId: true } } },
          },
        },
      });

      const boardId = subtask.task.column.boardId;

      this.gateway.broadcastSubtaskCreated(boardId, subtask);

      return subtask;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2003') {
          throw new BadRequestException('Not Found Task by Id');
        } else if (e.code === 'P2000') {
          throw new BadRequestException('Title Too Long');
        }
      }

      console.error('An error occurred while creating the subtask: ' + e);
      throw new InternalServerErrorException('An error occurred');
    }
  }

  async getSubtaskById(SubTaskId: string): Promise<SubTasksResponseDto> {
    try {
      const subtask = await this.prisma.subtask.findUnique({
        where: { id: SubTaskId },
      });

      if (!subtask) throw new NotFoundException('Not Found SubTask by Id');

      return subtask;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2000') {
          throw new BadRequestException('Title Too Long');
        }
      }

      if (e instanceof HttpException) throw e;

      console.error(
        'An error occurred while finding the subtask with the ID : ' + e,
      );
      throw new InternalServerErrorException('An error occurred');
    }
  }

  async updateSubTask(
    SubTaskId: string,
    updateSubTaskDto: UpdateSubTaskDto,
  ): Promise<SubTasksResponseDto> {
    try {
      const updateSubtask = await this.prisma.subtask.update({
        where: { id: SubTaskId },
        data: {
          ...updateSubTaskDto,
        },
        include: {
          task: {
            select: { column: { select: { boardId: true } } },
          },
        },
      });

      const boardId = updateSubtask.task.column.boardId;

      this.gateway.broadcastSubtaskUpdate(boardId, updateSubtask);

      return updateSubtask;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2025') {
          throw new NotFoundException('Not Found SubTask by Id');
        } else if (e.code === 'P2000') {
          throw new BadRequestException('Title Too Long');
        }
      }

      console.error('An error occurred while updating the subtask: ' + e);
      throw new InternalServerErrorException('An error occurred');
    }
  }

  async deleteManySubtask(boardId: string, SubTaskIds: string[]) {
    try {
      const result = await this.prisma.subtask.deleteMany({
        where: { id: { in: SubTaskIds } },
      });

      if (result.count === 0) {
        throw new NotFoundException(
          'No subtasks to be deleted were found or they have already been deleted.',
        );
      }

      this.gateway.broadcastSubtaskDelete(boardId, SubTaskIds);

      return { message: 'Subtasks deleted successfully' };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      console.error('An error occurred while deleting the subtasks:', error);
      throw new InternalServerErrorException(
        'A technical error occurred while deleting the subtasks.',
      );
    }
  }
}
