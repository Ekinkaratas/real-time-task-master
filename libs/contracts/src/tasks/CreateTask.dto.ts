import { Priority, TaskStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
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
  @ValidateNested({ each: true })
  @Type(() => String)
  @IsNotEmpty()
  assigneeEmails!: string[];
}
