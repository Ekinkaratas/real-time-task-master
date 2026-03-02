import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class TaskCreateResponseDto {
  @IsUUID()
  @IsNotEmpty()
  id!: string;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsOptional()
  description!: string;

  //priority?
  //taskStatus?
}
