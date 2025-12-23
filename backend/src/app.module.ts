import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UploadModule } from './upload/upload.module';
import { AppController } from './app.controller';
import { TikaService } from './services/tika.service';
import { OllamaModule } from './services/ollama.module';
import { DocumentsModule } from './documents/documents.module';
import { RemoteFilesModule } from './remote-files/remote-files.module';
import { SettingsModule } from './settings/settings.module';

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
    RemoteFilesModule,
    SettingsModule,
    OllamaModule,
  ],
  controllers: [AppController],
  providers: [TikaService],
})
export class AppModule {}

