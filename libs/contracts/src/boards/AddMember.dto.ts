import { IsEmail, IsEnum, IsOptional } from 'class-validator';
import { BoardMemberRole } from '@prisma/client';

export class AddMemberDto {
  @IsEmail({}, { message: 'Please enter a valid email address.' })
  email!: string;

  @IsEnum(BoardMemberRole)
  @IsOptional()
  role?: BoardMemberRole;
}
