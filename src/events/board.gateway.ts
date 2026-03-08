import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';

import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL
      ? process.env.FRONTEND_URL.split(',')
      : '*',
    credentials: true,
  },
  namespace: 'board-events',
})
export class BoardGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  handleConnection(client: Socket) {
    console.log(`One connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Connection lost: ${client.id}`);
  }

  @SubscribeMessage('joinBoard')
  async handleJoinBoard(
    @MessageBody() boardId: string,
    @ConnectedSocket() client: Socket,
  ) {
    await client.join(boardId);
    console.log(`User with ID ${client.id} joined board ${boardId}.`);
  }

  broadcastBoardCreated(boardId: string, board: any) {
    this.server.to(boardId).emit('boardCreated', board);
  }

  broadcastBoardUpdate(boardId: string, board: any) {
    this.server.to(boardId).emit('boardUpdated', board);
  }

  broadcastBoardDelete(boardId: string) {
    this.server.to(boardId).emit('boardsDeleted', boardId);
  }

  broadcastColumnCreated(boardId: string, column: any) {
    this.server.to(boardId).emit('columnCreated', column);
  }

  broadcastColumnUpdate(boardId: string, column: any) {
    this.server.to(boardId).emit('columnUpdated', column);
  }

  broadcastColumnReorder(boardId: string, column: any[]) {
    this.server.to(boardId).emit('columnReorder', column);
  }

  broadcastColumnDelete(boardId: string, deletedColumnIds: string[]) {
    this.server.to(boardId).emit('columnsDeleted', deletedColumnIds);
  }

  broadcastTaskCreated(boardId: string, task: any) {
    this.server.to(boardId).emit('taskCreated', task);
  }

  broadcastTaskUpdate(boardId: string, task: any) {
    this.server.to(boardId).emit('taskUpdated', task);
  }

  broadcastTaskDeleted(boardId: string, taskId: string) {
    this.server.to(boardId).emit('taskDeleted', taskId);
  }

  broadcastTaskReordered(boardId: string, tasks: any[]) {
    this.server.to(boardId).emit('tasksReordered', tasks);
  }

  broadcastSubtaskCreated(boardId: string, subtask: any) {
    this.server.to(boardId).emit('subtaskCreated', subtask);
  }

  broadcastSubtaskUpdate(boardId: string, updateSubtask: any) {
    this.server.to(boardId).emit('subtaskUpdated', updateSubtask);
  }

  broadcastSubtaskDelete(boardId: string, deleteSubtask: any) {
    this.server.to(boardId).emit('subtaskDelete', deleteSubtask);
  }
}
