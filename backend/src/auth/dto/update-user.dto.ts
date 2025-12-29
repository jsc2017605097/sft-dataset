import { IsString, IsOptional, MinLength, IsEmail, IsEnum, IsBoolean } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(3, { message: 'Username phải có ít nhất 3 ký tự' })
  username?: string;

  @IsOptional()
  @IsString()
  @MinLength(6, { message: 'Password phải có ít nhất 6 ký tự' })
  password?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email?: string;

  @IsOptional()
  @IsEnum(['user', 'admin'], { message: 'Role phải là user hoặc admin' })
  role?: 'user' | 'admin';

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}


