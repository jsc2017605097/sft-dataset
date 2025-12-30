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
   * Clean text: Loại bỏ Word metadata và ký tự đặc biệt không cần thiết
   * @param text - Raw text từ Tika
   * @returns Cleaned text
   */
  private cleanExtractedText(text: string): string {
    let cleaned = text;

    // 1. Remove Word bookmarks: [bookmark: _Hlk155168448]
    cleaned = cleaned.replace(/\[bookmark:\s*[^\]]+\]/gi, '');

    // 2. Remove Word hyperlinks metadata: [hyperlink: ...]
    cleaned = cleaned.replace(/\[hyperlink:\s*[^\]]+\]/gi, '');

    // 3. Remove Word comments: [comment: ...]
    cleaned = cleaned.replace(/\[comment:\s*[^\]]+\]/gi, '');

    // 4. Remove excessive newlines (3+ newlines → 2 newlines)
    // Làm TRƯỚC khi xử lý spaces để giữ structure
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

    // 5. Trim each line và remove multiple spaces TRONG mỗi line
    // KHÔNG replace \n thành space
    cleaned = cleaned
      .split('\n')
      .map(line => line.trim().replace(/\s+/g, ' ')) // Replace spaces trong từng line
      .join('\n');

    // 6. Final trim
    return cleaned.trim();
  }

  /**
   * Extract text từ file sử dụng Apache Tika
   * @param fileBuffer - File buffer từ multer
   * @returns Plain text đã được extract và clean từ file
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

      // Clean text: Remove Word metadata và normalize whitespace
      const cleanedText = this.cleanExtractedText(text);

      console.log('[Tika] Text extracted and cleaned. Length:', cleanedText.length);

      return cleanedText;
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

