import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class UserSearchResponseDto {
  @ApiProperty({ example: '1' })
  @IsString()
  @IsNotEmpty()
  id!: string;

  @ApiProperty({ example: 'api@gmail.com' })
  @IsString()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ example: 'Ekin' })
  @IsString()
  @IsNotEmpty()
  name!: string;
}
