import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { BoardMemberRole, EnrollmentStatus, Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { UserService } from '../user/user.service';
import {
  AddMemberDto,
  CreateBoardDto,
  UpdateToBoardDto,
} from 'contracts/boards';
import { BoardGateway } from '../events/board.gateway';
import { UserGateway } from '../events/user.gateway';

@Injectable()
export class BoardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userService: UserService,
    private readonly gateway: BoardGateway,
    private readonly userGateway: UserGateway,
  ) {}

  async createBoard(createBoardDto: CreateBoardDto, userId: string) {
    return await this.prisma.$transaction(async (tx) => {
      console.log('Creating board right now:');
      const board = await tx.board.create({
        data: {
          title: createBoardDto.title,
          description:
            createBoardDto.description ?? 'No description has been added yet',
          ownerId: userId,
        },
      });

      console.log('Creating boardMember right now:');
      await tx.boardMember.create({
        data: {
          boardId: board.id,
          userId: userId,
          role: BoardMemberRole.OWNER,
          status: EnrollmentStatus.ACCEPTED,
        },
      });

      this.gateway.broadcastBoardCreated(board.id, board);

      return board;
    });
  }

  async BoardsAddUser(
    boardId: string,
    userDto: AddMemberDto,
  ): Promise<{ message: string }> {
    const users = await this.userService.findIdByEmail([userDto.email]);

    if (!users.length) {
      throw new NotFoundException(`User with email ${userDto.email} not found`);
    }

    const userId = users[0].id;

    try {
      await this.prisma.boardMember.create({
        data: {
          boardId,
          userId,
          role: userDto.role ? userDto.role : BoardMemberRole.MEMBER,
        },
      });

      const updatedBoard = await this.findOneBoard(boardId);

      this.gateway.broadcastBoardUpdate(boardId, updatedBoard);

      this.userGateway.broadcastToUser(userId, 'notification', {
        type: 'BOARD_INVITED',
        title: 'New Board Invitation!',
        message: `You have successfully added to the board named ${updatedBoard?.title}.`,
        boardId: updatedBoard?.id,
      });

      return { message: 'User invited to board successfully' };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException(
            'This user has already been invited or is a member of the board.',
          );
        }
      }
      throw new InternalServerErrorException(
        'An error occurred while inviting the user.',
      );
    }
  }

  async removeUserFromBoard(
    boardId: string,
    userEmail: string,
  ): Promise<{ message: string }> {
    const users = await this.userService.findIdByEmail([userEmail]);

    if (!users.length) {
      throw new NotFoundException(`User with email ${userEmail} not found`);
    }

    const userId = users[0].id;

    try {
      await this.prisma.boardMember.delete({
        where: { boardId_userId: { boardId, userId } },
      });

      const updatedBoard = await this.findOneBoard(boardId);

      this.gateway.broadcastBoardUpdate(boardId, updatedBoard);

      this.userGateway.broadcastToUser(userId, 'notification', {
        type: 'BOARD_REMOVE',
        title: 'You have been removed from the Board!',
        message: `You have successfully deleted to the board named ${updatedBoard?.title}.`,
        boardId: updatedBoard?.id,
      });

      return { message: 'User removed from board successfully' };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException(
            'The member to be deleted could not be found on this board.',
          );
        }
      }
      throw error;
    }
  }

  async acceptInvitation(
    boardId: string,
    userId: string,
  ): Promise<{ message: string }> {
    try {
      await this.prisma.boardMember.update({
        where: {
          boardId_userId: {
            boardId: boardId,
            userId: userId,
          },
        },
        data: {
          status: EnrollmentStatus.ACCEPTED,
        },
      });

      const updatedBoard = await this.findOneBoard(boardId);

      this.gateway.broadcastBoardUpdate(boardId, updatedBoard);

      if (updatedBoard?.ownerId) {
        this.userGateway.broadcastToUser(updatedBoard.ownerId, 'notification', {
          type: 'INVITATION_ACCEPTED',
          title: 'Invitation Accepted! 🎉',
          message: `A user joined the ‘${updatedBoard.title}’ board.`,
          boardId: updatedBoard.id,
        });
      }

      this.userGateway.broadcastToUser(userId, 'refreshBoards', {
        message: 'Panolar listeniz güncelleniyor...',
      });

      return { message: 'Invitation accepted successfully' };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException(
            'Board invitation not found or already accepted/rejected',
          );
        }
      }
      throw new InternalServerErrorException(
        'An error occurred while accepting the invitation.',
      );
    }
  }

  async rejectInvitation(
    boardId: string,
    userId: string,
  ): Promise<{ message: string }> {
    try {
      await this.prisma.boardMember.delete({
        where: {
          boardId_userId: {
            boardId: boardId,
            userId: userId,
          },
        },
      });

      const updatedBoard = await this.findOneBoard(boardId);

      this.gateway.broadcastBoardUpdate(boardId, updatedBoard);

      if (updatedBoard?.ownerId) {
        this.userGateway.broadcastToUser(updatedBoard.ownerId, 'notification', {
          type: 'INVITATION_REJECTED',
          title: 'Invitation Rejected',
          message: `A user didn't join the ‘${updatedBoard.title}’ board.`,
          boardId: updatedBoard.id,
        });
      }

      return { message: 'Invitation rejected' };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException(
            'The member or board entry to be deleted could not be found.',
          );
        }
      }
      throw new InternalServerErrorException(
        'An error occurred while deleting the member.',
      );
    }
  }

  async getBoardForUser(userId: string) {
    return await this.prisma.board.findMany({
      where: {
        members: {
          some: {
            userId: userId,
            status: EnrollmentStatus.ACCEPTED,
          },
        },
      },
      include: {
        columns: {
          include: {
            tasks: true,
          },
        },
        members: {
          where: {
            status: EnrollmentStatus.ACCEPTED,
          },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
        },
      },
    });
  }

  async findOneBoard(boardId: string) {
    return await this.prisma.board.findUnique({
      where: {
        id: boardId,
      },
      include: {
        columns: {
          include: {
            tasks: true,
          },
        },
        members: {
          where: {
            status: EnrollmentStatus.ACCEPTED,
          },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
        },
      },
    });
  }

  async updateBoard(boardId: string, updateBoardDto: UpdateToBoardDto) {
    try {
      const board = await this.prisma.board.update({
        where: {
          id: boardId,
        },
        data: updateBoardDto,
      });

      this.gateway.broadcastBoardUpdate(boardId, board);

      return board;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException('Board not found');
        }
      }
      throw new InternalServerErrorException(
        'An error occurred while updating the board.',
      );
    }
  }

  async deleteBoard(boardId: string) {
    try {
      await this.prisma.board.delete({
        where: {
          id: boardId,
        },
      });

      this.gateway.broadcastBoardDelete(boardId);

      return { message: 'Board deleted successfully' };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException('Board not found');
        }
      }
      throw new InternalServerErrorException(
        'An error occurred while deleting the board.',
      );
    }
  }

  async searchBoardsByTitle(title: string, userId: string) {
    return await this.prisma.board.findMany({
      where: {
        title: {
          contains: title,
          mode: 'insensitive',
        },
        members: {
          some: {
            userId: userId,
            status: EnrollmentStatus.ACCEPTED,
          },
        },
      },

      select: {
        id: true,
        title: true,
        description: true,
      },
    });
  }
}
