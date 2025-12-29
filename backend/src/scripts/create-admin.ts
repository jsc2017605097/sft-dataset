import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { AuthService } from '../auth/auth.service';
import * as readline from 'readline';

/**
 * Script để tạo admin account
 * 
 * Chạy: pnpm exec ts-node src/scripts/create-admin.ts
 */
async function createAdmin() {
  console.log('🔐 Script Tạo Admin Account\n');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (query: string): Promise<string> => {
    return new Promise((resolve) => rl.question(query, resolve));
  };

  try {
    // Tạo NestJS app context (không start server)
    const app = await NestFactory.createApplicationContext(AppModule);
    const authService = app.get(AuthService);

    console.log('✅ Kết nối database thành công\n');

    // Lấy thông tin từ user
    const username = await question('Nhập username (mặc định: admin): ') || 'admin';
    const password = await question('Nhập password (mặc định: admin123): ') || 'admin123';
    const email = await question('Nhập email (optional): ');

    console.log('\n🔄 Đang tạo admin account...\n');

    // Tạo admin user
    await authService.register({
      username,
      password,
      email: email || undefined,
    });

    // Update role thành admin (vì register mặc định tạo role 'user')
    const userRepo = app.get('UserEntityRepository');
    const user = await userRepo.findOne({ where: { username } });
    if (user) {
      user.role = 'admin';
      await userRepo.save(user);
    }

    console.log('✅ Tạo admin account thành công!\n');
    console.log(`   Username: ${username}`);
    console.log(`   Password: ${password}`);
    console.log(`   Role: admin\n`);

    await app.close();
    rl.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Lỗi khi tạo admin:', error);
    if (error.message?.includes('already exists') || error.message?.includes('đã tồn tại')) {
      console.log('\n💡 Username đã tồn tại. Vui lòng chọn username khác hoặc đăng nhập với tài khoản hiện có.\n');
    }
    rl.close();
    process.exit(1);
  }
}

createAdmin();


