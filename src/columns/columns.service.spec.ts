import { Test, TestingModule } from '@nestjs/testing';
import { ColumnsService } from './columns.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ColumnResponseDto, ReorderColumnDto } from 'contracts/columns';

describe('ColumnsService', () => {
  let service: ColumnsService;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let prismaService: PrismaService;

  const mockPrismaService = {
    column: {
      findFirst: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
    },
    task: {
      findFirst: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ColumnsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ColumnsService>(ColumnsService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createColumn', () => {
    it('İlk sütun olarak başarıyla oluşturulmalı (order: 1)', async () => {
      const boardId = 'board-1';
      const title = 'Yeni Sütun';

      mockPrismaService.column.findFirst.mockResolvedValue(null);

      const expectedColumn = {
        id: 'col-1',
        title,
        order: 1,
        boardId,
      } as unknown as ColumnResponseDto;

      mockPrismaService.column.create.mockResolvedValue(expectedColumn);

      const result: ColumnResponseDto = await service.createColumn(
        boardId,
        title,
      );

      expect(result).toEqual(expectedColumn);
      expect(mockPrismaService.column.create).toHaveBeenCalledWith(
        expect.objectContaining({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          data: expect.objectContaining({ title, order: 1 }),
        }),
      );
    });

    it('Mevcut sütunların sonuna eklenmeli (order + 1)', async () => {
      mockPrismaService.column.findFirst.mockResolvedValue({ order: 5 });

      const expectedColumn = { order: 6 } as unknown as ColumnResponseDto;
      mockPrismaService.column.create.mockResolvedValue(expectedColumn);

      const result = await service.createColumn('board-1', 'Test');

      expect(result.order).toBe(6);
    });
  });

  describe('getAllColumns', () => {
    it('Panodaki tüm sütunları başarıyla getirmeli', async () => {
      const expectedColumns = [
        { id: 'col-1' },
      ] as unknown as ColumnResponseDto[];

      mockPrismaService.column.findMany.mockResolvedValue(expectedColumns);

      const result = await service.getAllColumns('board-1');

      expect(result).toEqual(expectedColumns);
    });

    it('Veritabanı hatasında InternalServerErrorException fırlatmalı', async () => {
      mockPrismaService.column.findMany.mockRejectedValue(
        new Error('DB Error'),
      );

      await expect(service.getAllColumns('board-1')).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('updateColumn', () => {
    it('Sütunu başarıyla güncellemeli', async () => {
      const expectedColumn = {
        title: 'Güncel',
      } as unknown as ColumnResponseDto;
      mockPrismaService.column.update.mockResolvedValue(expectedColumn);

      const result = await service.updateColumn('col-1', 'board-1', 'Güncel');

      expect(result).toEqual(expectedColumn);
    });

    it('Sütun bulunamazsa NotFoundException fırlatmalı (P2025)', async () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError('Error', {
        code: 'P2025',
        clientVersion: 'v1',
      });

      mockPrismaService.column.update.mockRejectedValueOnce(prismaError);

      await expect(
        service.updateColumn('yanlis-col', 'board-1', 'Test'),
      ).rejects.toThrow(NotFoundException);
    });

    it('Pano eşleşmezse BadRequestException fırlatmalı (P2003)', async () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError('Error', {
        code: 'P2003',
        clientVersion: 'v1',
      });

      mockPrismaService.column.update.mockRejectedValueOnce(prismaError);

      await expect(
        service.updateColumn('col-1', 'yanlis-board', 'Test'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('reorderColumns', () => {
    it('Sütunların sırasını güncelleyip sıralı halde dönmeli', async () => {
      const dto: ReorderColumnDto[] = [
        { id: 'col-1', order: 2 },
        { id: 'col-2', order: 1 },
      ];

      const transactionResult = [
        { id: 'col-1', order: 2 },
        { id: 'col-2', order: 1 },
      ] as unknown as ColumnResponseDto[];

      mockPrismaService.$transaction.mockResolvedValue(transactionResult);

      const result = await service.reorderColumns('board-1', dto);

      expect(result[0].id).toBe('col-2');
      expect(result[1].id).toBe('col-1');
    });
  });

  describe('deleteManyColumns', () => {
    it('İçinde tamamlanmamış görev varsa BadRequestException fırlatmalı', async () => {
      mockPrismaService.task.findFirst.mockResolvedValue({ id: 'task-1' });

      await expect(
        service.deleteManyColumns('board-1', ['col-1']),
      ).rejects.toThrow(BadRequestException);
    });

    it('Sütun silinemezse (count 0) NotFoundException fırlatmalı', async () => {
      mockPrismaService.task.findFirst.mockResolvedValue(null);
      mockPrismaService.column.deleteMany.mockResolvedValue({ count: 0 });

      await expect(
        service.deleteManyColumns('board-1', ['yanlis-col']),
      ).rejects.toThrow(NotFoundException);
    });

    it('Başarıyla silip kalan sütunları dönmeli', async () => {
      mockPrismaService.task.findFirst.mockResolvedValue(null);
      mockPrismaService.column.deleteMany.mockResolvedValue({ count: 1 });

      const remainingColumns = [
        { id: 'col-2' },
      ] as unknown as ColumnResponseDto[];
      mockPrismaService.column.findMany.mockResolvedValue(remainingColumns);

      const result = await service.deleteManyColumns('board-1', ['col-1']);

      expect(result).toEqual(remainingColumns);
    });
  });
});
