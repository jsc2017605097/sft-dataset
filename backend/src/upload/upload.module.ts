import { Module } from '@nestjs/common';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
import { TikaService } from '../services/tika.service';
import { OllamaService } from '../services/ollama.service';
import { ConfigModule } from '@nestjs/config';
import { DocumentsModule } from '../documents/documents.module';

/**
 * Upload Module - Module cho file upload và processing
 */
@Module({
  imports: [ConfigModule, DocumentsModule],
  controllers: [UploadController],
  providers: [UploadService, TikaService, OllamaService],
})
export class UploadModule {}


