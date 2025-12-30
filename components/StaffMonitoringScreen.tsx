import React, { useState, useEffect } from 'react';
import { ArrowLeft, Users, TrendingUp, AlertTriangle, CheckCircle2, FileText, Edit3, Clock, Award } from 'lucide-react';
import { StaffOverviewResponse, StaffStats } from '../types';
import { getStaffOverview } from '../services/apiService';

interface StaffMonitoringScreenProps {
  onBack: () => void;
}

export const StaffMonitoringScreen: React.FC<StaffMonitoringScreenProps> = ({ onBack }) => {
  const [data, setData] = useState<StaffOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'completion' | 'docs' | 'overdue'>('completion');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getStaffOverview();
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  const getSortedStats = (stats: StaffStats[]): StaffStats[] => {
    const sorted = [...stats];
    switch (sortBy) {
      case 'completion':
        return sorted.sort((a, b) => b.avgCompletionRate - a.avgCompletionRate);
      case 'docs':
        return sorted.sort((a, b) => b.totalDocs - a.totalDocs);
      case 'overdue':
        return sorted.sort((a, b) => {
          if (a.isOverdue && !b.isOverdue) return -1;
          if (!a.isOverdue && b.isOverdue) return 1;
          return (b.daysSinceOldestPending || 0) - (a.daysSinceOldestPending || 0);
        });
      default:
        return sorted;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Users className="animate-pulse text-blue-600" size={48} />
          <p className="text-gray-600">Đang tải dữ liệu giám sát...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <p className="text-red-800 font-medium">Lỗi: {error}</p>
          <button
            onClick={loadData}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const sortedStats = getSortedStats(data.stats);

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
          <h1 className="text-xl font-bold text-gray-900">Giám Sát Cán Bộ</h1>
          <p className="text-sm text-gray-500 mt-0.5">Theo dõi tiến độ và hiệu suất làm việc của từng cán bộ</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="text-blue-600" size={20} />
            </div>
            <span className="text-2xl font-bold text-gray-900">{data.summary.totalUsers}</span>
          </div>
          <p className="text-sm text-gray-600">Tổng cán bộ</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-green-100 rounded-lg">
              <FileText className="text-green-600" size={20} />
            </div>
            <span className="text-2xl font-bold text-gray-900">{data.summary.totalDocs}</span>
          </div>
          <p className="text-sm text-gray-600">Tổng tài liệu</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-purple-100 rounded-lg">
              <TrendingUp className="text-purple-600" size={20} />
            </div>
            <span className="text-2xl font-bold text-gray-900">{data.summary.avgCompletionRate.toFixed(1)}%</span>
          </div>
          <p className="text-sm text-gray-600">Tiến độ TB</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="text-red-600" size={20} />
            </div>
            <span className="text-2xl font-bold text-gray-900">{data.summary.overdueUsers}</span>
          </div>
          <p className="text-sm text-gray-600">CB quá hạn</p>
        </div>
      </div>

      {/* Sort Controls */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm mb-6">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-gray-700">Sắp xếp theo:</span>
          <div className="flex gap-2">
            <button
              onClick={() => setSortBy('completion')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                sortBy === 'completion'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Tiến độ
            </button>
            <button
              onClick={() => setSortBy('docs')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                sortBy === 'docs'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Số tài liệu
            </button>
            <button
              onClick={() => setSortBy('overdue')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                sortBy === 'overdue'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Quá hạn
            </button>
          </div>
        </div>
      </div>

      {/* Staff Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedStats.map((staff) => (
          <div
            key={staff.userId}
            className={`bg-white border-2 rounded-xl p-6 shadow-sm transition-all hover:shadow-md ${
              staff.isOverdue ? 'border-red-300 bg-red-50' : 'border-gray-200'
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-lg font-bold">
                  {staff.username.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{staff.username}</h3>
                  <p className="text-xs text-gray-500">{staff.totalDocs} tài liệu</p>
                </div>
              </div>
              {staff.isOverdue && (
                <div className="p-1.5 bg-red-100 rounded-lg">
                  <AlertTriangle className="text-red-600" size={16} />
                </div>
              )}
              {!staff.isOverdue && staff.avgCompletionRate === 100 && (
                <div className="p-1.5 bg-green-100 rounded-lg">
                  <Award className="text-green-600" size={16} />
                </div>
              )}
            </div>

            {/* Progress Bar */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-gray-600">Tiến độ</span>
                <span className="text-sm font-bold text-gray-900">{staff.avgCompletionRate.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    staff.avgCompletionRate === 100
                      ? 'bg-green-500'
                      : staff.avgCompletionRate >= 70
                      ? 'bg-blue-500'
                      : staff.avgCompletionRate >= 40
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                  }`}
                  style={{ width: `${staff.avgCompletionRate}%` }}
                />
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 className="text-green-600" size={14} />
                  <span className="text-xs text-gray-600">Hoàn thành</span>
                </div>
                <p className="text-lg font-bold text-gray-900">{staff.completedDocs}</p>
              </div>

              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="text-orange-600" size={14} />
                  <span className="text-xs text-gray-600">Đang làm</span>
                </div>
                <p className="text-lg font-bold text-gray-900">{staff.incompleteDocs}</p>
              </div>

              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="text-blue-600" size={14} />
                  <span className="text-xs text-gray-600">Q&A reviewed</span>
                </div>
                <p className="text-sm font-bold text-gray-900">
                  {staff.reviewedQAPairs}/{staff.totalQAPairs}
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Edit3 className="text-purple-600" size={14} />
                  <span className="text-xs text-gray-600">Đã edit</span>
                </div>
                <p className="text-lg font-bold text-gray-900">{staff.editedQAPairs}</p>
              </div>
            </div>

            {/* Warning/Info */}
            {staff.isOverdue && (
              <div className="bg-red-100 border border-red-200 rounded-lg p-3">
                {staff.totalDocs === 0 ? (
                  <>
                    <p className="text-xs text-red-800 font-semibold">
                      🚫 Chưa upload tài liệu nào!
                    </p>
                    <p className="text-[10px] text-red-600 mt-1">
                      Cán bộ chưa có tài liệu nào trong hệ thống
                    </p>
                  </>
                ) : staff.avgCompletionRate === 0 && staff.incompleteDocs > 0 ? (
                  <>
                    <p className="text-xs text-red-800 font-semibold">
                      🚨 Chưa bắt đầu làm việc!
                    </p>
                    <p className="text-[10px] text-red-600 mt-1">
                      Có {staff.incompleteDocs} tài liệu nhưng chưa review Q&A nào
                    </p>
                  </>
                ) : staff.incompleteDocs > 5 ? (
                  <>
                    <p className="text-xs text-red-800 font-semibold">
                      ⚠️ Quá nhiều tài liệu dở dang!
                    </p>
                    <p className="text-[10px] text-red-600 mt-1">
                      {staff.incompleteDocs} tài liệu chưa hoàn thành
                    </p>
                  </>
                ) : staff.daysSinceOldestPending ? (
                  <>
                    <p className="text-xs text-red-800">
                      ⚠️ Tài liệu cũ nhất chưa hoàn thành: <strong>{staff.daysSinceOldestPending} ngày</strong>
                    </p>
                    <p className="text-[10px] text-red-600 mt-1">Upload: {staff.oldestPendingDocDate}</p>
                  </>
                ) : null}
              </div>
            )}

            {!staff.isOverdue && staff.avgCompletionRate === 100 && (
              <div className="bg-green-100 border border-green-200 rounded-lg p-3">
                <p className="text-xs text-green-800">
                  🏆 Xuất sắc! Đã hoàn thành tất cả tài liệu.
                </p>
              </div>
            )}

            {!staff.isOverdue && staff.avgCompletionRate > 0 && staff.avgCompletionRate < 100 && staff.incompleteDocs > 0 && (
              <div className="bg-blue-100 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-800">
                  ✅ Đang làm việc tốt. Tiếp tục phấn đấu!
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Empty State */}
      {sortedStats.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <Users className="mx-auto text-gray-400 mb-4" size={48} />
          <p className="text-gray-600">Chưa có cán bộ nào trong hệ thống</p>
        </div>
      )}
    </div>
  );
};

