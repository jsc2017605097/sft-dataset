/**
 * API Service - Gọi Backend NestJS API
 * Thay thế việc gọi trực tiếp Tika/Ollama từ FE
 */

import { Document, QAPair } from '../types';

export interface GeneratedQA {
  question: string;
  answer: string;
}

export interface ProcessFileResponse {
  fileName: string;
  fileSize: string;
  qaPairs: GeneratedQA[];
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/**
 * Process file: Upload file và generate Q&A pairs
 * @param file - File object từ browser
 * @param autoGenerate - Có tự động generate Q&A không
 * @param count - Số lượng Q&A pairs cần tạo
 * @returns ProcessFileResponse với fileName, fileSize, qaPairs
 */
export const processFile = async (
  file: File,
  autoGenerate: boolean = true,
  count: number = 5,
): Promise<ProcessFileResponse> => {
  try {
    // Tạo FormData để gửi file
    const formData = new FormData();
    formData.append('file', file);
    formData.append('autoGenerate', String(autoGenerate));
    formData.append('count', String(count));

    // Gọi Backend API
    const response = await fetch(`${API_BASE_URL}/api/upload/process`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const data: ProcessFileResponse = await response.json();
    return data;
  } catch (error) {
    console.error('Lỗi khi gọi Backend API:', error);
    throw error;
  }
};

/**
 * Lấy danh sách Documents (cho Dashboard)
 */
export const getDocuments = async (): Promise<Document[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/documents`, {
      method: 'GET',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const data: Document[] = await response.json();
    return data;
  } catch (error) {
    console.error('Lỗi khi lấy danh sách documents:', error);
    throw error;
  }
};

/**
 * Lấy Q&A pairs của một document (cho ReviewScreen)
 */
export const getQAPairs = async (docId: string): Promise<QAPair[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/documents/${docId}/qa-pairs`, {
      method: 'GET',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const data: QAPair[] = await response.json();
    return data;
  } catch (error) {
    console.error('Lỗi khi lấy Q&A pairs:', error);
    throw error;
  }
};

/**
 * Cập nhật một Q&A pair (edit/review)
 */
export const updateQAPair = async (qaId: string, updates: Partial<QAPair>): Promise<QAPair> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/qa/${qaId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const data: QAPair = await response.json();
    return data;
  } catch (error) {
    console.error('Lỗi khi cập nhật Q&A pair:', error);
    throw error;
  }
};

/**
 * Xóa một Q&A pair
 */
export const deleteQAPair = async (qaId: string): Promise<void> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/qa/${qaId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
  } catch (error) {
    console.error('Lỗi khi xóa Q&A pair:', error);
    throw error;
  }
};

/**
 * Xóa một document
 */
export const deleteDocument = async (docId: string): Promise<void> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/documents/${docId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
  } catch (error) {
    console.error('Lỗi khi xóa document:', error);
    throw error;
  }
};


