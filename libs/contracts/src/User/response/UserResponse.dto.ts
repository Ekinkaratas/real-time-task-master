import { ApiProperty } from '@nestjs/swagger';
import { UserRole, UserStatus } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UserResponse {
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

  @IsEnum(UserRole)
  @IsNotEmpty()
  role!: UserRole;

  @IsEnum(UserStatus)
  @IsNotEmpty()
  status!: UserStatus;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  password?: string;
}
