import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { AccessTokenGuard } from '../common/guards/access-token.guard';
import {
  UserResponse,
  UserSearchResponseDto,
  UserUpdateDto,
} from 'contracts/User';

describe('UserController', () => {
  let controller: UserController;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let service: UserService;

  const mockUserService = {
    getUserById: jest.fn(),
    updateUser: jest.fn(),
    searchUsers: jest.fn(),
    deleteAccount: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: UserService,
          useValue: mockUserService,
        },
      ],
    })
      .overrideGuard(AccessTokenGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<UserController>(UserController);
    service = module.get<UserService>(UserService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserById', () => {
    it('Mevcut kullanicinin (me) ID sini servise iletmeli ve profili dönmeli', async () => {
      const userId = 'user-1';
      const expectedUser = {
        id: userId,
        name: 'Ekin Karataş',
        email: 'test@test.com',
      } as unknown as UserResponse;

      mockUserService.getUserById.mockResolvedValue(expectedUser);

      const result = await controller.getUserById(userId);

      expect(result).toEqual(expectedUser);
      expect(mockUserService.getUserById).toHaveBeenCalledWith(userId);
    });
  });

  describe('userUpdate', () => {
    it('Kullanici ID si ve DTO yu servise iletmeli ve başari mesaji dönmeli', async () => {
      const userId = 'user-1';
      const dto: UserUpdateDto = {
        name: 'Yeni Ekin',
      };
      const expectedResponse = { message: 'update is succesfuly ' };

      mockUserService.updateUser.mockResolvedValue(expectedResponse);

      const result = await controller.userUpdate(userId, dto);

      expect(result).toEqual(expectedResponse);
      expect(mockUserService.updateUser).toHaveBeenCalledWith(userId, dto);
    });
  });

  describe('searchUsers', () => {
    it('Arama sorgusunu (query) servise iletmeli ve sonuç listesini dönmeli', async () => {
      const query = 'ekin';
      const expectedResponse = [
        { id: '1', name: 'Ekin', email: 'test@test.com' },
      ] as unknown as UserSearchResponseDto[];

      mockUserService.searchUsers.mockResolvedValue(expectedResponse);

      const result = await controller.searchUsers(query);

      expect(result).toEqual(expectedResponse);
      expect(mockUserService.searchUsers).toHaveBeenCalledWith(query);
    });
  });

  describe('deleteAccount', () => {
    it('Kullanici ID sini servise iletmeli ve silme/anonimleştirme mesaji dönmeli', async () => {
      const userId = 'user-1';
      const expectedResponse = {
        message: 'Your account has been deleted...',
      };

      mockUserService.deleteAccount.mockResolvedValue(expectedResponse);

      const result = await controller.deleteAccount(userId);

      expect(result).toEqual(expectedResponse);
      expect(mockUserService.deleteAccount).toHaveBeenCalledWith(userId);
    });
  });
});
