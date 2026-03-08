import { Module } from '@nestjs/common';
import { BoardGateway } from './board.gateway';
import { UserGateway } from './user.gateway';

@Module({
  providers: [BoardGateway, UserGateway],
  exports: [BoardGateway, UserGateway],
})
export class GatewayModule {}
