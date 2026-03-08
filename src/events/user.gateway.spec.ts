/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { Test, TestingModule } from '@nestjs/testing';
import { UserGateway } from './user.gateway';
import { Socket } from 'socket.io';
import { UserResponse } from 'contracts/User';

describe('UserGateway', () => {
  let gateway: UserGateway;

  let emitMock: jest.Mock;
  let toMock: jest.Mock;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UserGateway],
    }).compile();

    gateway = module.get<UserGateway>(UserGateway);

    emitMock = jest.fn();
    toMock = jest.fn().mockReturnValue({ emit: emitMock });

    gateway.server = {
      emit: emitMock,
      to: toMock,
    } as any;

    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Bağlanti Yönetimi (Connection & Disconnection)', () => {
    it('Kullanici bağlandiğinda log atmali', () => {
      const mockClient = { id: 'socket-123' } as Socket;
      gateway.handleConnection(mockClient);
      expect(console.log).toHaveBeenCalledWith(
        'One connected UserGateway: socket-123',
      );
    });

    it('Kullanici koptuğunda log atmali', () => {
      const mockClient = { id: 'socket-456' } as Socket;
      gateway.handleDisconnect(mockClient);
      expect(console.log).toHaveBeenCalledWith(
        'One disconnect UserGateway: socket-456',
      );
    });
  });

  describe('handleJoinUser', () => {
    it('Kullaniciyi kendi özel odasina (Room) dahil etmeli', async () => {
      const userId = 'user-1';
      const joinMock = jest.fn();
      const mockClient = {
        id: 'socket-123',
        join: joinMock,
      } as unknown as Socket;

      await gateway.handleJoinUser(userId, mockClient);

      expect(joinMock).toHaveBeenCalledWith('user-room-user-1');
      expect(console.log).toHaveBeenCalledWith(
        'User with Socket ID socket-123 joined personal room: user-room-user-1',
      );
    });
  });

  describe('Genel Yayinlar (Broadcasts)', () => {
    it('broadcastUserUpdated: Tüm sisteme kullanici güncellemesini yaymali', () => {
      const userId = 'user-1';
      const updatedData: Partial<UserResponse> = { name: 'Ekin' };

      gateway.broadcastUserUpdated(userId, updatedData);

      expect(emitMock).toHaveBeenCalledWith('userUpdated', {
        userId: 'user-1',
        name: 'Ekin',
      });
    });

    it('broadcastUserDeleted: Tüm sisteme hesap anonimleşme/silinme bilgisini yaymali', () => {
      const userId = 'user-2';

      gateway.broadcastUserDeleted(userId);

      expect(emitMock).toHaveBeenCalledWith('userDeleted', {
        userId: 'user-2',
        message: 'User account has been anonymized.',
      });
    });
  });

  describe('Kişiye Özel Bildirim (Direct Message)', () => {
    it('broadcastToUser: Sadece ilgili kullanicinin odasina özel sinyal göndermeli', () => {
      const userId = 'user-3';
      const eventName = 'notification';
      const payload = { title: 'Yeni Görev', message: 'Atandiniz.' };

      gateway.broadcastToUser(userId, eventName, payload);

      expect(toMock).toHaveBeenCalledWith('user-room-user-3');
      expect(emitMock).toHaveBeenCalledWith('notification', payload);
    });
  });
});
