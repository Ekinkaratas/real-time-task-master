import { Test, TestingModule } from '@nestjs/testing';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { TaskStatus, Priority } from '@prisma/client';
import { AccessTokenGuard } from '../common/guards/access-token.guard';
import { TaskBoardRoleGuard } from '../common/guards/task-board-role.guard';
import { CreateTaskDto, TaskResponseDto } from 'contracts/tasks';

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
    reOrder: jest.fn(),
    updateTask: jest.fn(),
    updateLead: jest.fn(),
    deleteTask: jest.fn(),
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

  describe('getTaskById', () => {
    it('id parametresini servise iletmeli ve görevi dönmeli', async () => {
      const taskId = 'task-1';
      const expectedResult = {
        id: taskId,
        title: 'Mevcut Görev',
      } as unknown as TaskResponseDto;

      mockTasksService.getTaskById.mockResolvedValue(expectedResult);

      const result = await controller.getTaskById(taskId);

      expect(result).toEqual(expectedResult);
      expect(mockTasksService.getTaskById).toHaveBeenCalledWith(taskId);
    });
  });

  describe('deleteTask', () => {
    it('id parametresini servise iletmeli ve true dönmeli', async () => {
      const taskId = 'task-1';
      mockTasksService.deleteTask.mockResolvedValue(true);

      const result = await controller.deleteTask(taskId);

      expect(result).toBe(true);
      expect(mockTasksService.deleteTask).toHaveBeenCalledWith(taskId);
    });
  });

  describe('addAssignees', () => {
    it('task ID ve e-posta dizisini servise iletmeli', async () => {
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
});
