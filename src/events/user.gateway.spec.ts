/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument */

import { Test, TestingModule } from '@nestjs/testing';
import { UserGateway } from './user.gateway';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserResponse } from 'contracts/User';

describe('UserGateway', () => {
  let gateway: UserGateway;

  let mockJwtService: { verifyAsync: jest.Mock };
  let mockConfigService: { get: jest.Mock };

  let emitMock: jest.Mock;
  let toMock: jest.Mock;

  const createMockClient = (authToken?: string, authHeader?: string) => ({
    id: 'socket-123',
    handshake: {
      auth: authToken ? { token: authToken } : {},
      headers: authHeader ? { authorization: authHeader } : {},
    },
    data: {} as { user?: any },
    disconnect: jest.fn(),
    join: jest.fn(),
  });

  beforeEach(async () => {
    mockJwtService = { verifyAsync: jest.fn() };
    mockConfigService = { get: jest.fn().mockReturnValue('super-secret-key') };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserGateway,
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    gateway = module.get<UserGateway>(UserGateway);

    emitMock = jest.fn();
    toMock = jest.fn().mockReturnValue({ emit: emitMock });

    gateway.server = {
      emit: emitMock,
      to: toMock,
    } as any;

    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleConnection (Kimlik Doğrulama)', () => {
    it('Token yoksa bağlantiyi kesmeli (disconnect)', async () => {
      const client = createMockClient();

      await gateway.handleConnection(client as any);

      expect(client.disconnect).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(
        'Connection rejected (No token): socket-123',
      );
    });

    it('.env içinde SECRET_KEY yoksa bağlantiyi kesmeli', async () => {
      mockConfigService.get.mockReturnValueOnce(undefined);
      const client = createMockClient('valid-token');

      await gateway.handleConnection(client as any);

      expect(client.disconnect).toHaveBeenCalled();
      expect(console.error).toHaveBeenCalledWith(
        'JWT Secret is not defined in environment variables.',
      );
    });

    it('Auth.token ile gelen geçerli kullaniciyi doğrulamali ve veriyi sokete eklemeli', async () => {
      const client = createMockClient('valid-token');
      const mockPayload = { id: 'user-1', email: 'test@test.com' };
      mockJwtService.verifyAsync.mockResolvedValue(mockPayload);

      await gateway.handleConnection(client as any);

      expect(mockJwtService.verifyAsync).toHaveBeenCalledWith('valid-token', {
        secret: 'super-secret-key',
      });
      expect(client.data.user).toEqual(mockPayload);
      expect(console.log).toHaveBeenCalledWith(
        'User connected: socket-123, User ID: user-1',
      );
    });

    it('Headers içinden gelen geçerli Bearer tokeni doğrulamali', async () => {
      const client = createMockClient(undefined, 'Bearer header-token');
      const mockPayload = { id: 'user-2', email: 'test2@test.com' };
      mockJwtService.verifyAsync.mockResolvedValue(mockPayload);

      await gateway.handleConnection(client as any);

      expect(mockJwtService.verifyAsync).toHaveBeenCalledWith('header-token', {
        secret: 'super-secret-key',
      });
      expect(client.data.user).toEqual(mockPayload);
    });

    it('Token geçersizse (hata firlatirsa) bağlantiyi kesmeli', async () => {
      const client = createMockClient('invalid-token');
      mockJwtService.verifyAsync.mockRejectedValue(new Error('JWT Expired'));

      await gateway.handleConnection(client as any);

      expect(client.disconnect).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(
        'Connection rejected (Invalid token): socket-123',
      );
    });
  });

  describe('handleDisconnect', () => {
    it('Kullanici koptuğunda log atmali', () => {
      const client = createMockClient();
      gateway.handleDisconnect(client as any);
      expect(console.log).toHaveBeenCalledWith(
        'One disconnect UserGateway: socket-123',
      );
    });
  });

  describe('handleJoinUser (Odaya Katilma)', () => {
    it('Sokette kullanici ID varsa (doğrulanmişsa) odaya katilmali', async () => {
      const client = createMockClient();
      client.data.user = { id: 'user-1', email: 'test@test.com' };

      await gateway.handleJoinUser(client as any);

      expect(client.join).toHaveBeenCalledWith('user-room-user-1');
      expect(console.log).toHaveBeenCalledWith(
        'User with Socket ID socket-123 joined personal room: user-room-user-1',
      );
    });

    it('Sokette kullanici ID yoksa işlemi sessizce iptal etmeli (Erken Dönüş)', async () => {
      const client = createMockClient();
      client.data.user = undefined;

      await gateway.handleJoinUser(client as any);

      expect(client.join).not.toHaveBeenCalled();
    });
  });

  describe('Yayin Metotlari (Broadcasts)', () => {
    it('broadcastUserUpdated: Tüm kullanicilara güncelleme sinyali göndermeli', () => {
      const updatedUser: Partial<UserResponse> = { name: 'Ekin' };
      gateway.broadcastUserUpdated('user-1', updatedUser);

      expect(emitMock).toHaveBeenCalledWith('userUpdated', {
        userId: 'user-1',
        name: 'Ekin',
      });
    });

    it('broadcastUserDeleted: Hesap silinme sinyalini yaymali', () => {
      gateway.broadcastUserDeleted('user-2');

      expect(emitMock).toHaveBeenCalledWith('userDeleted', {
        userId: 'user-2',
        message: 'User account has been anonymized.',
      });
    });

    it('broadcastToUser: İlgili kullanicinin özel odasina sinyal göndermeli', () => {
      const payload = { test: 'data' };
      gateway.broadcastToUser('user-3', 'notification', payload);

      expect(toMock).toHaveBeenCalledWith('user-room-user-3');
      expect(emitMock).toHaveBeenCalledWith('notification', payload);
    });
  });
});
