import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';
import { TikaService } from '../services/tika.service';
import { OllamaService } from '../services/ollama.service';
import { DocumentsService } from '../documents/documents.service';
import { Document } from '../common/interfaces/frontend-types';
import { GeneratedQA } from '../common/interfaces/frontend-types';

/**
 * Interface cho file từ xa
 */
export interface RemoteFile {
  name: string; // Tên file đầy đủ
  size: number; // Bytes
  sizeFormatted: string; // "2.45 MB"
  isProcessed: boolean;
  docId?: string; // Nếu đã xử lý
  processedDate?: string; // Nếu đã xử lý
}

/**
 * Remote Files Service - Quản lý file từ folder data/uploads
 */
@Injectable()
export class RemoteFilesService {
  private readonly uploadsPath: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly tikaService: TikaService,
    private readonly ollamaService: OllamaService,
    private readonly documentsService: DocumentsService,
  ) {
    // Lấy đường dẫn từ config hoặc dùng default
    this.uploadsPath = path.join(process.cwd(), 'data', 'uploads');
  }

  /**
   * Normalize tên file để match với DB
   * - Loại bỏ UUID prefix nếu có (format: UUID_filename)
   * - Normalize encoding (latin1 -> utf8)
   */
  private normalizeFileNameForMatch(fileName: string): string {
    // Loại bỏ UUID prefix (format: UUID_filename)
    // UUID format: 8-4-4-4-12 hex characters
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}_/i;
    let cleanName = fileName.replace(uuidPattern, '');

    // Normalize encoding
    try {
      const utf8 = Buffer.from(cleanName, 'latin1').toString('utf8');
      if (!utf8.includes('')) {
        cleanName = utf8;
      }
    } catch {
      // Giữ nguyên nếu decode fail
    }

    return cleanName.trim();
  }

  /**
   * Lấy danh sách file từ folder data/uploads và check trạng thái trong DB
   */
  async listFiles(): Promise<RemoteFile[]> {
    try {
      // Đọc danh sách file từ folder
      const files = await fs.readdir(this.uploadsPath);

      // Lọc chỉ lấy file PDF và DOCX
      const allowedExtensions = ['.pdf', '.docx', '.doc'];
      const documentFiles = files.filter((file) => {
        const ext = path.extname(file).toLowerCase();
        return allowedExtensions.includes(ext);
      });

      // Với mỗi file, check xem đã xử lý chưa
      const remoteFiles: RemoteFile[] = await Promise.all(
        documentFiles.map(async (fileName) => {
          const filePath = path.join(this.uploadsPath, fileName);
          const stats = await fs.stat(filePath);
          const size = stats.size;
          const sizeFormatted = (size / (1024 * 1024)).toFixed(2) + ' MB';

          // Normalize filename để tìm trong DB
          const normalizedName = this.normalizeFileNameForMatch(fileName);

          // Tìm Document trong DB theo tên file
          const document = await this.documentsService.findDocumentByFileName(normalizedName);

          if (document) {
            return {
              name: fileName,
              size,
              sizeFormatted,
              isProcessed: true,
              docId: document.id,
              processedDate: document.uploadDate,
            };
          }

          return {
            name: fileName,
            size,
            sizeFormatted,
            isProcessed: false,
          };
        }),
      );

      return remoteFiles;
    } catch (error) {
      // Nếu folder không tồn tại hoặc không đọc được
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        // Folder không tồn tại → trả về mảng rỗng
        return [];
      }
      throw new BadRequestException(`Không thể đọc folder uploads: ${error instanceof Error ? error.message : 'Lỗi không xác định'}`);
    }
  }

  /**
   * Xử lý file từ filesystem: Extract text → Generate Q&A → Lưu DB
   * @param fileName - Tên file trong folder uploads
   * @param autoGenerate - Có tự động generate Q&A không
   * @param count - Số lượng Q&A pairs cần tạo
   * @param userId - ID của user xử lý file
   * @param username - Username của user xử lý file
   * @returns Document đã được tạo
   */
  async processFileFromPath(
    fileName: string,
    autoGenerate: boolean = true,
    count: number = 5,
    userId?: string,
    username?: string,
  ): Promise<Document> {
    const filePath = path.join(this.uploadsPath, fileName);

    // Kiểm tra file có tồn tại không
    try {
      await fs.access(filePath);
    } catch {
      throw new NotFoundException(`File "${fileName}" không tồn tại trong folder uploads`);
    }

    // Đọc file từ filesystem
    const fileBuffer = await fs.readFile(filePath);
    const stats = await fs.stat(filePath);

    // Validate file size (200MB max)
    const maxSize = 200 * 1024 * 1024; // 200MB
    if (stats.size > maxSize) {
      throw new BadRequestException('File quá lớn. Kích thước tối đa là 200MB.');
    }

    // Validate file type dựa vào extension
    const ext = path.extname(fileName).toLowerCase();
    const allowedExtensions = ['.pdf', '.docx', '.doc'];
    if (!allowedExtensions.includes(ext)) {
      throw new BadRequestException('File không hợp lệ. Chỉ chấp nhận PDF hoặc DOCX.');
    }

    // Xác định MIME type
    let mimeType: string;
    if (ext === '.pdf') {
      mimeType = 'application/pdf';
    } else {
      mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    }

    // Format file size string
    const fileSize = (stats.size / (1024 * 1024)).toFixed(2) + ' MB';

    let qaPairs: GeneratedQA[] = [];
    let extractedText = '';
    let lastChunkIndex = 0;
    let totalChunks = 0;

    if (autoGenerate) {
      // Step 1: Extract text từ file bằng Tika
      extractedText = await this.tikaService.extractText(fileBuffer);

      // Step 2: Generate Q&A pairs từ text bằng Ollama với chunk tracking
      const result = await this.ollamaService.generateQAPairs(extractedText, count, 0);
      qaPairs = result.qaPairs;
      lastChunkIndex = result.lastChunkIndex;
      totalChunks = result.totalChunks;
    }

    // Normalize tên file để tránh lỗi encoding tiếng Việt
    const normalizeFileName = (name: string): string => {
      try {
        // Loại bỏ UUID prefix nếu có
        const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}_/i;
        let cleanName = name.replace(uuidPattern, '');

        // Thử decode lại từ latin1 sang utf8
        const utf8 = Buffer.from(cleanName, 'latin1').toString('utf8');
        if (utf8.includes('')) {
          return cleanName;
        }
        return utf8;
      } catch {
        return fileName;
      }
    };

    const safeFileName = normalizeFileName(fileName);

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

    return document;
  }
}

