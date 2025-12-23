import { Module } from '@nestjs/common';
import { RemoteFilesController } from './remote-files.controller';
import { RemoteFilesService } from './remote-files.service';
import { TikaService } from '../services/tika.service';
import { OllamaModule } from '../services/ollama.module';
import { DocumentsModule } from '../documents/documents.module';

/**
 * Remote Files Module - Quản lý file từ folder data/uploads
 */
@Module({
  imports: [DocumentsModule, OllamaModule],
  controllers: [RemoteFilesController],
  providers: [RemoteFilesService, TikaService],
  exports: [RemoteFilesService],
})
export class RemoteFilesModule {}

