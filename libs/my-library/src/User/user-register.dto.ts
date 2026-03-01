import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class userRegisterDto {
  @ApiProperty({ example: 'api@gmail.com' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ example: '$argon2id$v=19$m=65536,t=3,p=4$...' })
  @IsNotEmpty()
  @IsString()
  password!: string;

  @ApiProperty({ example: 'Ekin' })
  @IsNotEmpty()
  @IsString()
  firstName!: string;

  @ApiProperty({ example: 'Karatas' })
  @IsNotEmpty()
  @IsString()
  lastName!: string;
}
