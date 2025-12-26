export class UserResponseDto {
  id: string;
  username: string;
  email: string | null;
  role: 'user' | 'admin';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

