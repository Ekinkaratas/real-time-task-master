import {
  Body,
  Controller,
  Param,
  Patch,
  Post,
  Req,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AllExceptionsFilter } from '../filter/rpc-exception.filter';
import { RefreshTokenGuard } from '../common/guards/refresh-token.guard';
import { CurrentUser } from '../common/decorator/get-current-user.decorator';
import { AccessTokenGuard } from '../common/guards/access-token.guard';
import {
  authClientResponseDto,
  authLogin,
  authRegisterDto,
  tokensPayload,
  UpdatePasswordDto,
} from 'contracts/Auth';

@ApiTags('auth')
@UseFilters(new AllExceptionsFilter())
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({ summary: 'creates a new user' })
  @Post('/R')
  register(@Body() dto: authRegisterDto): Promise<authClientResponseDto> {
    return this.authService.register(dto);
  }

  @ApiOperation({ summary: 'user information is verified' })
  @Post('/L')
  login(@Body() dto: authLogin): Promise<authClientResponseDto> {
    return this.authService.login(dto);
  }

  @ApiOperation({ summary: 'updates user tokens' })
  @UseGuards(AccessTokenGuard)
  @Post('/newTokens')
  updateTokens(
    @CurrentUser() user: tokensPayload,
  ): Promise<authClientResponseDto> {
    return this.authService.updateTokens(user);
  }

  @ApiOperation({ summary: 'updates user access token' })
  @UseGuards(RefreshTokenGuard)
  @Post('/newAccessToken')
  updateAccessToken(
    @CurrentUser('id') userId: string,
    @Req() req: Request,
  ): Promise<{ access_token: string }> {
    return this.authService.updateAccessToken(
      userId,
      req['refreshToken'] as string,
    );
  }

  @Post('/forgot-password')
  forgotPassword(@Body('email') email: string): Promise<{ message: string }> {
    return this.authService.forgotPassword(email);
  }

  @Post('/reset-password/:token')
  resetPassword(
    @Param('token') token: string,
    @Body('newPassword') newPassword: string,
  ): Promise<{ message: string }> {
    return this.authService.resetPassword(token, newPassword);
  }

  @UseGuards(AccessTokenGuard)
  @Patch('/update-password')
  updatePassword(
    @CurrentUser('id') userId: string,
    @Body() UpdatePasswordDto: UpdatePasswordDto,
  ): Promise<{ message: string }> {
    return this.authService.updatePassword(userId, UpdatePasswordDto);
  }
}
