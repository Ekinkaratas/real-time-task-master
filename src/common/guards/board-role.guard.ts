import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { BoardMemberRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { BOARD_ROLE_KEY } from '../decorator/board-role.decorator';

interface RequestWithUser extends Request {
  user: {
    id: string;
    email: string;
  };
  params: {
    boardId?: string;
    id?: string;
  };
}

@Injectable()
export class BoardRoleGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<BoardMemberRole[]>(
      BOARD_ROLE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;

    const boardId = request.params.boardId || request.params.id;

    if (!user || !boardId) {
      throw new ForbiddenException(
        'Invalid request: User or Dashboard information is missing.',
      );
    }

    const member = await this.prisma.boardMember.findUnique({
      where: {
        boardId_userId: {
          boardId: boardId,
          userId: user.id,
        },
      },
    });

    if (!member) {
      throw new ForbiddenException('You are not a member of this board.');
    }

    const hasRole = requiredRoles.includes(member.role);

    if (!hasRole) {
      throw new ForbiddenException(
        `You do not have permission to perform this action. Required roles: ${requiredRoles.join(', ')}`,
      );
    }

    return true;
  }
}
