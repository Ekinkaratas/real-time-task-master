import { IsEnum, IsOptional, IsString } from 'class-validator';
import { Priority, TaskStatus } from '@prisma/client';

export class UpdateTaskDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(TaskStatus)
  @IsOptional()
  taskStatus?: TaskStatus;

  @IsEnum(Priority)
  @IsOptional()
  priority?: Priority;
}
