import { IsOptional, IsString } from 'class-validator';

export class UpdateToBoardDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;
}
