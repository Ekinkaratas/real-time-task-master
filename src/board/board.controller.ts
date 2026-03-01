import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { BoardService } from './board.service';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AllExceptionsFilter } from 'src/filter/rpc-exception.filter';
import { BoardRoleGuard } from 'src/common/guards/board-role.guard';
import { AccessTokenGuard } from 'src/common/guards/access-token.guard';
import { BoardRoles } from 'src/common/decorator/board-role.decorator';
import { CurrentUser } from 'src/common/decorator/get-current-user.decorator';
import {
  AddMemberDto,
  CreateBoardDto,
  UpdateToBoardDto,
} from 'contracts/my-library';

@ApiTags('board')
@UseFilters(new AllExceptionsFilter())
@UseGuards(AccessTokenGuard)
@Controller('board')
export class BoardController {
  constructor(private readonly service: BoardService) {}

  @ApiOperation({ summary: 'Board created successfully' })
  @ApiBody({ type: CreateBoardDto })
  @Post('/')
  createBoard(
    @Body() createBoardDto: CreateBoardDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.service.createBoard(createBoardDto, userId);
  }

  @ApiOperation({ summary: 'Board user added successfully' })
  @ApiBody({ type: AddMemberDto })
  @UseGuards(BoardRoleGuard)
  @BoardRoles('ADMIN', 'OWNER') // Only users with ADMIN and OWNER roles can access this endpoint
  @Post('/:boardId/add-user')
  addedUserToBoard(
    @Param('boardId') boardId: string,
    @Body() user: AddMemberDto,
  ) {
    return this.service.BoardsAddUser(boardId, user);
  }

  @ApiOperation({ summary: 'Board user removed successfully' })
  @UseGuards(BoardRoleGuard)
  @BoardRoles('ADMIN', 'OWNER')
  @Delete('/:boardId/remove-user')
  removeUserFromBoard(
    @Param('boardId') boardId: string,
    @Body('email') userEmail: string,
  ) {
    return this.service.removeUserFromBoard(boardId, userEmail);
  }

  @ApiOperation({ summary: 'Board invitation accepted successfully' })
  @Patch(':boardId/invitation/accept')
  acceptInvitation(
    @Param('boardId') boardId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.service.acceptInvitation(boardId, userId);
  }

  @ApiOperation({ summary: 'Board invitation rejected successfully' })
  @Patch(':boardId/invitation/reject')
  rejectInvitation(
    @Param('boardId') boardId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.service.rejectInvitation(boardId, userId);
  }

  @ApiOperation({ summary: 'Get all boards for user' })
  @Get()
  getBoardForUser(@CurrentUser('id') userId: string) {
    return this.service.getBoardForUser(userId);
  }

  @UseGuards(BoardRoleGuard)
  @BoardRoles('ADMIN', 'OWNER', 'MEMBER')
  @Get('/:boardId')
  getfindOneBoard(@Param('boardId') boardId: string) {
    return this.service.findOneBoard(boardId);
  }

  @Get('/search/:title')
  getSearchBoardByTitle(
    @Param('title') title: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.service.searchBoardsByTitle(title, userId);
  }

  @ApiOperation({ summary: 'Board updated successfully' })
  @ApiBody({ type: UpdateToBoardDto })
  @UseGuards(BoardRoleGuard)
  @BoardRoles('ADMIN', 'OWNER')
  @Patch('/:boardId')
  updateBoard(
    @Param('boardId') boardId: string,
    @Body() updateBoardDto: UpdateToBoardDto,
  ) {
    return this.service.updateBoard(boardId, updateBoardDto);
  }

  @ApiOperation({ summary: 'Board deleted successfully' })
  @UseGuards(BoardRoleGuard)
  @BoardRoles('OWNER')
  @Delete('/:boardId')
  deleteBoard(@Param('boardId') boardId: string) {
    return this.service.deleteBoard(boardId);
  }
}
