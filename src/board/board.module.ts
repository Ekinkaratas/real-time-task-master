import { Module } from '@nestjs/common';
import { BoardController } from './board.controller';
import { BoardService } from './board.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { UserModule } from 'src/user/user.module';
import { GatewayModule } from 'src/events/gateway.module';

@Module({
  imports: [PrismaModule, UserModule, GatewayModule],
  controllers: [BoardController],
  providers: [BoardService],
})
export class BoardModule {}
