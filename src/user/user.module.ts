import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { GatewayModule } from 'src/events/gateway.module';

@Module({
  imports: [PrismaModule, GatewayModule],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
