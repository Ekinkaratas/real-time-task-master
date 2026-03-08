import { Test, TestingModule } from '@nestjs/testing';
import { BoardController } from './board.controller';
import { BoardService } from './board.service';

import { AccessTokenGuard } from '../common/guards/access-token.guard';
import { BoardRoleGuard } from '../common/guards/board-role.guard';

import {
  AddMemberDto,
  CreateBoardDto,
  UpdateToBoardDto,
} from 'libs/contracts/src/boards';
import { BoardMemberRole } from '@prisma/client';

describe('BoardController', () => {
  let controller: BoardController;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let service: BoardService;

  const mockBoardService = {
    createBoard: jest.fn(),
    BoardsAddUser: jest.fn(),
    removeUserFromBoard: jest.fn(),
    acceptInvitation: jest.fn(),
    rejectInvitation: jest.fn(),
    getBoardForUser: jest.fn(),
    findOneBoard: jest.fn(),
    searchBoardsByTitle: jest.fn(),
    updateBoard: jest.fn(),
    deleteBoard: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BoardController],
      providers: [
        {
          provide: BoardService,
          useValue: mockBoardService,
        },
      ],
    })
      .overrideGuard(AccessTokenGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(BoardRoleGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<BoardController>(BoardController);
    service = module.get<BoardService>(BoardService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createBoard', () => {
    it('DTO ve userId parametrelerini servise iletip yeni panoyu dönmeli', async () => {
      const dto: CreateBoardDto = {
        title: 'Yeni Pano',
        description: 'Açiklama',
      };
      const userId = 'user-1';
      const expectedResult = { id: 'board-1', ...dto };

      mockBoardService.createBoard.mockResolvedValue(expectedResult);

      const result = await controller.createBoard(dto, userId);

      expect(result).toEqual(expectedResult);
      expect(mockBoardService.createBoard).toHaveBeenCalledWith(dto, userId);
    });
  });

  describe('addedUserToBoard', () => {
    it('boardId ve userDto parametrelerini servise iletmeli', async () => {
      const boardId = 'board-1';
      const dto: AddMemberDto = {
        email: 'test@test.com',
        role: BoardMemberRole.MEMBER,
      };
      const expectedResult = { message: 'User invited to board successfully' };

      mockBoardService.BoardsAddUser.mockResolvedValue(expectedResult);

      const result = await controller.addedUserToBoard(boardId, dto);

      expect(result).toEqual(expectedResult);
      expect(mockBoardService.BoardsAddUser).toHaveBeenCalledWith(boardId, dto);
    });
  });

  describe('removeUserFromBoard', () => {
    it('boardId ve userEmail parametrelerini servise iletmeli', async () => {
      const boardId = 'board-1';
      const email = 'test@test.com';
      const expectedResult = {
        message: 'User removed from board successfully',
      };

      mockBoardService.removeUserFromBoard.mockResolvedValue(expectedResult);

      const result = await controller.removeUserFromBoard(boardId, email);

      expect(result).toEqual(expectedResult);
      expect(mockBoardService.removeUserFromBoard).toHaveBeenCalledWith(
        boardId,
        email,
      );
    });
  });

  describe('acceptInvitation', () => {
    it('boardId ve userId parametrelerini servise iletmeli', async () => {
      const boardId = 'board-1';
      const userId = 'user-1';
      const expectedResult = { message: 'Invitation accepted successfully' };

      mockBoardService.acceptInvitation.mockResolvedValue(expectedResult);

      const result = await controller.acceptInvitation(boardId, userId);

      expect(result).toEqual(expectedResult);
      expect(mockBoardService.acceptInvitation).toHaveBeenCalledWith(
        boardId,
        userId,
      );
    });
  });

  describe('rejectInvitation', () => {
    it('boardId ve userId parametrelerini servise iletmeli', async () => {
      const boardId = 'board-1';
      const userId = 'user-1';
      const expectedResult = { message: 'Invitation rejected' };

      mockBoardService.rejectInvitation.mockResolvedValue(expectedResult);

      const result = await controller.rejectInvitation(boardId, userId);

      expect(result).toEqual(expectedResult);
      expect(mockBoardService.rejectInvitation).toHaveBeenCalledWith(
        boardId,
        userId,
      );
    });
  });

  describe('getBoardForUser', () => {
    it('userId parametresini servise iletip pano listesini dönmeli', async () => {
      const userId = 'user-1';
      const expectedResult = [{ id: 'board-1', title: 'Pano 1' }];

      mockBoardService.getBoardForUser.mockResolvedValue(expectedResult);

      const result = await controller.getBoardForUser(userId);

      expect(result).toEqual(expectedResult);
      expect(mockBoardService.getBoardForUser).toHaveBeenCalledWith(userId);
    });
  });

  describe('getfindOneBoard', () => {
    it('boardId parametresini servise iletip pano detayını dönmeli', async () => {
      const boardId = 'board-1';
      const expectedResult = { id: boardId, title: 'Detaylı Pano' };

      mockBoardService.findOneBoard.mockResolvedValue(expectedResult);

      const result = await controller.getfindOneBoard(boardId);

      expect(result).toEqual(expectedResult);
      expect(mockBoardService.findOneBoard).toHaveBeenCalledWith(boardId);
    });
  });

  describe('getSearchBoardByTitle', () => {
    it('title ve userId parametrelerini servise iletip sonuçları dönmeli', async () => {
      const title = 'Aranan';
      const userId = 'user-1';
      const expectedResult = [{ id: 'board-1', title: 'Aranan Pano' }];

      mockBoardService.searchBoardsByTitle.mockResolvedValue(expectedResult);

      const result = await controller.getSearchBoardByTitle(title, userId);

      expect(result).toEqual(expectedResult);
      expect(mockBoardService.searchBoardsByTitle).toHaveBeenCalledWith(
        title,
        userId,
      );
    });
  });

  describe('updateBoard', () => {
    it('boardId ve updateDto parametrelerini servise iletmeli', async () => {
      const boardId = 'board-1';
      const dto: UpdateToBoardDto = { title: 'Güncel Pano' };
      const expectedResult = { id: boardId, ...dto };

      mockBoardService.updateBoard.mockResolvedValue(expectedResult);

      const result = await controller.updateBoard(boardId, dto);

      expect(result).toEqual(expectedResult);
      expect(mockBoardService.updateBoard).toHaveBeenCalledWith(boardId, dto);
    });
  });

  describe('deleteBoard', () => {
    it('boardId parametresini servise iletmeli', async () => {
      const boardId = 'board-1';
      const expectedResult = { message: 'Board deleted successfully' };

      mockBoardService.deleteBoard.mockResolvedValue(expectedResult);

      const result = await controller.deleteBoard(boardId);

      expect(result).toEqual(expectedResult);
      expect(mockBoardService.deleteBoard).toHaveBeenCalledWith(boardId);
    });
  });
});
