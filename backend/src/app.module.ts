import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UploadModule } from './upload/upload.module';
import { AppController } from './app.controller';
import { TikaService } from './services/tika.service';
import { OllamaService } from './services/ollama.service';
import { DocumentsModule } from './documents/documents.module';

/**
 * App Module - Root module của NestJS application
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // Làm cho ConfigModule available globally
      envFilePath: '.env',
    }),
    // TypeORM + SQLite cấu hình global
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: 'sft-dataset.db',
      autoLoadEntities: true,
      synchronize: true, // CHỈ dùng cho dev; production nên dùng migration
    }),
    UploadModule,
    DocumentsModule,
  ],
  controllers: [AppController],
  providers: [TikaService, OllamaService],
})
export class AppModule {}

