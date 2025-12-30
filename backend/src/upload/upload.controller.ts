import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadService } from './upload.service';
import { ProcessFileDto } from './dto/process-file.dto';
import { ProcessFileResponseDto } from './dto/process-response.dto';
import { GetUser } from '../auth/get-user.decorator';
import { UserEntity } from '../auth/entities/user.entity';
import type { Express } from 'express';

/**
 * Upload Controller - API endpoints cho file upload và processing
 * Note: Không cần 'api' prefix vì đã có global prefix trong main.ts
 * Require authentication (via global JwtAuthGuard)
 */
@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  /**
   * POST /api/upload/process
   * Upload file và process để generate Q&A pairs
   * User upload file sẽ là owner của document đó
   * 
   * Request:
   * - multipart/form-data
   * - file: File (PDF/DOCX)
   * - autoGenerate: boolean (optional, default: true)
   * - count: number (optional, default: 5)
   * 
   * Response:
   * - fileName: string
   * - fileSize: string
   * - qaPairs: GeneratedQA[]
   */
  @Post('process')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  async processFile(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() body: ProcessFileDto,
    @GetUser() user: UserEntity,
  ): Promise<ProcessFileResponseDto> {
    const { autoGenerate = true, count = 5 } = body;
    return this.uploadService.processFile(file, autoGenerate, count, user.id, user.username);
  }

  /**
   * POST /api/upload/process-template
   * Upload CSV template file và parse Q&A pairs
   * User upload file sẽ là owner của document đó
   * 
   * Request:
   * - multipart/form-data
   * - file: File (CSV)
   * 
   * Response:
   * - fileName: string
   * - fileSize: string
   * - qaPairs: GeneratedQA[]
   */
  @Post('process-template')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  async processTemplate(
    @UploadedFile() file: Express.Multer.File | undefined,
    @GetUser() user: UserEntity,
  ): Promise<ProcessFileResponseDto> {
    return this.uploadService.processTemplateFile(file, user.id, user.username);
  }

  /**
   * POST /api/upload/process-text-template
   * Upload text template file (TXT, PDF, DOC, DOCX) và parse Q&A pairs
   * Format: "Câu hỏi X: ..." followed by "Trả lời: ..."
   * User upload file sẽ là owner của document đó
   * 
   * Request:
   * - multipart/form-data
   * - file: File (TXT, PDF, DOC, DOCX)
   * 
   * Response:
   * - fileName: string
   * - fileSize: string
   * - qaPairs: GeneratedQA[]
   */
  @Post('process-text-template')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  async processTextTemplate(
    @UploadedFile() file: Express.Multer.File | undefined,
    @GetUser() user: UserEntity,
  ): Promise<ProcessFileResponseDto> {
    return this.uploadService.processTextTemplateFile(file, user.id, user.username);
  }
}

