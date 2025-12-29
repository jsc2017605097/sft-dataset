import { UserResponseDto } from './user-response.dto';

export class AuthResponseDto {
  user: UserResponseDto;
  accessToken: string;
}


