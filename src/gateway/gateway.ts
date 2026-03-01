import {
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({ namespace: 'gateway' })
export class Gateway {
  @WebSocketServer()
  server!: Server;

  @SubscribeMessage('inMessage')
  handleMessage(@MessageBody() data: unknown): any {
    this.server.emit('outMessage', data);
  }
}
