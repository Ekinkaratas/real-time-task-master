import { authRegisterDto } from 'contracts/my-library/Auth/register.dto.js';
import { userRegisterDto } from '../user-register.dto.js';

export function toUserRegisterDto(
  dto: authRegisterDto,
  passwordHash: string,
): userRegisterDto {
  return {
    email: dto.email,
    password: passwordHash,
    firstName: dto.firstname,
    lastName: dto.lastname,
  };
}
