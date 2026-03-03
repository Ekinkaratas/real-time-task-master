import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, UserStatus } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import {
  userForAuthResponse,
  userLoginDto,
  userRegisterDto,
} from 'libs/contracts/src/User';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async register(dto: userRegisterDto): Promise<userForAuthResponse> {
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

      return user as userForAuthResponse;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ForbiddenException('Credentials taken.');
        }
      }
      throw new InternalServerErrorException('Database error.');
    }
  }
  async verifyLogin(dto: userLoginDto): Promise<userForAuthResponse> {
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

      return user as userForAuthResponse;
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new Error('User not found');
        }
      }
      throw error;
    }
  }

  async deleteUser(userId: string): Promise<void> {
    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: { status: UserStatus.DELETED },
      });
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          return;
        }
      }
      throw new InternalServerErrorException('Failed to rollback user.');
    }
  }

  async getUserById(userId: string): Promise<userForAuthResponse> {
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

      return user as userForAuthResponse;
    } catch (error) {
      console.error('User fetch error:', error);
      throw new NotFoundException(`User with ID ${userId} not found`);
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

  async addRefreshToken(userId: string, refreshToken: string): Promise<void> {
    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: { refreshTokenHash: refreshToken },
      });
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException('Failed to store refresh token.');
    }
  }
}
