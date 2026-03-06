import { Module } from '@nestjs/common';
import { SubtaskController } from './subtask.controller';
import { SubtaskService } from './subtask.service';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SubtaskController],
  providers: [SubtaskService],
})
export class SubtaskModule {}
