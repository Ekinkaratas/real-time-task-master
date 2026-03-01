import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateBoardDto {
  @ApiProperty({
    description: 'The title of the panel',
    example: 'Nova Bazaar Sprint 1',
  })
  @IsNotEmpty()
  @IsString()
  title!: string;

  @ApiProperty({
    description: 'The description of the panel',
    example: 'The e-commerce project includes the first sprint tasks.',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;
}
