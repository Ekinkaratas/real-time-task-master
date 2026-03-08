import {
  ForbiddenException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import {
  userLoginDto,
  userRegisterDto,
  UserResponse,
  UserSearchResponseDto,
  UserUpdateDto,
} from 'libs/contracts/src/User';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async register(dto: userRegisterDto): Promise<UserResponse> {
    try {
      const user = await this.prisma.user.create({
        data: {
          email: dto.email,
          password: dto.password,
          name: dto.lastName
            ? `${dto.firstName} ${dto.lastName}`
            : dto.firstName,
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          status: true,
        },
      });

      return user as UserResponse;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2002') {
          throw new ForbiddenException('Credentials taken.');
        }
      }
      throw new InternalServerErrorException('Database error.');
    }
  }

  async verifyLogin(dto: userLoginDto): Promise<UserResponse> {
    try {
      const user = await this.prisma.user.findFirstOrThrow({
        where: {
          email: dto.email,
        },

        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          status: true,
          password: true,
        },
      });

      return user as UserResponse;
    } catch (e) {
      if (e instanceof PrismaClientKnownRequestError) {
        if (e.code === 'P2025') {
          throw new NotFoundException('User not found');
        }
      }
      throw e;
    }
  }

  async deleteAccount(userId: string): Promise<{ message: string }> {
    try {
      const uniqueSuffix = Date.now().toString();

      await this.prisma.user.update({
        where: { id: userId },
        data: {
          userStatus: 'DELETED',
          email: `deleted_${userId}_${uniqueSuffix}@domain.com`,
          name: 'Deleted User',
          password: 'DELETED_ACCOUNT',

          boardMemberships: {
            deleteMany: {},
          },

          assignedTasks: {
            set: [],
          },

          leadTasks: { set: [] },
        },
      });

      return {
        message:
          'Your account has been deleted, and you have been removed from all active tasks and boards.',
      };
    } catch (e) {
      console.error('An error occurred while deleting the user:', e);
      throw new InternalServerErrorException(
        'A technical error occurred while deleting the account.',
      );
    }
  }

  async getUserById(userId: string): Promise<UserResponse> {
    try {
      const user = await this.prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          status: true,
        },
      });

      return user as UserResponse;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2025')
          throw new NotFoundException(`User with ID ${userId} not found`);
      }
      console.error('User fetch error:', e);
      throw new InternalServerErrorException(
        'A technical error occurred during the get user by Id.',
      );
    }
  }

  async updateUser(
    userId: string,
    dto: UserUpdateDto,
  ): Promise<{ message: string }> {
    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          ...dto,
        },
      });

      return { message: 'update is succesfuly ' };
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2025') {
          throw new NotFoundException('Not Found User');
        }
      }

      console.error('user service updating error: ' + e);
      throw new InternalServerErrorException('A technical error occurred.');
    }
  }

  async searchUsers(searchQuery: string): Promise<UserSearchResponseDto[]> {
    if (!searchQuery || searchQuery.trim() === '') {
      return [];
    }

    try {
      const users = await this.prisma.user.findMany({
        where: {
          OR: [
            {
              name: {
                contains: searchQuery,
                mode: 'insensitive',
              },
            },
            {
              email: {
                contains: searchQuery,
                mode: 'insensitive',
              },
            },
          ],
        },
        take: 5,
        select: {
          id: true,
          name: true,
          email: true,
        },
      });

      const mappedUsers = users.map((user) => ({
        id: user.id,
        email: user.email,
        name: user.name ?? '',
      }));

      return mappedUsers;
    } catch (e) {
      console.error('An error occurred during the user search:', e);
      throw new InternalServerErrorException(
        'A technical error occurred during the search process.',
      );
    }
  }

  async findIdByEmail(
    emails: string[],
  ): Promise<{ id: string; email: string }[]> {
    const users = await this.prisma.user.findMany({
      where: {
        email: { in: emails },
      },
      select: { id: true, email: true },
    });

    if (!users.length) {
      throw new NotFoundException('No users found for given emails');
    }

    return users;
  }

  /*  These methods are intended for internal use by the Auth Service only.*/
  async addRefreshToken(userId: string, refreshToken: string): Promise<void> {
    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: { refreshTokenHash: refreshToken },
      });
    } catch (e) {
      console.log(e);
      throw new InternalServerErrorException('Failed to store refresh token.');
    }
  }

  async findUserWithPassword(userId: string): Promise<{ password: string }> {
    try {
      const userPasswordHash = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          password: true,
        },
      });

      if (!userPasswordHash) throw new NotFoundException('Not Found User');

      return userPasswordHash;
    } catch (e) {
      if (e instanceof HttpException) throw e;

      console.error('user service updating error: ' + e);
      throw new InternalServerErrorException('A technical error occurred.');
    }
  }

  async updateUserPassword(
    userId: string,
    newPasswordHash: string,
  ): Promise<{ message: string }> {
    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          password: newPasswordHash,
        },
      });

      return { message: 'Password change successfully completed.' };
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2025') {
          throw new NotFoundException('Not Found User');
        }
      }

      console.error('user service updating error: ' + e);
      throw new InternalServerErrorException('A technical error occurred.');
    }
  }
}
