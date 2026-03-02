import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseArrayPipe,
  Patch,
  Post,
  UseFilters,
  UseGuards,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ColumnsService } from './columns.service';
import { AccessTokenGuard } from 'src/common/guards/access-token.guard';
import { AllExceptionsFilter } from 'src/filter/rpc-exception.filter';
import { BoardRoleGuard } from 'src/common/guards/board-role.guard';
import { BoardRoles } from 'src/common/decorator/board-role.decorator';
import { ColumnResponseDto, ReorderColumnDto } from 'contracts/columns';

@ApiTags('columns')
@UseGuards(AccessTokenGuard)
@UseFilters(AllExceptionsFilter)
@Controller('columns')
export class ColumnsController {
  constructor(private readonly columnsService: ColumnsService) {}

  @ApiOperation({ summary: 'Create a new column for a specific board' })
  @ApiBody({ schema: { example: { title: 'To Do' } } })
  @UseGuards(BoardRoleGuard)
  @BoardRoles('ADMIN', 'OWNER')
  @Post('/:boardId')
  createColumn(
    @Param('boardId') boardId: string,
    @Body('title') title: string,
  ): Promise<ColumnResponseDto> {
    return this.columnsService.createColumn(boardId, title);
  }

  @UseGuards(BoardRoleGuard)
  @BoardRoles('ADMIN', 'OWNER', 'MEMBER')
  @Get('/:boardId')
  getAllColumns(@Param('boardId') boardId: string) {
    return this.columnsService.getAllColumns(boardId);
  }

  @ApiOperation({ summary: 'Reorder columns in a board' })
  @UseGuards(BoardRoleGuard)
  @BoardRoles('ADMIN', 'OWNER', 'MEMBER')
  @Patch('/:boardId/reorder')
  reorder(
    @Param('boardId') boardId: string,
    @Body(new ParseArrayPipe({ items: ReorderColumnDto }))
    dtoList: ReorderColumnDto[],
  ): Promise<ColumnResponseDto[]> {
    return this.columnsService.reorderColumns(boardId, dtoList);
  }

  @ApiOperation({ summary: 'Update a column for a specific board' })
  @ApiBody({ schema: { example: { title: 'In Progress' } } })
  @UseGuards(BoardRoleGuard)
  @BoardRoles('ADMIN', 'OWNER')
  @Patch('/:boardId/:columnId')
  updateColumn(
    @Param('boardId') boardId: string,
    @Param('columnId') columnId: string,
    @Body('title') title: string,
  ): Promise<ColumnResponseDto> {
    return this.columnsService.updateColumn(columnId, boardId, title);
  }

  @ApiOperation({ summary: 'Delete multiple columns from a board' })
  @ApiBody({ type: [String], description: 'Array of Column IDs to delete' })
  @UseGuards(BoardRoleGuard)
  @BoardRoles('ADMIN', 'OWNER')
  @Delete('/:boardId/bulk')
  deleteManyColumns(
    @Param('boardId') boardId: string,
    @Body(new ParseArrayPipe({ items: String }))
    columnIds: string[],
  ): Promise<ColumnResponseDto[]> {
    return this.columnsService.deleteManyColumns(boardId, columnIds);
  }
}
