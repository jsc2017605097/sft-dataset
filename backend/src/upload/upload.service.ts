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
   * @param userId - ID của user upload file
   * @param username - Username của user upload file
   * @returns ProcessFileResponseDto với fileName, fileSize, qaPairs
   */
  async processFile(
    file: Express.Multer.File | undefined,
    autoGenerate: boolean = true,
    count: number = 5,
    userId?: string,
    username?: string,
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
    let lastChunkIndex = 0;
    let totalChunks = 0;

    if (autoGenerate) {
      // Step 1: Extract text từ file bằng Tika
      extractedText = await this.tikaService.extractText(file.buffer);

      // Step 2: Generate Q&A pairs từ text bằng Ollama với chunk tracking
      const result = await this.ollamaService.generateQAPairs(extractedText, count, 0);
      qaPairs = result.qaPairs;
      lastChunkIndex = result.lastChunkIndex;
      totalChunks = result.totalChunks;
    }

    // Normalize tên file để tránh lỗi encoding tiếng Việt (UTF-8 bị hiển thị sai)
    const normalizeFileName = (name: string): string => {
      try {
        // Thử decode lại từ latin1 sang utf8 nếu ban đầu bị đọc sai
        const utf8 = Buffer.from(name, 'latin1').toString('utf8');
        // Nếu decode ra vẫn có ký tự lạ thì giữ nguyên
        if (utf8.includes('�')) {
          return name;
        }
        return utf8;
      } catch {
        return name;
      }
    };

    const safeFileName = normalizeFileName(file.originalname);

    // Tạo Document id và metadata tương thích với FE
    const docId = `doc-${Date.now()}`;
    const uploadDate = new Date().toLocaleDateString('vi-VN');

    const document: Document = {
      id: docId,
      name: safeFileName,
      size: fileSize,
      uploadDate,
      totalSamples: qaPairs.length,
      reviewedSamples: 0,
      status: 'Ready',
    };

    // Lưu Document + QAPairs + extractedText + chunk tracking xuống SQLite
    await this.documentsService.createDocumentWithQAPairs(
      document,
      qaPairs,
      extractedText,
      userId,
      username,
      lastChunkIndex,
      totalChunks,
    );

    // Response cho FE giữ nguyên format cũ (fileName, fileSize, qaPairs)
    return {
      fileName: safeFileName,
      fileSize: fileSize,
      qaPairs: qaPairs,
    };
  }

  /**
   * Process CSV template file: Parse CSV và extract Q&A pairs
   * @param file - CSV file từ multer
   * @param userId - ID của user upload file
   * @param username - Username của user upload file
   * @returns ProcessFileResponseDto với fileName, fileSize, qaPairs
   */
  async processTemplateFile(
    file: Express.Multer.File | undefined,
    userId?: string,
    username?: string,
  ): Promise<ProcessFileResponseDto> {
    // Validate file
    if (!file) {
      throw new BadRequestException('File không được cung cấp');
    }

    // Validate file type - CSV
    const allowedMimeTypes = [
      'text/csv',
      'application/csv',
      'text/plain', // Một số browser trả về text/plain cho CSV
    ];
    const isCSV = file.originalname.toLowerCase().endsWith('.csv');
    if (!isCSV && !allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('File không hợp lệ. Chỉ chấp nhận file CSV.');
    }

    // Validate file size (10MB max cho CSV)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new BadRequestException('File quá lớn. Kích thước tối đa là 10MB.');
    }

    // Format file size string
    const fileSize = (file.size / (1024 * 1024)).toFixed(2) + ' MB';

    // Parse CSV
    const qaPairs = this.parseCSVTemplate(file.buffer, file.originalname);

    if (qaPairs.length === 0) {
      throw new BadRequestException(
        'CSV không có dữ liệu hợp lệ. Vui lòng kiểm tra:\n' +
        '- Header phải là: "Câu hỏi,Câu trả lời"\n' +
        '- Mỗi row phải có đúng 2 cột\n' +
        '- Câu hỏi và Câu trả lời không được để trống\n' +
        '\n💡 Tip: Tải template mẫu để tránh lỗi format!'
      );
    }

    // Normalize tên file
    const normalizeFileName = (name: string): string => {
      try {
        const utf8 = Buffer.from(name, 'latin1').toString('utf8');
        if (utf8.includes('')) {
          return name;
        }
        return utf8;
      } catch {
        return name;
      }
    };

    const safeFileName = normalizeFileName(file.originalname);

    // Tạo Document id và metadata
    const docId = `doc-${Date.now()}`;
    const uploadDate = new Date().toLocaleDateString('vi-VN');

    const document: Document = {
      id: docId,
      name: safeFileName,
      size: fileSize,
      uploadDate,
      totalSamples: qaPairs.length,
      reviewedSamples: 0,
      status: 'Ready',
    };

    // Lưu Document + QAPairs (không có extractedText vì không dùng Tika)
    await this.documentsService.createDocumentWithQAPairs(
      document,
      qaPairs,
      null, // Không có extractedText
      userId,
      username,
      0, // Không có chunk tracking
      0,
    );

    return {
      fileName: safeFileName,
      fileSize: fileSize,
      qaPairs: qaPairs,
    };
  }

  /**
   * Parse CSV template file và extract Q&A pairs
   * @param buffer - File buffer
   * @param fileName - Tên file (để log error)
   * @returns Array of GeneratedQA
   */
  private parseCSVTemplate(buffer: Buffer, fileName: string): Array<{ question: string; answer: string }> {
    try {
      // Convert buffer to string, xử lý UTF-8 BOM
      let content = buffer.toString('utf8');
      
      // Remove UTF-8 BOM nếu có
      if (content.charCodeAt(0) === 0xfeff) {
        content = content.slice(1);
      }

      // Split lines
      const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0);

      if (lines.length < 2) {
        throw new BadRequestException('CSV phải có ít nhất 1 header row và 1 data row.');
      }

      // Parse header
      const header = this.parseCSVLine(lines[0]);
      if (header.length !== 2) {
        throw new BadRequestException(
          `Header phải có đúng 2 cột. Tìm thấy: ${header.length} cột.\n` +
          `Header hiện tại: ${lines[0]}\n` +
          `Header mong đợi: "Câu hỏi,Câu trả lời"`
        );
      }

      // Normalize header (case-insensitive, trim)
      const normalizedHeader = header.map(h => h.trim().toLowerCase());
      const expectedHeaders = ['câu hỏi', 'câu trả lời'];
      
      if (
        normalizedHeader[0] !== expectedHeaders[0] ||
        normalizedHeader[1] !== expectedHeaders[1]
      ) {
        throw new BadRequestException(
          `Header không đúng format.\n` +
          `Tìm thấy: "${header[0]},${header[1]}"\n` +
          `Mong đợi: "Câu hỏi,Câu trả lời"\n` +
          `\n💡 Tip: Tải template mẫu để có format đúng!`
        );
      }

      // Parse data rows
      const qaPairs: Array<{ question: string; answer: string }> = [];
      
      for (let i = 1; i < lines.length; i++) {
        const row = this.parseCSVLine(lines[i]);
        
        if (row.length !== 2) {
          throw new BadRequestException(
            `Row ${i + 1}: Phải có đúng 2 cột. Tìm thấy: ${row.length} cột.\n` +
            `Row: ${lines[i]}\n` +
            `\n💡 Nếu câu hỏi/câu trả lời có dấu phẩy, phải đặt trong dấu ngoặc kép: "Câu hỏi, có phẩy","Câu trả lời"`
          );
        }

        const question = row[0].trim();
        const answer = row[1].trim();

        if (!question || !answer) {
          throw new BadRequestException(
            `Row ${i + 1}: Câu hỏi và Câu trả lời không được để trống.\n` +
            `Row: ${lines[i]}`
          );
        }

        qaPairs.push({ question, answer });
      }

      return qaPairs;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      
      // Parse error - có thể do format CSV không đúng
      console.error(`Lỗi parse CSV file ${fileName}:`, error);
      throw new BadRequestException(
        `Lỗi parse CSV: ${error instanceof Error ? error.message : 'Unknown error'}\n` +
        `\nVui lòng kiểm tra:\n` +
        `- Header phải là: "Câu hỏi,Câu trả lời"\n` +
        `- Mỗi row phải có đúng 2 cột\n` +
        `- Nếu có dấu phẩy trong nội dung, phải đặt trong dấu ngoặc kép\n` +
        `- File phải là UTF-8 encoding\n` +
        `\n💡 Tip: Tải template mẫu (Excel) để tránh lỗi format!`
      );
    }
  }

  /**
   * Parse một dòng CSV, xử lý quotes và escape
   * @param line - CSV line string
   * @returns Array of fields
   */
  private parseCSVLine(line: string): string[] {
    const fields: string[] = [];
    let currentField = '';
    let inQuotes = false;
    let i = 0;

    while (i < line.length) {
      const char = line[i];
      const nextChar = i + 1 < line.length ? line[i + 1] : '';

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote ("")
          currentField += '"';
          i += 2;
        } else if (inQuotes && nextChar === ',') {
          // End of quoted field
          inQuotes = false;
          i += 2;
        } else if (!inQuotes) {
          // Start of quoted field
          inQuotes = true;
          i++;
        } else {
          // End quote
          inQuotes = false;
          i++;
        }
      } else if (char === ',' && !inQuotes) {
        // Field separator
        fields.push(currentField);
        currentField = '';
        i++;
      } else {
        currentField += char;
        i++;
      }
    }

    // Add last field
    fields.push(currentField);

    return fields;
  }
}

