import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class authLogin {
  @ApiProperty({ example: 'api@gmail.com', required: false })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ example: 'ABC123...' })
  @IsNotEmpty()
  @IsString()
  password!: string;
}
