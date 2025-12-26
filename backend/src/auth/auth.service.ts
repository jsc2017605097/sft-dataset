import { Injectable, ConflictException, UnauthorizedException, HttpException, HttpStatus, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserEntity } from './entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtPayload } from './jwt.strategy';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserEntity)
    private userRepository: Repository<UserEntity>,
    private jwtService: JwtService,
  ) {}

  /**
   * Đăng ký user mới
   */
  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    const { username, password, email } = registerDto;

    // Check username đã tồn tại chưa
    const existingUser = await this.userRepository.findOne({
      where: { username },
    });

    if (existingUser) {
      throw new ConflictException('Username đã tồn tại');
    }

    // Check email đã tồn tại chưa (nếu có)
    if (email) {
      const existingEmail = await this.userRepository.findOne({
        where: { email },
      });

      if (existingEmail) {
        throw new ConflictException('Email đã được sử dụng');
      }
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Tạo user mới (mặc định chưa kích hoạt - cần admin approve)
    const user = this.userRepository.create({
      username,
      email: email || null,
      passwordHash,
      role: 'user', // Default role
      isActive: false, // User phải được admin kích hoạt mới có thể login
    });

    try {
      await this.userRepository.save(user);
    } catch (error) {
      throw new HttpException(
        'Có lỗi khi tạo tài khoản',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    // Đăng ký thành công nhưng tài khoản chưa được kích hoạt
    // Throw exception đặc biệt để frontend biết và hiển thị message phù hợp
    throw new HttpException(
      {
        statusCode: 201,
        message: 'Đăng ký thành công! Vui lòng đợi admin kích hoạt tài khoản của bạn.',
        requiresActivation: true,
      },
      HttpStatus.CREATED,
    );
  }

  /**
   * Đăng nhập
   */
  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const { username, password } = loginDto;

    // Tìm user
    const user = await this.userRepository.findOne({
      where: { username },
    });

    if (!user) {
      throw new UnauthorizedException('Username hoặc password không đúng');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Username hoặc password không đúng');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new UnauthorizedException(
        'Tài khoản của bạn chưa được kích hoạt. Vui lòng liên hệ admin để kích hoạt tài khoản.',
      );
    }

    // Generate JWT token
    const accessToken = this.generateJwtToken(user);

    return {
      user: this.toUserResponse(user),
      accessToken,
    };
  }

  /**
   * Get current user info
   */
  async getMe(userId: string): Promise<UserResponseDto> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User không tồn tại');
    }

    return this.toUserResponse(user);
  }

  /**
   * Generate JWT token
   */
  private generateJwtToken(user: UserEntity): string {
    const payload: JwtPayload = {
      sub: user.id,
      username: user.username,
      role: user.role,
    };

    return this.jwtService.sign(payload);
  }

  /**
   * Admin tạo user mới (có thể chọn role)
   * Không trả về token, chỉ trả về thông tin user
   */
  async adminCreateUser(createUserDto: RegisterDto & { role?: 'user' | 'admin' }): Promise<UserResponseDto> {
    const { username, password, email, role = 'user' } = createUserDto;

    // Check username đã tồn tại chưa
    const existingUser = await this.userRepository.findOne({
      where: { username },
    });

    if (existingUser) {
      throw new ConflictException('Username đã tồn tại');
    }

    // Check email đã tồn tại chưa (nếu có)
    if (email) {
      const existingEmail = await this.userRepository.findOne({
        where: { email },
      });

      if (existingEmail) {
        throw new ConflictException('Email đã được sử dụng');
      }
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Tạo user mới với role được chỉ định
    const user = this.userRepository.create({
      username,
      email: email || null,
      passwordHash,
      role, // Admin có thể chọn role
    });

    try {
      await this.userRepository.save(user);
    } catch (error) {
      throw new HttpException(
        'Có lỗi khi tạo tài khoản',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return this.toUserResponse(user);
  }

  /**
   * Lấy danh sách tất cả users (Admin only)
   */
  async getAllUsers(): Promise<UserResponseDto[]> {
    const users = await this.userRepository.find({
      order: { createdAt: 'DESC' },
    });
    return users.map(user => this.toUserResponse(user));
  }

  /**
   * Lấy chi tiết 1 user (Admin only)
   */
  async getUserById(userId: string): Promise<UserResponseDto> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User không tồn tại');
    }
    return this.toUserResponse(user);
  }

  /**
   * Cập nhật thông tin user (Admin only)
   */
  async updateUser(userId: string, updateDto: UpdateUserDto): Promise<UserResponseDto> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User không tồn tại');
    }

    // Check username conflict nếu đổi username
    if (updateDto.username && updateDto.username !== user.username) {
      const existingUser = await this.userRepository.findOne({
        where: { username: updateDto.username },
      });
      if (existingUser) {
        throw new ConflictException('Username đã tồn tại');
      }
      user.username = updateDto.username;
    }

    // Check email conflict nếu đổi email
    if (updateDto.email !== undefined) {
      if (updateDto.email && updateDto.email !== user.email) {
        const existingEmail = await this.userRepository.findOne({
          where: { email: updateDto.email },
        });
        if (existingEmail) {
          throw new ConflictException('Email đã được sử dụng');
        }
      }
      user.email = updateDto.email || null;
    }

    // Update password nếu có
    if (updateDto.password) {
      const salt = await bcrypt.genSalt(10);
      user.passwordHash = await bcrypt.hash(updateDto.password, salt);
    }

    // Update role nếu có
    if (updateDto.role) {
      user.role = updateDto.role;
    }

    // Update isActive nếu có
    if (updateDto.isActive !== undefined) {
      user.isActive = updateDto.isActive;
    }

    await this.userRepository.save(user);
    return this.toUserResponse(user);
  }

  /**
   * Xóa user (Admin only)
   */
  async deleteUser(userId: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User không tồn tại');
    }
    await this.userRepository.delete(userId);
  }

  /**
   * Khóa/mở khóa user (Admin only)
   */
  async toggleUserActive(userId: string): Promise<UserResponseDto> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User không tồn tại');
    }
    user.isActive = !user.isActive;
    await this.userRepository.save(user);
    return this.toUserResponse(user);
  }

  /**
   * Convert UserEntity to UserResponseDto (không trả về passwordHash)
   */
  private toUserResponse(user: UserEntity): UserResponseDto {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}

