import { Module } from '@nestjs/common';
import { BoardController } from './board.controller';
import { BoardService } from './board.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { UserModule } from 'src/user/user.module';
import { BoardGateway } from 'src/events/board.gateway';

@Module({
  imports: [PrismaModule, UserModule, BoardGateway],
  controllers: [BoardController],
  providers: [BoardService],
})
export class BoardModule {}
