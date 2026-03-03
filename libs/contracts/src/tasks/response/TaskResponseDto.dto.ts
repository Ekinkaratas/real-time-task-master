import { Priority, TaskStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { SubTasksResponseDto } from 'contracts/subtasks';
import { AssigneeResponseDto } from './AssigneeResponse.dto';

export class TaskResponseDto {
  @IsUUID()
  @IsNotEmpty()
  id!: string;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsOptional()
  description!: string;

  @IsNumber()
  @IsNotEmpty()
  order!: number;

  @IsString()
  @IsNotEmpty()
  leadAssigneeId!: string | null;

  @IsEnum(Priority)
  @IsNotEmpty()
  priority!: Priority;

  @IsEnum(TaskStatus)
  @IsNotEmpty()
  taskStatus!: TaskStatus;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AssigneeResponseDto)
  @IsNotEmpty()
  assignees?: AssigneeResponseDto[];

  @IsOptional()
  @Type(() => SubTasksResponseDto)
  @IsArray()
  @ValidateNested({ each: true })
  subtasks?: SubTasksResponseDto[];
}
