/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { Test, TestingModule } from '@nestjs/testing';
import { BoardGateway } from './board.gateway';
import { Socket } from 'socket.io';

describe('BoardGateway', () => {
  let gateway: BoardGateway;

  let emitMock: jest.Mock;
  let toMock: jest.Mock;
  let mockSocket: Partial<Socket>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BoardGateway],
    }).compile();

    gateway = module.get<BoardGateway>(BoardGateway);

    emitMock = jest.fn();
    toMock = jest.fn().mockReturnValue({ emit: emitMock });

    gateway.server = {
      to: toMock,
    } as any;

    mockSocket = {
      id: 'test-socket-123',
      join: jest.fn().mockResolvedValue(undefined),
    };

    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Bağlanti ve Yaşam Döngüsü (Lifecycle)', () => {
    it('Birisi bağlandiğinda (handleConnection) log atmali', () => {
      gateway.handleConnection(mockSocket as Socket);
      expect(console.log).toHaveBeenCalledWith(
        `One connected: test-socket-123`,
      );
    });

    it('Bağlanti koptuğunda (handleDisconnect) log atmali', () => {
      gateway.handleDisconnect(mockSocket as Socket);
      expect(console.log).toHaveBeenCalledWith(
        `Connection lost: test-socket-123`,
      );
    });
  });

  describe('Mesaj Dinleyicileri (SubscribeMessage)', () => {
    it('joinBoard mesaji geldiğinde kullaniciyi odaya eklemeli (join)', async () => {
      const boardId = 'board-1';
      await gateway.handleJoinBoard(boardId, mockSocket as Socket);

      expect(mockSocket.join).toHaveBeenCalledWith(boardId);
      expect(console.log).toHaveBeenCalledWith(
        `User with ID test-socket-123 joined board board-1.`,
      );
    });
  });

  describe('Board (Pano) Yayinlari', () => {
    const boardId = 'board-1';
    const fakeData = { id: boardId, title: 'Test Panosu' };

    it('broadcastBoardCreated yayinini doğru yapmali', () => {
      gateway.broadcastBoardCreated(boardId, fakeData);
      expect(toMock).toHaveBeenCalledWith(boardId);
      expect(emitMock).toHaveBeenCalledWith('boardCreated', fakeData);
    });

    it('broadcastBoardUpdate yayinini doğru yapmali', () => {
      gateway.broadcastBoardUpdate(boardId, fakeData);
      expect(toMock).toHaveBeenCalledWith(boardId);
      expect(emitMock).toHaveBeenCalledWith('boardUpdated', fakeData);
    });

    it('broadcastBoardDelete yayinini doğru yapmali', () => {
      gateway.broadcastBoardDelete(boardId);
      expect(toMock).toHaveBeenCalledWith(boardId);
      expect(emitMock).toHaveBeenCalledWith('boardsDeleted', boardId);
    });
  });

  describe('Column (Sütun) Yayinlari', () => {
    const boardId = 'board-1';
    const fakeColumn = { id: 'col-1', title: 'To Do' };

    it('broadcastColumnCreated yayinini doğru yapmali', () => {
      gateway.broadcastColumnCreated(boardId, fakeColumn);
      expect(toMock).toHaveBeenCalledWith(boardId);
      expect(emitMock).toHaveBeenCalledWith('columnCreated', fakeColumn);
    });

    it('broadcastColumnUpdate yayinini doğru yapmali', () => {
      gateway.broadcastColumnUpdate(boardId, fakeColumn);
      expect(toMock).toHaveBeenCalledWith(boardId);
      expect(emitMock).toHaveBeenCalledWith('columnUpdated', fakeColumn);
    });

    it('broadcastColumnReorder yayinini doğru yapmali', () => {
      const reorderedColumns = [fakeColumn];
      gateway.broadcastColumnReorder(boardId, reorderedColumns);
      expect(toMock).toHaveBeenCalledWith(boardId);
      expect(emitMock).toHaveBeenCalledWith('columnReorder', reorderedColumns);
    });

    it('broadcastColumnDelete yayinini doğru yapmali', () => {
      const deletedIds = ['col-1', 'col-2'];
      gateway.broadcastColumnDelete(boardId, deletedIds);
      expect(toMock).toHaveBeenCalledWith(boardId);
      expect(emitMock).toHaveBeenCalledWith('columnsDeleted', deletedIds);
    });
  });

  describe('Task (Görev) Yayinlari', () => {
    const boardId = 'board-1';
    const fakeTask = { id: 'task-1', title: 'Arayüzü Çiz' };

    it('broadcastTaskCreated yayinini doğru yapmali', () => {
      gateway.broadcastTaskCreated(boardId, fakeTask);
      expect(toMock).toHaveBeenCalledWith(boardId);
      expect(emitMock).toHaveBeenCalledWith('taskCreated', fakeTask);
    });

    it('broadcastTaskUpdate yayinini doğru yapmali', () => {
      gateway.broadcastTaskUpdate(boardId, fakeTask);
      expect(toMock).toHaveBeenCalledWith(boardId);
      expect(emitMock).toHaveBeenCalledWith('taskUpdated', fakeTask);
    });

    it('broadcastTaskDeleted yayinini doğru yapmali', () => {
      gateway.broadcastTaskDeleted(boardId, 'task-1');
      expect(toMock).toHaveBeenCalledWith(boardId);
      expect(emitMock).toHaveBeenCalledWith('taskDeleted', 'task-1');
    });

    it('broadcastTaskReordered yayinini doğru yapmali', () => {
      const reorderedTasks = [fakeTask];
      gateway.broadcastTaskReordered(boardId, reorderedTasks);
      expect(toMock).toHaveBeenCalledWith(boardId);
      expect(emitMock).toHaveBeenCalledWith('tasksReordered', reorderedTasks);
    });
  });

  describe('Subtask (Alt Görev) Yayinlari', () => {
    const boardId = 'board-1';
    const fakeSubtask = { id: 'sub-1', title: 'Buton Rengi' };

    it('broadcastSubtaskCreated yayinini doğru yapmali', () => {
      gateway.broadcastSubtaskCreated(boardId, fakeSubtask);
      expect(toMock).toHaveBeenCalledWith(boardId);
      expect(emitMock).toHaveBeenCalledWith('subtaskCreated', fakeSubtask);
    });

    it('broadcastSubtaskUpdate yayinini doğru yapmali', () => {
      gateway.broadcastSubtaskUpdate(boardId, fakeSubtask);
      expect(toMock).toHaveBeenCalledWith(boardId);
      expect(emitMock).toHaveBeenCalledWith('subtaskUpdated', fakeSubtask);
    });
  });
});
