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

import { PrismaService } from 'src/prisma/prisma.service';

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
      // ... hata yakalama kodların
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
        // P2025 = record not found
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

  async findIdByEmail(email: string): Promise<string> {
    try {
      const user = await this.prisma.user.findUniqueOrThrow({
        where: { email },
        select: { id: true },
      });

      return user.id;
    } catch (error) {
      console.error('User fetch error:', error);
      throw new NotFoundException(`User with email ${email} not found`);
    }
  }

  async addRefreshToken(
    userId: string,
    refreshToken: Promise<string>,
  ): Promise<void> {
    try {
      const tokenValue = await refreshToken;

      await this.prisma.user.update({
        where: { id: userId },
        data: { refreshTokenHash: tokenValue },
      });
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException('Failed to store refresh token.');
    }
  }
}
