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
import { TaskResponseForColumnsResponse } from 'contracts/tasks';

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
  @Type(() => TaskResponseForColumnsResponse)
  @IsArray()
  @ValidateNested({ each: true })
  tasks?: TaskResponseForColumnsResponse[];
}
