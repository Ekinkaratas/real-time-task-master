import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class ReorderColumnDto {
  @IsString()
  @IsNotEmpty()
  id!: string;

  @IsInt()
  @IsNotEmpty()
  @Min(1)
  order!: number;
}
