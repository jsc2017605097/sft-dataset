/**
 * API Service - Gọi Backend NestJS API
 * Thay thế việc gọi trực tiếp Tika/Ollama từ FE
 */

import { Document, QAPair, User, AuthResponse } from '../types';

export interface GeneratedQA {
  question: string;
  answer: string;
}

export interface ProcessFileResponse {
  fileName: string;
  fileSize: string;
  qaPairs: GeneratedQA[];
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://100.101.198.12:3001';
const TOKEN_STORAGE_KEY = 'sft_access_token';

// ==================== Auth Helper Functions ====================

/**
 * Lưu access token vào localStorage
 */
export const saveToken = (token: string): void => {
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
};

/**
 * Lấy access token từ localStorage
 */
export const getToken = (): string | null => {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
};

/**
 * Xóa access token khỏi localStorage
 */
export const clearToken = (): void => {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
};

/**
 * Tạo headers với Authorization token (nếu có)
 */
const getAuthHeaders = (): HeadersInit => {
  const token = getToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
};

/**
 * Tạo headers cho multipart/form-data (không set Content-Type, browser tự động set với boundary)
 */
const getAuthHeadersForFormData = (): HeadersInit => {
  const token = getToken();
  const headers: HeadersInit = {};
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
};

// ==================== Auth APIs ====================

/**
 * Đăng ký user mới
 * Note: Backend sẽ trả về HTTP 201 nếu tài khoản cần được admin kích hoạt
 */
export const register = async (username: string, password: string, email?: string): Promise<AuthResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password, email }),
    });

    // HTTP 201 = đăng ký thành công nhưng cần admin kích hoạt
    if (response.status === 201) {
      const data = await response.json();
      // Throw error với message từ backend để App.tsx catch và hiển thị
      throw new Error(data.message || 'Đăng ký thành công! Vui lòng đợi admin kích hoạt tài khoản của bạn.');
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const data: AuthResponse = await response.json();
    saveToken(data.accessToken);
    return data;
  } catch (error) {
    console.error('Lỗi khi đăng ký:', error);
    throw error;
  }
};

/**
 * Đăng nhập
 */
export const login = async (username: string, password: string): Promise<AuthResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const data: AuthResponse = await response.json();
    saveToken(data.accessToken);
    return data;
  } catch (error) {
    console.error('Lỗi khi đăng nhập:', error);
    throw error;
  }
};

/**
 * Đăng xuất (client-side: clear token)
 */
export const logout = (): void => {
  clearToken();
};

/**
 * Lấy thông tin user hiện tại (verify token)
 */
export const getCurrentUser = async (): Promise<User> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const data: User = await response.json();
    return data;
  } catch (error) {
    console.error('Lỗi khi lấy thông tin user:', error);
    throw error;
  }
};

/**
 * Admin tạo user mới (có thể chọn role)
 * Chỉ admin mới có quyền gọi API này
 */
export const adminCreateUser = async (
  username: string,
  password: string,
  email?: string,
  role?: 'user' | 'admin'
): Promise<User> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/admin/create-user`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ username, password, email, role }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const data: User = await response.json();
    return data;
  } catch (error) {
    console.error('Lỗi khi tạo user:', error);
    throw error;
  }
};

// ==================== Document APIs ====================

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

    // Gọi Backend API với auth header
    const response = await fetch(`${API_BASE_URL}/api/upload/process`, {
      method: 'POST',
      headers: getAuthHeadersForFormData(),
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
      headers: getAuthHeaders(),
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
      headers: getAuthHeaders(),
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
      headers: getAuthHeaders(),
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
      headers: getAuthHeaders(),
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
 * Tạo Q&A pair thủ công
 */
export const createManualQAPair = async (docId: string, question: string, answer: string): Promise<QAPair> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/qa`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ docId, question, answer }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Lỗi khi tạo Q&A thủ công:', error);
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
      headers: getAuthHeaders(),
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

/**
 * Generate thêm Q&A pairs cho document đã có
 * @param docId - ID của document
 * @param count - Số lượng Q&A pairs cần tạo thêm
 * @returns Mảng các Q&A pairs mới được tạo
 */
export const generateMoreQAPairs = async (docId: string, count: number): Promise<QAPair[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/documents/${docId}/generate-more`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ count }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const data: QAPair[] = await response.json();
    return data;
  } catch (error) {
    console.error('Lỗi khi generate thêm Q&A pairs:', error);
    throw error;
  }
};

/**
 * Interface cho Remote File
 */
export interface RemoteFile {
  name: string;
  size: number;
  sizeFormatted: string;
  isProcessed: boolean;
  docId?: string;
  processedDate?: string;
}

/**
 * Lấy danh sách file từ xa (từ folder data/uploads)
 */
export const getRemoteFiles = async (): Promise<RemoteFile[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/remote-files`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const data: RemoteFile[] = await response.json();
    return data;
  } catch (error) {
    console.error('Lỗi khi lấy danh sách remote files:', error);
    throw error;
  }
};

/**
 * Xử lý file từ xa (từ folder data/uploads)
 * @param fileName - Tên file trong folder uploads
 * @param autoGenerate - Có tự động generate Q&A không
 * @param count - Số lượng Q&A pairs cần tạo
 * @returns Document đã được tạo
 */
export const processRemoteFile = async (
  fileName: string,
  autoGenerate: boolean = true,
  count: number = 5,
): Promise<Document> => {
  try {
    // Encode filename để xử lý ký tự đặc biệt trong URL
    const encodedFileName = encodeURIComponent(fileName);

    const response = await fetch(`${API_BASE_URL}/api/remote-files/${encodedFileName}/process`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ autoGenerate, count }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const data: Document = await response.json();
    return data;
  } catch (error) {
    console.error('Lỗi khi xử lý remote file:', error);
    throw error;
  }
};

/**
 * Settings API
 */
export interface SettingsResponse {
  useDefaultPrompt: boolean;
  customPrompt: string | null;
  defaultPromptTemplate: string;
  updatedAt: string;
}

export interface UpdateSettingsRequest {
  useDefaultPrompt: boolean;
  customPrompt?: string | null;
}

/**
 * Get current settings
 */
export const getSettings = async (): Promise<SettingsResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/settings`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Lỗi khi lấy settings:', error);
    throw error;
  }
};

/**
 * Update settings
 */
export const updateSettings = async (data: UpdateSettingsRequest): Promise<SettingsResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/settings`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Lỗi khi cập nhật settings:', error);
    throw error;
  }
};

// ==================== User Management APIs (Admin only) ====================

export interface UpdateUserRequest {
  username?: string;
  password?: string;
  email?: string;
  role?: 'user' | 'admin';
  isActive?: boolean;
}

export interface CreateUserRequest {
  username: string;
  password: string;
  email?: string;
  role?: 'user' | 'admin';
}

/**
 * Lấy danh sách tất cả users (Admin only)
 */
export const getAllUsers = async (): Promise<User[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/admin/users`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Lỗi khi lấy danh sách users:', error);
    throw error;
  }
};

/**
 * Lấy chi tiết 1 user (Admin only)
 */
export const getUserById = async (userId: string): Promise<User> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/admin/users/${userId}`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Lỗi khi lấy chi tiết user:', error);
    throw error;
  }
};

/**
 * Tạo user mới (Admin only)
 */
export const createUser = async (data: CreateUserRequest): Promise<User> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/admin/create-user`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Lỗi khi tạo user:', error);
    throw error;
  }
};

/**
 * Cập nhật thông tin user (Admin only)
 */
export const updateUser = async (userId: string, data: UpdateUserRequest): Promise<User> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/admin/users/${userId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Lỗi khi cập nhật user:', error);
    throw error;
  }
};

/**
 * Xóa user (Admin only)
 */
export const deleteUser = async (userId: string): Promise<void> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/admin/users/${userId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
  } catch (error) {
    console.error('Lỗi khi xóa user:', error);
    throw error;
  }
};

/**
 * Khóa/mở khóa user (Admin only)
 */
export const toggleUserActive = async (userId: string): Promise<User> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/admin/users/${userId}/toggle-active`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Lỗi khi toggle user active:', error);
    throw error;
  }
};

// ==================== Document Reassignment API (Admin only) ====================

/**
 * Gán lại document cho user khác (Admin only)
 */
export const reassignDocument = async (docId: string, userId: string): Promise<Document> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/documents/${docId}/reassign`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ userId }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Lỗi khi gán lại document:', error);
    throw error;
  }
};


