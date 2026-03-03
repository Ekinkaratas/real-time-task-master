import {
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, TaskStatus } from '@prisma/client';
import { ColumnResponseDto, ReorderColumnDto } from 'contracts/columns';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ColumnsService {
  constructor(private readonly prisma: PrismaService) {}

  private async lastColumnInBoard(
    boardId: string,
  ): Promise<{ order: number } | null> {
    return await this.prisma.column.findFirst({
      where: { boardId },
      orderBy: { order: 'desc' },
      select: { order: true },
    });
  }

  async createColumn(
    boardId: string,
    title: string,
  ): Promise<ColumnResponseDto> {
    const lastColumn = await this.lastColumnInBoard(boardId);

    const newOrder = lastColumn ? lastColumn.order + 1 : 1;

    return await this.prisma.column.create({
      data: {
        boardId: boardId,
        title,
        order: newOrder,
      },

      include: {
        tasks: {
          select: {
            id: true,
            title: true,
            description: true,
          },
        },
      },
    });
  }

  async getAllColumns(boardId: string): Promise<ColumnResponseDto[]> {
    try {
      return await this.prisma.column.findMany({
        where: { boardId: boardId },
        orderBy: { order: 'asc' },
        include: {
          tasks: {
            orderBy: { order: 'asc' },
            select: {
              id: true,
              title: true,
              description: true,
            },
          },
        },
      });
    } catch {
      throw new InternalServerErrorException('An error occurred');
    }
  }

  async updateColumn(
    columnId: string,
    boardId: string,
    title: string,
  ): Promise<ColumnResponseDto> {
    try {
      return await this.prisma.column.update({
        where: {
          id: columnId,
        },
        data: {
          title: title,
        },

        include: {
          tasks: {
            select: {
              id: true,
              title: true,
              description: true,
            },
          },
        },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2025') {
          throw new NotFoundException('Column not found');
        } else if (e.code === 'P2003') {
          throw new BadRequestException('Invalid board reference');
        }
      }
      throw new InternalServerErrorException('An error occurred');
    }
  }

  async reorderColumns(
    boardId: string,
    dto: ReorderColumnDto[],
  ): Promise<ColumnResponseDto[]> {
    const transactionQueries = dto.map((item) =>
      this.prisma.column.update({
        where: {
          id: item.id,
        },
        data: { order: item.order },
        include: {
          tasks: {
            orderBy: { order: 'asc' },
            select: {
              id: true,
              title: true,
              description: true,
            },
          },
        },
      }),
    );

    try {
      const res = await this.prisma.$transaction(transactionQueries);

      return res.sort((a, b) => a.order - b.order);
    } catch {
      throw new InternalServerErrorException(
        'An error occurred while updating the ranking.',
      );
    }
  }

  async deleteManyColumns(
    boardId: string,
    columnIds: string[],
  ): Promise<ColumnResponseDto[]> {
    try {
      const hasIncompleteTasks = await this.prisma.task.findFirst({
        where: {
          columnId: { in: columnIds },
          taskStatus: { not: TaskStatus.DONE },
        },
      });

      if (hasIncompleteTasks) {
        throw new BadRequestException(
          'This column(s) cannot be deleted! It contains tasks that have not yet been completed. Please complete the tasks first or move them to another column.',
        );
      }

      const result = await this.prisma.column.deleteMany({
        where: {
          boardId: boardId,
          id: {
            in: columnIds,
          },
        },
      });

      if (result.count === 0) {
        throw new NotFoundException(
          'No column to be deleted was found or it has already been deleted.',
        );
      }

      return this.getAllColumns(boardId);
    } catch (e) {
      if (e instanceof HttpException) {
        throw e;
      }

      throw new InternalServerErrorException(
        'A technical error occurred while deleting the columns.',
      );
    }
  }
}
