import { Injectable } from '@nestjs/common';
// import { TaskStatus } from '@prisma/client';
// import { createTaskDto } from 'contracts/my-library/tasks';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}
  /*
  async createTask(createTaskDto: createTaskDto): Promise<void> {
    try {
      const task = await this.prisma.task.create({
        data: {
          ...createTaskDto,
          taskStatus: createTaskDto.status ?? TaskStatus.TODO,
          description:
            createTaskDto.description ?? 'No description has been added yet',
        },
      });
    } catch (error) {
      console.error('Error creating task:', error);
      throw new InternalServerErrorException('Task could not be created');
    }
  }
  getAllTasks() {}
  getTaskById(id: string) {}
  updateTask(id: string) {}
  deleteTask(id: string) {}
  */
}
