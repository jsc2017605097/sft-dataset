import React, { useState, useEffect } from 'react';
import { FileText, Loader2, ArrowLeft, ExternalLink, Play, Filter } from 'lucide-react';
import { getRemoteFiles, processRemoteFile, RemoteFile } from '../services/apiService';
import { Badge } from './Badge';
import { useNotification } from '../contexts/NotificationContext';

interface RemoteFilesScreenProps {
  onBack: () => void;
  onViewDocument: (docId: string) => void;
}

export const RemoteFilesScreen: React.FC<RemoteFilesScreenProps> = ({ onBack, onViewDocument }) => {
  const { showToast } = useNotification();
  const [files, setFiles] = useState<RemoteFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'All' | 'Processed' | 'Unprocessed'>('Unprocessed');
  const [processingFile, setProcessingFile] = useState<string | null>(null);
  const [showProcessModal, setShowProcessModal] = useState<{ fileName: string } | null>(null);
  const [processCount, setProcessCount] = useState(5);

  // Load files khi mount
  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = async () => {
    try {
      setLoading(true);
      setError(null);
      const remoteFiles = await getRemoteFiles();
      
      // Deduplicate files: nếu có nhiều file cùng tên (sau khi loại UUID), chỉ giữ 1
      const deduplicatedFiles = deduplicateFiles(remoteFiles);
      
      setFiles(deduplicatedFiles);
    } catch (err) {
      console.error('Lỗi khi load remote files:', err);
      setError(err instanceof Error ? err.message : 'Không thể tải danh sách file');
    } finally {
      setLoading(false);
    }
  };

  // Helper function: Deduplicate files dựa trên normalized name
  const deduplicateFiles = (files: RemoteFile[]): RemoteFile[] => {
    const fileMap = new Map<string, RemoteFile>();
    
    for (const file of files) {
      const normalizedName = getDisplayFileName(file.name).toLowerCase().trim();
      
      const existing = fileMap.get(normalizedName);
      
      if (!existing) {
        // Chưa có file nào với tên này → thêm vào
        fileMap.set(normalizedName, file);
      } else {
        // Đã có file với tên này → giữ file tốt hơn
        // Ưu tiên: 1. File đã xử lý, 2. File có UUID (mới hơn)
        const shouldReplace = 
          (file.isProcessed && !existing.isProcessed) || // File mới đã xử lý, file cũ chưa
          (file.isProcessed === existing.isProcessed && file.name.includes('-')); // Cùng trạng thái, ưu tiên file có UUID
        
        if (shouldReplace) {
          fileMap.set(normalizedName, file);
        }
      }
    }
    
    return Array.from(fileMap.values());
  };

  const handleProcessFile = async (fileName: string, count: number) => {
    try {
      setProcessingFile(fileName);
      setError(null);
      
      await processRemoteFile(fileName, true, count);
      
      // Reload danh sách file sau khi xử lý thành công
      await loadFiles();
      
      // Đóng modal
      setShowProcessModal(null);
      
      // Hiển thị thông báo thành công
      showToast('success', `Đã xử lý file "${getDisplayFileName(fileName)}" thành công!`);
    } catch (err) {
      console.error('Lỗi khi xử lý file:', err);
      showToast('error', `Lỗi khi xử lý file "${getDisplayFileName(fileName)}": ${err instanceof Error ? err.message : 'Lỗi không xác định'}`);
    } finally {
      setProcessingFile(null);
    }
  };

  // Helper function: Loại bỏ UUID prefix khi hiển thị (nhưng vẫn dùng full name để xử lý)
  const getDisplayFileName = (fileName: string): string => {
    // UUID format: 8-4-4-4-12 hex characters, theo sau là dấu _
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}_/i;
    return fileName.replace(uuidPattern, '');
  };

  const filteredFiles = files.filter((file) => {
    if (filter === 'All') return true;
    if (filter === 'Processed') return file.isProcessed;
    if (filter === 'Unprocessed') return !file.isProcessed;
    return true;
  });

  // Tính số lượng file cho mỗi filter
  const totalCount = files.length;
  const processedCount = files.filter(f => f.isProcessed).length;
  const unprocessedCount = files.filter(f => !f.isProcessed).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onBack}
          className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Quản lý tài liệu từ xa</h1>
          <p className="text-sm text-gray-500 mt-0.5">Quản lý và xử lý các tài liệu trong folder uploads.</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-4 mb-6">
        <Filter size={18} className="text-gray-400" />
        <div className="flex bg-white border border-gray-200 rounded-lg p-1">
          <button
            onClick={() => setFilter('All')}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              filter === 'All' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Tất cả ({totalCount})
          </button>
          <button
            onClick={() => setFilter('Unprocessed')}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              filter === 'Unprocessed' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Chưa xử lý ({unprocessedCount})
          </button>
          <button
            onClick={() => setFilter('Processed')}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              filter === 'Processed' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Đã xử lý ({processedCount})
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800 font-medium">Lỗi: {error}</p>
          <button
            onClick={loadFiles}
            className="mt-2 text-red-600 hover:text-red-800 underline text-sm"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="animate-spin text-blue-600" size={48} />
            <p className="text-gray-500">Đang tải danh sách file...</p>
          </div>
        </div>
      ) : (
        /* File List */
        <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto shadow-sm" style={{ width: '100%' }}>
          <table className="w-full divide-y divide-gray-200" style={{ minWidth: '800px' }}>
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider" style={{ width: '40%', maxWidth: '400px' }}>
                  Tên file
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider" style={{ width: '15%' }}>
                  Kích thước
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider" style={{ width: '15%' }}>
                  Trạng thái
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider" style={{ width: '30%' }}>
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {filteredFiles.map((file) => (
                <tr key={file.name} className="hover:bg-gray-50 transition-colors group">
                  <td className="px-6 py-4 whitespace-nowrap" style={{ maxWidth: '400px' }}>
                    <div className="flex items-center">
                      <div className="p-2 bg-blue-50 rounded-lg text-blue-600 mr-3 flex-shrink-0">
                        <FileText size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-gray-900 truncate" title={getDisplayFileName(file.name)}>
                          {getDisplayFileName(file.name)}
                        </div>
                        {file.isProcessed && file.processedDate && (
                          <div className="text-xs text-gray-400">Đã xử lý: {file.processedDate}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-600">{file.sizeFormatted}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {file.isProcessed ? (
                      <Badge variant="green">Đã xử lý</Badge>
                    ) : (
                      <Badge variant="blue">Chưa xử lý</Badge>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-2" style={{ minHeight: '40px' }}>
                      {file.isProcessed ? (
                        <button
                          onClick={() => file.docId && onViewDocument(file.docId)}
                          className="inline-flex items-center px-3 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-lg hover:bg-gray-800 transition-colors"
                        >
                          <ExternalLink size={14} className="mr-1.5" />
                          Xem chi tiết
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setShowProcessModal({ fileName: file.name });
                          }}
                          disabled={processingFile === file.name}
                          className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 shadow-sm"
                          style={{ 
                            minWidth: '140px',
                          }}
                        >
                          {processingFile === file.name ? (
                            <>
                              <Loader2 size={16} className="mr-2 animate-spin" />
                              <span>Đang xử lý...</span>
                            </>
                          ) : (
                            <>
                              <Play size={16} className="mr-2" />
                              <span>Xử lý sinh mẫu</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredFiles.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center">
                      <FileText size={48} className="text-gray-200 mb-4" />
                      <p>
                        {files.length === 0
                          ? 'Không có file nào trong folder uploads.'
                          : 'Không tìm thấy file phù hợp với bộ lọc.'}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Process Modal */}
      {showProcessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Xử lý file: {getDisplayFileName(showProcessModal.fileName)}
            </h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Số lượng Q&A pairs
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                value={processCount}
                onChange={(e) => setProcessCount(parseInt(e.target.value))}
              >
                <option value={3}>3 pairs</option>
                <option value={5}>5 pairs</option>
                <option value={8}>8 pairs</option>
                <option value={10}>10 pairs</option>
              </select>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowProcessModal(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={() => handleProcessFile(showProcessModal.fileName, processCount)}
                disabled={processingFile === showProcessModal.fileName}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  processingFile === showProcessModal.fileName
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {processingFile === showProcessModal.fileName ? 'Đang xử lý...' : 'Xử lý'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

