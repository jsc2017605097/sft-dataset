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
import type { Express } from 'express';

/**
 * Upload Controller - API endpoints cho file upload và processing
 * Note: Không cần 'api' prefix vì đã có global prefix trong main.ts
 */
@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  /**
   * POST /api/upload/process
   * Upload file và process để generate Q&A pairs
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
  ): Promise<ProcessFileResponseDto> {
    const { autoGenerate = true, count = 5 } = body;
    return this.uploadService.processFile(file, autoGenerate, count);
  }
}

