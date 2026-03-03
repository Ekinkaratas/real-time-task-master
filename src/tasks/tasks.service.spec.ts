import { Test, TestingModule } from '@nestjs/testing';
import { TasksService } from './tasks.service';
import { PrismaService } from '../prisma/prisma.service';
import { UserService } from '../user/user.service';
import { NotFoundException } from '@nestjs/common';
import { TaskStatus, Priority, Prisma } from '@prisma/client';
import { CreateTaskDto, TaskResponseDto } from 'contracts/tasks';

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
      findUniqueOrThrow: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
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
    it('görev başarıyla oluşturulmalı (Atanan kişi yokken)', async () => {
      const columnId = 'col-1';
      const userId = 'user-1';

      const dto: CreateTaskDto = {
        title: 'Test Task',
        priority: Priority.MEDIUM,
        status: TaskStatus.TODO,
        description: '',
        assigneeEmails: [],
      };

      mockPrismaService.task.findFirst.mockResolvedValue(null);
      const createdTask = {
        id: 'task-1',
        title: 'Test Task',
        order: 1,
      } as unknown as TaskResponseDto;
      mockPrismaService.task.create.mockResolvedValue(createdTask);

      const result: TaskResponseDto = await service.createTask(
        columnId,
        userId,
        dto,
      );

      expect(result).toEqual(createdTask);
      expect(mockPrismaService.task.create).toHaveBeenCalledWith(
        expect.objectContaining({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          data: expect.objectContaining({ title: 'Test Task', order: 1 }),
        }),
      );
    });
  });

  describe('getTaskById', () => {
    it('ID ile görev başarıyla getirilmeli', async () => {
      const taskId = 'task-1';
      const expectedTask = {
        id: taskId,
        title: 'Görev',
      } as unknown as TaskResponseDto;
      mockPrismaService.task.findUniqueOrThrow.mockResolvedValue(expectedTask);

      const result: TaskResponseDto = await service.getTaskById(taskId);

      expect(result).toEqual(expectedTask);
      expect(mockPrismaService.task.findUniqueOrThrow).toHaveBeenCalledWith({
        where: { id: taskId },
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        include: expect.any(Object),
      });
    });

    it('Görev bulunamazsa NotFoundException (404) fırlatmalı', async () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Not found',
        {
          code: 'P2025',
          clientVersion: 'v1',
        },
      );
      mockPrismaService.task.findUniqueOrThrow.mockRejectedValue(prismaError);

      await expect(service.getTaskById('yanlis-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('deleteTask', () => {
    it('Görev başarıyla silinmeli ve true dönmeli', async () => {
      mockPrismaService.task.delete.mockResolvedValue({ id: 'task-1' });

      const result = await service.deleteTask('task-1');

      expect(result).toBe(true);
      expect(mockPrismaService.task.delete).toHaveBeenCalledWith({
        where: { id: 'task-1' },
      });
    });
  });
});
