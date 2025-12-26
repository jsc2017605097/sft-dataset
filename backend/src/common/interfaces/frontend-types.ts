/**
 * Frontend Types - Copy từ frontend/types.ts
 * Đảm bảo tương thích 100% với React Frontend
 */

export type FileStatus = 'Pending' | 'Processing' | 'Completed' | 'Error';

export interface Document {
  id: string;
  name: string;
  size: string;
  uploadDate: string;
  totalSamples: number;
  reviewedSamples: number;
  status: 'Ready' | 'Processing' | 'Failed';
  createdBy?: string; // Username của người tạo document (optional for backward compatibility)
  lastProcessedChunkIndex?: number; // Chunk cuối cùng đã xử lý (0-based index)
  totalChunks?: number; // Tổng số chunks của tài liệu
}

export type QAStatus = 'Pending' | 'Reviewed' | 'Edited';

export interface QAPair {
  id: string;
  docId: string;
  question: string;
  answer: string;
  status: QAStatus;
  originalQuestion?: string;
  originalAnswer?: string;
}

export interface GeneratedQA {
  question: string;
  answer: string;
}



