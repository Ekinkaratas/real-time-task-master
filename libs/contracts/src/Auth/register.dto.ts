import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class authRegisterDto {
  @ApiProperty({ example: 'api@gmail.com' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ example: 'ABC123...' })
  @IsNotEmpty()
  @IsString()
  password!: string;

  @ApiProperty({ example: 'Ekin' })
  @IsNotEmpty()
  @IsString()
  firstname!: string;

  @ApiProperty({ example: 'Karataş' })
  @IsNotEmpty()
  @IsString()
  lastname!: string;
}
