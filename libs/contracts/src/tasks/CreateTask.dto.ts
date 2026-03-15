import { Priority, TaskStatus } from '@prisma/client';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateTaskDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(Priority)
  @IsNotEmpty()
  priority!: Priority;

  @IsEnum(TaskStatus)
  @IsOptional()
  status?: TaskStatus;

  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  assigneeEmails!: string[];
}
