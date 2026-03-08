/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */

import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../user/user.service';
import { RedisService } from '../redis/redis.service';
import * as argon from 'argon2';
import {
  BadRequestException,
  ForbiddenException,
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
  let mockUserService: any;
  let mockRedisService: any;
  let mockJwtService: any;

  beforeEach(async () => {
    mockUserService = {
      register: jest.fn(),
      verifyLogin: jest.fn(),
      updateFailedAttempts: jest.fn(),
      addRefreshToken: jest.fn(),
      getUserById: jest.fn(),
      findUserWithPassword: jest.fn(),
      updateUserPassword: jest.fn(),
    };

    mockRedisService = {
      setTokens: jest.fn(),
      updateTokens: jest.fn(),
      getTokens: jest.fn(),
    };

    mockJwtService = {
      signAsync: jest.fn().mockResolvedValue('mock-token'),
    };

    const mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'ACCESS_TOKEN_KEY') return 'access-secret';
        if (key === 'REFRESH_TOKEN_KEY') return 'refresh-secret';
        return null;
      }),
    };

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

    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('Kullanıcıyı kaydetmeli ve tokenları dönmeli', async () => {
      const registerDto = {
        email: 'test@test.com',
        password: '123',
        firstName: 'Ekin',
      };
      const expectedUser = {
        id: '1',
        email: 'test@test.com',
        name: 'Ekin',
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
      };

      (argon.hash as jest.Mock).mockResolvedValue('hashed-password');
      mockUserService.register.mockResolvedValue(expectedUser);
      mockRedisService.setTokens.mockResolvedValue(true);

      const result = await service.register(registerDto as any);

      expect(argon.hash).toHaveBeenCalledWith('123');
      expect(result.userData).toEqual(expectedUser);
      expect(result.access_Token).toBe('mock-token');
      expect(mockRedisService.setTokens).toHaveBeenCalledWith(
        '1',
        'mock-token',
        'mock-token',
      );
    });

    it('Redis patlarsa InternalServerError fırlatmalı', async () => {
      (argon.hash as jest.Mock).mockResolvedValue('hash');
      mockUserService.register.mockResolvedValue({ id: '1' });
      mockRedisService.setTokens.mockRejectedValue(new Error('Redis Down'));

      await expect(service.register({} as any)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('login', () => {
    it('Hesap kilitliyse ForbiddenException fırlatmalı', async () => {
      const futureDate = new Date(Date.now() + 10 * 60000);
      mockUserService.verifyLogin.mockResolvedValue({
        lockoutUntil: futureDate,
      });

      await expect(service.login({} as any)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('Şifre yanlışsa failedAttempts artmalı ve Unauthorized fırlatmalı', async () => {
      const mockUser = { id: '1', password: 'hash', failedAttempts: 2 };
      mockUserService.verifyLogin.mockResolvedValue(mockUser);
      (argon.verify as jest.Mock).mockResolvedValue(false);
      mockUserService.updateFailedAttempts.mockResolvedValue(true);

      await expect(service.login({ password: 'wrong' } as any)).rejects.toThrow(
        UnauthorizedException,
      );

      expect(mockUserService.updateFailedAttempts).toHaveBeenCalledWith(
        '1',
        3,
        null,
      );
    });

    it('5. yanlış şifrede hesap 15 dakika kilitlenmeli', async () => {
      const mockUser = { id: '1', password: 'hash', failedAttempts: 4 };
      mockUserService.verifyLogin.mockResolvedValue(mockUser);
      (argon.verify as jest.Mock).mockResolvedValue(false);

      await expect(service.login({ password: 'wrong' } as any)).rejects.toThrow(
        UnauthorizedException,
      );

      expect(mockUserService.updateFailedAttempts).toHaveBeenCalledWith(
        '1',
        5,
        expect.any(Date),
      );
    });

    it('Doğru giriş yapıldığında kilitler sıfırlanmalı ve token dönmeli', async () => {
      const mockUser = {
        id: '1',
        password: 'hash',
        failedAttempts: 2,
        role: 'USER',
      };
      mockUserService.verifyLogin.mockResolvedValue(mockUser);
      (argon.verify as jest.Mock).mockResolvedValue(true);
      mockRedisService.updateTokens.mockResolvedValue(true);

      const result = await service.login({ password: 'correct' } as any);

      expect(mockUserService.updateFailedAttempts).toHaveBeenCalledWith(
        '1',
        0,
        null,
      );

      expect(result.userData).not.toHaveProperty('password');
      expect(result.access_Token).toBe('mock-token');
    });
  });

  describe('updateTokens', () => {
    it('Tokenları güncellemeli ve dönmeli', async () => {
      const mockReq = { id: '1', role: 'USER' };
      (argon.hash as jest.Mock).mockResolvedValue('hash-refresh');
      mockRedisService.setTokens.mockResolvedValue(true);

      const result = await service.updateTokens(mockReq as any);

      expect(mockUserService.addRefreshToken).toHaveBeenCalledWith(
        '1',
        'hash-refresh',
      );
      expect(mockRedisService.setTokens).toHaveBeenCalled();
      expect(result.access_Token).toBe('mock-token');
    });
  });

  describe('updateAccessToken', () => {
    it('Geçerli refresh token ile yeni access token dönmeli', async () => {
      mockRedisService.getTokens.mockResolvedValue({
        refresh: 'valid-refresh',
      });
      mockUserService.getUserById.mockResolvedValue({ id: '1', role: 'USER' });
      mockRedisService.updateTokens.mockResolvedValue(true);

      const result = await service.updateAccessToken('1', 'valid-refresh');

      expect(result.access_token).toBe('mock-token');
    });

    it('Refresh token eşleşmezse UnauthorizedException fırlatmalı', async () => {
      mockRedisService.getTokens.mockResolvedValue({ refresh: 'real-refresh' });

      await expect(
        service.updateAccessToken('1', 'fake-refresh'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('updatePassword', () => {
    it('Eski ve yeni şifre aynıysa BadRequest fırlatmalı', async () => {
      const dto = { oldPassword: 'same', newPassword: 'same' };
      await expect(service.updatePassword('1', dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('Eski şifre yanlışsa BadRequest fırlatmalı', async () => {
      const dto = { oldPassword: 'wrong', newPassword: 'new' };
      mockUserService.findUserWithPassword.mockResolvedValue({
        password: 'hash',
      });
      (argon.verify as jest.Mock).mockResolvedValue(false);

      await expect(service.updatePassword('1', dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('Şifreleri doğruysa güncelleyip mesaj dönmeli', async () => {
      const dto = { oldPassword: 'old', newPassword: 'new' };
      mockUserService.findUserWithPassword.mockResolvedValue({
        password: 'hash',
      });
      (argon.verify as jest.Mock).mockResolvedValue(true);
      (argon.hash as jest.Mock).mockResolvedValue('new-hash');
      mockUserService.updateUserPassword.mockResolvedValue({
        message: 'Success',
      });

      const result = await service.updatePassword('1', dto);

      expect(mockUserService.updateUserPassword).toHaveBeenCalledWith(
        '1',
        'new-hash',
      );
      expect(result.message).toBe('Success');
    });
  });
});
