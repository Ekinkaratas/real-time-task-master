import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { UserResponse } from 'contracts/User';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL
      ? process.env.FRONTEND_URL.split(',')
      : '*',
    credentials: true,
  },
  namespace: 'user-events',
})
export class UserGateway implements OnGatewayDisconnect, OnGatewayConnection {
  @WebSocketServer()
  server!: Server;

  handleConnection(client: Socket) {
    console.log(`One connected UserGateway: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`One disconnect UserGateway: ${client.id}`);
  }

  @SubscribeMessage('joinUser')
  async handleJoinUser(
    @MessageBody() userId: string,
    @ConnectedSocket() client: Socket,
  ) {
    const roomName = `user-room-${userId}`;
    await client.join(roomName);
    console.log(
      `User with Socket ID ${client.id} joined personal room: ${roomName}`,
    );
  }

  broadcastUserUpdated(userId: string, updatedUser: Partial<UserResponse>) {
    this.server.emit('userUpdated', {
      userId,
      ...updatedUser,
    });
  }

  broadcastUserDeleted(userId: string) {
    this.server.emit('userDeleted', {
      userId,
      message: 'User account has been anonymized.',
    });
  }

  broadcastToUser(userId: string, eventName: string, payload: any) {
    this.server.to(`user-room-${userId}`).emit(eventName, payload);
  }
}
