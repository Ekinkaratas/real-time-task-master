import {
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UserResponse } from 'contracts/User';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

interface JwtPayload {
  id: string;
  email: string;
}

interface AuthenticatedSocket extends Socket {
  data: {
    user?: JwtPayload;
  };
}

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

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token =
        (client.handshake.auth?.token as string | undefined) ||
        client.handshake.headers?.authorization?.split(' ')[1];

      if (!token) {
        console.log(`Connection rejected (No token): ${client.id}`);
        client.disconnect();
        return;
      }

      const secret = this.configService.get<string>('ACCESS_TOKEN_KEY');
      if (!secret) {
        console.error('JWT Secret is not defined in environment variables.');
        client.disconnect();
        return;
      }

      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: secret,
      });

      client.data.user = payload;
      console.log(`User connected: ${client.id}, User ID: ${payload.id}`);
    } catch {
      console.log(`Connection rejected (Invalid token): ${client.id}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    console.log(`One disconnect UserGateway: ${client.id}`);
  }

  @SubscribeMessage('joinUser')
  async handleJoinUser(@ConnectedSocket() client: AuthenticatedSocket) {
    const userId = client.data.user?.id;

    if (!userId) {
      return;
    }

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

  broadcastToUser(userId: string, eventName: string, payload: unknown) {
    this.server.to(`user-room-${userId}`).emit(eventName, payload);
  }
}
