import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateSubTaskDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsBoolean()
  @IsOptional()
  isCompleted?: boolean = false;
}
