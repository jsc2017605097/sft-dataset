
import React, { useState } from 'react';
import { Search, Plus, FileText, CheckCircle2, Clock, MoreVertical, ExternalLink, Download, Trash2, FolderOpen, Settings } from 'lucide-react';
import { Document } from '../types';
import { Badge } from './Badge';

interface DashboardProps {
  documents: Document[];
  onUploadClick: () => void;
  onViewSamples: (docId: string) => void;
  onDeleteDoc: (docId: string) => void;
  onRemoteFilesClick?: () => void;
  onSettingsClick?: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ documents, onUploadClick, onViewSamples, onDeleteDoc, onRemoteFilesClick, onSettingsClick }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'All' | 'Unreviewed'>('All');

  const filteredDocs = documents.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === 'All' || doc.reviewedSamples < doc.totalSamples;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bảng điều khiển tài liệu</h1>
          <p className="text-gray-500">Quản lý và duyệt các bộ dữ liệu SFT pháp luật của bạn.</p>
        </div>
        <div className="flex items-center gap-3">
          {onSettingsClick && (
            <button
              onClick={onSettingsClick}
              className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors shadow-sm"
            >
              <Settings size={18} className="mr-2" />
              Cài đặt
            </button>
          )}
          {onRemoteFilesClick && (
            <button
              onClick={onRemoteFilesClick}
              className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors shadow-sm"
            >
              <FolderOpen size={18} className="mr-2" />
              Tài liệu từ xa
            </button>
          )}
          <button
            onClick={onUploadClick}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus size={18} className="mr-2" />
            Xử lý tài liệu mới
          </button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-center gap-4 mb-6">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Tìm kiếm tài liệu..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex bg-white border border-gray-200 rounded-lg p-1">
          <button
            onClick={() => setFilter('All')}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${filter === 'All' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
          >
            Tất cả
          </button>
          <button
            onClick={() => setFilter('Unreviewed')}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${filter === 'Unreviewed' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
          >
            Chưa duyệt
          </button>
        </div>
      </div>

      {/* Document List */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Tên tài liệu</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Tiến độ duyệt</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Trạng thái</th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {filteredDocs.map((doc) => {
              const progress = (doc.reviewedSamples / doc.totalSamples) * 100;
              return (
                <tr key={doc.id} className="hover:bg-gray-50 transition-colors group">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="p-2 bg-blue-50 rounded-lg text-blue-600 mr-3">
                        <FileText size={20} />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-gray-900">{doc.name}</div>
                        <div className="text-xs text-gray-400">{doc.size} • Tải lên: {doc.uploadDate}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="w-48">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-medium text-gray-600">
                          {doc.reviewedSamples} / {doc.totalSamples} Đã duyệt
                        </span>
                        <span className="text-xs font-bold text-gray-900">{Math.round(progress)}%</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
                        <div
                          className="bg-green-500 h-1.5 rounded-full transition-all duration-500"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge variant={doc.status === 'Ready' ? 'green' : 'blue'}>
                      {doc.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => onViewSamples(doc.id)}
                        className="inline-flex items-center px-3 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-lg hover:bg-gray-800 transition-colors"
                      >
                        <ExternalLink size={14} className="mr-1.5" />
                        Xem mẫu
                      </button>
                      <button
                        className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg border border-transparent hover:border-gray-200"
                        title="Xuất JSON"
                      >
                        <Download size={18} />
                      </button>
                      <button
                        onClick={() => onDeleteDoc(doc.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg border border-transparent hover:border-red-100"
                        title="Xóa tài liệu"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filteredDocs.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                  <div className="flex flex-col items-center">
                    <Search size={48} className="text-gray-200 mb-4" />
                    <p>{documents.length === 0 ? 'Chưa có tài liệu nào. Hãy tải lên tài liệu đầu tiên!' : 'Không tìm thấy tài liệu phù hợp.'}</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
