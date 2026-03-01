import {
  Body,
  Controller,
  Post,
  Req,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import {
  authClientResponseDto,
  authLogin,
  authRegisterDto,
  tokensPayload,
} from 'contracts/my-library';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AllExceptionsFilter } from 'src/filter/rpc-exception.filter';
import { RefreshTokenGuard } from '../common/guards/refresh-token.guard';
import { CurrentUser } from '../common/decorator/get-current-user.decorator';
import { AccessTokenGuard } from '../common/guards/access-token.guard';

@ApiTags('auth')
@UseFilters(new AllExceptionsFilter())
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('/r')
  @ApiOperation({ summary: 'creates a new user' })
  register(@Body() dto: authRegisterDto): Promise<authClientResponseDto> {
    return this.authService.register(dto);
  }

  @Post('/L')
  @ApiOperation({ summary: 'user information is verified' })
  login(@Body() dto: authLogin): Promise<authClientResponseDto> {
    return this.authService.login(dto);
  }

  @UseGuards(AccessTokenGuard)
  @Post('/newTokens')
  @ApiOperation({ summary: 'updates user tokens' })
  updateTokens(
    @CurrentUser() user: tokensPayload,
  ): Promise<authClientResponseDto> {
    return this.authService.updateTokens(user);
  }

  @UseGuards(RefreshTokenGuard)
  @Post('/newAccessToken')
  @ApiOperation({ summary: 'updates user access token' })
  updateAccessToken(
    @CurrentUser('id') userId: string,
    @Req() req: Request,
  ): Promise<{ access_token: string }> {
    return this.authService.updateAccessToken(
      userId,
      req['refreshToken'] as string,
    );
  }
}
