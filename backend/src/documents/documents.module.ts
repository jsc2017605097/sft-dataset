import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentEntity } from './entities/document.entity';
import { QAPairEntity } from './entities/qa-pair.entity';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';
import { OllamaService } from '../services/ollama.service';

/**
 * Documents Module - Quản lý Document & QAPair (SQLite + TypeORM)
 */
@Module({
  imports: [TypeOrmModule.forFeature([DocumentEntity, QAPairEntity])],
  providers: [DocumentsService, OllamaService],
  controllers: [DocumentsController],
  exports: [DocumentsService],
})
export class DocumentsModule {}


