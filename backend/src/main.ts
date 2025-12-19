import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

/**
 * Bootstrap NestJS application
 */
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS Configuration - Cho phép FE client (từ IP 100.101.198.12) gọi API
  const corsOrigin = process.env.CORS_ORIGIN || 'http://100.101.198.12:3000';
  app.enableCors({
    origin: corsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Global prefix cho tất cả routes
  app.setGlobalPrefix('api');

  // Global validation pipe - Tự động validate DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Chỉ cho phép properties được định nghĩa trong DTO
      forbidNonWhitelisted: true, // Throw error nếu có properties không được định nghĩa
      transform: true, // Tự động transform types
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global exception filter - Format error response chuẩn
  app.useGlobalFilters(new HttpExceptionFilter());

  const port = process.env.PORT || 3001;
  await app.listen(port);

  console.log(`🚀 NestJS Backend đang chạy trên: http://localhost:${port}`);
  console.log(`📡 API endpoints: http://localhost:${port}/api`);
  console.log(`🔗 CORS enabled cho: ${corsOrigin}`);
}

bootstrap();

