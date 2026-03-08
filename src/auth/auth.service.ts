import {
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon from 'argon2';
import { UserService } from '../user/user.service';
import { RedisService } from '../redis/redis.service';
import {
  authClientResponseDto,
  authLogin,
  authRegisterDto,
  tokensPayload,
  UpdatePasswordDto,
} from 'contracts/Auth';
import { toUserRegisterDto } from 'contracts/User';

export interface Tokens {
  access_token: string;
  refresh_token: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly userService: UserService,
    private readonly redis: RedisService,
  ) {}

  private async createTokens(payload: tokensPayload): Promise<Tokens> {
    try {
      const accessPayload = {
        id: payload.id,
        email: payload.email,
        name: payload.name,
        role: payload.role,
        status: payload.status,
      };

      const [access_token, refresh_token] = await Promise.all([
        this.jwtService.signAsync(accessPayload, {
          secret: this.configService.get<string>('ACCESS_TOKEN_KEY'),
          expiresIn: '15m',
        }),

        this.jwtService.signAsync(
          { id: payload.id, role: payload.role },
          {
            secret: this.configService.get<string>('REFRESH_TOKEN_KEY'),
            expiresIn: '7d',
          },
        ),
      ]);

      return {
        access_token,
        refresh_token,
      };
    } catch (e) {
      throw new InternalServerErrorException(e);
    }
  }

  private async createAccessTokens(payload: tokensPayload): Promise<string> {
    try {
      const access_token = await this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('ACCESS_TOKEN_KEY'),
        expiresIn: '15m',
      });

      return access_token;
    } catch (e) {
      throw new InternalServerErrorException(e);
    }
  }

  async register(dto: authRegisterDto): Promise<authClientResponseDto> {
    const hash = await argon.hash(dto.password);

    const userDto = toUserRegisterDto(dto, hash);

    const payload = await this.userService.register(userDto);

    const tokens = await this.createTokens(payload);

    try {
      await this.redis.setTokens(
        payload.id,
        tokens.access_token,
        tokens.refresh_token,
      );

      return {
        userData: payload,
        refresh_Token: tokens.refresh_token,
        access_Token: tokens.access_token,
      };
    } catch (e) {
      console.log('auth.service register error message: ', e);
      throw new InternalServerErrorException(
        'Redis error — transaction aborted',
      );
    }
  }

  async login(dto: authLogin): Promise<authClientResponseDto> {
    const result = await this.userService.verifyLogin(dto);

    const { password, ...user } = result;

    const passwordFlag = await argon.verify(password!, dto.password);

    if (!passwordFlag) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.createTokens(user);

    try {
      await this.redis.updateTokens(
        user.id,
        tokens.access_token,
        tokens.refresh_token,
      );

      return {
        userData: user,
        refresh_Token: tokens.refresh_token,
        access_Token: tokens.access_token,
      };
    } catch (e) {
      console.log('auth.service register error message: ', e);
      throw new InternalServerErrorException(
        'Redis error — transaction aborted',
      );
    }
  }

  async updateTokens(req: tokensPayload): Promise<authClientResponseDto> {
    const tokens = await this.createTokens(req);

    await this.userService.addRefreshToken(
      req.id,
      await argon.hash(tokens.refresh_token),
    );

    try {
      await this.redis.setTokens(
        req.id,
        tokens.access_token,
        tokens.refresh_token,
      );

      return {
        userData: req,
        refresh_Token: tokens.refresh_token,
        access_Token: tokens.access_token,
      };
    } catch (e) {
      console.log('auth.service updateTokens error message: ', e);
      throw new InternalServerErrorException(
        'Redis error — transaction aborted',
      );
    }
  }

  async updateAccessToken(
    userId: string,
    refreshToken: string,
  ): Promise<{ access_token: string }> {
    const tokens = await this.redis.getTokens(userId);

    if (tokens.refresh !== refreshToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const payload = await this.userService.getUserById(userId);

    const newAccessToken = await this.createAccessTokens(payload);

    await this.redis.updateTokens(userId, newAccessToken);

    return { access_token: newAccessToken };
  }

  async updatePassword(
    userId: string,
    dto: UpdatePasswordDto,
  ): Promise<{ message: string }> {
    try {
      if (dto.oldPassword === dto.newPassword) {
        throw new BadRequestException(
          'New password cannot be the same as the old password.',
        );
      }

      const oldPasswordHash = await this.userService
        .findUserWithPassword(userId)
        .then((u) => u.password);

      const flag = await argon.verify(oldPasswordHash, dto.oldPassword);

      if (!flag)
        throw new BadRequestException('Your old password is incorrect');

      const newPasswordHash = await argon.hash(dto.newPassword);

      const update = await this.userService.updateUserPassword(
        userId,
        newPasswordHash,
      );

      return update;
    } catch (e) {
      if (e instanceof HttpException) throw e;

      console.error('An error while updating password : ' + e);
      throw new InternalServerErrorException('A technical error occurred.');
    }
  }
}
