/* eslint-disable @typescript-eslint/no-unsafe-argument */

import { Test, TestingModule } from '@nestjs/testing';
import { TasksService } from './tasks.service';
import { PrismaService } from '../prisma/prisma.service';
import { UserService } from '../user/user.service';
import { BoardGateway } from '../events/board.gateway';
import {
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Prisma, TaskStatus } from '@prisma/client';
import {
  CreateTaskDto,
  ReOrderTaskDto,
  TaskResponseDto,
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
      findMany: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockUserService = {
    findIdByEmail: jest.fn(),
  };

  const mockBoardGateway = {
    broadcastTaskCreated: jest.fn(),
    broadcastTaskUpdate: jest.fn(),
    broadcastTaskDeleted: jest.fn(),
    broadcastTaskReordered: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: UserService, useValue: mockUserService },
        { provide: BoardGateway, useValue: mockBoardGateway },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
    prismaService = module.get<PrismaService>(PrismaService);
    userService = module.get<UserService>(UserService);

    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createTask', () => {
    it('Görev başariyla oluşturulmali ve yayin yapilmali', async () => {
      const dto: CreateTaskDto = {
        title: 'Yeni Görev',
        priority: 'HIGH',
        status: TaskStatus.TODO,
        assigneeEmails: [],
      };
      mockPrismaService.task.findFirst.mockResolvedValue({ order: 1 });

      const expectedTask = {
        id: 'task-1',
        title: 'Yeni Görev',
        order: 2,
        column: { boardId: 'board-1' },
      } as unknown as TaskResponseDto;

      mockPrismaService.task.create.mockResolvedValue(expectedTask);

      const result = await service.createTask('col-1', 'user-1', dto);

      expect(result).toEqual(expectedTask);
      expect(mockBoardGateway.broadcastTaskCreated).toHaveBeenCalledWith(
        'board-1',
        expectedTask,
      );
    });

    it('Veritabani hatasinda InternalServerErrorException firlatmali', async () => {
      mockPrismaService.task.findFirst.mockRejectedValue(new Error('DB Error'));

      await expect(
        service.createTask('col-1', 'user-1', {
          title: 'Hata',
        } as CreateTaskDto),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('addAssignees', () => {
    it('Kişileri atamali, yayin yapmali ve görevi dönmeli', async () => {
      mockUserService.findIdByEmail.mockResolvedValue([{ id: 'user-2' }]);

      const updatedTask = { id: 'task-1', column: { boardId: 'board-1' } };
      mockPrismaService.task.update.mockResolvedValue(updatedTask);

      const expectedTask = {
        id: 'task-1',
        title: 'Test',
      } as unknown as TaskResponseDto;
      jest.spyOn(service, 'getTaskById').mockResolvedValue(expectedTask);

      const result = await service.addAssignees('task-1', ['test@test.com']);

      expect(result).toEqual(expectedTask);
      expect(mockBoardGateway.broadcastTaskUpdate).toHaveBeenCalledWith(
        'board-1',
        updatedTask,
      );
    });

    it('Kullanici bulunamazsa NotFoundException firlatmali', async () => {
      mockUserService.findIdByEmail.mockResolvedValue([]);

      await expect(
        service.addAssignees('task-1', ['yok@test.com']),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getTaskById', () => {
    it('Görevi başariyla dönmeli', async () => {
      const expectedTask = { id: 'task-1' } as unknown as TaskResponseDto;
      mockPrismaService.task.findUniqueOrThrow.mockResolvedValue(expectedTask);

      const result = await service.getTaskById('task-1');
      expect(result).toEqual(expectedTask);
    });

    it('Görev bulunamazsa NotFoundException (P2025) firlatmali', async () => {
      const error = new Prisma.PrismaClientKnownRequestError('Err', {
        code: 'P2025',
        clientVersion: 'v1',
      });
      mockPrismaService.task.findUniqueOrThrow.mockRejectedValue(error);

      await expect(service.getTaskById('wrong-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getAllTasks', () => {
    it('Görev listesini dönmeli', async () => {
      const tasks = [{ id: 'task-1' }] as unknown as TaskResponseDto[];
      mockPrismaService.task.findMany.mockResolvedValue(tasks);

      const result = await service.getAllTasks('col-1');
      expect(result).toEqual(tasks);
    });

    it('Liste boşsa NotFoundException firlatmali', async () => {
      mockPrismaService.task.findMany.mockResolvedValue([]);
      await expect(service.getAllTasks('col-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('calculateTaskProgress', () => {
    it('İlerlemeyi %50 olarak hesaplamali (2 görevden 1i bitmiş)', async () => {
      mockPrismaService.task.findUnique.mockResolvedValue({
        _count: { subtasks: 2 },
        subtasks: [{ id: 'sub-1' }],
      });

      const result = await service.calculateTaskProgress('task-1');
      expect(result).toEqual({ progress: 50 });
    });

    it('Görev yoksa NotFoundException firlatmali', async () => {
      mockPrismaService.task.findUnique.mockResolvedValue(null);
      await expect(service.calculateTaskProgress('task-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('reOrder', () => {
    it('Siralamayi güncelleyip yayin yapmali', async () => {
      const dto: ReOrderTaskDto[] = [
        { id: 'task-1', newOrder: 1, newColumnId: 'col-1' },
      ];

      const updatedTasks = [
        { id: 'task-1', order: 1, column: { boardId: 'board-1' } },
      ];
      mockPrismaService.$transaction.mockResolvedValue(updatedTasks);

      const result = await service.reOrder(dto);

      expect(result).toEqual(updatedTasks);
      expect(mockBoardGateway.broadcastTaskReordered).toHaveBeenCalledWith(
        'board-1',
        updatedTasks,
      );
    });

    it('Transaction çökerse InternalServerErrorException firlatmali', async () => {
      mockPrismaService.$transaction.mockRejectedValue(new Error('Crash'));
      await expect(service.reOrder([])).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('updateTask', () => {
    it('Güncelleyip yayin yapmali ve getTaskById çağirmali', async () => {
      const updatedTask = { id: 'task-1', column: { boardId: 'board-1' } };
      mockPrismaService.task.update.mockResolvedValue(updatedTask);

      const expectedTask = {
        id: 'task-1',
        title: 'Yeni',
      } as unknown as TaskResponseDto;
      jest.spyOn(service, 'getTaskById').mockResolvedValue(expectedTask);

      const result = await service.updateTask('task-1', {
        title: 'Yeni',
      } as any);

      expect(result).toEqual(expectedTask);
      expect(mockBoardGateway.broadcastTaskUpdate).toHaveBeenCalledWith(
        'board-1',
        updatedTask,
      );
    });
  });

  describe('updateLead', () => {
    it('Lideri güncelleyip yayin yapmali', async () => {
      mockUserService.findIdByEmail.mockResolvedValue([{ id: 'user-2' }]);

      const updatedTask = { id: 'task-1', column: { boardId: 'board-1' } };
      mockPrismaService.task.update.mockResolvedValue(updatedTask);

      const expectedTask = {
        id: 'task-1',
        leadAssigneeId: 'user-2',
      } as unknown as TaskResponseDto;
      jest.spyOn(service, 'getTaskById').mockResolvedValue(expectedTask);

      const result = await service.updateLead('task-1', 'test@test.com');

      expect(result).toEqual(expectedTask);
      expect(mockBoardGateway.broadcastTaskUpdate).toHaveBeenCalledWith(
        'board-1',
        updatedTask,
      );
    });
  });

  describe('deleteTask', () => {
    it('Görevi silip true dönmeli ve yayin yapmali', async () => {
      mockPrismaService.task.findUnique.mockResolvedValue({
        id: 'task-1',
        column: { boardId: 'board-1' },
      });
      mockPrismaService.task.delete.mockResolvedValue({});

      const result = await service.deleteTask('task-1');

      expect(result).toBe(true);
      expect(mockBoardGateway.broadcastTaskDeleted).toHaveBeenCalledWith(
        'board-1',
        'task-1',
      );
    });

    it('Silinecek görev bulunamazsa NotFoundException firlatmali', async () => {
      mockPrismaService.task.findUnique.mockResolvedValue(null);
      await expect(service.deleteTask('task-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('deleteAssignees', () => {
    it('Atananlari silip yayin yapmali', async () => {
      mockUserService.findIdByEmail.mockResolvedValue([{ id: 'user-2' }]);

      const updatedTask = { id: 'task-1', column: { boardId: 'board-1' } };
      mockPrismaService.task.update.mockResolvedValue(updatedTask);

      const expectedTask = { id: 'task-1' } as unknown as TaskResponseDto;
      jest.spyOn(service, 'getTaskById').mockResolvedValue(expectedTask);

      const result = await service.deleteAssignees('task-1', ['test@test.com']);

      expect(result).toEqual(expectedTask);
      expect(mockBoardGateway.broadcastTaskUpdate).toHaveBeenCalledWith(
        'board-1',
        updatedTask,
      );
    });
  });

  describe('getTasksByUser', () => {
    it('Kullanicinin görevlerini dönmeli', async () => {
      const tasks = [{ id: 'task-1' }] as unknown as TaskResponseDto[];
      mockPrismaService.task.findMany.mockResolvedValue(tasks);

      const result = await service.getTasksByUser('user-1');
      expect(result).toEqual(tasks);
    });
  });
});
