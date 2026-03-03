import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

import { AccessTokenGuard } from '../common/guards/access-token.guard';
import { RefreshTokenGuard } from '../common/guards/refresh-token.guard';

import {
  authRegisterDto,
  authLogin,
  authClientResponseDto,
  tokensPayload,
} from 'libs/contracts/src/Auth';

describe('AuthController', () => {
  let controller: AuthController;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let service: AuthService;

  const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
    updateTokens: jest.fn(),
    updateAccessToken: jest.fn(),
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
    it('kayıt bilgilerini servise iletmeli ve yanıt dönmeli', async () => {
      const dto: authRegisterDto = {
        email: 'test@test.com',
        password: 'password123',
        firstname: 'Test firstname',
        lastname: 'Test lastname',
      };

      const expectedResult = {
        access_Token: 'access123',
        refresh_Token: 'refresh123',
        userData: { id: 'user-1', email: 'test@test.com' },
      } as unknown as authClientResponseDto;

      mockAuthService.register.mockResolvedValue(expectedResult);

      const result = await controller.register(dto);

      expect(result).toEqual(expectedResult);
      expect(mockAuthService.register).toHaveBeenCalledWith(dto);
    });
  });

  describe('login', () => {
    it('giriş bilgilerini servise iletmeli ve tokenları dönmeli', async () => {
      const dto: authLogin = {
        email: 'test@test.com',
        password: 'password123',
      };

      const expectedResult = {
        access_Token: 'access123',
        refresh_Token: 'refresh123',
        userData: { id: 'user-1', email: 'test@test.com' },
      } as unknown as authClientResponseDto;

      mockAuthService.login.mockResolvedValue(expectedResult);

      const result = await controller.login(dto);

      expect(result).toEqual(expectedResult);
      expect(mockAuthService.login).toHaveBeenCalledWith(dto);
    });
  });

  describe('updateTokens', () => {
    it('kullanıcı payload bilgisini servise iletip yeni tokenları dönmeli', async () => {
      const userPayload = {
        id: 'user-1',
        email: 'test@test.com',
      } as unknown as tokensPayload;

      const expectedResult = {
        access_Token: 'new_access',
        refresh_Token: 'new_refresh',
        userData: userPayload,
      } as unknown as authClientResponseDto;

      mockAuthService.updateTokens.mockResolvedValue(expectedResult);

      const result = await controller.updateTokens(userPayload);

      expect(result).toEqual(expectedResult);
      expect(mockAuthService.updateTokens).toHaveBeenCalledWith(userPayload);
    });
  });

  describe('updateAccessToken', () => {
    it('userId ve Request içindeki refreshToken bilgisini servise iletmeli', async () => {
      const userId = 'user-1';
      const refreshTokenValue = 'my_refresh_token';

      const mockRequest = {
        refreshToken: refreshTokenValue,
      } as unknown as Request;

      const expectedResult = { access_token: 'new_access_token_only' };

      mockAuthService.updateAccessToken.mockResolvedValue(expectedResult);

      const result = await controller.updateAccessToken(userId, mockRequest);

      expect(result).toEqual(expectedResult);

      expect(mockAuthService.updateAccessToken).toHaveBeenCalledWith(
        userId,
        refreshTokenValue,
      );
    });
  });
});
