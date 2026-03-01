import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { userForAuthResponse } from '../User';

export class authClientResponseDto {
  @ApiProperty({ type: () => userForAuthResponse })
  userData!: userForAuthResponse;

  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
  })
  @IsString()
  refresh_Token!: string;

  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
  })
  @IsString()
  access_Token!: string;
}
