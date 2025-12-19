import {
  Controller,
  Get,
  Param,
  Patch,
  Body,
  Delete,
  Post,
} from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { Document, QAPair } from '../common/interfaces/frontend-types';

/**
 * Documents Controller - API endpoints tương thích với FE
 */
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  /**
   * GET /api/documents
   * Trả về danh sách Document cho Dashboard
   */
  @Get()
  async getDocuments(): Promise<Document[]> {
    return this.documentsService.findAllDocuments();
  }

  /**
   * GET /api/documents/:id/qa-pairs
   * Trả về danh sách QAPair cho ReviewScreen
   */
  @Get(':id/qa-pairs')
  async getQAPairs(@Param('id') id: string): Promise<QAPair[]> {
    const { qaPairs } = await this.documentsService.findDocumentWithQAPairs(id);
    return qaPairs;
  }

  /**
   * PATCH /api/qa/:id
   * Cập nhật 1 QAPair (edit/review)
   */
  @Patch('/../qa/:id')
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
  @Delete('/../qa/:id')
  async deleteQAPair(@Param('id') id: string): Promise<void> {
    return this.documentsService.deleteQAPair(id);
  }

  /**
   * DELETE /api/documents/:id
   * Xóa 1 Document (và tất cả QAPairs liên quan - cascade)
   */
  @Delete(':id')
  async deleteDocument(@Param('id') id: string): Promise<void> {
    return this.documentsService.deleteDocument(id);
  }

  /**
   * POST /api/documents/:id/generate-more
   * Generate thêm Q&A pairs cho document đã có
   * Body: { count: number }
   * Returns: QAPair[] - các Q&A pairs mới được tạo
   */
  @Post(':id/generate-more')
  async generateMoreQAPairs(
    @Param('id') id: string,
    @Body() body: { count: number },
  ): Promise<QAPair[]> {
    const count = body.count || 5;
    if (count < 1 || count > 20) {
      throw new Error('Số lượng Q&A pairs phải từ 1 đến 20');
    }
    return this.documentsService.generateMoreQAPairs(id, count);
  }
}


