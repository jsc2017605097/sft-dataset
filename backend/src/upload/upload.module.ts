import { Module } from '@nestjs/common';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
import { TikaService } from '../services/tika.service';
import { OllamaModule } from '../services/ollama.module';
import { ConfigModule } from '@nestjs/config';
import { DocumentsModule } from '../documents/documents.module';

/**
 * Upload Module - Module cho file upload và processing
 */
@Module({
  imports: [ConfigModule, DocumentsModule, OllamaModule],
  controllers: [UploadController],
  providers: [UploadService, TikaService],
})
export class UploadModule {}


