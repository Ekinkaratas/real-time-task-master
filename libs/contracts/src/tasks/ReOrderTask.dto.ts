import { IsInt, IsNotEmpty, IsOptional, IsUUID, Min } from 'class-validator';

export class ReOrderTaskDto {
  @IsUUID()
  @IsNotEmpty()
  id!: string;

  @IsInt()
  @IsNotEmpty()
  @Min(1)
  newOrder!: number;

  @IsUUID()
  @IsOptional()
  newColumnId?: string;
}
