import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentEntity } from './entities/document.entity';
import { QAPairEntity } from './entities/qa-pair.entity';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';
import { QAController } from './qa.controller';
import { OllamaModule } from '../services/ollama.module';

/**
 * Documents Module - Quản lý Document & QAPair (SQLite + TypeORM)
 */
@Module({
  imports: [TypeOrmModule.forFeature([DocumentEntity, QAPairEntity]), OllamaModule],
  providers: [DocumentsService],
  controllers: [DocumentsController, QAController],
  exports: [DocumentsService],
})
export class DocumentsModule {}


