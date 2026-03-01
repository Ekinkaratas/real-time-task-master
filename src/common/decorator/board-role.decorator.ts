import { SetMetadata } from '@nestjs/common';
import { BoardMemberRole } from '@prisma/client';

export const BOARD_ROLE_KEY = 'board_role';
export const BoardRoles = (...roles: BoardMemberRole[]) =>
  SetMetadata(BOARD_ROLE_KEY, roles);
