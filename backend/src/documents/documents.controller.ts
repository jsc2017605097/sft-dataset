import {
  Controller,
  Get,
  Param,
  Patch,
  Body,
  Delete,
  Post,
  UseGuards,
} from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { Document, QAPair } from '../common/interfaces/frontend-types';
import { GetUser } from '../auth/get-user.decorator';
import { UserEntity } from '../auth/entities/user.entity';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';

/**
 * Documents Controller - API endpoints tương thích với FE
 * Tất cả endpoints require authentication (via global JwtAuthGuard)
 */
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  /**
   * GET /api/documents
   * Trả về danh sách Document cho Dashboard
   * Admin xem tất cả, user thường chỉ xem của mình
   */
  @Get()
  async getDocuments(@GetUser() user: UserEntity): Promise<Document[]> {
    return this.documentsService.findAllDocuments(user.id, user.role);
  }

  /**
   * GET /api/documents/:id/qa-pairs
   * Trả về danh sách QAPair cho ReviewScreen
   * Check ownership: user chỉ xem được document của mình, admin xem được tất cả
   */
  @Get(':id/qa-pairs')
  async getQAPairs(
    @Param('id') id: string,
    @GetUser() user: UserEntity,
  ): Promise<QAPair[]> {
    const { qaPairs } = await this.documentsService.findDocumentWithQAPairs(
      id,
      user.id,
      user.role,
    );
    return qaPairs;
  }

  /**
   * DELETE /api/documents/:id
   * Xóa 1 Document (và tất cả QAPairs liên quan - cascade)
   * CHỈ ADMIN có quyền xóa
   */
  @UseGuards(RolesGuard)
  @Roles('admin')
  @Delete(':id')
  async deleteDocument(
    @Param('id') id: string,
    @GetUser() user: UserEntity,
  ): Promise<void> {
    return this.documentsService.deleteDocument(id, user.id, user.role);
  }

  /**
   * POST /api/documents/:id/generate-more
   * Generate thêm Q&A pairs cho document đã có
   * Body: { count: number }
   * Returns: QAPair[] - các Q&A pairs mới được tạo
   * User chỉ generate cho document của mình, admin generate cho bất kỳ document nào
   */
  @Post(':id/generate-more')
  async generateMoreQAPairs(
    @Param('id') id: string,
    @Body() body: { count: number },
    @GetUser() user: UserEntity,
  ): Promise<QAPair[]> {
    const count = body.count || 5;
    if (count < 1 || count > 20) {
      throw new Error('Số lượng Q&A pairs phải từ 1 đến 20');
    }
    return this.documentsService.generateMoreQAPairs(id, count, user.id, user.role);
  }

  /**
   * PATCH /api/documents/:id/reassign
   * Gán lại document cho user khác (Admin only)
   * Body: { userId: string }
   * Returns: Document đã update
   */
  @UseGuards(RolesGuard)
  @Roles('admin')
  @Patch(':id/reassign')
  async reassignDocument(
    @Param('id') id: string,
    @Body() body: { userId: string },
  ): Promise<Document> {
    return this.documentsService.reassignDocument(id, body.userId);
  }
}


