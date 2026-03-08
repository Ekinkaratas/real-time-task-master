import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Query,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { UserService } from './user.service';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorator/get-current-user.decorator';
import { AllExceptionsFilter } from '../filter/rpc-exception.filter';
import { AccessTokenGuard } from '../common/guards/access-token.guard';
import {
  UserResponse,
  UserSearchResponseDto,
  UserUpdateDto,
} from 'contracts/User';

@ApiTags('user')
@UseFilters(AllExceptionsFilter)
@UseGuards(AccessTokenGuard)
@Controller('user')
export class UserController {
  constructor(private readonly service: UserService) {}

  @ApiOperation({ summary: 'get user by Id' })
  @Get('me')
  getUserById(@CurrentUser('id') userId: string): Promise<UserResponse> {
    return this.service.getUserById(userId);
  }

  @ApiOperation({ summary: 'Search users by email or name' })
  @Get('search')
  searchUsers(@Query('query') query: string): Promise<UserSearchResponseDto[]> {
    return this.service.searchUsers(query);
  }

  @ApiOperation({ summary: 'update user by Id' })
  @Patch('me')
  userUpdate(
    @CurrentUser('id') userId: string,
    @Body() userUpdateDto: UserUpdateDto,
  ): Promise<{ message: string }> {
    return this.service.updateUser(userId, userUpdateDto);
  }

  @ApiOperation({ summary: 'Delete current user account' })
  @Delete('')
  deleteAccount(
    @CurrentUser('id') userId: string,
  ): Promise<{ message: string }> {
    return this.service.deleteAccount(userId);
  }
}
