/**
 * Tika Service - Extract text từ file PDF/DOCX
 * Gọi Tika API để trích xuất nội dung văn bản thuần từ file
 */

const TIKA_ENDPOINT = 'http://localhost:9998/tika';

/**
 * Extract text từ file sử dụng Apache Tika
 * @param file - File object từ browser (PDF hoặc DOCX)
 * @returns Plain text đã được extract từ file
 * @throws Error nếu Tika server không phản hồi hoặc file không hợp lệ
 */
export const extractTextFromFile = async (file: File): Promise<string> => {
  try {
    // Đọc file thành ArrayBuffer để gửi binary data
    const fileBuffer = await file.arrayBuffer();
    
    // Gọi Tika API với PUT request
    const response = await fetch(TIKA_ENDPOINT, {
      method: 'PUT',
      headers: {
        'Accept': 'text/plain',
        'Content-Type': 'application/octet-stream',
      },
      body: fileBuffer,
    });

    // Kiểm tra response status
    if (!response.ok) {
      throw new Error(`Tika API error: ${response.status} ${response.statusText}`);
    }

    // Đọc text response
    const text = await response.text();
    
    // Kiểm tra nếu text rỗng
    if (!text || text.trim().length === 0) {
      throw new Error('Tika trả về nội dung rỗng. File có thể không có text hoặc định dạng không được hỗ trợ.');
    }

    return text.trim();
  } catch (error) {
    console.error('Lỗi khi gọi Tika API:', error);
    
    // Re-throw với message rõ ràng hơn
    if (error instanceof Error) {
      throw new Error(`Không thể extract text từ file: ${error.message}`);
    }
    throw new Error('Không thể extract text từ file: Lỗi không xác định');
  }
};


