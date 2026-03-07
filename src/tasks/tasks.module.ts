import { Module } from '@nestjs/common';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { UserModule } from 'src/user/user.module';
import { BoardGateway } from 'src/events/board.gateway';

@Module({
  imports: [PrismaModule, UserModule, BoardGateway],
  controllers: [TasksController],
  providers: [TasksService],
})
export class TasksModule {}
