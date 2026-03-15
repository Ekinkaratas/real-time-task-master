import { Test, TestingModule } from '@nestjs/testing';
import { SubtaskService } from './subtask.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  CreateSubTaskDto,
  SubTasksResponseDto,
  UpdateSubTaskDto,
} from 'contracts/subtasks';
import { BoardGateway } from '../events/board.gateway';

describe('SubtaskService', () => {
  let service: SubtaskService;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let prismaService: PrismaService;

  const mockPrismaService = {
    subtask: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
    },
  };

  const mockBoardGateway = {
    broadcastSubtaskCreated: jest.fn(),
    broadcastSubtaskUpdate: jest.fn(),
    broadcastSubtaskDelete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubtaskService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: BoardGateway, useValue: mockBoardGateway },
      ],
    }).compile();

    service = module.get<SubtaskService>(SubtaskService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createSubtask', () => {
    it('Alt görevi başariyla oluşturmali ve yayin yapmali', async () => {
      const taskId = 'task-1';
      const dto: CreateSubTaskDto = { title: 'Yeni Alt Görev' };

      const expectedSubtask = {
        id: 'sub-1',
        title: 'Yeni Alt Görev',
        taskId,
        task: { column: { boardId: 'board-1' } },
      } as unknown as SubTasksResponseDto;

      mockPrismaService.subtask.create.mockResolvedValue(expectedSubtask);

      const result = await service.createSubtask(taskId, dto);

      expect(result).toEqual(expectedSubtask);
      expect(mockPrismaService.subtask.create).toHaveBeenCalledWith({
        data: {
          ...dto,
          taskId,
        },
        include: {
          task: {
            select: { column: { select: { boardId: true } } },
          },
        },
      });
      expect(mockBoardGateway.broadcastSubtaskCreated).toHaveBeenCalledWith(
        'board-1',
        expectedSubtask,
      );
    });

    it('Görev ID bulunamazsa BadRequestException firlatmali (P2003)', async () => {
      const error = new Prisma.PrismaClientKnownRequestError('Err', {
        code: 'P2003',
        clientVersion: 'v1',
      });
      mockPrismaService.subtask.create.mockRejectedValueOnce(error);

      await expect(
        service.createSubtask('wrong-task', { title: 'Test' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('Başlik çok uzunsa BadRequestException firlatmali (P2000)', async () => {
      const error = new Prisma.PrismaClientKnownRequestError('Err', {
        code: 'P2000',
        clientVersion: 'v1',
      });
      mockPrismaService.subtask.create.mockRejectedValueOnce(error);

      await expect(
        service.createSubtask('task-1', { title: 'ÇokUzunBaşlik' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('Bilinmeyen bir hata oluşursa InternalServerErrorException firlatmali', async () => {
      mockPrismaService.subtask.create.mockRejectedValueOnce(
        new Error('DB Down'),
      );

      await expect(
        service.createSubtask('task-1', { title: 'Test' }),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('getSubtaskById', () => {
    it('Alt görevi başariyla dönmeli', async () => {
      const expectedSubtask = {
        id: 'sub-1',
        title: 'Alt Görev',
      } as unknown as SubTasksResponseDto;
      mockPrismaService.subtask.findUnique.mockResolvedValue(expectedSubtask);

      const result = await service.getSubtaskById('sub-1');

      expect(result).toEqual(expectedSubtask);
      expect(mockPrismaService.subtask.findUnique).toHaveBeenCalledWith({
        where: { id: 'sub-1' },
      });
    });

    it('Alt görev bulunamazsa (null dönerse) NotFoundException firlatmali', async () => {
      mockPrismaService.subtask.findUnique.mockResolvedValue(null);

      await expect(service.getSubtaskById('wrong-sub')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getSubtaskByTaskId', () => {
    it('Göreve ait alt görevleri başarıyla dönmeli', async () => {
      const taskId = 'task-1';
      const expectedSubtasks = [
        { id: 'sub-1', title: 'Alt Görev 1', taskId },
        { id: 'sub-2', title: 'Alt Görev 2', taskId },
      ] as unknown as SubTasksResponseDto[];

      mockPrismaService.subtask.findMany.mockResolvedValue(expectedSubtasks);

      const result = await service.getSubtaskByTaskId(taskId);

      expect(result).toEqual(expectedSubtasks);
      expect(mockPrismaService.subtask.findMany).toHaveBeenCalledWith({
        where: { taskId },
      });
    });

    it('Göreve ait alt görev yoksa NotFoundException fırlatmalı', async () => {
      const taskId = 'wrong-task';

      mockPrismaService.subtask.findMany.mockResolvedValue([]);

      await expect(service.getSubtaskByTaskId(taskId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('Prisma P2000 (Title Too Long) hatası atarsa BadRequestException fırlatmalı', async () => {
      const error = new Prisma.PrismaClientKnownRequestError('Err', {
        code: 'P2000',
        clientVersion: 'v1',
      });
      mockPrismaService.subtask.findMany.mockRejectedValueOnce(error);

      await expect(service.getSubtaskByTaskId('task-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('Bilinmeyen bir hata oluşursa InternalServerErrorException fırlatmalı', async () => {
      mockPrismaService.subtask.findMany.mockRejectedValueOnce(
        new Error('Unexpected DB Error'),
      );

      await expect(service.getSubtaskByTaskId('task-1')).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('updateSubTask', () => {
    it('Alt görevi başariyla güncelleyip yayin yapmali', async () => {
      const dto: UpdateSubTaskDto = {
        title: 'Güncel Alt Görev',
        isCompleted: true,
      };

      const expectedSubtask = {
        id: 'sub-1',
        ...dto,
        task: { column: { boardId: 'board-1' } },
      } as unknown as SubTasksResponseDto;

      mockPrismaService.subtask.update.mockResolvedValue(expectedSubtask);

      const result = await service.updateSubTask('sub-1', dto);

      expect(result).toEqual(expectedSubtask);
      expect(mockPrismaService.subtask.update).toHaveBeenCalledWith({
        where: { id: 'sub-1' },
        data: { ...dto },
        include: {
          task: {
            select: { column: { select: { boardId: true } } },
          },
        },
      });
      expect(mockBoardGateway.broadcastSubtaskUpdate).toHaveBeenCalledWith(
        'board-1',
        expectedSubtask,
      );
    });

    it('Alt görev bulunamazsa NotFoundException firlatmali (P2025)', async () => {
      const error = new Prisma.PrismaClientKnownRequestError('Err', {
        code: 'P2025',
        clientVersion: 'v1',
      });
      mockPrismaService.subtask.update.mockRejectedValueOnce(error);

      await expect(
        service.updateSubTask('wrong-sub', { title: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('Başlik çok uzunsa BadRequestException firlatmali (P2000)', async () => {
      const error = new Prisma.PrismaClientKnownRequestError('Err', {
        code: 'P2000',
        clientVersion: 'v1',
      });
      mockPrismaService.subtask.update.mockRejectedValueOnce(error);

      await expect(
        service.updateSubTask('sub-1', { title: 'ÇokUzunBaşlik' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('deleteManySubtask', () => {
    it('Alt görevleri başariyla silip yayin yapmali', async () => {
      const boardId = 'board-1';
      const subtaskIds = ['sub-1', 'sub-2'];

      mockPrismaService.subtask.deleteMany.mockResolvedValue({ count: 2 });

      const result = await service.deleteManySubtask(boardId, subtaskIds);

      expect(result).toEqual({ message: 'Subtasks deleted successfully' });
      expect(mockPrismaService.subtask.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: subtaskIds } },
      });
      expect(mockBoardGateway.broadcastSubtaskDelete).toHaveBeenCalledWith(
        boardId,
        subtaskIds,
      );
    });

    it('Hiçbir alt görev silinemezse (count: 0) NotFoundException firlatmali', async () => {
      const boardId = 'board-1';
      const subtaskIds = ['wrong-1', 'wrong-2'];

      mockPrismaService.subtask.deleteMany.mockResolvedValue({ count: 0 });

      await expect(
        service.deleteManySubtask(boardId, subtaskIds),
      ).rejects.toThrow(NotFoundException);
    });

    it('Bilinmeyen bir veritabani hatasinda InternalServerErrorException firlatmali', async () => {
      mockPrismaService.subtask.deleteMany.mockRejectedValueOnce(
        new Error('DB Down'),
      );

      await expect(
        service.deleteManySubtask('board-1', ['sub-1']),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });
});
