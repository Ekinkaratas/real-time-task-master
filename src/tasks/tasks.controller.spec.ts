import { Test, TestingModule } from '@nestjs/testing';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

import { AccessTokenGuard } from '../common/guards/access-token.guard';
import { TaskBoardRoleGuard } from '../common/guards/task-board-role.guard';

import {
  CreateTaskDto,
  ReOrderTaskDto,
  TaskResponseDto,
  UpdateTaskDto,
} from 'contracts/tasks';
import { Priority, TaskStatus } from '@prisma/client';

describe('TasksController', () => {
  let controller: TasksController;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let service: TasksService;

  const mockTasksService = {
    createTask: jest.fn(),
    addAssignees: jest.fn(),
    deleteAssignees: jest.fn(),
    getTaskById: jest.fn(),
    getAllTasks: jest.fn(),
    calculateTaskProgress: jest.fn(),
    reOrder: jest.fn(),
    updateTask: jest.fn(),
    updateLead: jest.fn(),
    deleteTask: jest.fn(),
    getAssignees: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TasksController],
      providers: [
        {
          provide: TasksService,
          useValue: mockTasksService,
        },
      ],
    })
      .overrideGuard(AccessTokenGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(TaskBoardRoleGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<TasksController>(TasksController);
    service = module.get<TasksService>(TasksService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createTask', () => {
    it('gelen veriyi servise iletmeli ve yeni görevi dönmeli', async () => {
      const columnId = 'col-1';
      const userId = 'user-1';

      const dto: CreateTaskDto = {
        title: 'Yeni Görev',
        priority: Priority.HIGH,
        status: TaskStatus.TODO,
        assigneeEmails: [],
      };

      const expectedResult = {
        id: 'task-1',
        title: 'Yeni Görev',
      } as unknown as TaskResponseDto;
      mockTasksService.createTask.mockResolvedValue(expectedResult);

      const result = await controller.createTask(columnId, userId, dto);

      expect(result).toEqual(expectedResult);
      expect(mockTasksService.createTask).toHaveBeenCalledWith(
        columnId,
        userId,
        dto,
      );
    });
  });

  describe('addAssignees', () => {
    it('taskId ve e-posta dizisini servise iletmeli', async () => {
      const taskId = 'task-1';
      const emails = ['test@test.com'];
      const expectedResult = { id: taskId } as unknown as TaskResponseDto;

      mockTasksService.addAssignees.mockResolvedValue(expectedResult);

      const result = await controller.addAssignees(taskId, emails);

      expect(result).toEqual(expectedResult);
      expect(mockTasksService.addAssignees).toHaveBeenCalledWith(
        taskId,
        emails,
      );
    });
  });

  describe('deleteAssignees', () => {
    it('taskId ve silinecek e-posta dizisini servise iletmeli', async () => {
      const taskId = 'task-1';
      const emails = ['test@test.com'];
      const expectedResult = { id: taskId } as unknown as TaskResponseDto;

      mockTasksService.deleteAssignees.mockResolvedValue(expectedResult);

      const result = await controller.deleteAssignees(taskId, emails);

      expect(result).toEqual(expectedResult);
      expect(mockTasksService.deleteAssignees).toHaveBeenCalledWith(
        taskId,
        emails,
      );
    });
  });

  describe('getTaskById', () => {
    it('id parametresini servise iletmeli ve görevi dönmeli', async () => {
      const taskId = 'task-1';
      const expectedResult = {
        id: taskId,
        title: 'Görev',
      } as unknown as TaskResponseDto;

      mockTasksService.getTaskById.mockResolvedValue(expectedResult);

      const result = await controller.getTaskById(taskId);

      expect(result).toEqual(expectedResult);
      expect(mockTasksService.getTaskById).toHaveBeenCalledWith(taskId);
    });
  });

  describe('getAllTasks', () => {
    it('columnId parametresini servise iletmeli', async () => {
      const columnId = 'col-1';
      const expectedResult = [{ id: 'task-1' }] as unknown as TaskResponseDto[];

      mockTasksService.getAllTasks.mockResolvedValue(expectedResult);

      const result = await controller.getAllTasks(columnId);

      expect(result).toEqual(expectedResult);
      expect(mockTasksService.getAllTasks).toHaveBeenCalledWith(columnId);
    });
  });

  describe('calculateTaskProgress', () => {
    it('taskId parametresini servise iletip ilerleme yüzdesini dönmeli', async () => {
      const taskId = 'task-1';
      const expectedResult = { progress: 50 };

      mockTasksService.calculateTaskProgress.mockResolvedValue(expectedResult);

      const result = await controller.calculateTaskProgress(taskId);

      expect(result).toEqual(expectedResult);
      expect(mockTasksService.calculateTaskProgress).toHaveBeenCalledWith(
        taskId,
      );
    });
  });

  describe('reOrder', () => {
    it('sıralama dizisini servise iletmeli', async () => {
      const dto: ReOrderTaskDto[] = [{ id: 'task-1', newOrder: 2 }];
      const expectedResult = [
        { id: 'task-1', order: 2 },
      ] as unknown as TaskResponseDto[];

      mockTasksService.reOrder.mockResolvedValue(expectedResult);

      const result = await controller.reOrder(dto);

      expect(result).toEqual(expectedResult);
      expect(mockTasksService.reOrder).toHaveBeenCalledWith(dto);
    });
  });

  describe('updateTask', () => {
    it('taskId ve güncelleme DTOsunu servise iletmeli', async () => {
      const taskId = 'task-1';
      const dto: UpdateTaskDto = { title: 'Güncel Görev' };
      const expectedResult = {
        id: taskId,
        title: 'Güncel Görev',
      } as unknown as TaskResponseDto;

      mockTasksService.updateTask.mockResolvedValue(expectedResult);

      const result = await controller.updateTask(taskId, dto);

      expect(result).toEqual(expectedResult);
      expect(mockTasksService.updateTask).toHaveBeenCalledWith(taskId, dto);
    });
  });

  describe('updateLead', () => {
    it('boardId, taskId ve lead e-postasını servise iletmeli', async () => {
      const boardId = 'board-1';
      const taskId = 'task-1';
      const email = 'lead@test.com';
      const expectedResult = { id: taskId } as unknown as TaskResponseDto;

      mockTasksService.updateLead.mockResolvedValue(expectedResult);

      const result = await controller.updateLead(boardId, taskId, email);

      expect(result).toEqual(expectedResult);
      expect(mockTasksService.updateLead).toHaveBeenCalledWith(
        boardId,
        taskId,
        email,
      );
    });
  });

  describe('getAssignees', () => {
    it('taskId parametresini servise iletip atananları (assignees) ve lideri (lead) dönmeli', async () => {
      const taskId = 'task-1';
      const expectedResult = {
        lead: { id: 'user-1', name: 'Lead User', email: 'lead@test.com' },
        assignees: [
          { id: 'user-2', name: 'Member User', email: 'member@test.com' },
        ],
      };

      mockTasksService.getAssignees.mockResolvedValue(expectedResult);

      const result = await controller.getAssignees(taskId);

      expect(result).toEqual(expectedResult);
      expect(mockTasksService.getAssignees).toHaveBeenCalledWith(taskId);
    });
  });

  describe('deleteTask', () => {
    it('taskId parametresini servise iletip true dönmeli', async () => {
      const taskId = 'task-1';
      mockTasksService.deleteTask.mockResolvedValue(true);

      const result = await controller.deleteTask(taskId);

      expect(result).toBe(true);
      expect(mockTasksService.deleteTask).toHaveBeenCalledWith(taskId);
    });
  });
});
