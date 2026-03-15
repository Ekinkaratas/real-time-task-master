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
import { CreateSubTaskDto, SubTasksResponseDto } from 'contracts/subtasks';
import { SubtaskService } from './subtask.service';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AccessTokenGuard } from '../common/guards/access-token.guard';
import { AllExceptionsFilter } from '../filter/rpc-exception.filter';
import { TaskBoardRoleGuard } from '../common/guards/task-board-role.guard';
import { BoardRoles } from '../common/decorator/board-role.decorator';
import { UpdateSubTaskDto } from 'contracts/subtasks/UpdateSubTask.dto';

@ApiTags('subtask')
@UseGuards(AccessTokenGuard, TaskBoardRoleGuard)
@UseFilters(AllExceptionsFilter)
@Controller('subtask')
export class SubtaskController {
  constructor(private readonly service: SubtaskService) {}

  @ApiOperation({ summary: 'creates a new subtask' })
  @BoardRoles('ADMIN', 'OWNER', 'MEMBER')
  @Post('/:taskId')
  createSubtask(
    @Param('taskId') taskId: string,
    @Body() createSubTaskDto: CreateSubTaskDto,
  ): Promise<SubTasksResponseDto> {
    return this.service.createSubtask(taskId, createSubTaskDto);
  }

  @ApiOperation({ summary: 'get all subtask by taskId' })
  @BoardRoles('ADMIN', 'OWNER', 'MEMBER')
  @Get('/list/:taskId')
  getSubtaskByTaskId(
    @Param('taskId') taskId: string,
  ): Promise<SubTasksResponseDto[]> {
    return this.service.getSubtaskByTaskId(taskId);
  }

  @ApiOperation({ summary: 'get a subtask by id' })
  @BoardRoles('ADMIN', 'OWNER', 'MEMBER')
  @Get('/detail/:taskId/:subtaskId')
  getSubtaskById(
    @Param('taskId') taskId: string,
    @Param('subtaskId') subtaskId: string,
  ): Promise<SubTasksResponseDto> {
    return this.service.getSubtaskById(subtaskId);
  }

  @ApiOperation({ summary: 'update a subtask' })
  @BoardRoles('ADMIN', 'OWNER', 'MEMBER')
  @Patch('/:taskId/:subtaskId')
  updateSubTask(
    @Param('taskId') taskId: string,
    @Param('subtaskId') subtaskId: string,
    @Body() updateSubTaskDto: UpdateSubTaskDto,
  ): Promise<SubTasksResponseDto> {
    return this.service.updateSubTask(subtaskId, updateSubTaskDto);
  }

  @ApiOperation({ summary: 'delete a subtask' })
  @BoardRoles('ADMIN', 'OWNER')
  @Delete('/:BoardId')
  deleteManySubtask(
    @Param('BoardId') BoardId: string,
    @Body(new ParseArrayPipe({ items: String })) subtasksIds: string[],
  ) {
    return this.service.deleteManySubtask(BoardId, subtasksIds);
  }
}
