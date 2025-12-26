import { Controller, Post, Body, Get, UseGuards, Put, Delete, Param, Patch } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { GetUser } from './get-user.decorator';
import { UserEntity } from './entities/user.entity';
import { Public } from './public.decorator';
import { Roles } from './roles.decorator';
import { RolesGuard } from './roles.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Đăng ký user mới
   * POST /api/auth/register
   */
  @Public()
  @Post('register')
  async register(@Body() registerDto: RegisterDto): Promise<AuthResponseDto> {
    return this.authService.register(registerDto);
  }

  /**
   * Đăng nhập
   * POST /api/auth/login
   */
  @Public()
  @Post('login')
  async login(@Body() loginDto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(loginDto);
  }

  /**
   * Get thông tin user hiện tại
   * GET /api/auth/me
   */
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@GetUser() user: UserEntity): Promise<UserResponseDto> {
    return this.authService.getMe(user.id);
  }

  /**
   * Admin tạo user mới (có thể chọn role)
   * POST /api/auth/admin/create-user
   * Chỉ admin mới có quyền
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('admin/create-user')
  async adminCreateUser(@Body() createUserDto: RegisterDto & { role?: 'user' | 'admin' }): Promise<UserResponseDto> {
    return this.authService.adminCreateUser(createUserDto);
  }

  /**
   * Lấy danh sách tất cả users
   * GET /api/auth/admin/users
   * Chỉ admin mới có quyền
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('admin/users')
  async getAllUsers(): Promise<UserResponseDto[]> {
    return this.authService.getAllUsers();
  }

  /**
   * Lấy chi tiết 1 user
   * GET /api/auth/admin/users/:id
   * Chỉ admin mới có quyền
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('admin/users/:id')
  async getUserById(@Param('id') id: string): Promise<UserResponseDto> {
    return this.authService.getUserById(id);
  }

  /**
   * Cập nhật thông tin user
   * PUT /api/auth/admin/users/:id
   * Chỉ admin mới có quyền
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Put('admin/users/:id')
  async updateUser(
    @Param('id') id: string,
    @Body() updateDto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    return this.authService.updateUser(id, updateDto);
  }

  /**
   * Xóa user
   * DELETE /api/auth/admin/users/:id
   * Chỉ admin mới có quyền
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Delete('admin/users/:id')
  async deleteUser(@Param('id') id: string): Promise<void> {
    return this.authService.deleteUser(id);
  }

  /**
   * Khóa/mở khóa user
   * PATCH /api/auth/admin/users/:id/toggle-active
   * Chỉ admin mới có quyền
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Patch('admin/users/:id/toggle-active')
  async toggleUserActive(@Param('id') id: string): Promise<UserResponseDto> {
    return this.authService.toggleUserActive(id);
  }
}

