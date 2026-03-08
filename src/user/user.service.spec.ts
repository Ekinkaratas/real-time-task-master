/* eslint-disable @typescript-eslint/no-unsafe-argument */

import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { userRegisterDto, UserUpdateDto } from 'libs/contracts/src/User';

describe('UserService', () => {
  let service: UserService;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let prismaService: PrismaService;

  const mockPrismaService = {
    user: {
      create: jest.fn(),
      findFirstOrThrow: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    prismaService = module.get<PrismaService>(PrismaService);

    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('Kullaniciyi başariyla kaydetmeli', async () => {
      const dto: userRegisterDto = {
        email: 'test@test.com',
        password: 'hashed123',
        firstName: 'Ekin',
        lastName: 'Karatas',
      };
      const expectedUser = {
        id: 'user-1',
        name: 'Ekin Karatas',
        email: dto.email,
      };

      mockPrismaService.user.create.mockResolvedValue(expectedUser);

      const result = await service.register(dto);
      expect(result).toEqual(expectedUser);
    });

    it('E-posta zaten varsa (P2002) ForbiddenException firlatmali', async () => {
      const error = new Prisma.PrismaClientKnownRequestError('Err', {
        code: 'P2002',
        clientVersion: 'v1',
      });
      mockPrismaService.user.create.mockRejectedValueOnce(error);

      await expect(service.register({} as any)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('Veritabani hatasinda InternalServerErrorException firlatmali', async () => {
      mockPrismaService.user.create.mockRejectedValueOnce(
        new Error('DB Error'),
      );
      await expect(service.register({} as any)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('verifyLogin', () => {
    it('Giriş bilgilerini başariyla dönmeli', async () => {
      const expectedUser = {
        id: 'user-1',
        email: 'test@test.com',
        password: 'hash',
      };
      mockPrismaService.user.findFirstOrThrow.mockResolvedValue(expectedUser);

      const result = await service.verifyLogin({
        email: 'test@test.com',
        password: '123',
      });
      expect(result).toEqual(expectedUser);
    });

    it('Kullanici bulunamazsa hata firlatmali', async () => {
      const error = new Prisma.PrismaClientKnownRequestError('User not found', {
        code: 'P2025',
        clientVersion: 'v1',
      });
      mockPrismaService.user.findFirstOrThrow.mockRejectedValueOnce(error);

      await expect(
        service.verifyLogin({ email: 'test@test.com', password: '123' }),
      ).rejects.toThrow('User not found');
    });
  });

  describe('deleteAccount', () => {
    it('Kullaniciyi başariyla anonimleştirmeli ve silmeli', async () => {
      mockPrismaService.user.update.mockResolvedValue({});

      const result = await service.deleteAccount('user-1');
      expect(result.message).toContain('deleted');
      expect(mockPrismaService.user.update).toHaveBeenCalled();
    });

    it('Hata durumunda InternalServerErrorException firlatmali', async () => {
      mockPrismaService.user.update.mockRejectedValueOnce(new Error('Crash'));
      await expect(service.deleteAccount('user-1')).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('getUserById', () => {
    it('Kullaniciyi başariyla getirmeli', async () => {
      const expectedUser = { id: 'user-1', name: 'Ekin' };
      mockPrismaService.user.findUniqueOrThrow.mockResolvedValue(expectedUser);

      const result = await service.getUserById('user-1');
      expect(result).toEqual(expectedUser);
    });

    it('Kullanici bulunamazsa NotFoundException firlatmali', async () => {
      const error = new Prisma.PrismaClientKnownRequestError('Not Found', {
        code: 'P2025',
        clientVersion: 'v1',
      });
      mockPrismaService.user.findUniqueOrThrow.mockRejectedValueOnce(error);

      await expect(service.getUserById('user-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateUser', () => {
    it('Kullaniciyi başariyla güncellemeli', async () => {
      const dto: UserUpdateDto = { name: 'Yeni İsim' };
      mockPrismaService.user.update.mockResolvedValue({});

      const result = await service.updateUser('user-1', dto);
      expect(result.message).toContain('succesfuly');
    });

    it('Kullanici yoksa (P2025) NotFoundException firlatmali', async () => {
      const error = new Prisma.PrismaClientKnownRequestError('Err', {
        code: 'P2025',
        clientVersion: 'v1',
      });
      mockPrismaService.user.update.mockRejectedValueOnce(error);

      await expect(service.updateUser('user-1', {})).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('searchUsers', () => {
    it('Boş arama sorgusunda boş dizi dönmeli', async () => {
      const result = await service.searchUsers('   ');
      expect(result).toEqual([]);
      expect(mockPrismaService.user.findMany).not.toHaveBeenCalled();
    });

    it('Kullanicilari bulup isimsizleri (null) boş string ile haritalamali', async () => {
      const fakeUsers = [
        { id: '1', email: 'test@test.com', name: 'Ekin' },
        { id: '2', email: 'no-name@test.com', name: null },
      ];
      mockPrismaService.user.findMany.mockResolvedValue(fakeUsers);

      const result = await service.searchUsers('ek');
      expect(result).toEqual([
        { id: '1', email: 'test@test.com', name: 'Ekin' },
        { id: '2', email: 'no-name@test.com', name: '' },
      ]);
    });

    it('Hata durumunda InternalServerErrorException firlatmali', async () => {
      mockPrismaService.user.findMany.mockRejectedValueOnce(new Error());
      await expect(service.searchUsers('test')).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('findIdByEmail', () => {
    it('Gelen e-postalarin ID listesini dönmeli', async () => {
      const expected = [{ id: 'user-1', email: 'test@test.com' }];
      mockPrismaService.user.findMany.mockResolvedValue(expected);

      const result = await service.findIdByEmail(['test@test.com']);
      expect(result).toEqual(expected);
    });

    it('Hiç kullanici bulunamazsa NotFoundException firlatmali', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([]);
      await expect(service.findIdByEmail(['test@test.com'])).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('Auth İç Güvenlik Metotlari', () => {
    it('addRefreshToken: Tokeni başariyla kaydetmeli', async () => {
      mockPrismaService.user.update.mockResolvedValue({});
      await expect(
        service.addRefreshToken('user-1', 'token123'),
      ).resolves.not.toThrow();
    });

    it('addRefreshToken: Hata durumunda InternalServerErrorException firlatmali', async () => {
      mockPrismaService.user.update.mockRejectedValueOnce(new Error());
      await expect(
        service.addRefreshToken('user-1', 'token123'),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('findUserWithPassword: Şifreyi başariyla dönmeli', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        password: 'hash123',
      });
      const result = await service.findUserWithPassword('user-1');
      expect(result).toEqual({ password: 'hash123' });
    });

    it('findUserWithPassword: Kullanici yoksa NotFoundException firlatmali', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      await expect(service.findUserWithPassword('user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('updateUserPassword: Yeni şifreyi kaydedip mesaj dönmeli', async () => {
      mockPrismaService.user.update.mockResolvedValue({});
      const result = await service.updateUserPassword('user-1', 'newHash');
      expect(result.message).toContain('successfully');
    });

    it('updateUserPassword: Kullanici yoksa (P2025) NotFoundException firlatmali', async () => {
      const error = new Prisma.PrismaClientKnownRequestError('Err', {
        code: 'P2025',
        clientVersion: 'v1',
      });
      mockPrismaService.user.update.mockRejectedValueOnce(error);
      await expect(
        service.updateUserPassword('user-1', 'newHash'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
