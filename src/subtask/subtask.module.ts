import { Module } from '@nestjs/common';
import { SubtaskController } from './subtask.controller';
import { SubtaskService } from './subtask.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { GatewayModule } from 'src/events/gateway.module';

@Module({
  imports: [PrismaModule, GatewayModule],
  controllers: [SubtaskController],
  providers: [SubtaskService],
})
export class SubtaskModule {}
