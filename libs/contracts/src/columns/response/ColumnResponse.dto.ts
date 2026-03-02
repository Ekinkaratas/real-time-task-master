import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { TaskCreateResponseDto } from 'contracts/tasks/response/TaskCreateResponse.dto';

export class ColumnResponseDto {
  @IsUUID()
  @IsNotEmpty()
  id!: string;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsNumber()
  @IsNotEmpty()
  order!: number;

  @IsString()
  @IsNotEmpty()
  boardId!: string;

  @IsOptional()
  @Type(() => TaskCreateResponseDto)
  @IsArray()
  @ValidateNested({ each: true })
  tasks?: TaskCreateResponseDto[];
}
