import { IsBoolean, IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class SubTasksResponseDto {
  @IsUUID()
  @IsNotEmpty()
  id!: string;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsBoolean()
  @IsNotEmpty()
  isCompleted!: boolean;
}
