import { Test, TestingModule } from '@nestjs/testing';
import { SubtaskController } from './subtask.controller';
import { SubtaskService } from './subtask.service';

import { AccessTokenGuard } from '../common/guards/access-token.guard';
import { TaskBoardRoleGuard } from '../common/guards/task-board-role.guard';

import { CreateSubTaskDto, SubTasksResponseDto } from 'contracts/subtasks';
import { UpdateSubTaskDto } from 'contracts/subtasks/UpdateSubTask.dto';

describe('SubtaskController', () => {
  let controller: SubtaskController;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let service: SubtaskService;

  const mockSubtaskService = {
    createSubtask: jest.fn(),
    getSubtaskById: jest.fn(),
    updateSubTask: jest.fn(),
    deleteManySubtask: jest.fn(),
    getSubtaskByTaskId: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SubtaskController],
      providers: [
        {
          provide: SubtaskService,
          useValue: mockSubtaskService,
        },
      ],
    })
      .overrideGuard(AccessTokenGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(TaskBoardRoleGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<SubtaskController>(SubtaskController);
    service = module.get<SubtaskService>(SubtaskService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createSubtask', () => {
    it('taskId ve DTO yu servise iletmeli ve yeni alt görevi dönmeli', async () => {
      const taskId = 'task-1';
      const dto: CreateSubTaskDto = {
        title: 'Yeni Alt Görev',
      };

      const expectedResult = {
        id: 'sub-1',
        title: 'Yeni Alt Görev',
      } as unknown as SubTasksResponseDto;

      mockSubtaskService.createSubtask.mockResolvedValue(expectedResult);

      const result = await controller.createSubtask(taskId, dto);

      expect(result).toEqual(expectedResult);
      expect(mockSubtaskService.createSubtask).toHaveBeenCalledWith(
        taskId,
        dto,
      );
    });
  });

  describe('getSubtaskById', () => {
    it('taskId ve subtaskId parametrelerini alıp, servise sadece subtaskId iletmeli', async () => {
      const taskId = 'task-1';
      const subtaskId = 'sub-1';

      const expectedResult = {
        id: subtaskId,
        title: 'Bulunan Alt Görev',
      } as unknown as SubTasksResponseDto;

      mockSubtaskService.getSubtaskById.mockResolvedValue(expectedResult);

      const result = await controller.getSubtaskById(taskId, subtaskId);

      expect(result).toEqual(expectedResult);
      expect(mockSubtaskService.getSubtaskById).toHaveBeenCalledWith(subtaskId);
    });
  });

  describe('getSubtaskByTaskId', () => {
    it('taskId yi servise iletmeli ve alt görev listesini dönmeli', async () => {
      const taskId = 'task-1';

      const expectedResult = [
        { id: 'sub-1', title: 'Alt Görev 1', taskId },
        { id: 'sub-2', title: 'Alt Görev 2', taskId },
      ] as unknown as SubTasksResponseDto[];

      mockSubtaskService.getSubtaskByTaskId.mockResolvedValue(expectedResult);

      const result = await controller.getSubtaskByTaskId(taskId);

      expect(result).toEqual(expectedResult);
      expect(mockSubtaskService.getSubtaskByTaskId).toHaveBeenCalledWith(
        taskId,
      );
    });
  });

  describe('updateSubTask', () => {
    it('subtaskId ve DTO yu servise iletmeli', async () => {
      const taskId = 'task-1';
      const subtaskId = 'sub-1';
      const dto: UpdateSubTaskDto = {
        title: 'Güncel Alt Görev',
        isCompleted: true,
      };

      const expectedResult = {
        id: subtaskId,
        ...dto,
      } as unknown as SubTasksResponseDto;

      mockSubtaskService.updateSubTask.mockResolvedValue(expectedResult);

      const result = await controller.updateSubTask(taskId, subtaskId, dto);

      expect(result).toEqual(expectedResult);
      expect(mockSubtaskService.updateSubTask).toHaveBeenCalledWith(
        subtaskId,
        dto,
      );
    });
  });

  describe('deleteManySubtask', () => {
    it('BoardId ve silinecek alt görev ID dizisini servise iletmeli', async () => {
      const boardId = 'board-1';
      const subtasksIds = ['sub-1', 'sub-2'];
      const expectedResult = { message: 'Subtasks deleted successfully' };

      mockSubtaskService.deleteManySubtask.mockResolvedValue(expectedResult);

      const result = await controller.deleteManySubtask(boardId, subtasksIds);

      expect(result).toEqual(expectedResult);
      expect(mockSubtaskService.deleteManySubtask).toHaveBeenCalledWith(
        boardId,
        subtasksIds,
      );
    });
  });
});
