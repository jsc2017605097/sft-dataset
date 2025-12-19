import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Tika Service - Extract text từ file PDF/DOCX
 * Gọi Tika API để trích xuất nội dung văn bản thuần từ file
 */
@Injectable()
export class TikaService {
  private readonly tikaEndpoint: string;

  constructor(private readonly configService: ConfigService) {
    this.tikaEndpoint = this.configService.get<string>('TIKA_ENDPOINT') || 'http://localhost:9998/tika';
  }

  /**
   * Extract text từ file sử dụng Apache Tika
   * @param fileBuffer - File buffer từ multer
   * @returns Plain text đã được extract từ file
   * @throws HttpException nếu Tika server không phản hồi hoặc file không hợp lệ
   */
  async extractText(fileBuffer: Buffer): Promise<string> {
    try {
      // Convert Buffer sang Uint8Array để tương thích với fetch API
      const uint8Array = new Uint8Array(fileBuffer);
      
      // Gọi Tika API với PUT request
      const response = await fetch(this.tikaEndpoint, {
        method: 'PUT',
        headers: {
          'Accept': 'text/plain',
          'Content-Type': 'application/octet-stream',
        },
        body: uint8Array,
      });

      // Kiểm tra response status
      if (!response.ok) {
        throw new HttpException(
          `Tika API error: ${response.status} ${response.statusText}`,
          HttpStatus.BAD_GATEWAY,
        );
      }

      // Đọc text response
      const text = await response.text();

      // Kiểm tra nếu text rỗng
      if (!text || text.trim().length === 0) {
        throw new HttpException(
          'Tika trả về nội dung rỗng. File có thể không có text hoặc định dạng không được hỗ trợ.',
          HttpStatus.UNPROCESSABLE_ENTITY,
        );
      }

      return text.trim();
    } catch (error) {
      // Log error nhưng không expose internal details
      console.error('Lỗi khi gọi Tika API:', error);

      // Re-throw với message rõ ràng hơn
      if (error instanceof HttpException) {
        throw error;
      }

      // Network errors hoặc unknown errors
      throw new HttpException(
        'Không thể extract text từ file. Vui lòng kiểm tra Tika server có đang chạy không.',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }
}

