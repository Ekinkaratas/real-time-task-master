/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
import { Test, TestingModule } from '@nestjs/testing';
import { BoardService } from './board.service';
import { PrismaService } from '../prisma/prisma.service';
import { UserService } from '../user/user.service';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { BoardMemberRole, EnrollmentStatus, Prisma } from '@prisma/client';
import {
  AddMemberDto,
  CreateBoardDto,
  UpdateToBoardDto,
} from 'libs/contracts/src/boards';

describe('BoardService', () => {
  let service: BoardService;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let prismaService: PrismaService;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let userService: UserService;

  const mockPrismaService = {
    $transaction: jest.fn(async (callback) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return await callback(mockPrismaService);
    }),
    board: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    boardMember: {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockUserService = {
    findIdByEmail: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BoardService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: UserService, useValue: mockUserService },
      ],
    }).compile();

    service = module.get<BoardService>(BoardService);
    prismaService = module.get<PrismaService>(PrismaService);
    userService = module.get<UserService>(UserService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createBoard', () => {
    it('Transaction ile pano ve OWNER rolünde üye oluşturmalı', async () => {
      const createDto: CreateBoardDto = {
        title: 'Yeni Pano',
        description: 'Açıklama',
      };
      const userId = 'user-1';

      const expectedBoard = {
        id: 'board-1',
        title: 'Yeni Pano',
        ownerId: userId,
      };

      mockPrismaService.board.create.mockResolvedValue(expectedBoard);
      mockPrismaService.boardMember.create.mockResolvedValue({});

      const result = await service.createBoard(createDto, userId);

      expect(result).toEqual(expectedBoard);
      expect(mockPrismaService.board.create).toHaveBeenCalled();
      expect(mockPrismaService.boardMember.create).toHaveBeenCalledWith({
        data: {
          boardId: 'board-1',
          userId: userId,
          role: BoardMemberRole.OWNER,
          status: EnrollmentStatus.ACCEPTED,
        },
      });
    });
  });

  describe('BoardsAddUser', () => {
    it('Kullanıcı bulunamazsa NotFoundException fırlatmalı', async () => {
      mockUserService.findIdByEmail.mockResolvedValue([]);
      const dto: AddMemberDto = { email: 'test@test.com' };

      await expect(service.BoardsAddUser('board-1', dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('Kullanıcı zaten üyeyse ConflictException fırlatmalı (P2002)', async () => {
      mockUserService.findIdByEmail.mockResolvedValue([{ id: 'user-2' }]);
      const dto: AddMemberDto = { email: 'test@test.com' };

      const prismaError = new Prisma.PrismaClientKnownRequestError('Error', {
        code: 'P2002',
        clientVersion: 'v1',
      });
      mockPrismaService.boardMember.create.mockRejectedValueOnce(prismaError);

      await expect(service.BoardsAddUser('board-1', dto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('Kullanıcıyı panoya başarıyla davet etmeli', async () => {
      mockUserService.findIdByEmail.mockResolvedValue([{ id: 'user-2' }]);
      mockPrismaService.boardMember.create.mockResolvedValue({});
      const dto: AddMemberDto = {
        email: 'test@test.com',
        role: BoardMemberRole.MEMBER,
      };

      const result = await service.BoardsAddUser('board-1', dto);

      expect(result).toEqual({ message: 'User invited to board successfully' });
    });
  });

  describe('removeUserFromBoard', () => {
    it('Üye başarıyla silinmeli', async () => {
      mockUserService.findIdByEmail.mockResolvedValue([{ id: 'user-2' }]);
      mockPrismaService.boardMember.delete.mockResolvedValue({});

      const result = await service.removeUserFromBoard(
        'board-1',
        'test@test.com',
      );
      expect(result).toEqual({
        message: 'User removed from board successfully',
      });
    });

    it('Silinecek üye panoda yoksa NotFoundException fırlatmalı (P2025)', async () => {
      mockUserService.findIdByEmail.mockResolvedValue([{ id: 'user-2' }]);
      const prismaError = new Prisma.PrismaClientKnownRequestError('Error', {
        code: 'P2025',
        clientVersion: 'v1',
      });
      mockPrismaService.boardMember.delete.mockRejectedValueOnce(prismaError);

      await expect(
        service.removeUserFromBoard('board-1', 'test@test.com'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('acceptInvitation', () => {
    it('Daveti başarıyla kabul etmeli (status: ACCEPTED)', async () => {
      mockPrismaService.boardMember.update.mockResolvedValue({});

      const result = await service.acceptInvitation('board-1', 'user-1');
      expect(result).toEqual({ message: 'Invitation accepted successfully' });
    });
  });

  describe('rejectInvitation', () => {
    it('Daveti başarıyla reddetmeli (boardMember silinmeli)', async () => {
      mockPrismaService.boardMember.delete.mockResolvedValue({});

      const result = await service.rejectInvitation('board-1', 'user-1');
      expect(result).toEqual({ message: 'Invitation rejected' });
    });
  });

  describe('getBoardForUser', () => {
    it('Kullanıcının kabul ettiği panoları getirmeli', async () => {
      const expectedBoards = [{ id: 'board-1' }];
      mockPrismaService.board.findMany.mockResolvedValue(expectedBoards);

      const result = await service.getBoardForUser('user-1');
      expect(result).toEqual(expectedBoards);
    });
  });

  describe('findOneBoard', () => {
    it('Pano detaylarını başarıyla getirmeli', async () => {
      const expectedBoard = { id: 'board-1' };
      mockPrismaService.board.findUnique.mockResolvedValue(expectedBoard);

      const result = await service.findOneBoard('board-1');
      expect(result).toEqual(expectedBoard);
    });
  });

  describe('updateBoard', () => {
    it('Panoyu güncellemeli', async () => {
      const updateDto: UpdateToBoardDto = { title: 'Yeni Başlık' };
      const expectedBoard = { id: 'board-1', title: 'Yeni Başlık' };
      mockPrismaService.board.update.mockResolvedValue(expectedBoard);

      const result = await service.updateBoard('board-1', updateDto);
      expect(result).toEqual(expectedBoard);
    });

    it('Pano bulunamazsa NotFoundException fırlatmalı (P2025)', async () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError('Error', {
        code: 'P2025',
        clientVersion: 'v1',
      });
      mockPrismaService.board.update.mockRejectedValueOnce(prismaError);

      await expect(
        service.updateBoard('yanlis-id', { title: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteBoard', () => {
    it('Panoyu başarıyla silmeli', async () => {
      mockPrismaService.board.delete.mockResolvedValue({});

      const result = await service.deleteBoard('board-1');
      expect(result).toEqual({ message: 'Board deleted successfully' });
    });
  });

  describe('searchBoardsByTitle', () => {
    it('Başlığa göre arama yapmalı', async () => {
      const expectedBoards = [{ id: 'board-1', title: 'Test Panosu' }];
      mockPrismaService.board.findMany.mockResolvedValue(expectedBoards);

      const result = await service.searchBoardsByTitle('Test', 'user-1');
      expect(result).toEqual(expectedBoards);
    });
  });
});
