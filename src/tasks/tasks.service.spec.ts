/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument */

import { Test, TestingModule } from '@nestjs/testing';
import { TasksService } from './tasks.service';
import { PrismaService } from '../prisma/prisma.service';
import { UserService } from '../user/user.service';
import { NotFoundException } from '@nestjs/common';
import { Prisma, TaskStatus, Priority } from '@prisma/client';
import {
  CreateTaskDto,
  TaskResponseDto,
  ReOrderTaskDto,
  UpdateTaskDto,
} from 'contracts/tasks';

describe('TasksService', () => {
  let service: TasksService;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let prismaService: PrismaService;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let userService: UserService;

  const mockPrismaService = {
    task: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockUserService = {
    findIdByEmail: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: UserService, useValue: mockUserService },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
    prismaService = module.get<PrismaService>(PrismaService);
    userService = module.get<UserService>(UserService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createTask', () => {
    it('Görev başarıyla oluşturulmalı', async () => {
      const dto: CreateTaskDto = {
        title: 'Test',
        priority: Priority.HIGH,
        status: TaskStatus.TODO,
        assigneeEmails: ['test@test.com'],
      };
      const expectedTask = {
        id: 'task-1',
        title: 'Test',
      } as unknown as TaskResponseDto;

      mockPrismaService.task.findFirst.mockResolvedValue(null);
      mockUserService.findIdByEmail.mockResolvedValue([
        { id: 'user-1', email: 'test@test.com' },
      ]);
      mockPrismaService.task.create.mockResolvedValue(expectedTask);

      const result = await service.createTask('col-1', 'creator-1', dto);

      expect(result).toEqual(expectedTask);
      expect(mockPrismaService.task.create).toHaveBeenCalled();
    });
  });

  describe('addAssignees', () => {
    it('Kullanıcı bulunamazsa NotFoundException fırlatmalı', async () => {
      mockUserService.findIdByEmail.mockResolvedValue([]);
      await expect(service.addAssignees('task-1', ['a@b.com'])).rejects.toThrow(
        NotFoundException,
      );
    });

    it('Kişileri başarıyla göreve atamalı', async () => {
      mockUserService.findIdByEmail.mockResolvedValue([{ id: 'user-1' }]);
      mockPrismaService.task.update.mockResolvedValue({});

      jest
        .spyOn(service, 'getTaskById')
        .mockResolvedValue({ id: 'task-1' } as any);

      const result = await service.addAssignees('task-1', ['a@b.com']);
      expect(result.id).toBe('task-1');
    });
  });

  describe('getTaskById', () => {
    it('Görev bulunamazsa NotFoundException (P2025) fırlatmalı', async () => {
      const error = new Prisma.PrismaClientKnownRequestError('Err', {
        code: 'P2025',
        clientVersion: 'v1',
      });
      mockPrismaService.task.findUniqueOrThrow.mockRejectedValueOnce(error);

      await expect(service.getTaskById('wrong')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getAllTasks', () => {
    it('Sütunda görev yoksa NotFoundException fırlatmalı', async () => {
      mockPrismaService.task.findMany.mockResolvedValue([]);
      await expect(service.getAllTasks('col-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('Görevleri başarıyla dönmeli', async () => {
      mockPrismaService.task.findMany.mockResolvedValue([{ id: 'task-1' }]);
      const result = await service.getAllTasks('col-1');
      expect(result).toHaveLength(1);
    });
  });

  describe('calculateTaskProgress', () => {
    it('Görev yoksa NotFoundException fırlatmalı', async () => {
      mockPrismaService.task.findUnique.mockResolvedValue(null);
      await expect(service.calculateTaskProgress('task-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('Alt görev yoksa progress 0 dönmeli', async () => {
      mockPrismaService.task.findUnique.mockResolvedValue({
        _count: { subtasks: 0 },
        subtasks: [],
      });
      const result = await service.calculateTaskProgress('task-1');
      expect(result.progress).toBe(0);
    });

    it('Yüzdeyi doğru hesaplamalı (2 görevden 1i bitmiş = %50)', async () => {
      mockPrismaService.task.findUnique.mockResolvedValue({
        _count: { subtasks: 2 },
        subtasks: [{ id: 'sub-1' }],
      });
      const result = await service.calculateTaskProgress('task-1');
      expect(result.progress).toBe(50);
    });
  });

  describe('reOrder', () => {
    it('Görevleri sıralayıp dönmeli', async () => {
      const dto: ReOrderTaskDto[] = [
        { id: 'task-1', newOrder: 1, newColumnId: 'col-2' },
      ];
      mockPrismaService.$transaction.mockResolvedValue([
        { id: 'task-1', order: 1 },
      ]);

      const result = await service.reOrder(dto);
      expect(result[0].id).toBe('task-1');
    });
  });

  describe('updateTask', () => {
    it('Görevi güncelleyip dönmeli', async () => {
      const dto: UpdateTaskDto = { title: 'Yeni' };
      mockPrismaService.task.update.mockResolvedValue({});
      jest
        .spyOn(service, 'getTaskById')
        .mockResolvedValue({ id: 'task-1', title: 'Yeni' } as any);

      const result = await service.updateTask('task-1', dto);
      expect(result.title).toBe('Yeni');
    });
  });

  describe('updateLead', () => {
    it('Lead (Lider) başarıyla güncellenmeli', async () => {
      mockUserService.findIdByEmail.mockResolvedValue([{ id: 'user-1' }]);
      mockPrismaService.task.update.mockResolvedValue({});
      jest
        .spyOn(service, 'getTaskById')
        .mockResolvedValue({ id: 'task-1' } as any);

      const result = await service.updateLead('task-1', 'lead@test.com');
      expect(result.id).toBe('task-1');
    });
  });

  describe('deleteTask', () => {
    it('Görevi sildiğinde true dönmeli', async () => {
      mockPrismaService.task.delete.mockResolvedValue({});
      const result = await service.deleteTask('task-1');
      expect(result).toBe(true);
    });
  });

  describe('deleteAssignees', () => {
    it('Atananları başarıyla silmeli (disconnect)', async () => {
      mockUserService.findIdByEmail.mockResolvedValue([{ id: 'user-1' }]);
      mockPrismaService.task.update.mockResolvedValue({});
      jest
        .spyOn(service, 'getTaskById')
        .mockResolvedValue({ id: 'task-1' } as any);

      const result = await service.deleteAssignees('task-1', ['test@test.com']);
      expect(result.id).toBe('task-1');
    });
  });

  describe('getTasksByUser', () => {
    it('Kullanıcının görevlerini başarıyla getirmeli', async () => {
      mockPrismaService.task.findMany.mockResolvedValue([{ id: 'task-1' }]);

      const result = await service.getTasksByUser('user-1', true, true, true);
      expect(result).toHaveLength(1);
      expect(mockPrismaService.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            leadAssigneeId: 'user-1',
          }),
        }),
      );
    });
  });
});
