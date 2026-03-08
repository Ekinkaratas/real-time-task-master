/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument */

import { Test, TestingModule } from '@nestjs/testing';
import { TasksService } from './tasks.service';
import { PrismaService } from '../prisma/prisma.service';
import { UserService } from '../user/user.service';
import { BoardGateway } from '../events/board.gateway';
import { UserGateway } from '../events/user.gateway';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

describe('TasksService', () => {
  let service: TasksService;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let prismaService: PrismaService;

  const mockPrismaService = {
    $transaction: jest.fn(async (queries) => Promise.all(queries)),
    task: {
      findFirst: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    boardMember: {
      findMany: jest.fn(),
    },
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

  const mockUserGateway = {
    broadcastToUser: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: UserService, useValue: mockUserService },
        { provide: BoardGateway, useValue: mockBoardGateway },
        { provide: UserGateway, useValue: mockUserGateway },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
    prismaService = module.get<PrismaService>(PrismaService);

    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createTask', () => {
    it('Görev oluşturmali ve broadcast yayini yapmali', async () => {
      mockPrismaService.task.findFirst.mockResolvedValue({ order: 1 });
      mockUserService.findIdByEmail.mockResolvedValue([
        { id: 'user-1', email: 'test@test.com' },
      ]);

      const expectedTask = {
        id: 'task-1',
        title: 'New Task',
        column: { boardId: 'board-1' },
      };
      mockPrismaService.task.create.mockResolvedValue(expectedTask);

      const dto = {
        title: 'New Task',
        assigneeEmails: ['test@test.com'],
      } as any;
      const result = await service.createTask('col-1', 'creator-1', dto);

      expect(result).toEqual(expectedTask);
      expect(mockBoardGateway.broadcastTaskCreated).toHaveBeenCalledWith(
        'board-1',
        expectedTask,
      );
    });
  });

  describe('addAssignees', () => {
    const taskId = 'task-1';
    const userEmails = ['test@test.com'];
    const mockTask = {
      id: taskId,
      title: 'Task',
      column: { boardId: 'board-1' },
    };

    it('Geçerli panodaki kullaniciyi göreve atamali ve bildirim göndermeli', async () => {
      mockPrismaService.task.findUnique.mockResolvedValue(mockTask);
      mockUserService.findIdByEmail.mockResolvedValue([{ id: 'user-1' }]);
      mockPrismaService.boardMember.findMany.mockResolvedValue([
        { userId: 'user-1' },
      ]);

      mockPrismaService.task.update.mockResolvedValue(mockTask);
      jest.spyOn(service, 'getTaskById').mockResolvedValue(mockTask as any);

      const result = await service.addAssignees(taskId, userEmails);

      expect(result).toEqual(mockTask);
      expect(mockBoardGateway.broadcastTaskUpdate).toHaveBeenCalled();
      expect(mockUserGateway.broadcastToUser).toHaveBeenCalledWith(
        'user-1',
        'notification',
        expect.objectContaining({ type: 'TASK_ASSIGNED' }),
      );
    });

    it('Kullanici panoda yoksa BadRequestException firlatmali', async () => {
      mockPrismaService.task.findUnique.mockResolvedValue(mockTask);
      mockUserService.findIdByEmail.mockResolvedValue([{ id: 'user-1' }]);
      mockPrismaService.boardMember.findMany.mockResolvedValue([]);

      await expect(service.addAssignees(taskId, userEmails)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('calculateTaskProgress', () => {
    it('Tamamlanan alt görevlerin yüzdesini doğru hesaplamali', async () => {
      mockPrismaService.task.findUnique.mockResolvedValue({
        _count: { subtasks: 4 },
        subtasks: [{ id: '1' }, { id: '2' }],
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
    it('Görevleri siralayip yayini tetiklemeli', async () => {
      const reOrderDto = [
        { id: '1', newOrder: 2 },
        { id: '2', newOrder: 1 },
      ];
      const updatedTasks = [
        { id: '1', order: 2, column: { boardId: 'board-1' } },
        { id: '2', order: 1, column: { boardId: 'board-1' } },
      ];

      mockPrismaService.task.update.mockReturnValue({});
      mockPrismaService.$transaction.mockResolvedValue(updatedTasks);

      const result = await service.reOrder(reOrderDto);

      expect(result[0].id).toBe('2');
      expect(mockBoardGateway.broadcastTaskReordered).toHaveBeenCalled();
    });
  });

  describe('deleteAssignees', () => {
    const taskId = 'task-1';

    it('Kullaniciyi görevden çikarip bildirimleri atmali', async () => {
      mockUserService.findIdByEmail.mockResolvedValue([{ id: 'user-1' }]);
      const updatedTask = {
        id: taskId,
        title: 'Task',
        column: { boardId: 'board-1' },
      };
      mockPrismaService.task.update.mockResolvedValue(updatedTask);
      jest.spyOn(service, 'getTaskById').mockResolvedValue(updatedTask as any);

      const result = await service.deleteAssignees(taskId, ['test@test.com']);

      expect(result).toEqual(updatedTask);
      expect(mockBoardGateway.broadcastTaskUpdate).toHaveBeenCalled();
      expect(mockUserGateway.broadcastToUser).toHaveBeenCalledWith(
        'user-1',
        'notification',
        expect.objectContaining({ type: 'TASK_UNASSIGNED' }),
      );
    });

    it('P2003 Foreign Key hatasi gelirse ConflictException firlatmali', async () => {
      mockUserService.findIdByEmail.mockResolvedValue([{ id: 'user-1' }]);
      const error = new Prisma.PrismaClientKnownRequestError('Err', {
        code: 'P2003',
        clientVersion: 'v1',
      });
      mockPrismaService.task.update.mockRejectedValueOnce(error);

      await expect(
        service.deleteAssignees(taskId, ['test@test.com']),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('getTasksByUser', () => {
    it('Kullanicinin görevlerini başariyla getirmeli', async () => {
      const mockTasks = [{ id: 'task-1' }];
      mockPrismaService.task.findMany.mockResolvedValue(mockTasks);

      const result = await service.getTasksByUser('user-1', true, true, true);
      expect(result).toEqual(mockTasks);
      expect(mockPrismaService.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { priority: 'desc' },
        }),
      );
    });
  });

  describe('Temel CRUD İşlemleri', () => {
    it('getTaskById: ID ye göre görev getirmeli', async () => {
      const mockTask = { id: 'task-1' };
      mockPrismaService.task.findUniqueOrThrow.mockResolvedValue(mockTask);
      const result = await service.getTaskById('task-1');
      expect(result).toEqual(mockTask);
    });

    it('getAllTasks: Kolon içindeki tüm görevleri getirmeli', async () => {
      const mockTasks = [{ id: 'task-1' }];
      mockPrismaService.task.findMany.mockResolvedValue(mockTasks);
      const result = await service.getAllTasks('col-1');
      expect(result).toEqual(mockTasks);
    });

    it('updateTask: Görevi güncellemeli', async () => {
      const mockTask = { id: 'task-1', column: { boardId: 'board-1' } };
      mockPrismaService.task.update.mockResolvedValue(mockTask);
      jest.spyOn(service, 'getTaskById').mockResolvedValue(mockTask as any);

      const result = await service.updateTask('task-1', {});
      expect(result).toEqual(mockTask);
    });

    it('updateLead: Lideri güncellemeli', async () => {
      mockUserService.findIdByEmail.mockResolvedValue([{ id: 'user-1' }]);
      const mockTask = { id: 'task-1', column: { boardId: 'board-1' } };
      mockPrismaService.task.update.mockResolvedValue(mockTask);
      jest.spyOn(service, 'getTaskById').mockResolvedValue(mockTask as any);

      const result = await service.updateLead('task-1', 'test@test.com');
      expect(result).toEqual(mockTask);
    });

    it('deleteTask: Görevi silmeli ve yayini tetiklemeli', async () => {
      mockPrismaService.task.findUnique.mockResolvedValue({
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
  });
});
