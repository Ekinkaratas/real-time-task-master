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

@Injectable()
export class SubtaskService {
  constructor(private readonly prisma: PrismaService) {}

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
      });

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
      });

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
}
