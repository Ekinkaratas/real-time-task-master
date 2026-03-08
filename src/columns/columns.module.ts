import { Module } from '@nestjs/common';
import { ColumnsController } from './columns.controller';
import { ColumnsService } from './columns.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { GatewayModule } from 'src/events/gateway.module';

@Module({
  imports: [PrismaModule, GatewayModule],
  controllers: [ColumnsController],
  providers: [ColumnsService],
})
export class ColumnsModule {}
