import { IsNotEmpty, IsString } from 'class-validator';

export class CreateColumnDto {
  @IsNotEmpty()
  @IsString()
  title!: string;

  @IsString()
  @IsNotEmpty()
  order!: number;

  @IsString()
  @IsNotEmpty()
  boardId!: string;
}
