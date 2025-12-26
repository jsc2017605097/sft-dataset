
import React, { useState, useCallback } from 'react';
import { Upload, X, FileText, ChevronDown, Check, Loader2, ArrowLeft } from 'lucide-react';
import { FileStatus } from '../types';
import { processFile } from '../services/apiService';
import { useNotification } from '../contexts/NotificationContext';

interface UploadScreenProps {
  onBack: () => void;
  onComplete: (docName: string, docSize: string, qaPairs: any[]) => void;
}

interface UploadingFile {
  id: string;
  name: string;
  size: string;
  status: FileStatus;
  progress: number;
  file: File; // Lưu File object để gửi lên Tika
}

export const UploadScreen: React.FC<UploadScreenProps> = ({ onBack, onComplete }) => {
  const { showToast } = useNotification();
  const [files, setFiles] = useState<UploadingFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [settings, setSettings] = useState({
    autoGenerate: true,
    sentencesPerChunk: 5,
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).map((f: File) => ({
        id: Math.random().toString(36).substr(2, 9),
        name: f.name,
        size: (f.size / (1024 * 1024)).toFixed(2) + ' MB',
        status: 'Pending' as FileStatus,
        progress: 0,
        file: f, // Lưu File object để gửi lên Tika
      }));
      setFiles(prev => [...prev, ...newFiles]);
    }
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const processFiles = async () => {
    if (files.length === 0) return;
    setIsProcessing(true);

    setFiles(prev => prev.map(f => ({ ...f, status: 'Processing', progress: 10 })));

    for (const fileItem of files) {
      try {
        // Update progress: Uploading
        setFiles(prev => prev.map(f => f.id === fileItem.id ? { ...f, progress: 20 } : f));
        
        // Gọi Backend API để process file
        setFiles(prev => prev.map(f => f.id === fileItem.id ? { ...f, progress: 50 } : f));
        
        const result = await processFile(
          fileItem.file,
          settings.autoGenerate,
          settings.sentencesPerChunk,
        );

        // Step 3: Hoàn thành (progress: 100%)
        setFiles(prev => prev.map(f => f.id === fileItem.id ? { ...f, progress: 100, status: 'Completed' } : f));
        
        await new Promise(r => setTimeout(r, 800));
        
        onComplete(result.fileName, result.fileSize, result.qaPairs);
      } catch (error) {
        // Xử lý lỗi: đánh dấu file là Error
        console.error(`Lỗi khi xử lý file ${fileItem.name}:`, error);
        setFiles(prev => prev.map(f => 
          f.id === fileItem.id 
            ? { ...f, status: 'Error' as FileStatus, progress: 0 } 
            : f
        ));
        
        // Hiển thị thông báo cho user
        showToast('error', `Lỗi khi xử lý file "${fileItem.name}": ${error instanceof Error ? error.message : 'Lỗi không xác định'}`);
      }
    }

    setIsProcessing(false);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <button
        onClick={onBack}
        className="flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 mb-8 transition-colors"
      >
        <ArrowLeft size={16} className="mr-2" />
        Quay lại Bảng điều khiển
      </button>

      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="p-8 border-b border-gray-100">
          <h2 className="text-2xl font-bold text-gray-900">Tải lên tài liệu</h2>
          <p className="text-gray-500">Tải lên các tệp PDF hoặc DOCX để tự động tạo bộ câu hỏi huấn luyện SFT.</p>
        </div>

        <div className="p-8 space-y-8">
          <div 
            className="border-2 border-dashed border-gray-200 rounded-xl p-10 flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 hover:border-blue-400 transition-all cursor-pointer group"
            onClick={() => document.getElementById('file-input')?.click()}
          >
            <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-sm mb-4 group-hover:scale-110 transition-transform">
              <Upload className="text-blue-600" size={24} />
            </div>
            <p className="text-gray-900 font-semibold">Nhấp hoặc kéo tệp vào đây để tải lên</p>
            <p className="text-gray-500 text-sm mt-1">PDF, DOCX tối đa 50MB</p>
            <input 
              id="file-input"
              type="file" 
              className="hidden" 
              multiple 
              accept=".pdf,.docx"
              onChange={handleFileChange}
            />
          </div>

          {files.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Tệp đã chọn</h3>
              <div className="space-y-2">
                {files.map(file => (
                  <div key={file.id} className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-xl shadow-sm">
                    <div className="flex items-center flex-1">
                      <div className="p-2 bg-blue-50 text-blue-600 rounded-lg mr-4">
                        <FileText size={20} />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-semibold text-gray-900 truncate max-w-[200px]">{file.name}</span>
                          <span className="text-xs text-gray-400">{file.size}</span>
                        </div>
                        {file.status === 'Processing' && (
                          <div className="w-full bg-gray-100 rounded-full h-1 mt-2">
                            <div className="bg-blue-600 h-1 rounded-full transition-all" style={{ width: `${file.progress}%` }} />
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="ml-4">
                      {file.status === 'Completed' ? (
                        <Check className="text-green-500" size={20} />
                      ) : isProcessing ? (
                        <Loader2 className="text-blue-600 animate-spin" size={20} />
                      ) : (
                        <button 
                          onClick={() => removeFile(file.id)}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <X size={20} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-gray-50 rounded-xl p-6 border border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Cấu hình xử lý</h3>
            <div className="space-y-4">
              <label className="flex items-center cursor-pointer group">
                <input 
                  type="checkbox" 
                  className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  checked={settings.autoGenerate}
                  onChange={(e) => setSettings(prev => ({ ...prev, autoGenerate: e.target.checked }))}
                />
                <span className="ml-3 text-sm font-medium text-gray-700 group-hover:text-gray-900 transition-colors">
                  Tự động tạo cặp Q&A bằng Ollama AI
                </span>
              </label>
              <div className="flex items-center justify-between pt-2">
                <span className="text-sm font-medium text-gray-700">Số lượng Q&A pairs</span>
                <div className="relative inline-block text-left">
                  <select
                    className="appearance-none block w-32 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500 bg-white cursor-pointer"
                    value={settings.sentencesPerChunk}
                    onChange={(e) => setSettings(prev => ({ ...prev, sentencesPerChunk: parseInt(e.target.value) }))}
                  >
                    <option value={3}>3 pairs</option>
                    <option value={5}>5 pairs</option>
                    <option value={8}>8 pairs</option>
                    <option value={10}>10 pairs</option>
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={processFiles}
            disabled={files.length === 0 || isProcessing}
            className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all flex items-center justify-center gap-2 ${
              files.length === 0 || isProcessing 
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
              : 'bg-blue-600 text-white hover:bg-blue-700 hover:scale-[1.01]'
            }`}
          >
            {isProcessing ? (
              <>
                <Loader2 className="animate-spin" size={24} />
                Đang xử lý dữ liệu...
              </>
            ) : (
              'Tải lên & Bắt đầu xử lý'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
