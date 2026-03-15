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
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import {
  CreateTaskDto,
  ReOrderTaskDto,
  TaskResponseDto,
  UpdateTaskDto,
} from 'contracts/tasks';
import { CurrentUser } from '../common/decorator/get-current-user.decorator';
import { AccessTokenGuard } from '../common/guards/access-token.guard';
import { AllExceptionsFilter } from '../filter/rpc-exception.filter';
import { BoardRoles } from '../common/decorator/board-role.decorator';
import { TaskBoardRoleGuard } from '../common/guards/task-board-role.guard';

@ApiTags('tasks')
@UseGuards(AccessTokenGuard, TaskBoardRoleGuard)
@UseFilters(AllExceptionsFilter)
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @BoardRoles('ADMIN', 'OWNER', 'MEMBER')
  @ApiOperation({ summary: 'creates a new task' })
  @Post(':columnId')
  createTask(
    @Param('columnId') columnId: string,
    @CurrentUser('id') userId: string,
    @Body() createTaskDto: CreateTaskDto,
  ): Promise<TaskResponseDto> {
    return this.tasksService.createTask(columnId, userId, createTaskDto);
  }

  @BoardRoles('ADMIN', 'OWNER')
  @ApiOperation({ summary: 'add assignees for task' })
  @Post(':taskId/assignees')
  addAssignees(
    @Param('taskId') taskId: string,
    @Body(new ParseArrayPipe({ items: String }))
    userEmails: string[],
  ): Promise<TaskResponseDto> {
    return this.tasksService.addAssignees(taskId, userEmails);
  }

  @BoardRoles('ADMIN', 'OWNER')
  @ApiOperation({ summary: 'deletes assignees for task' })
  @Post(':taskId/assignees/remove')
  deleteAssignees(
    @Param('taskId') taskId: string,
    @Body(new ParseArrayPipe({ items: String })) userEmails: string[],
  ): Promise<TaskResponseDto> {
    return this.tasksService.deleteAssignees(taskId, userEmails);
  }

  @BoardRoles('ADMIN', 'OWNER', 'MEMBER')
  @ApiOperation({ summary: 'gets a task by ID' })
  @Get(':taskId')
  getTaskById(@Param('taskId') id: string): Promise<TaskResponseDto> {
    return this.tasksService.getTaskById(id);
  }

  @BoardRoles('ADMIN', 'OWNER', 'MEMBER')
  @ApiOperation({ summary: 'gets all tasks for a user' })
  @Get(':columnId/getAllTasks')
  getAllTasks(
    @Param('columnId') columnsId: string,
  ): Promise<TaskResponseDto[]> {
    return this.tasksService.getAllTasks(columnsId);
  }

  @BoardRoles('ADMIN', 'OWNER', 'MEMBER')
  @ApiOperation({ summary: 'gets a task by ID' })
  @Get('/:taskId/progress')
  calculateTaskProgress(@Param('taskId') id: string) {
    return this.tasksService.calculateTaskProgress(id);
  }

  @BoardRoles('ADMIN', 'OWNER', 'MEMBER')
  @ApiOperation({ summary: 'Reorders tasks or moves them between columns' })
  @Patch('/reOrder')
  reOrder(
    @Body(new ParseArrayPipe({ items: ReOrderTaskDto }))
    reOrderTaskDto: ReOrderTaskDto[],
  ): Promise<TaskResponseDto[]> {
    return this.tasksService.reOrder(reOrderTaskDto);
  }

  @BoardRoles('ADMIN', 'OWNER', 'MEMBER')
  @ApiOperation({ summary: 'updates a task by ID' })
  @Patch(':taskId')
  updateTask(
    @Param('taskId') id: string,
    @Body() updateTaskDto: UpdateTaskDto,
  ): Promise<TaskResponseDto> {
    return this.tasksService.updateTask(id, updateTaskDto);
  }

  @BoardRoles('ADMIN', 'OWNER')
  @ApiOperation({ summary: 'update lead for task' })
  @Patch(':taskId/lead')
  updateLead(
    @Param('taskId') taskId: string,
    @Body('email') email: string,
  ): Promise<TaskResponseDto> {
    return this.tasksService.updateLead(taskId, email);
  }

  @BoardRoles('ADMIN', 'OWNER')
  @ApiOperation({ summary: 'deletes a task by ID' })
  @Delete(':taskId')
  deleteTask(@Param('taskId') id: string): Promise<boolean> {
    return this.tasksService.deleteTask(id);
  }
}
