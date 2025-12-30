
import React, { useState } from 'react';
import { Upload, X, FileText, ChevronDown, Check, Loader2, ArrowLeft, Download, Sparkles, FileSpreadsheet } from 'lucide-react';
import { FileStatus } from '../types';
import { processFile, processTemplateFile, processTextTemplateFile } from '../services/apiService';
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
  file: File;
}

export const UploadScreen: React.FC<UploadScreenProps> = ({ onBack, onComplete }) => {
  const { showToast } = useNotification();
  const [files, setFiles] = useState<UploadingFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processMode, setProcessMode] = useState<'ai' | 'csv-template' | 'text-template'>('text-template');
  const [settings, setSettings] = useState({
    autoGenerate: true,
    sentencesPerChunk: 5,
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).map((f: File) => {
        if (processMode === 'csv-template' && !f.name.toLowerCase().endsWith('.csv')) {
          showToast('error', `File "${f.name}" không phải CSV. Vui lòng chọn file CSV.`);
          return null;
        }
        if (processMode === 'text-template' && !f.name.toLowerCase().match(/\.(txt|pdf|doc|docx)$/i)) {
          showToast('error', `File "${f.name}" không hợp lệ. Vui lòng chọn file TXT, PDF, DOC hoặc DOCX.`);
          return null;
        }
        if (processMode === 'ai' && !f.name.toLowerCase().match(/\.(pdf|docx)$/i)) {
          showToast('error', `File "${f.name}" không phải PDF hoặc DOCX. Vui lòng chọn file PDF/DOCX.`);
          return null;
        }
        
        return {
          id: Math.random().toString(36).substr(2, 9),
          name: f.name,
          size: (f.size / (1024 * 1024)).toFixed(2) + ' MB',
          status: 'Pending' as FileStatus,
          progress: 0,
          file: f,
        };
      }).filter(f => f !== null) as UploadingFile[];
      
      setFiles(prev => [...prev, ...newFiles]);
    }
  };

  const handleDownloadTemplate = () => {
    const link = document.createElement('a');
    link.href = '/templates/qa-template.csv';
    link.download = 'qa-template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('success', 'Đã tải template mẫu thành công!');
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
        setFiles(prev => prev.map(f => f.id === fileItem.id ? { ...f, progress: 20 } : f));
        setFiles(prev => prev.map(f => f.id === fileItem.id ? { ...f, progress: 50 } : f));
        
        let result;
        if (processMode === 'csv-template') {
          result = await processTemplateFile(fileItem.file);
        } else if (processMode === 'text-template') {
          result = await processTextTemplateFile(fileItem.file);
        } else {
          result = await processFile(
            fileItem.file,
            settings.autoGenerate,
            settings.sentencesPerChunk,
          );
        }

        setFiles(prev => prev.map(f => f.id === fileItem.id ? { ...f, progress: 100, status: 'Completed' } : f));
        await new Promise(r => setTimeout(r, 800));
        onComplete(result.fileName, result.fileSize, result.qaPairs);
      } catch (error) {
        console.error(`Lỗi khi xử lý file ${fileItem.name}:`, error);
        setFiles(prev => prev.map(f => 
          f.id === fileItem.id 
            ? { ...f, status: 'Error' as FileStatus, progress: 0 } 
            : f
        ));
        showToast('error', `Lỗi khi xử lý file "${fileItem.name}": ${error instanceof Error ? error.message : 'Lỗi không xác định'}`);
      }
    }

    setIsProcessing(false);
  };

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
          <h1 className="text-xl font-bold text-gray-900">Xử lý tài liệu mới</h1>
          <p className="text-sm text-gray-500 mt-0.5">Tải lên tài liệu PDF/DOCX để tự động tạo Q&A, hoặc upload template đã điền sẵn (CSV hoặc văn bản).</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Process Mode Selection */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wider">Chế độ xử lý</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <label className={`relative flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all ${
              processMode === 'ai'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}>
              <input 
                type="radio" 
                name="processMode"
                value="ai"
                checked={processMode === 'ai'}
                onChange={() => {
                  setProcessMode('ai');
                  setFiles([]);
                }}
                className="sr-only"
              />
              <div className="flex items-start gap-3 flex-1">
                <div className={`flex-shrink-0 p-2 rounded-lg ${
                  processMode === 'ai' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
                }`}>
                  <Sparkles size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-gray-900">Tự động gen bằng AI</div>
                  <p className="text-xs text-gray-500 mt-1">Upload PDF/DOCX, hệ thống tự động tạo Q&A bằng Ollama AI</p>
                </div>
              </div>
            </label>

            <label className={`relative flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all ${
              processMode === 'csv-template'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}>
              <input 
                type="radio" 
                name="processMode"
                value="csv-template"
                checked={processMode === 'csv-template'}
                onChange={() => {
                  setProcessMode('csv-template');
                  setFiles([]);
                }}
                className="sr-only"
              />
              <div className="flex items-start gap-3 flex-1">
                <div className={`flex-shrink-0 p-2 rounded-lg ${
                  processMode === 'csv-template' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
                }`}>
                  <FileSpreadsheet size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-gray-900">Template CSV</div>
                  <p className="text-xs text-gray-500 mt-1">Upload CSV template đã điền sẵn câu hỏi và câu trả lời</p>
                </div>
              </div>
            </label>

            <label className={`relative flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all ${
              processMode === 'text-template'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}>
              <input 
                type="radio" 
                name="processMode"
                value="text-template"
                checked={processMode === 'text-template'}
                onChange={() => {
                  setProcessMode('text-template');
                  setFiles([]);
                }}
                className="sr-only"
              />
              <div className="flex items-start gap-3 flex-1">
                <div className={`flex-shrink-0 p-2 rounded-lg ${
                  processMode === 'text-template' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
                }`}>
                  <FileText size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-gray-900">Template văn bản</div>
                  <p className="text-xs text-gray-500 mt-1">Upload TXT/PDF/DOC/DOCX với format "Câu hỏi X:" và "Trả lời:"</p>
                </div>
              </div>
            </label>
          </div>

          {processMode === 'csv-template' && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <button
                onClick={handleDownloadTemplate}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm"
              >
                <Download size={16} />
                Tải template mẫu (CSV)
              </button>
              <p className="text-xs text-gray-500 mt-2">
                💡 Tip: Tải template mẫu, mở bằng Excel, điền câu hỏi và câu trả lời, sau đó Save as CSV (UTF-8) để tránh lỗi format.
              </p>
            </div>
          )}

          {processMode === 'text-template' && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-blue-900 mb-2">📝 Format yêu cầu:</h3>
                <div className="text-xs text-blue-800 space-y-1 font-mono bg-white p-3 rounded border border-blue-100">
                  <div>Câu hỏi 1: <span className="text-gray-600">&lt;nội dung câu hỏi&gt;</span></div>
                  <div>Trả lời: <span className="text-gray-600">&lt;nội dung trả lời&gt;</span></div>
                  <div className="pt-1 opacity-50">...</div>
                  <div>Câu hỏi 2: <span className="text-gray-600">&lt;nội dung câu hỏi&gt;</span></div>
                  <div>Trả lời: <span className="text-gray-600">&lt;nội dung trả lời&gt;</span></div>
                </div>
                <p className="text-xs text-blue-700 mt-2">
                  💡 File có thể chứa tiêu đề hoặc nội dung khác, hệ thống sẽ tự động tách các cặp Q&A dựa trên từ khóa "Câu hỏi" và "Trả lời".
                </p>
              </div>
            </div>
          )}
        </div>

        {/* File Upload Area */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wider">Tải lên tệp</h2>
          <div 
            className="border-2 border-dashed border-gray-300 rounded-lg p-12 flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 hover:border-blue-400 transition-all cursor-pointer group"
            onClick={() => document.getElementById('file-input')?.click()}
          >
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4 group-hover:scale-110 transition-transform border border-gray-200">
              <Upload className="text-blue-600" size={28} />
            </div>
            <p className="text-base font-semibold text-gray-900 mb-1">Nhấp hoặc kéo tệp vào đây để tải lên</p>
            <p className="text-sm text-gray-500">
              {processMode === 'ai' && 'PDF, DOCX tối đa 50MB'}
              {processMode === 'csv-template' && 'CSV template tối đa 10MB'}
              {processMode === 'text-template' && 'TXT, PDF, DOC, DOCX tối đa 50MB'}
            </p>
            <input 
              id="file-input"
              type="file" 
              className="hidden" 
              multiple 
              accept={
                processMode === 'ai' ? '.pdf,.docx' : 
                processMode === 'csv-template' ? '.csv' : 
                '.txt,.pdf,.doc,.docx'
              }
              onChange={handleFileChange}
            />
          </div>
        </div>

        {/* Selected Files */}
        {files.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Tệp đã chọn ({files.length})</h2>
            </div>
            <div className="divide-y divide-gray-200">
              {files.map(file => (
                <div key={file.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center flex-1 min-w-0">
                      <div className="flex-shrink-0 p-2 bg-blue-50 rounded-lg text-blue-600 mr-3">
                        <FileText size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate" title={file.name}>
                          {file.name}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">{file.size}</div>
                        {file.status === 'Processing' && (
                          <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2">
                            <div className="bg-blue-500 h-1.5 rounded-full transition-all duration-500" style={{ width: `${file.progress}%` }} />
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex-shrink-0 ml-4">
                      {file.status === 'Completed' ? (
                        <Check className="text-green-500" size={20} />
                      ) : isProcessing ? (
                        <Loader2 className="text-blue-600 animate-spin" size={20} />
                      ) : (
                        <button 
                          onClick={() => removeFile(file.id)}
                          className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                        >
                          <X size={18} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Settings (AI Mode Only) */}
        {processMode === 'ai' && (
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wider">Cấu hình xử lý</h2>
            <div className="space-y-4">
              <label className="flex items-center cursor-pointer group">
                <input 
                  type="checkbox" 
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  checked={settings.autoGenerate}
                  onChange={(e) => setSettings(prev => ({ ...prev, autoGenerate: e.target.checked }))}
                />
                <span className="ml-3 text-sm font-medium text-gray-700 group-hover:text-gray-900 transition-colors">
                  Tự động tạo cặp Q&A bằng Ollama AI
                </span>
              </label>
              <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                <span className="text-sm font-medium text-gray-700">Số lượng Q&A pairs</span>
                <div className="relative inline-block">
                  <select
                    className="appearance-none block w-32 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white cursor-pointer font-medium"
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
        )}

        {/* Submit Button */}
        <button
          onClick={processFiles}
          disabled={files.length === 0 || isProcessing}
          className={`w-full py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 ${
            files.length === 0 || isProcessing 
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
            : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
          }`}
        >
          {isProcessing ? (
            <>
              <Loader2 className="animate-spin" size={20} />
              Đang xử lý dữ liệu...
            </>
          ) : (
            <>
              <Upload size={18} />
              Tải lên & Bắt đầu xử lý
            </>
          )}
        </button>
      </div>
    </div>
  );
};
