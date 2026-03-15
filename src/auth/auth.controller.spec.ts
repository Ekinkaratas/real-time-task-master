import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AccessTokenGuard } from '../common/guards/access-token.guard';
import { RefreshTokenGuard } from '../common/guards/refresh-token.guard';
import {
  authClientResponseDto,
  authLogin,
  authRegisterDto,
  tokensPayload,
  UpdatePasswordDto,
} from 'contracts/Auth';

describe('AuthController', () => {
  let controller: AuthController;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let service: AuthService;

  const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
    updateTokens: jest.fn(),
    updateAccessToken: jest.fn(),
    updatePassword: jest.fn(),
    resetPassword: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    })
      .overrideGuard(AccessTokenGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RefreshTokenGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AuthController>(AuthController);
    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('Kayit DTO sunu servise iletmeli ve sonucu dönmeli', async () => {
      const dto = {
        email: 'test@test.com',
        password: '123',
      } as authRegisterDto;
      const expectedResponse = {
        access_Token: 'token_123',
      } as unknown as authClientResponseDto;

      mockAuthService.register.mockResolvedValue(expectedResponse);

      const result = await controller.register(dto);

      expect(result).toEqual(expectedResponse);
      expect(mockAuthService.register).toHaveBeenCalledWith(dto);
    });
  });

  describe('login', () => {
    it('Giriş DTO sunu servise iletmeli ve sonucu dönmeli', async () => {
      const dto = { email: 'test@test.com', password: '123' } as authLogin;
      const expectedResponse = {
        access_Token: 'token_123',
      } as unknown as authClientResponseDto;

      mockAuthService.login.mockResolvedValue(expectedResponse);

      const result = await controller.login(dto);

      expect(result).toEqual(expectedResponse);
      expect(mockAuthService.login).toHaveBeenCalledWith(dto);
    });
  });

  describe('updateTokens', () => {
    it('Kullanici payload unu servise iletip yeni tokenleri dönmeli', async () => {
      const userPayload = {
        id: 'user-1',
        email: 'test@test.com',
      } as unknown as tokensPayload;
      const expectedResponse = {
        access_Token: 'new_token_123',
      } as unknown as authClientResponseDto;

      mockAuthService.updateTokens.mockResolvedValue(expectedResponse);

      const result = await controller.updateTokens(userPayload);

      expect(result).toEqual(expectedResponse);
      expect(mockAuthService.updateTokens).toHaveBeenCalledWith(userPayload);
    });
  });

  describe('updateAccessToken', () => {
    it('Kullanici ID sini ve Refresh Token i servise iletip yeni access token i dönmeli', async () => {
      const userId = 'user-1';
      const req = { refreshToken: 'my_refresh_token' } as unknown as Request;
      const expectedResponse = { access_token: 'new_access_token_123' };

      mockAuthService.updateAccessToken.mockResolvedValue(expectedResponse);

      const result = await controller.updateAccessToken(userId, req);

      expect(result).toEqual(expectedResponse);
      expect(mockAuthService.updateAccessToken).toHaveBeenCalledWith(
        userId,
        'my_refresh_token',
      );
    });
  });

  describe('updatePassword', () => {
    it('Kullanici ID sini ve Şifre DTO sunu servise iletip mesaj dönmeli', async () => {
      const userId = 'user-1';
      const dto = {
        oldPassword: 'old',
        newPassword: 'new',
      } as UpdatePasswordDto;
      const expectedResponse = { message: 'Password updated successfully' };

      mockAuthService.updatePassword.mockResolvedValue(expectedResponse);

      const result = await controller.updatePassword(userId, dto);

      expect(result).toEqual(expectedResponse);
      expect(mockAuthService.updatePassword).toHaveBeenCalledWith(userId, dto);
    });
  });

  describe('resetPassword', () => {
    it('Kullanici ID sini ve yeni şifreyi servise iletip mesaj dönmeli', async () => {
      const userId = 'user-1';
      const newPassword = 'newSecretPassword';
      const expectedResponse = {
        message: 'Password has been successfully reset',
      };

      mockAuthService.resetPassword.mockResolvedValue(expectedResponse);

      const result = await controller.resetPassword(userId, newPassword);

      expect(result).toEqual(expectedResponse);
      expect(mockAuthService.resetPassword).toHaveBeenCalledWith(
        userId,
        newPassword,
      );
    });
  });
});
