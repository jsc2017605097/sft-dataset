import React, { useState, useEffect } from 'react';
import { getSettings, updateSettings, SettingsResponse } from '../services/apiService';

interface SettingsScreenProps {
  onBack: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onBack }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [mode, setMode] = useState<'default' | 'custom'>('default');
  const [customPrompt, setCustomPrompt] = useState('');
  const [defaultPrompt, setDefaultPrompt] = useState('');

  // Load settings từ API
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const data: SettingsResponse = await getSettings();
      
      setMode(data.useDefaultPrompt ? 'default' : 'custom');
      setCustomPrompt(data.customPrompt || '');
      setDefaultPrompt(data.defaultPromptTemplate);
    } catch (err) {
      setError(`Không thể tải cấu hình: ${err instanceof Error ? err.message : 'Lỗi không xác định'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyDefault = () => {
    setCustomPrompt(defaultPrompt);
    setSuccessMessage('Đã áp dụng prompt mặc định vào textarea');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);

      await updateSettings({
        useDefaultPrompt: mode === 'default',
        customPrompt: mode === 'custom' ? customPrompt : null,
      });

      setSuccessMessage('Lưu cấu hình thành công! Cache đã được cập nhật.');
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      setError(`Lỗi khi lưu cấu hình: ${err instanceof Error ? err.message : 'Lỗi không xác định'}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Đang tải cấu hình...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={onBack}
                className="text-gray-600 hover:text-gray-800"
              >
                ← Quay lại
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-800">⚙️ Cài đặt System Prompt</h1>
                <p className="text-gray-600 mt-1">
                  Tùy chỉnh cách Ollama tạo câu hỏi và câu trả lời
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Success Message */}
        {successMessage && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <p className="text-green-800">{successMessage}</p>
          </div>
        )}

        {/* Settings Form */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          {/* Mode Selection */}
          <div className="mb-6">
            <label className="block text-gray-700 font-semibold mb-3">
              Chế độ Prompt:
            </label>
            <div className="space-y-3">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  name="mode"
                  value="default"
                  checked={mode === 'default'}
                  onChange={(e) => setMode(e.target.value as 'default' | 'custom')}
                  className="w-4 h-4 text-blue-600"
                />
                <div>
                  <div className="font-medium text-gray-800">
                    📌 Sử dụng prompt mặc định (Khuyên dùng)
                  </div>
                  <div className="text-sm text-gray-600">
                    Prompt đã được test kỹ và hoạt động tốt với tài liệu pháp luật
                  </div>
                </div>
              </label>

              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  name="mode"
                  value="custom"
                  checked={mode === 'custom'}
                  onChange={(e) => setMode(e.target.value as 'default' | 'custom')}
                  className="w-4 h-4 text-blue-600"
                />
                <div>
                  <div className="font-medium text-gray-800">
                    ✏️ Tùy chỉnh prompt
                  </div>
                  <div className="text-sm text-gray-600">
                    Chỉnh sửa prompt để phù hợp với nhu cầu cụ thể của bạn
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Prompt Textarea */}
          <div className="mb-6">
            <label className="block text-gray-700 font-semibold mb-2">
              Nội dung System Prompt:
            </label>
            <textarea
              value={mode === 'default' ? defaultPrompt : customPrompt}
              onChange={(e) => mode === 'custom' && setCustomPrompt(e.target.value)}
              disabled={mode === 'default'}
              rows={12}
              className={`w-full px-4 py-3 border rounded-lg font-mono text-sm ${
                mode === 'default'
                  ? 'bg-gray-50 text-gray-600 cursor-not-allowed'
                  : 'bg-white text-gray-800'
              } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              placeholder="Nhập system prompt của bạn..."
            />
            <p className="text-sm text-gray-600 mt-2">
              💡 <strong>Lưu ý:</strong> Prompt này chỉ quy định vai trò và phong cách.
              Format JSON và validation rules sẽ được tự động thêm vào bởi hệ thống.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t">
            <button
              onClick={handleApplyDefault}
              disabled={mode === 'default'}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                mode === 'default'
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-gray-600 text-white hover:bg-gray-700'
              }`}
            >
              📋 Áp dụng prompt mặc định
            </button>

            <button
              onClick={handleSave}
              disabled={saving}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                saving
                  ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {saving ? 'Đang lưu...' : '💾 Lưu cấu hình'}
            </button>
          </div>
        </div>

        {/* Info Section */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
          <h3 className="font-semibold text-blue-900 mb-2">ℹ️ Hướng dẫn:</h3>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li>Prompt mặc định đã được tối ưu cho tài liệu pháp luật tiếng Việt</li>
            <li>Nếu muốn tùy chỉnh, hãy chọn "Tùy chỉnh prompt" và nhập nội dung của bạn</li>
            <li>Bạn có thể bấm "Áp dụng prompt mặc định" để fill nội dung mặc định làm base chỉnh sửa</li>
            <li>Sau khi lưu, cache sẽ tự động cập nhật và áp dụng ngay không cần restart server</li>
            <li>Format JSON và validation rules sẽ được hệ thống tự động thêm vào</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

