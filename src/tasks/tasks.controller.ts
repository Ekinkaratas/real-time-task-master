import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { TasksService } from './tasks.service';

@ApiTags('tasks')
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}
  /*
  @Post()
  @ApiOperation({ summary: 'creates a new task' })
  createTask(@Body() createTaskDto: createTaskDto) {
    return this.tasksService.createTask(createTaskDto);
  }

  @Get('')
  @ApiOperation({ summary: 'gets all tasks for a user' })
  getAllTasks() {
    return this.tasksService.getAllTasks();
  }

  @Get(':id')
  @ApiOperation({ summary: 'gets a task by ID' })
  getTaskById(@Param('id') id: string) {
    return this.tasksService.getTaskById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'updates a task by ID' })
  updateTask(@Param('id') id: string) {
    return this.tasksService.updateTask(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'deletes a task by ID' })
  deleteTask(@Param('id') id: string) {
    return this.tasksService.deleteTask(id);
  }
 */
}
