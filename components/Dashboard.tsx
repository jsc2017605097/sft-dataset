
import React, { useState } from 'react';
import { Search, Plus, FileText, ExternalLink, Download, Trash2, FolderOpen, Settings, Users, UserCog, X, Loader2, BarChart3 } from 'lucide-react';
import { Document, User as UserType } from '../types';
import { getAllUsers, reassignDocument } from '../services/apiService';
import { useNotification } from '../contexts/NotificationContext';

interface DashboardProps {
  documents: Document[];
  onUploadClick: () => void;
  onViewSamples: (docId: string) => void;
  onDeleteDoc: (docId: string) => void;
  onRemoteFilesClick?: () => void;
  onSettingsClick?: () => void;
  onUserManagementClick?: () => void;
  onStaffMonitoringClick?: () => void;
  onReassignDoc?: (docId: string, userId: string) => Promise<void>;
  currentUser?: UserType | null;
}

export const Dashboard: React.FC<DashboardProps> = ({ 
  documents, 
  onUploadClick, 
  onViewSamples, 
  onDeleteDoc, 
  onRemoteFilesClick, 
  onSettingsClick,
  onUserManagementClick,
  onStaffMonitoringClick,
  onReassignDoc,
  currentUser,
}) => {
  const { showConfirm, showToast } = useNotification();
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'All' | 'Completed' | 'Incomplete'>('All');
  
  // Reassign modal state
  const [reassignModalOpen, setReassignModalOpen] = useState(false);
  const [selectedDocForReassign, setSelectedDocForReassign] = useState<Document | null>(null);
  const [availableUsers, setAvailableUsers] = useState<UserType[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [reassigning, setReassigning] = useState(false);
  const [reassignError, setReassignError] = useState<string | null>(null);

  const isAdmin = currentUser?.role === 'admin';

  // Tính toán counts cho từng loại
  const totalCount = documents.length;
  const completedCount = documents.filter(d => d.reviewedSamples === d.totalSamples).length;
  const incompleteCount = documents.filter(d => d.reviewedSamples < d.totalSamples).length;

  const filteredDocs = documents.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Filter logic
    let matchesFilter = true;
    if (filter === 'Completed') {
      matchesFilter = doc.reviewedSamples === doc.totalSamples;
    } else if (filter === 'Incomplete') {
      matchesFilter = doc.reviewedSamples < doc.totalSamples;
    }
    
    return matchesSearch && matchesFilter;
  });

  // Open reassign modal
  const handleReassignClick = async (doc: Document) => {
    setSelectedDocForReassign(doc);
    setReassignModalOpen(true);
    setReassignError(null);
    setSelectedUserId('');
    
    // Load users
    setLoadingUsers(true);
    try {
      const users = await getAllUsers();
      setAvailableUsers(users.filter(u => u.isActive)); // Chỉ show active users
    } catch (err) {
      setReassignError(err instanceof Error ? err.message : 'Không thể tải danh sách users');
    } finally {
      setLoadingUsers(false);
    }
  };

  // Close reassign modal
  const handleCloseReassignModal = () => {
    setReassignModalOpen(false);
    setSelectedDocForReassign(null);
    setAvailableUsers([]);
    setSelectedUserId('');
    setReassignError(null);
  };

  // Submit reassign
  const handleReassignSubmit = async () => {
    if (!selectedDocForReassign || !selectedUserId) return;
    
    setReassigning(true);
    setReassignError(null);
    
    try {
      if (onReassignDoc) {
        await onReassignDoc(selectedDocForReassign.id, selectedUserId);
      } else {
        // Fallback: gọi trực tiếp API
        await reassignDocument(selectedDocForReassign.id, selectedUserId);
        showToast('success', 'Đã gán lại tài liệu thành công');
      }
      handleCloseReassignModal();
      // Parent component sẽ reload documents
    } catch (err) {
      setReassignError(err instanceof Error ? err.message : 'Không thể gán lại tài liệu');
    } finally {
      setReassigning(false);
    }
  };

  // Handle delete with confirmation
  const handleDeleteClick = async (doc: Document) => {
    const confirmed = await showConfirm({
      title: 'Xác nhận xóa tài liệu',
      message: `Bạn có chắc chắn muốn xóa tài liệu "${doc.name}"?\n\nHành động này không thể hoàn tác và sẽ xóa tất cả ${doc.totalSamples} mẫu Q&A liên quan.`,
      confirmText: 'Xóa',
      cancelText: 'Hủy',
      type: 'danger',
    });
    
    if (confirmed) {
      onDeleteDoc(doc.id);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Bảng điều khiển tài liệu</h1>
          <p className="text-sm text-gray-500 mt-1">Quản lý và duyệt các bộ dữ liệu SFT pháp luật của bạn.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onUploadClick}
            className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus size={16} className="mr-1.5" />
            Xử lý tài liệu mới
          </button>
          {onRemoteFilesClick && (
            <button
              onClick={onRemoteFilesClick}
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 bg-white text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              <FolderOpen size={16} className="mr-1.5" />
              Tài liệu từ xa
            </button>
          )}
          {isAdmin && onUserManagementClick && (
            <button
              onClick={onUserManagementClick}
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 bg-white text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              <Users size={16} className="mr-1.5" />
              Quản lý tài khoản
            </button>
          )}
          {isAdmin && onStaffMonitoringClick && (
            <button
              onClick={onStaffMonitoringClick}
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 bg-white text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              <BarChart3 size={16} className="mr-1.5" />
              Giám sát cán bộ
            </button>
          )}
          {isAdmin && onSettingsClick && (
            <button
              onClick={onSettingsClick}
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 bg-white text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              <Settings size={16} className="mr-1.5" />
              Cài đặt
            </button>
          )}
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
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              filter === 'All' 
                ? 'bg-blue-50 text-blue-700' 
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            Tất cả ({totalCount})
          </button>
          <button
            onClick={() => setFilter('Completed')}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              filter === 'Completed' 
                ? 'bg-blue-50 text-blue-700' 
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            Hoàn thành ({completedCount})
          </button>
          <button
            onClick={() => setFilter('Incomplete')}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              filter === 'Incomplete' 
                ? 'bg-blue-50 text-blue-700' 
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            Chưa hoàn thành ({incompleteCount})
          </button>
        </div>
      </div>

      {/* Document List */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 table-fixed">
          <thead className="bg-gray-50">
            <tr>
              <th className="w-[22%] px-4 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Tên tài liệu</th>
              <th className="w-[15%] px-4 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Người tạo</th>
              <th className="w-[35%] px-4 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Tiến độ duyệt</th>
              <th className="w-[28%] px-4 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {filteredDocs.map((doc) => {
              const progress = (doc.reviewedSamples / doc.totalSamples) * 100;
              return (
                <tr key={doc.id} className="hover:bg-gray-50 transition-colors group">
                  <td className="px-4 py-4 max-w-0">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 p-2 bg-blue-50 rounded-lg text-blue-600 mr-3">
                        <FileText size={18} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate max-w-[200px]" title={doc.name}>
                          {doc.name}
                        </div>
                        <div className="text-xs text-gray-500">{doc.size} • {doc.uploadDate}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-xs font-semibold mr-2">
                        {doc.createdBy ? doc.createdBy.charAt(0).toUpperCase() : '?'}
                      </div>
                      <span className="text-sm text-gray-700 truncate" title={doc.createdBy || 'Không xác định'}>
                        {doc.createdBy || 'N/A'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-medium text-gray-600">
                          {doc.reviewedSamples} / {doc.totalSamples} Đã duyệt
                        </span>
                        <span className="text-xs font-semibold text-gray-900">{Math.round(progress)}%</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
                        <div
                          className="bg-blue-500 h-1.5 rounded-full transition-all duration-500"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => onViewSamples(doc.id)}
                        className="inline-flex items-center px-4 py-2 bg-gray-900 text-white text-xs font-medium rounded-lg hover:bg-gray-800 transition-colors"
                      >
                        <ExternalLink size={14} className="mr-1.5" />
                        Xem mẫu
                      </button>
                      {isAdmin && (
                        <button
                          onClick={() => handleReassignClick(doc)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg border border-transparent hover:border-blue-100 transition-colors"
                          title="Gán lại cho user khác"
                        >
                          <UserCog size={18} />
                        </button>
                      )}
                      <button
                        className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg border border-transparent hover:border-gray-200 transition-colors"
                        title="Xuất JSON"
                      >
                        <Download size={18} />
                      </button>
                      {isAdmin && (
                        <button
                          onClick={() => handleDeleteClick(doc)}
                          className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg border border-transparent hover:border-red-100 transition-colors"
                          title="Xóa tài liệu"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
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

      {/* Reassign Modal */}
      {reassignModalOpen && selectedDocForReassign && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Gán lại tài liệu</h2>
              <button
                onClick={handleCloseReassignModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-2">Tài liệu:</p>
                <p className="font-medium text-gray-900">{selectedDocForReassign.name}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Hiện tại thuộc về: <span className="font-medium">{selectedDocForReassign.createdBy || 'N/A'}</span>
                </p>
              </div>

              {loadingUsers ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="animate-spin text-blue-600" size={24} />
                  <span className="ml-2 text-gray-600">Đang tải danh sách users...</span>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Gán cho user:
                  </label>
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                  >
                    <option value="">-- Chọn user --</option>
                    {availableUsers.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.username} {user.role === 'admin' ? '(Admin)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {reassignError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {reassignError}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCloseReassignModal}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Hủy
                </button>
                <button
                  onClick={handleReassignSubmit}
                  disabled={!selectedUserId || reassigning || loadingUsers}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {reassigning && <Loader2 className="animate-spin" size={16} />}
                  Gán lại
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
