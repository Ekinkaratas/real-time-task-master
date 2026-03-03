/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */

import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

import { UserService } from '../user/user.service';
import { RedisService } from '../redis/redis.service';

import * as argon from 'argon2';
import {
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { UserRole, UserStatus } from '@prisma/client';

jest.mock('argon2', () => ({
  hash: jest.fn(),
  verify: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let jwtService: JwtService;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let userService: UserService;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let redisService: RedisService;

  const mockJwtService = {
    signAsync: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'ACCESS_TOKEN_KEY') return 'access_secret';
      if (key === 'REFRESH_TOKEN_KEY') return 'refresh_secret';
      return null;
    }),
  };

  const mockUserService = {
    register: jest.fn(),
    verifyLogin: jest.fn(),
    addRefreshToken: jest.fn(),
    getUserById: jest.fn(),
  };

  const mockRedisService = {
    setTokens: jest.fn(),
    updateTokens: jest.fn(),
    getTokens: jest.fn(),
  };

  const mockPayload = {
    id: 'user-1',
    email: 'test@test.com',
    name: 'Test User',
    role: UserRole.USER,
    status: UserStatus.ACTIVE,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: UserService, useValue: mockUserService },
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);
    userService = module.get<UserService>(UserService);
    redisService = module.get<RedisService>(RedisService);

    mockJwtService.signAsync.mockResolvedValue('mocked_token');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('Kullanıcıyı başarıyla kaydetmeli ve token dönmeli', async () => {
      const dto: any = {
        email: 'test@test.com',
        password: 'password123',
        name: 'Test User',
      };

      (argon.hash as jest.Mock).mockResolvedValue('hashed_password');
      mockUserService.register.mockResolvedValue(mockPayload);
      mockRedisService.setTokens.mockResolvedValue('OK');

      const result = await service.register(dto);

      expect(argon.hash).toHaveBeenCalledWith(dto.password);
      expect(mockUserService.register).toHaveBeenCalled();
      expect(mockRedisService.setTokens).toHaveBeenCalledWith(
        mockPayload.id,
        'mocked_token',
        'mocked_token',
      );
      expect(result.access_Token).toBe('mocked_token');
      expect(result.userData.email).toBe(dto.email);
    });

    it('Redis hatası oluşursa InternalServerErrorException fırlatmalı', async () => {
      const dto: any = { password: 'pw' };

      (argon.hash as jest.Mock).mockResolvedValue('hashed_password');
      mockUserService.register.mockResolvedValue(mockPayload);
      mockRedisService.setTokens.mockRejectedValueOnce(new Error('Redis Down'));

      await expect(service.register(dto)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('login', () => {
    it('Geçerli bilgilerle giriş yapıp token dönmeli', async () => {
      const dto: any = { email: 'test@test.com', password: 'password123' };
      const userFromDb = { ...mockPayload, password: 'hashed_password' };

      mockUserService.verifyLogin.mockResolvedValue(userFromDb);
      (argon.verify as jest.Mock).mockResolvedValue(true);
      mockRedisService.updateTokens.mockResolvedValue('OK');

      const result = await service.login(dto);

      expect(argon.verify).toHaveBeenCalledWith(
        'hashed_password',
        dto.password,
      );
      expect(mockRedisService.updateTokens).toHaveBeenCalledWith(
        mockPayload.id,
        'mocked_token',
        'mocked_token',
      );
      expect(result.access_Token).toBe('mocked_token');
    });

    it('Yanlış şifrede UnauthorizedException fırlatmalı', async () => {
      const dto: any = { email: 'test@test.com', password: 'wrong' };
      const userFromDb = { ...mockPayload, password: 'hashed_password' };

      mockUserService.verifyLogin.mockResolvedValue(userFromDb);
      (argon.verify as jest.Mock).mockResolvedValue(false);

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('updateTokens', () => {
    it('Tokenleri yenileyip Redis ve DB güncellemeli', async () => {
      (argon.hash as jest.Mock).mockResolvedValue('hashed_refresh_token');
      mockUserService.addRefreshToken.mockResolvedValue(true);
      mockRedisService.setTokens.mockResolvedValue('OK');

      const result = await service.updateTokens(mockPayload as any);

      expect(mockUserService.addRefreshToken).toHaveBeenCalledWith(
        mockPayload.id,
        'hashed_refresh_token',
      );
      expect(mockRedisService.setTokens).toHaveBeenCalled();
      expect(result.access_Token).toBe('mocked_token');
    });
  });

  describe('updateAccessToken', () => {
    it('Geçerli refresh token ile yeni access token dönmeli', async () => {
      const userId = 'user-1';
      const refreshToken = 'valid_refresh_token';

      mockRedisService.getTokens.mockResolvedValue({ refresh: refreshToken });
      mockUserService.getUserById.mockResolvedValue(mockPayload);
      mockRedisService.updateTokens.mockResolvedValue('OK');
      mockJwtService.signAsync.mockResolvedValue('new_access_token');

      const result = await service.updateAccessToken(userId, refreshToken);

      expect(result.access_token).toBe('new_access_token');
      expect(mockRedisService.updateTokens).toHaveBeenCalledWith(
        userId,
        'new_access_token',
      );
    });

    it('Gönderilen refresh token Redis ile eşleşmezse UnauthorizedException fırlatmalı', async () => {
      const userId = 'user-1';

      mockRedisService.getTokens.mockResolvedValue({
        refresh: 'different_token',
      });

      await expect(
        service.updateAccessToken(userId, 'my_refresh_token'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
