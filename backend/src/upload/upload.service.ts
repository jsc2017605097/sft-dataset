import { Injectable, BadRequestException } from '@nestjs/common';
import { TikaService } from '../services/tika.service';
import { OllamaService } from '../services/ollama.service';
import { ProcessFileResponseDto } from './dto/process-response.dto';
import type { Express } from 'express';
import { DocumentsService } from '../documents/documents.service';
import { Document } from '../common/interfaces/frontend-types';

/**
 * Upload Service - Business logic cho file upload và processing
 */
@Injectable()
export class UploadService {
  constructor(
    private readonly tikaService: TikaService,
    private readonly ollamaService: OllamaService,
    private readonly documentsService: DocumentsService,
  ) {}

  /**
   * Process file: Extract text với Tika, sau đó generate Q&A với Ollama
   * @param file - File từ multer
   * @param autoGenerate - Có tự động generate Q&A không
   * @param count - Số lượng Q&A pairs cần tạo
   * @returns ProcessFileResponseDto với fileName, fileSize, qaPairs
   */
  async processFile(
    file: Express.Multer.File | undefined,
    autoGenerate: boolean = true,
    count: number = 5,
  ): Promise<ProcessFileResponseDto> {
    // Validate file
    if (!file) {
      throw new BadRequestException('File không được cung cấp');
    }

    // Validate file type
    const allowedMimeTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    ];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('File không hợp lệ. Chỉ chấp nhận PDF hoặc DOCX.');
    }

    // Validate file size (200MB max)
    const maxSize = 200 * 1024 * 1024; // 200MB
    if (file.size > maxSize) {
      throw new BadRequestException('File quá lớn. Kích thước tối đa là 200MB.');
    }

    // Format file size string (match với FE format)
    const fileSize = (file.size / (1024 * 1024)).toFixed(2) + ' MB';

    let qaPairs = [];
    let extractedText = '';

    if (autoGenerate) {
      // Step 1: Extract text từ file bằng Tika
      extractedText = await this.tikaService.extractText(file.buffer);

      // Step 2: Generate Q&A pairs từ text bằng Ollama
      qaPairs = await this.ollamaService.generateQAPairs(extractedText, count);
    }

    // Tạo Document id và metadata tương thích với FE
    const docId = `doc-${Date.now()}`;
    const uploadDate = new Date().toLocaleDateString('vi-VN');

    const document: Document = {
      id: docId,
      name: file.originalname,
      size: fileSize,
      uploadDate,
      totalSamples: qaPairs.length,
      reviewedSamples: 0,
      status: 'Ready',
    };

    // Lưu Document + QAPairs + extractedText xuống SQLite (transaction bên trong service)
    await this.documentsService.createDocumentWithQAPairs(document, qaPairs, extractedText);

    // Response cho FE giữ nguyên format cũ (fileName, fileSize, qaPairs)
    return {
      fileName: file.originalname,
      fileSize: fileSize,
      qaPairs: qaPairs,
    };
  }
}

