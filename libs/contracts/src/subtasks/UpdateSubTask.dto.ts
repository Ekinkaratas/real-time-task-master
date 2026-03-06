import { IsBoolean, IsOptional, IsString } from 'class-validator';
export class UpdateSubTaskDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsBoolean()
  @IsOptional()
  isCompleted?: boolean;
}
