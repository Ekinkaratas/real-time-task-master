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

describe('SubtaskService', () => {
  let service: SubtaskService;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let prismaService: PrismaService;

  const mockPrismaService = {
    subtask: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubtaskService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<SubtaskService>(SubtaskService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createSubtask', () => {
    it('Alt görevi başarıyla oluşturmalı', async () => {
      const taskId = 'task-1';
      const dto: CreateSubTaskDto = { title: 'Yeni Alt Görev' };
      const expectedSubtask = {
        id: 'sub-1',
        title: 'Yeni Alt Görev',
        taskId,
      } as unknown as SubTasksResponseDto;

      mockPrismaService.subtask.create.mockResolvedValue(expectedSubtask);

      const result = await service.createSubtask(taskId, dto);

      expect(result).toEqual(expectedSubtask);
      expect(mockPrismaService.subtask.create).toHaveBeenCalledWith({
        data: {
          ...dto,
          taskId,
        },
      });
    });

    it('Görev ID bulunamazsa BadRequestException fırlatmalı (P2003)', async () => {
      const error = new Prisma.PrismaClientKnownRequestError('Err', {
        code: 'P2003',
        clientVersion: 'v1',
      });
      mockPrismaService.subtask.create.mockRejectedValueOnce(error);

      await expect(
        service.createSubtask('wrong-task', { title: 'Test' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('Başlık çok uzunsa BadRequestException fırlatmalı (P2000)', async () => {
      const error = new Prisma.PrismaClientKnownRequestError('Err', {
        code: 'P2000',
        clientVersion: 'v1',
      });
      mockPrismaService.subtask.create.mockRejectedValueOnce(error);

      await expect(
        service.createSubtask('task-1', { title: 'ÇokUzunBaşlık' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('Bilinmeyen bir hata oluşursa InternalServerErrorException fırlatmalı', async () => {
      mockPrismaService.subtask.create.mockRejectedValueOnce(
        new Error('DB Down'),
      );

      await expect(
        service.createSubtask('task-1', { title: 'Test' }),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('getSubtaskById', () => {
    it('Alt görevi başarıyla dönmeli', async () => {
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

    it('Alt görev bulunamazsa (null dönerse) NotFoundException fırlatmalı', async () => {
      mockPrismaService.subtask.findUnique.mockResolvedValue(null);

      await expect(service.getSubtaskById('wrong-sub')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateSubTask', () => {
    it('Alt görevi başarıyla güncelleyip dönmeli', async () => {
      const dto: UpdateSubTaskDto = {
        title: 'Güncel Alt Görev',
        isCompleted: true,
      };
      const expectedSubtask = {
        id: 'sub-1',
        ...dto,
      } as unknown as SubTasksResponseDto;

      mockPrismaService.subtask.update.mockResolvedValue(expectedSubtask);

      const result = await service.updateSubTask('sub-1', dto);

      expect(result).toEqual(expectedSubtask);
      expect(mockPrismaService.subtask.update).toHaveBeenCalledWith({
        where: { id: 'sub-1' },
        data: { ...dto },
      });
    });

    it('Alt görev bulunamazsa NotFoundException fırlatmalı (P2025)', async () => {
      const error = new Prisma.PrismaClientKnownRequestError('Err', {
        code: 'P2025',
        clientVersion: 'v1',
      });
      mockPrismaService.subtask.update.mockRejectedValueOnce(error);

      await expect(
        service.updateSubTask('wrong-sub', { title: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('Başlık çok uzunsa BadRequestException fırlatmalı (P2000)', async () => {
      const error = new Prisma.PrismaClientKnownRequestError('Err', {
        code: 'P2000',
        clientVersion: 'v1',
      });
      mockPrismaService.subtask.update.mockRejectedValueOnce(error);

      await expect(
        service.updateSubTask('sub-1', { title: 'ÇokUzunBaşlık' }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
