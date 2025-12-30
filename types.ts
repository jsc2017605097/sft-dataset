
export type FileStatus = 'Pending' | 'Processing' | 'Completed' | 'Error';

export interface Document {
  id: string;
  name: string;
  size: string;
  uploadDate: string;
  totalSamples: number;
  reviewedSamples: number;
  status: 'Ready' | 'Processing' | 'Failed';
  createdBy?: string; // Username của người tạo document
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

// Auth types
export interface User {
  id: string;
  username: string;
  email: string | null;
  role: 'user' | 'admin';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
}

// Analytics types
export interface StaffStats {
  userId: string;
  username: string;
  totalDocs: number;
  completedDocs: number;
  incompleteDocs: number;
  totalQAPairs: number;
  reviewedQAPairs: number;
  editedQAPairs: number;
  avgCompletionRate: number;
  oldestPendingDocDate: string | null;
  daysSinceOldestPending: number | null;
  isOverdue: boolean;
}

export interface StaffOverviewResponse {
  stats: StaffStats[];
  summary: {
    totalUsers: number;
    totalDocs: number;
    avgCompletionRate: number;
    overdueUsers: number;
  };
}

export type ViewState = 'login' | 'register' | 'dashboard' | 'upload' | 'review' | 'remote-files' | 'settings' | 'user-management' | 'staff-monitoring';

export interface AppState {
  view: ViewState;
  selectedDocId: string | null;
  documents: Document[];
  qaPairs: Record<string, QAPair[]>;
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
}
