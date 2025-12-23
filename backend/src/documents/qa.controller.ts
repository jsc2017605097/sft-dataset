import {
  Controller,
  Patch,
  Delete,
  Param,
  Body,
} from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { QAPair } from '../common/interfaces/frontend-types';

/**
 * QA Controller - API endpoints cho QAPair operations
 * Routes: /api/qa/*
 */
@Controller('qa')
export class QAController {
  constructor(private readonly documentsService: DocumentsService) {}

  /**
   * PATCH /api/qa/:id
   * Cập nhật 1 QAPair (edit/review)
   */
  @Patch(':id')
  async updateQAPair(
    @Param('id') id: string,
    @Body()
    body: Partial<
      Pick<QAPair, 'question' | 'answer' | 'status' | 'originalQuestion' | 'originalAnswer'>
    >,
  ): Promise<QAPair> {
    return this.documentsService.updateQAPair(id, body);
  }

  /**
   * DELETE /api/qa/:id
   * Xóa 1 QAPair
   */
  @Delete(':id')
  async deleteQAPair(@Param('id') id: string): Promise<void> {
    return this.documentsService.deleteQAPair(id);
  }
}


