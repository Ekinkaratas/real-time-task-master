import { Test, TestingModule } from '@nestjs/testing';
import { ColumnsController } from './columns.controller';
import { ColumnsService } from './columns.service';

import { AccessTokenGuard } from '../common/guards/access-token.guard';
import { BoardRoleGuard } from '../common/guards/board-role.guard';

import { ColumnResponseDto, ReorderColumnDto } from 'contracts/columns';

describe('ColumnsController', () => {
  let controller: ColumnsController;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let service: ColumnsService;

  const mockColumnsService = {
    createColumn: jest.fn(),
    getAllColumns: jest.fn(),
    reorderColumns: jest.fn(),
    updateColumn: jest.fn(),
    deleteManyColumns: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ColumnsController],
      providers: [
        {
          provide: ColumnsService,
          useValue: mockColumnsService,
        },
      ],
    })
      .overrideGuard(AccessTokenGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(BoardRoleGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ColumnsController>(ColumnsController);
    service = module.get<ColumnsService>(ColumnsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createColumn', () => {
    it('gelen veriyi servise iletmeli ve yeni sütunu dönmeli', async () => {
      const boardId = 'board-1';
      const title = 'Yeni Sütun';

      const expectedResult = {
        id: 'col-1',
        title,
        order: 1,
        boardId,
      } as unknown as ColumnResponseDto;

      mockColumnsService.createColumn.mockResolvedValue(expectedResult);

      const result = await controller.createColumn(boardId, title);

      expect(result).toEqual(expectedResult);
      expect(mockColumnsService.createColumn).toHaveBeenCalledWith(
        boardId,
        title,
      );
    });
  });

  describe('getAllColumns', () => {
    it('boardId parametresini servise iletmeli ve sütun listesini dönmeli', async () => {
      const boardId = 'board-1';
      const expectedResult = [
        { id: 'col-1', title: 'Sütun 1' },
      ] as unknown as ColumnResponseDto[];

      mockColumnsService.getAllColumns.mockResolvedValue(expectedResult);

      const result = await controller.getAllColumns(boardId);

      expect(result).toEqual(expectedResult);
      expect(mockColumnsService.getAllColumns).toHaveBeenCalledWith(boardId);
    });
  });

  describe('reorder', () => {
    it('yeni sıralama dizisini servise iletmeli ve güncel listeyi dönmeli', async () => {
      const boardId = 'board-1';
      const dtoList: ReorderColumnDto[] = [
        { id: 'col-1', order: 2 },
        { id: 'col-2', order: 1 },
      ];

      const expectedResult = [
        { id: 'col-2', order: 1 },
        { id: 'col-1', order: 2 },
      ] as unknown as ColumnResponseDto[];

      mockColumnsService.reorderColumns.mockResolvedValue(expectedResult);

      const result = await controller.reorder(boardId, dtoList);

      expect(result).toEqual(expectedResult);
      expect(mockColumnsService.reorderColumns).toHaveBeenCalledWith(
        boardId,
        dtoList,
      );
    });
  });

  describe('updateColumn', () => {
    it('parametreleri doğru sırayla servise iletmeli ve güncel sütunu dönmeli', async () => {
      const boardId = 'board-1';
      const columnId = 'col-1';
      const title = 'Güncel Başlık';

      const expectedResult = {
        id: columnId,
        title,
      } as unknown as ColumnResponseDto;

      mockColumnsService.updateColumn.mockResolvedValue(expectedResult);

      const result = await controller.updateColumn(boardId, columnId, title);

      expect(result).toEqual(expectedResult);

      expect(mockColumnsService.updateColumn).toHaveBeenCalledWith(
        columnId,
        boardId,
        title,
      );
    });
  });

  describe('deleteManyColumns', () => {
    it('silinecek sütun ID dizisini servise iletmeli ve kalanları dönmeli', async () => {
      const boardId = 'board-1';
      const columnIds = ['col-1', 'col-2'];
      const expectedResult = [
        { id: 'col-3' },
      ] as unknown as ColumnResponseDto[];

      mockColumnsService.deleteManyColumns.mockResolvedValue(expectedResult);

      const result = await controller.deleteManyColumns(boardId, columnIds);

      expect(result).toEqual(expectedResult);
      expect(mockColumnsService.deleteManyColumns).toHaveBeenCalledWith(
        boardId,
        columnIds,
      );
    });
  });
});
