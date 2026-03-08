/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */

import { Test, TestingModule } from '@nestjs/testing';
import { BoardService } from './board.service';
import { PrismaService } from '../prisma/prisma.service';
import { UserService } from '../user/user.service';
import { BoardGateway } from '../events/board.gateway';
import { UserGateway } from '../events/user.gateway';
import {
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { BoardMemberRole, Prisma } from '@prisma/client';

describe('BoardService', () => {
  let service: BoardService;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let prismaService: PrismaService;

  const mockPrismaService = {
    $transaction: jest.fn(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      async (callback) => await callback(mockPrismaService),
    ),
    board: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
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

  const mockBoardGateway = {
    broadcastBoardCreated: jest.fn(),
    broadcastBoardUpdate: jest.fn(),
    broadcastBoardDelete: jest.fn(),
  };

  const mockUserGateway = {
    broadcastToUser: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BoardService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: UserService, useValue: mockUserService },
        { provide: BoardGateway, useValue: mockBoardGateway },
        { provide: UserGateway, useValue: mockUserGateway },
      ],
    }).compile();

    service = module.get<BoardService>(BoardService);
    prismaService = module.get<PrismaService>(PrismaService);

    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createBoard', () => {
    it('Transaction ile pano ve kurucu üyeyi oluşturup Gateway yayini yapmali', async () => {
      const dto = { title: 'Test Board', description: 'Desc' };
      const userId = 'user-1';
      const createdBoard = { id: 'board-1', ...dto, ownerId: userId };

      mockPrismaService.board.create.mockResolvedValue(createdBoard);
      mockPrismaService.boardMember.create.mockResolvedValue({});

      const result = await service.createBoard(dto, userId);

      expect(result).toEqual(createdBoard);
      expect(mockPrismaService.board.create).toHaveBeenCalled();
      expect(mockPrismaService.boardMember.create).toHaveBeenCalled();
      expect(mockBoardGateway.broadcastBoardCreated).toHaveBeenCalledWith(
        'board-1',
        createdBoard,
      );
    });
  });

  describe('BoardsAddUser', () => {
    const boardId = 'board-1';
    const userDto = { email: 'test@test.com', role: BoardMemberRole.MEMBER };
    const userId = 'user-2';

    it('Kullaniciyi panoya eklemeli ve her iki Gateway üzerinden bildirim atmali', async () => {
      mockUserService.findIdByEmail.mockResolvedValue([
        { id: userId, email: userDto.email },
      ]);
      mockPrismaService.boardMember.create.mockResolvedValue({});

      const updatedBoard = { id: boardId, title: 'Test Board' };
      mockPrismaService.board.findUnique.mockResolvedValue(updatedBoard);

      const result = await service.BoardsAddUser(boardId, userDto);

      expect(result.message).toContain('successfully');
      expect(mockBoardGateway.broadcastBoardUpdate).toHaveBeenCalledWith(
        boardId,
        updatedBoard,
      );
      expect(mockUserGateway.broadcastToUser).toHaveBeenCalledWith(
        userId,
        'notification',
        expect.objectContaining({ type: 'BOARD_INVITED' }),
      );
    });

    it('Kullanici zaten ekliyse (P2002) ConflictException firlatmali', async () => {
      mockUserService.findIdByEmail.mockResolvedValue([{ id: userId }]);

      const error = new Prisma.PrismaClientKnownRequestError('Err', {
        code: 'P2002',
        clientVersion: '1',
      });
      mockPrismaService.boardMember.create.mockRejectedValueOnce(error);

      await expect(service.BoardsAddUser(boardId, userDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('Beklenmeyen hatalarda InternalServerErrorException firlatmali (Bug Fix Testi)', async () => {
      mockUserService.findIdByEmail.mockResolvedValue([{ id: userId }]);
      mockPrismaService.boardMember.create.mockRejectedValueOnce(
        new Error('Crash'),
      );

      await expect(service.BoardsAddUser(boardId, userDto)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('removeUserFromBoard', () => {
    it('Kullaniciyi silmeli ve bildirimleri atmali', async () => {
      mockUserService.findIdByEmail.mockResolvedValue([{ id: 'user-2' }]);
      mockPrismaService.boardMember.delete.mockResolvedValue({});
      mockPrismaService.board.findUnique.mockResolvedValue({
        id: 'board-1',
        title: 'Test',
      });

      const result = await service.removeUserFromBoard(
        'board-1',
        'test@test.com',
      );

      expect(result.message).toContain('removed');
      expect(mockPrismaService.boardMember.delete).toHaveBeenCalled();
      expect(mockUserGateway.broadcastToUser).toHaveBeenCalledWith(
        'user-2',
        'notification',
        expect.objectContaining({ type: 'BOARD_REMOVE' }),
      );
    });

    it('Kullanici panoda yoksa (P2025) NotFoundException firlatmali', async () => {
      mockUserService.findIdByEmail.mockResolvedValue([{ id: 'user-2' }]);
      const error = new Prisma.PrismaClientKnownRequestError('Err', {
        code: 'P2025',
        clientVersion: '1',
      });
      mockPrismaService.boardMember.delete.mockRejectedValueOnce(error);

      await expect(
        service.removeUserFromBoard('board-1', 'test@test.com'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('acceptInvitation', () => {
    it('Daveti kabul edip, pano sahibine bildirim atmali', async () => {
      mockPrismaService.boardMember.update.mockResolvedValue({});
      const updatedBoard = { id: 'board-1', title: 'Test', ownerId: 'owner-1' };
      mockPrismaService.board.findUnique.mockResolvedValue(updatedBoard);

      const result = await service.acceptInvitation('board-1', 'user-2');

      expect(result.message).toContain('accepted');
      expect(mockBoardGateway.broadcastBoardUpdate).toHaveBeenCalled();
      expect(mockUserGateway.broadcastToUser).toHaveBeenCalledWith(
        'owner-1',
        'notification',
        expect.objectContaining({ type: 'INVITATION_ACCEPTED' }),
      );
      expect(mockUserGateway.broadcastToUser).toHaveBeenCalledWith(
        'user-2',
        'refreshBoards',
        expect.any(Object),
      );
    });
  });

  describe('rejectInvitation', () => {
    it('Daveti reddedip (silip) pano sahibine bildirim atmali', async () => {
      mockPrismaService.boardMember.delete.mockResolvedValue({});
      mockPrismaService.board.findUnique.mockResolvedValue({
        id: 'board-1',
        ownerId: 'owner-1',
      });

      const result = await service.rejectInvitation('board-1', 'user-2');

      expect(result.message).toContain('rejected');
      expect(mockUserGateway.broadcastToUser).toHaveBeenCalledWith(
        'owner-1',
        'notification',
        expect.objectContaining({ type: 'INVITATION_REJECTED' }),
      );
    });
  });

  describe('CRUD & Search Operations', () => {
    it('getBoardForUser: Kullanicinin kabul ettiği panolari getirmeli', async () => {
      const mockBoards = [{ id: '1' }, { id: '2' }];
      mockPrismaService.board.findMany.mockResolvedValue(mockBoards);

      const result = await service.getBoardForUser('user-1');
      expect(result).toEqual(mockBoards);
    });

    it('findOneBoard: Panoyu getirmeli', async () => {
      const mockBoard = { id: '1' };
      mockPrismaService.board.findUnique.mockResolvedValue(mockBoard);

      const result = await service.findOneBoard('1');
      expect(result).toEqual(mockBoard);
    });

    it('updateBoard: Panoyu güncelleyip yayinlamali', async () => {
      const mockBoard = { id: '1', title: 'New' };
      mockPrismaService.board.update.mockResolvedValue(mockBoard);

      const result = await service.updateBoard('1', { title: 'New' });
      expect(result).toEqual(mockBoard);
      expect(mockBoardGateway.broadcastBoardUpdate).toHaveBeenCalledWith(
        '1',
        mockBoard,
      );
    });

    it('deleteBoard: Panoyu silip yayinlamali', async () => {
      mockPrismaService.board.delete.mockResolvedValue({});

      const result = await service.deleteBoard('1');
      expect(result.message).toContain('deleted');
      expect(mockBoardGateway.broadcastBoardDelete).toHaveBeenCalledWith('1');
    });

    it('searchBoardsByTitle: Arama sonucunu dönmeli', async () => {
      const mockBoards = [{ id: '1', title: 'Test' }];
      mockPrismaService.board.findMany.mockResolvedValue(mockBoards);

      const result = await service.searchBoardsByTitle('test', 'user-1');
      expect(result).toEqual(mockBoards);
      expect(mockPrismaService.board.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            title: expect.objectContaining({
              contains: 'test',
              mode: 'insensitive',
            }),
          }),
        }),
      );
    });
  });
});
