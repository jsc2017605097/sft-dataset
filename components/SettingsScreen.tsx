import React, { useState, useEffect } from 'react';
import { ArrowLeft, Settings, CheckCircle2, AlertCircle, Save, FileText, Info } from 'lucide-react';
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
        <div className="flex items-center space-x-3 text-gray-600">
          <Settings className="animate-spin" size={24} />
          <span className="text-lg">Đang tải cấu hình...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-6">
          <div className="flex items-center space-x-4 mb-2">
            <button
              onClick={onBack}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft size={20} />
              <span className="font-medium">Quay lại</span>
            </button>
          </div>
          <div className="flex items-center space-x-3 mt-4">
            <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg">
              <Settings className="text-blue-600" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Cài đặt System Prompt</h1>
              <p className="text-gray-600 text-sm mt-1">
                Tùy chỉnh cách Ollama tạo câu hỏi và câu trả lời từ tài liệu
              </p>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start space-x-3">
            <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {/* Success Message */}
        {successMessage && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex items-start space-x-3">
            <CheckCircle2 className="text-green-600 flex-shrink-0 mt-0.5" size={20} />
            <p className="text-green-800 text-sm">{successMessage}</p>
          </div>
        )}

        {/* Settings Form */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          {/* Mode Selection */}
          <div className="mb-8">
            <label className="block text-gray-900 font-semibold text-lg mb-4">
              Chế độ Prompt
            </label>
            <div className="space-y-3">
              <label className="flex items-start space-x-3 p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-blue-300 transition-colors">
                <input
                  type="radio"
                  name="mode"
                  value="default"
                  checked={mode === 'default'}
                  onChange={(e) => setMode(e.target.value as 'default' | 'custom')}
                  className="w-5 h-5 text-blue-600 mt-0.5"
                />
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <CheckCircle2 className="text-green-600" size={18} />
                    <span className="font-medium text-gray-900">Sử dụng prompt mặc định</span>
                    <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded">Khuyên dùng</span>
                  </div>
                  <p className="text-sm text-gray-600 ml-6">
                    Prompt đã được tối ưu và test kỹ với tài liệu pháp luật Việt Nam
                  </p>
                </div>
              </label>

              <label className="flex items-start space-x-3 p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-blue-300 transition-colors">
                <input
                  type="radio"
                  name="mode"
                  value="custom"
                  checked={mode === 'custom'}
                  onChange={(e) => setMode(e.target.value as 'default' | 'custom')}
                  className="w-5 h-5 text-blue-600 mt-0.5"
                />
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <FileText className="text-blue-600" size={18} />
                    <span className="font-medium text-gray-900">Tùy chỉnh prompt</span>
                  </div>
                  <p className="text-sm text-gray-600 ml-6">
                    Chỉnh sửa prompt để phù hợp với nhu cầu cụ thể của bạn
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Prompt Textarea */}
          <div className="mb-8">
            <label className="block text-gray-900 font-semibold text-lg mb-4">
              Nội dung System Prompt
            </label>
            <textarea
              value={mode === 'default' ? defaultPrompt : customPrompt}
              onChange={(e) => mode === 'custom' && setCustomPrompt(e.target.value)}
              disabled={mode === 'default'}
              rows={14}
              className={`w-full px-4 py-3 border-2 rounded-lg text-sm leading-relaxed transition-colors ${
                mode === 'default'
                  ? 'bg-gray-50 text-gray-700 border-gray-200 cursor-not-allowed'
                  : 'bg-white text-gray-900 border-gray-300 focus:border-blue-500'
              } focus:outline-none focus:ring-2 focus:ring-blue-200`}
              placeholder="Nhập system prompt của bạn..."
            />
            <div className="flex items-start space-x-2 mt-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
              <Info className="text-blue-600 flex-shrink-0 mt-0.5" size={18} />
              <p className="text-sm text-blue-800">
                <strong>Lưu ý:</strong> Prompt này chỉ quy định vai trò và phong cách của AI. 
                Format JSON và validation rules sẽ được tự động thêm vào bởi hệ thống.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-6 border-t-2 border-gray-100">
            <button
              onClick={handleApplyDefault}
              disabled={mode === 'default'}
              className={`flex items-center space-x-2 px-5 py-2.5 rounded-lg font-medium transition-all ${
                mode === 'default'
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-700 text-white hover:bg-gray-800 hover:shadow-md'
              }`}
            >
              <FileText size={18} />
              <span>Áp dụng prompt mặc định</span>
            </button>

            <button
              onClick={handleSave}
              disabled={saving}
              className={`flex items-center space-x-2 px-6 py-2.5 rounded-lg font-medium transition-all ${
                saving
                  ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md'
              }`}
            >
              {saving ? (
                <>
                  <Settings className="animate-spin" size={18} />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <>
                  <Save size={18} />
                  <span>Lưu cấu hình</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Info Section */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 mt-6">
          <div className="flex items-center space-x-2 mb-4">
            <div className="flex items-center justify-center w-8 h-8 bg-blue-600 rounded-lg">
              <Info className="text-white" size={18} />
            </div>
            <h3 className="font-bold text-blue-900 text-lg">Hướng dẫn sử dụng</h3>
          </div>
          <ul className="text-sm text-blue-900 space-y-2.5">
            <li className="flex items-start space-x-2">
              <CheckCircle2 className="text-blue-600 flex-shrink-0 mt-0.5" size={16} />
              <span>Prompt mặc định đã được tối ưu cho tài liệu pháp luật tiếng Việt</span>
            </li>
            <li className="flex items-start space-x-2">
              <CheckCircle2 className="text-blue-600 flex-shrink-0 mt-0.5" size={16} />
              <span>Nếu muốn tùy chỉnh, hãy chọn "Tùy chỉnh prompt" và nhập nội dung của bạn</span>
            </li>
            <li className="flex items-start space-x-2">
              <CheckCircle2 className="text-blue-600 flex-shrink-0 mt-0.5" size={16} />
              <span>Bạn có thể bấm "Áp dụng prompt mặc định" để sử dụng nội dung mặc định làm base chỉnh sửa</span>
            </li>
            <li className="flex items-start space-x-2">
              <CheckCircle2 className="text-blue-600 flex-shrink-0 mt-0.5" size={16} />
              <span>Sau khi lưu, cache sẽ tự động cập nhật và áp dụng ngay không cần restart server</span>
            </li>
            <li className="flex items-start space-x-2">
              <CheckCircle2 className="text-blue-600 flex-shrink-0 mt-0.5" size={16} />
              <span>Format JSON và validation rules sẽ được hệ thống tự động thêm vào</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

