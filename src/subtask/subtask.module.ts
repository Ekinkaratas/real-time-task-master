import { Module } from '@nestjs/common';
import { SubtaskController } from './subtask.controller';
import { SubtaskService } from './subtask.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { BoardGateway } from 'src/events/board.gateway';

@Module({
  imports: [PrismaModule, BoardGateway],
  controllers: [SubtaskController],
  providers: [SubtaskService],
})
export class SubtaskModule {}
