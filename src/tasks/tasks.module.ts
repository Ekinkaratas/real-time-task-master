import { Module } from '@nestjs/common';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { UserModule } from 'src/user/user.module';
import { GatewayModule } from 'src/events/gateway.module';

@Module({
  imports: [PrismaModule, UserModule, GatewayModule],
  controllers: [TasksController],
  providers: [TasksService],
})
export class TasksModule {}
