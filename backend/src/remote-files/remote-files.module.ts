import { Module } from '@nestjs/common';
import { RemoteFilesController } from './remote-files.controller';
import { RemoteFilesService } from './remote-files.service';
import { TikaService } from '../services/tika.service';
import { OllamaService } from '../services/ollama.service';
import { DocumentsModule } from '../documents/documents.module';

/**
 * Remote Files Module - Quản lý file từ folder data/uploads
 */
@Module({
  imports: [DocumentsModule],
  controllers: [RemoteFilesController],
  providers: [RemoteFilesService, TikaService, OllamaService],
  exports: [RemoteFilesService],
})
export class RemoteFilesModule {}

