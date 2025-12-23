import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { RemoteFilesService, RemoteFile } from './remote-files.service';
import { ProcessRemoteFileDto } from './dto/process-remote-file.dto';
import { Document } from '../common/interfaces/frontend-types';

/**
 * Remote Files Controller - API endpoints cho quản lý file từ xa
 */
@Controller('remote-files')
export class RemoteFilesController {
  constructor(private readonly remoteFilesService: RemoteFilesService) {}

  /**
   * GET /api/remote-files
   * Lấy danh sách file từ folder data/uploads và trạng thái xử lý
   * 
   * Response:
   * - RemoteFile[] với thông tin: name, size, isProcessed, docId (nếu đã xử lý)
   */
  @Get()
  async listFiles(): Promise<RemoteFile[]> {
    return this.remoteFilesService.listFiles();
  }

  /**
   * POST /api/remote-files/:filename/process
   * Xử lý file từ folder uploads: Extract text → Generate Q&A → Lưu DB
   * 
   * Request:
   * - autoGenerate: boolean (optional, default: true)
   * - count: number (optional, default: 5)
   * 
   * Response:
   * - Document đã được tạo
   */
  @Post(':filename/process')
  @HttpCode(HttpStatus.OK)
  async processFile(
    @Param('filename') filename: string,
    @Body() body: ProcessRemoteFileDto,
  ): Promise<Document> {
    // Decode filename từ URL (có thể có ký tự đặc biệt)
    const decodedFilename = decodeURIComponent(filename);
    const { autoGenerate = true, count = 5 } = body;
    
    return this.remoteFilesService.processFileFromPath(decodedFilename, autoGenerate, count);
  }
}

