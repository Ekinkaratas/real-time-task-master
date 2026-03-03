import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { Request } from 'express';

interface AuthenticatedRequest extends Request {
  user?: { id: string };
  boardId?: string;
}

interface ReOrderTaskPayload {
  id: string;
  newOrder: number;
  newColumnId?: string;
}

@Injectable()
export class TaskBoardRoleGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.get<string[]>(
      'boardRoles',
      context.getHandler(),
    );

    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const userId = request.user?.id;

    if (!userId) {
      throw new ForbiddenException('User not verified.');
    }

    let boardId: string | undefined;
    const params = request.params;

    if (params['columnId'] || params['columnsId']) {
      const colId = (params['columnId'] || params['columnsId']) as string;

      const column = await this.prisma.column.findUnique({
        where: { id: colId },
        select: { boardId: true },
      });
      if (!column) throw new NotFoundException('Column not found.');
      boardId = column.boardId;
    } else if (params['taskId'] || params['id']) {
      const taskId = (params['taskId'] || params['id']) as string;

      const task = await this.prisma.task.findUnique({
        where: { id: taskId },
        select: { column: { select: { boardId: true } } },
      });
      if (!task) throw new NotFoundException('Task not found.');
      boardId = task.column.boardId;
    } else {
      const body = request.body as unknown;

      if (
        Array.isArray(body) &&
        body.length > 0 &&
        typeof body[0] === 'object' &&
        body[0] !== null &&
        'id' in body[0]
      ) {
        const payload = body as ReOrderTaskPayload[];
        const taskId = String(payload[0].id);

        const task = await this.prisma.task.findUnique({
          where: { id: taskId },
          select: { column: { select: { boardId: true } } },
        });
        if (!task)
          throw new NotFoundException('No tasks to schedule were found.');
        boardId = task.column.boardId;
      }
    }

    if (!boardId) {
      throw new ForbiddenException(
        'No task to be scheduled found. No board context found for permission control..',
      );
    }

    const boardMember = await this.prisma.boardMember.findUnique({
      where: {
        boardId_userId: {
          boardId: boardId,
          userId: userId,
        },
      },
    });

    if (!boardMember) {
      throw new ForbiddenException(
        'You do not have permission (membership) to access this board.',
      );
    }

    const hasRole = requiredRoles.includes(boardMember.role);
    if (!hasRole) {
      throw new ForbiddenException(
        'You do not have sufficient permissions for this operation..',
      );
    }

    request.boardId = boardId;

    return true;
  }
}
