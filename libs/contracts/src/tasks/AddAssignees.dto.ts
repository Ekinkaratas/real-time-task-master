import { IsNotEmpty, IsString } from 'class-validator';

export class AddAssigneesDto {
  @IsString()
  @IsNotEmpty()
  email!: string;
}
