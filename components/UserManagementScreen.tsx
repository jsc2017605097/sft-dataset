import React, { useState, useEffect } from 'react';
import { User } from '../types';
import {
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
  toggleUserActive,
  CreateUserRequest,
  UpdateUserRequest,
} from '../services/apiService';
import {
  Users,
  UserPlus,
  Edit2,
  Trash2,
  Lock,
  Unlock,
  X,
  Loader2,
  ArrowLeft,
  Shield,
  UserCheck,
} from 'lucide-react';
import { useNotification } from '../contexts/NotificationContext';

interface UserManagementScreenProps {
  onBack: () => void;
}

type ModalMode = 'create' | 'edit' | null;

interface UserFormData {
  username: string;
  password: string;
  email: string;
  role: 'user' | 'admin';
  isActive: boolean;
}

export const UserManagementScreen: React.FC<UserManagementScreenProps> = ({ onBack }) => {
  const { showToast, showConfirm } = useNotification();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<UserFormData>({
    username: '',
    password: '',
    email: '',
    role: 'user',
    isActive: true,
  });
  const [formErrors, setFormErrors] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Load users
  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAllUsers();
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải danh sách users');
    } finally {
      setLoading(false);
    }
  };

  // Open create modal
  const handleCreateClick = () => {
    setFormData({
      username: '',
      password: '',
      email: '',
      role: 'user',
      isActive: true,
    });
    setFormErrors(null);
    setSelectedUser(null);
    setModalMode('create');
  };

  // Open edit modal
  const handleEditClick = (user: User) => {
    setFormData({
      username: user.username,
      password: '', // Không hiển thị password cũ
      email: user.email || '',
      role: user.role,
      isActive: user.isActive,
    });
    setFormErrors(null);
    setSelectedUser(user);
    setModalMode('edit');
  };

  // Close modal
  const handleCloseModal = () => {
    setModalMode(null);
    setSelectedUser(null);
    setFormData({
      username: '',
      password: '',
      email: '',
      role: 'user',
      isActive: true,
    });
    setFormErrors(null);
  };

  // Submit form (create or edit)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors(null);
    setSubmitting(true);

    try {
      if (modalMode === 'create') {
        // Validate password
        if (!formData.password || formData.password.length < 6) {
          setFormErrors('Password phải có ít nhất 6 ký tự');
          setSubmitting(false);
          return;
        }

        const createData: CreateUserRequest = {
          username: formData.username,
          password: formData.password,
          email: formData.email || undefined,
          role: formData.role,
        };
        await createUser(createData);
      } else if (modalMode === 'edit' && selectedUser) {
        const updateData: UpdateUserRequest = {
          username: formData.username,
          email: formData.email || undefined,
          role: formData.role,
          isActive: formData.isActive,
        };
        // Chỉ update password nếu người dùng nhập password mới
        if (formData.password) {
          if (formData.password.length < 6) {
            setFormErrors('Password phải có ít nhất 6 ký tự');
            setSubmitting(false);
            return;
          }
          updateData.password = formData.password;
        }
        await updateUser(selectedUser.id, updateData);
      }

      await loadUsers();
      handleCloseModal();
    } catch (err) {
      setFormErrors(err instanceof Error ? err.message : 'Có lỗi xảy ra');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete user
  const handleDelete = async (user: User) => {
    const confirmed = await showConfirm({
      title: 'Xác nhận xóa user',
      message: `Bạn có chắc chắn muốn xóa user "${user.username}"?\n\nHành động này không thể hoàn tác.`,
      confirmText: 'Xóa',
      cancelText: 'Hủy',
      type: 'danger',
    });

    if (!confirmed) return;

    try {
      await deleteUser(user.id);
      await loadUsers();
      showToast('success', `Đã xóa user "${user.username}" thành công`);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Không thể xóa user');
    }
  };

  // Toggle user active status
  const handleToggleActive = async (user: User) => {
    try {
      await toggleUserActive(user.id);
      await loadUsers();
      showToast('success', `Đã ${user.isActive ? 'khóa' : 'mở khóa'} user "${user.username}"`);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Không thể thay đổi trạng thái user');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-gray-600">Đang tải danh sách users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
              <Users className="text-white" size={16} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Quản lý tài khoản</h1>
              <p className="text-xs text-gray-500 mt-0.5">Tổng {users.length} tài khoản</p>
            </div>
          </div>
        </div>
        <button
          onClick={handleCreateClick}
          className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <UserPlus size={16} />
          Tạo tài khoản mới
        </button>
      </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {/* Users Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">Tên người dùng</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">Email</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">Vai trò</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">Trạng thái</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">Ngày tạo</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-700">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    Chưa có user nào
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                          <span className="text-white text-sm font-medium">
                            {user.username.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="font-medium text-gray-900">{user.username}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {user.email || <span className="text-gray-400 italic">Chưa có email</span>}
                    </td>
                    <td className="px-6 py-4">
                      {user.role === 'admin' ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                          <Shield size={12} />
                          Admin
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">
                          <UserCheck size={12} />
                          User
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {user.isActive ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                          <Unlock size={12} />
                          Hoạt động
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                          <Lock size={12} />
                          Bị khóa
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(user.createdAt).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEditClick(user)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Sửa"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleToggleActive(user)}
                          className={`p-2 rounded-lg transition-colors ${
                            user.isActive
                              ? 'text-yellow-600 hover:bg-yellow-50'
                              : 'text-green-600 hover:bg-green-50'
                          }`}
                          title={user.isActive ? 'Khóa' : 'Mở khóa'}
                        >
                          {user.isActive ? <Lock size={16} /> : <Unlock size={16} />}
                        </button>
                        <button
                          onClick={() => handleDelete(user)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Xóa"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Modal (Create/Edit) */}
      {modalMode && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                {modalMode === 'create' ? 'Tạo tài khoản mới' : 'Chỉnh sửa tài khoản'}
              </h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {formErrors && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {formErrors}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tên người dùng
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  required
                  minLength={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                  placeholder="Nhập tên người dùng"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mật khẩu {modalMode === 'edit' && <span className="text-gray-500">(để trống nếu không đổi)</span>}
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required={modalMode === 'create'}
                  minLength={6}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                  placeholder={modalMode === 'create' ? 'Nhập mật khẩu' : 'Nhập mật khẩu mới (nếu muốn đổi)'}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email (tùy chọn)
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                  placeholder="Nhập email"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vai trò
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as 'user' | 'admin' })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              {modalMode === 'edit' && (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                    Tài khoản đang hoạt động
                  </label>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {submitting && <Loader2 className="animate-spin" size={16} />}
                  {modalMode === 'create' ? 'Tạo mới' : 'Cập nhật'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

