import React, { useState, useEffect } from 'react';
import { ArrowLeft, Settings, CheckCircle2, AlertCircle, Save, FileText, Info, Bell, MessageSquare } from 'lucide-react';
import { getSettings, updateSettings, SettingsResponse } from '../services/apiService';

interface SettingsScreenProps {
  onBack: () => void;
}

type TabType = 'prompt' | 'warning';

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<TabType>('prompt');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [mode, setMode] = useState<'default' | 'custom'>('default');
  const [customPrompt, setCustomPrompt] = useState('');
  const [defaultPrompt, setDefaultPrompt] = useState('');
  
  // Warning configuration
  const [warningDaysThreshold, setWarningDaysThreshold] = useState(7);
  const [warningIncompleteDocsThreshold, setWarningIncompleteDocsThreshold] = useState(5);
  const [enableZeroProgressWarning, setEnableZeroProgressWarning] = useState(true);
  const [enableOverdueWarning, setEnableOverdueWarning] = useState(true);
  const [enableTooManyIncompleteWarning, setEnableTooManyIncompleteWarning] = useState(true);
  const [enableNoDocumentWarning, setEnableNoDocumentWarning] = useState(true);

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
      
      // Load warning configuration
      setWarningDaysThreshold(data.warningDaysThreshold || 7);
      setWarningIncompleteDocsThreshold(data.warningIncompleteDocsThreshold || 5);
      setEnableZeroProgressWarning(data.enableZeroProgressWarning ?? true);
      setEnableOverdueWarning(data.enableOverdueWarning ?? true);
      setEnableTooManyIncompleteWarning(data.enableTooManyIncompleteWarning ?? true);
      setEnableNoDocumentWarning(data.enableNoDocumentWarning ?? true);
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
        warningDaysThreshold,
        warningIncompleteDocsThreshold,
        enableZeroProgressWarning,
        enableOverdueWarning,
        enableTooManyIncompleteWarning,
        enableNoDocumentWarning,
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onBack}
          className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Cài đặt hệ thống</h1>
          <p className="text-sm text-gray-500 mt-0.5">Quản lý cấu hình prompt AI và cảnh báo giám sát</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm mb-6 overflow-hidden">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('prompt')}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 text-sm font-medium transition-all relative ${
              activeTab === 'prompt'
                ? 'text-blue-600 bg-blue-50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <MessageSquare size={18} />
            <span>System Prompt</span>
            {activeTab === 'prompt' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></div>
            )}
          </button>
          
          <button
            onClick={() => setActiveTab('warning')}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 text-sm font-medium transition-all relative ${
              activeTab === 'warning'
                ? 'text-orange-600 bg-orange-50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <Bell size={18} />
            <span>Cảnh báo giám sát</span>
            {activeTab === 'warning' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-600"></div>
            )}
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={18} />
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {/* Success Message */}
        {successMessage && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
            <CheckCircle2 className="text-green-600 flex-shrink-0 mt-0.5" size={18} />
            <p className="text-green-800 text-sm">{successMessage}</p>
          </div>
        )}

        {/* Prompt Tab Content */}
        {activeTab === 'prompt' && (
          <>
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-6">
                <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-lg">
                  <MessageSquare className="text-blue-600" size={18} />
                </div>
                <h2 className="text-base font-semibold text-gray-900">Chế độ Prompt</h2>
              </div>
          
          {/* Mode Selection */}
          <div className="space-y-3 mb-6">
            <label className={`relative flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all ${
              mode === 'default'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}>
              <input
                type="radio"
                name="mode"
                value="default"
                checked={mode === 'default'}
                onChange={(e) => setMode(e.target.value as 'default' | 'custom')}
                className="sr-only"
              />
              <div className="flex items-start gap-3 flex-1">
                <div className={`flex-shrink-0 p-2 rounded-lg ${
                  mode === 'default' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
                }`}>
                  <CheckCircle2 size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-gray-900">Sử dụng prompt mặc định</span>
                    <span className="text-[10px] font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded uppercase">Khuyên dùng</span>
                  </div>
                  <p className="text-xs text-gray-500">Prompt đã được tối ưu và test kỹ với tài liệu pháp luật Việt Nam</p>
                </div>
              </div>
            </label>

            <label className={`relative flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all ${
              mode === 'custom'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}>
              <input
                type="radio"
                name="mode"
                value="custom"
                checked={mode === 'custom'}
                onChange={(e) => setMode(e.target.value as 'default' | 'custom')}
                className="sr-only"
              />
              <div className="flex items-start gap-3 flex-1">
                <div className={`flex-shrink-0 p-2 rounded-lg ${
                  mode === 'custom' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
                }`}>
                  <FileText size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-gray-900 mb-1">Tùy chỉnh prompt</div>
                  <p className="text-xs text-gray-500">Chỉnh sửa prompt để phù hợp với nhu cầu cụ thể của bạn</p>
                </div>
              </div>
            </label>
          </div>

          {/* Prompt Textarea */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-900 mb-2 uppercase tracking-wider">
              Nội dung System Prompt
            </label>
            <textarea
              value={mode === 'default' ? defaultPrompt : customPrompt}
              onChange={(e) => mode === 'custom' && setCustomPrompt(e.target.value)}
              disabled={mode === 'default'}
              rows={14}
              className={`w-full px-4 py-3 border rounded-lg text-sm leading-relaxed transition-colors ${
                mode === 'default'
                  ? 'bg-gray-50 text-gray-700 border-gray-200 cursor-not-allowed'
                  : 'bg-white text-gray-900 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
              } focus:outline-none`}
              placeholder="Nhập system prompt của bạn..."
            />
            <div className="flex items-start gap-2 mt-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
              <Info className="text-blue-600 flex-shrink-0 mt-0.5" size={16} />
              <p className="text-xs text-blue-800">
                <strong>Lưu ý:</strong> Prompt này chỉ quy định vai trò và phong cách của AI. Format JSON và validation rules sẽ được tự động thêm vào bởi hệ thống.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <button
              onClick={handleApplyDefault}
              disabled={mode === 'default'}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                mode === 'default'
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-700 text-white hover:bg-gray-800'
              }`}
            >
              <FileText size={16} />
              <span>Áp dụng prompt mặc định</span>
            </button>

            <button
              onClick={handleSave}
              disabled={saving}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                saving
                  ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
              }`}
            >
              {saving ? (
                <>
                  <Settings className="animate-spin" size={16} />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <>
                  <Save size={16} />
                  <span>Lưu cấu hình</span>
                </>
              )}
            </button>
          </div>
        </div>

            {/* Prompt Info Section */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="flex items-center justify-center w-7 h-7 bg-blue-600 rounded-lg">
                  <Info className="text-white" size={16} />
                </div>
                <h3 className="font-semibold text-blue-900 text-base">Hướng dẫn sử dụng Prompt</h3>
              </div>
              <ul className="text-sm text-blue-900 space-y-2">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="text-blue-600 flex-shrink-0 mt-0.5" size={14} />
                  <span>Prompt mặc định đã được tối ưu cho tài liệu pháp luật tiếng Việt</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="text-blue-600 flex-shrink-0 mt-0.5" size={14} />
                  <span>Nếu muốn tùy chỉnh, hãy chọn "Tùy chỉnh prompt" và nhập nội dung của bạn</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="text-blue-600 flex-shrink-0 mt-0.5" size={14} />
                  <span>Bạn có thể bấm "Áp dụng prompt mặc định" để sử dụng nội dung mặc định làm base chỉnh sửa</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="text-blue-600 flex-shrink-0 mt-0.5" size={14} />
                  <span>Sau khi lưu, cache sẽ tự động cập nhật và áp dụng ngay không cần restart server</span>
                </li>
              </ul>
            </div>
          </>
        )}

        {/* Warning Tab Content */}
        {activeTab === 'warning' && (
          <>
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-6">
                <div className="flex items-center justify-center w-8 h-8 bg-orange-100 rounded-lg">
                  <Bell className="text-orange-600" size={18} />
                </div>
                <h2 className="text-base font-semibold text-gray-900">Cấu hình cảnh báo giám sát</h2>
              </div>
          
          {/* Thresholds */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ngưỡng cảnh báo quá hạn (ngày)
              </label>
              <input
                type="number"
                min="1"
                max="30"
                value={warningDaysThreshold}
                onChange={(e) => setWarningDaysThreshold(parseInt(e.target.value) || 7)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">Cảnh báo nếu tài liệu chưa hoàn thành sau X ngày</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ngưỡng cảnh báo tài liệu dở dang
              </label>
              <input
                type="number"
                min="1"
                max="50"
                value={warningIncompleteDocsThreshold}
                onChange={(e) => setWarningIncompleteDocsThreshold(parseInt(e.target.value) || 5)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">Cảnh báo nếu cán bộ có quá X tài liệu dở dang</p>
            </div>
          </div>

          {/* Enable/Disable Warnings */}
          <div className="space-y-3">
            <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
              <input
                type="checkbox"
                checked={enableOverdueWarning}
                onChange={(e) => setEnableOverdueWarning(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-200"
              />
              <div className="flex-1">
                <span className="text-sm font-medium text-gray-900">Cảnh báo tài liệu quá hạn</span>
                <p className="text-xs text-gray-500">Hiển thị cảnh báo khi tài liệu chưa hoàn thành vượt quá ngưỡng ngày</p>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
              <input
                type="checkbox"
                checked={enableZeroProgressWarning}
                onChange={(e) => setEnableZeroProgressWarning(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-200"
              />
              <div className="flex-1">
                <span className="text-sm font-medium text-gray-900">Cảnh báo chưa bắt đầu làm việc</span>
                <p className="text-xs text-gray-500">Cảnh báo khi cán bộ có tài liệu nhưng chưa review Q&A nào (0% tiến độ)</p>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
              <input
                type="checkbox"
                checked={enableTooManyIncompleteWarning}
                onChange={(e) => setEnableTooManyIncompleteWarning(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-200"
              />
              <div className="flex-1">
                <span className="text-sm font-medium text-gray-900">Cảnh báo quá nhiều tài liệu dở dang</span>
                <p className="text-xs text-gray-500">Cảnh báo khi cán bộ có quá nhiều tài liệu chưa hoàn thành</p>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
              <input
                type="checkbox"
                checked={enableNoDocumentWarning}
                onChange={(e) => setEnableNoDocumentWarning(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-200"
              />
              <div className="flex-1">
                <span className="text-sm font-medium text-gray-900">Cảnh báo chưa upload tài liệu nào</span>
                <p className="text-xs text-gray-500">Cảnh báo khi cán bộ chưa upload tài liệu nào vào hệ thống</p>
              </div>
            </label>
          </div>

              {/* Save Button for Warning */}
              <div className="flex justify-end pt-6 border-t border-gray-200 mt-6">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    saving
                      ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                      : 'bg-orange-600 text-white hover:bg-orange-700 shadow-sm'
                  }`}
                >
                  {saving ? (
                    <>
                      <Settings className="animate-spin" size={16} />
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      <span>Lưu cấu hình cảnh báo</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Warning Info Section */}
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="flex items-center justify-center w-7 h-7 bg-orange-600 rounded-lg">
                  <Info className="text-white" size={16} />
                </div>
                <h3 className="font-semibold text-orange-900 text-base">Hướng dẫn cảnh báo giám sát</h3>
              </div>
              <ul className="text-sm text-orange-900 space-y-2">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="text-orange-600 flex-shrink-0 mt-0.5" size={14} />
                  <span>Cấu hình này áp dụng cho tất cả cán bộ trong hệ thống giám sát</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="text-orange-600 flex-shrink-0 mt-0.5" size={14} />
                  <span>Ngưỡng ngày quá hạn: số ngày kể từ khi tài liệu được upload chưa hoàn thành</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="text-orange-600 flex-shrink-0 mt-0.5" size={14} />
                  <span>Ngưỡng dở dang: số lượng tài liệu chưa hoàn thành tối đa mà cán bộ có thể có</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="text-orange-600 flex-shrink-0 mt-0.5" size={14} />
                  <span>Bạn có thể bật/tắt từng loại cảnh báo tùy theo nhu cầu quản lý</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="text-orange-600 flex-shrink-0 mt-0.5" size={14} />
                  <span>Cảnh báo sẽ hiển thị trên màn hình "Giám sát cán bộ"</span>
                </li>
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

