import { Module } from '@nestjs/common';
import { ColumnsController } from './columns.controller';
import { ColumnsService } from './columns.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { BoardGateway } from 'src/events/board.gateway';

@Module({
  imports: [PrismaModule, BoardGateway],
  controllers: [ColumnsController],
  providers: [ColumnsService],
})
export class ColumnsModule {}
