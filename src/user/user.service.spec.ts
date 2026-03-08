/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument */

import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { PrismaService } from '../prisma/prisma.service';
import { UserGateway } from '../events/user.gateway';
import { Prisma, UserStatus } from '@prisma/client';
import {
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';

describe('UserService', () => {
  let service: UserService;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let prismaService: PrismaService;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let userGateway: UserGateway;

  const mockPrismaService = {
    user: {
      create: jest.fn(),
      findFirstOrThrow: jest.fn(),
      update: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  const mockUserGateway = {
    broadcastUserDeleted: jest.fn(),
    broadcastUserUpdated: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: UserGateway, useValue: mockUserGateway },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    prismaService = module.get<PrismaService>(PrismaService);
    userGateway = module.get<UserGateway>(UserGateway);

    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('Yeni kullanici oluşturmali', async () => {
      const dto = {
        email: 't@t.com',
        password: '123',
        firstName: 'John',
        lastName: 'Doe',
      };
      const expectedUser = { id: '1', email: 't@t.com', name: 'John Doe' };
      mockPrismaService.user.create.mockResolvedValue(expectedUser);

      const result = await service.register(dto as any);

      expect(result).toEqual(expectedUser);
      expect(mockPrismaService.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { email: 't@t.com', password: '123', name: 'John Doe' },
        }),
      );
    });

    it('Email zaten alinmişsa (P2002) ForbiddenException firlatmali', async () => {
      mockPrismaService.user.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('', {
          code: 'P2002',
          clientVersion: '',
        }),
      );
      await expect(service.register({} as any)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('Bilinmeyen bir DB hatasinda InternalServerError firlatmali', async () => {
      mockPrismaService.user.create.mockRejectedValue(new Error('DB Error'));
      await expect(service.register({} as any)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('verifyLogin', () => {
    it('Kullaniciyi başariyla getirmeli', async () => {
      const expectedUser = { id: '1', email: 't@t.com' };
      mockPrismaService.user.findFirstOrThrow.mockResolvedValue(expectedUser);

      const result = await service.verifyLogin({ email: 't@t.com' } as any);
      expect(result).toEqual(expectedUser);
    });

    it('Kullanici bulunamazsa (P2025) NotFoundException firlatmali', async () => {
      mockPrismaService.user.findFirstOrThrow.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('', {
          code: 'P2025',
          clientVersion: '',
        }),
      );
      await expect(service.verifyLogin({} as any)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('deleteAccount (Anonimleştirme)', () => {
    it('Kullaniciyi anonimleştirmeli ve gateway yayini yapmali', async () => {
      mockPrismaService.user.update.mockResolvedValue({ id: '1' });

      const result = await service.deleteAccount('1');

      expect(mockPrismaService.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: UserStatus.DELETED,
            name: 'Deleted User',
            password: 'DELETED_ACCOUNT',
          }),
        }),
      );
      expect(mockUserGateway.broadcastUserDeleted).toHaveBeenCalledWith('1');
      expect(result.message).toContain('deleted');
    });

    it('Hata durumunda InternalServerError firlatmali', async () => {
      mockPrismaService.user.update.mockRejectedValue(new Error(''));
      await expect(service.deleteAccount('1')).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('getUserById', () => {
    it('ID ile kullaniciyi getirmeli', async () => {
      mockPrismaService.user.findUniqueOrThrow.mockResolvedValue({ id: '1' });
      const result = await service.getUserById('1');
      expect(result.id).toBe('1');
    });

    it('Kullanici yoksa NotFoundException firlatmali', async () => {
      mockPrismaService.user.findUniqueOrThrow.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('', {
          code: 'P2025',
          clientVersion: '',
        }),
      );
      await expect(service.getUserById('1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateUser', () => {
    it('Kullaniciyi güncellemeli ve gateway yayini yapmali', async () => {
      const updatedUser = { id: '1', name: 'New Name' };
      mockPrismaService.user.update.mockResolvedValue(updatedUser);

      const result = await service.updateUser('1', { name: 'New Name' } as any);

      expect(mockUserGateway.broadcastUserUpdated).toHaveBeenCalledWith(
        '1',
        updatedUser,
      );
      expect(result.message).toContain('succesfuly');
    });
    it('Hata durumunda exception firlatmali', async () => {
      mockPrismaService.user.update.mockRejectedValue(new Error());
      await expect(service.updateUser('1', {} as any)).rejects.toThrow();
    });
  });

  describe('searchUsers', () => {
    it('Boş arama sorgusunda boş dizi dönmeli', async () => {
      const result = await service.searchUsers('');
      expect(result).toEqual([]);
    });

    it('Arama sorgusuna göre kullanicilari dönmeli', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([
        { id: '1', email: 't@t.com', name: 'Ekin' },
      ]);

      const result = await service.searchUsers('Ek');
      expect(result).toEqual([{ id: '1', email: 't@t.com', name: 'Ekin' }]);
      expect(mockPrismaService.user.findMany).toHaveBeenCalled();
    });
  });

  describe('findIdByEmail', () => {
    it('E-posta listesine göre kullanicilari bulmali', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([
        { id: '1', email: 't@t.com' },
      ]);
      const result = await service.findIdByEmail(['t@t.com']);
      expect(result.length).toBe(1);
    });

    it('Kullanici bulunamazsa NotFoundException firlatmali', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([]);
      await expect(service.findIdByEmail(['fake@t.com'])).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateUserPassword & findUserWithPassword', () => {
    it('Şifreyi güncellemeli', async () => {
      mockPrismaService.user.update.mockResolvedValue({});
      const result = await service.updateUserPassword('1', 'new-hash');
      expect(result.message).toContain('successfully');
    });

    it('Şifreyi bulup getirmeli', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ password: 'hash' });
      const result = await service.findUserWithPassword('1');
      expect(result.password).toBe('hash');
    });

    it('Şifre bulunamazsa NotFound firlatmali', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      await expect(service.findUserWithPassword('1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateFailedAttempts', () => {
    it('Başarisiz denemeleri güncellemeli', async () => {
      mockPrismaService.user.update.mockResolvedValue({});
      const result = await service.updateFailedAttempts('1', 5, new Date());
      expect(result.message).toContain('updated successfully');
    });
  });
});
