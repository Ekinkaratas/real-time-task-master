import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { UserModule } from 'src/user/user.module';
import { RedisModule } from 'src/redis/redis.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    JwtModule.register({
      global: true,
    }),
    ConfigModule,
    UserModule,
    RedisModule,
  ],
  providers: [AuthService],
  controllers: [AuthController],
})
export class AuthModule {}
