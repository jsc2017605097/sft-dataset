
import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Filter, Search, ChevronLeft, ChevronRight, Keyboard, Info, Plus, Loader2, AlertCircle } from 'lucide-react';
import { QAPair, Document } from '../types';
import { QACard } from './QACard';

interface ReviewScreenProps {
  document: Document;
  qaPairs: QAPair[];
  onBack: () => void;
  onUpdateQA: (qaId: string, updates: Partial<QAPair>) => void;
  onDeleteQA: (qaId: string) => void;
  onGenerateMore: (docId: string, count: number) => Promise<QAPair[]>;
}

export const ReviewScreen: React.FC<ReviewScreenProps> = ({ 
  document, 
  qaPairs, 
  onBack, 
  onUpdateQA, 
  onDeleteQA,
  onGenerateMore,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'All' | 'Pending' | 'Reviewed'>('All');
  const [activeIndex, setActiveIndex] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [isExhausted, setIsExhausted] = useState(false); // Đánh dấu đã hết nội dung
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generateCount, setGenerateCount] = useState(5);

  const filteredQAs = useMemo(() => {
    return qaPairs.filter(qa => {
      const matchesSearch = qa.question.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            qa.answer.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = filter === 'All' || 
                            (filter === 'Pending' && qa.status !== 'Reviewed') ||
                            (filter === 'Reviewed' && qa.status === 'Reviewed');
      return matchesSearch && matchesFilter;
    });
  }, [qaPairs, searchTerm, filter]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        if (!(e.ctrlKey && e.key === 'Enter')) return;
      }

      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        setActiveIndex(prev => Math.max(0, prev - 1));
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        setActiveIndex(prev => Math.min(filteredQAs.length - 1, prev + 1));
      } else if (e.ctrlKey && e.key === 'Enter') {
        const activeQA = filteredQAs[activeIndex];
        if (activeQA) {
          onUpdateQA(activeQA.id, { status: 'Reviewed' });
          if (activeIndex < filteredQAs.length - 1) {
            setActiveIndex(activeIndex + 1);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeIndex, filteredQAs, onUpdateQA]);

  const reviewedCount = qaPairs.filter(qa => qa.status === 'Reviewed').length;
  const progress = qaPairs.length > 0 ? (reviewedCount / qaPairs.length) * 100 : 0;

  const handleGenerateMore = async () => {
    if (isGenerating || isExhausted) return;
    
    setIsGenerating(true);
    setGenerateError(null);
    
    try {
      const newQAs = await onGenerateMore(document.id, generateCount);
      
      if (newQAs.length === 0) {
        // Không tạo được Q&A mới → đã hết nội dung
        setIsExhausted(true);
        setGenerateError('Không thể tạo thêm Q&A pairs. Có thể tài liệu đã hết nội dung để sinh mẫu.');
      } else {
        // Thành công, đóng modal
        setShowGenerateModal(false);
        setGenerateCount(5); // Reset về default
      }
    } catch (error) {
      console.error('Lỗi khi generate thêm Q&A:', error);
      setGenerateError(error instanceof Error ? error.message : 'Không thể tạo thêm Q&A pairs');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h2 className="text-lg font-bold text-gray-900 truncate max-w-[300px]">{document.name}</h2>
              <div className="flex items-center gap-3 mt-0.5">
                <div className="flex items-center gap-2">
                  <div className="w-32 h-1.5 bg-gray-100 rounded-full">
                    <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
                  </div>
                  <span className="text-[10px] font-bold text-gray-500 uppercase">Đã duyệt {reviewedCount} / {qaPairs.length}</span>
                </div>
                <div className="h-4 w-px bg-gray-300"></div>
                <div className="text-[10px] font-semibold text-gray-600">
                  Checkpoint: <span className="text-blue-600">{document.totalSamples}</span> mẫu đã sinh
                </div>
              </div>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-6">
            <div className="flex items-center gap-2 text-xs font-medium text-gray-400 border-r border-gray-200 pr-6">
              <Keyboard size={14} />
              <span className="bg-gray-100 px-1 rounded">Phím mũi tên</span> Di chuyển
              <span className="bg-gray-100 px-1 rounded ml-2">Ctrl+Enter</span> Phê duyệt
            </div>
            <button
              onClick={() => setShowGenerateModal(true)}
              disabled={isExhausted || isGenerating}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                isExhausted || isGenerating
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
              }`}
            >
              {isGenerating ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Đang sinh...</span>
                </>
              ) : isExhausted ? (
                <>
                  <AlertCircle size={14} />
                  <span>Đã hết nội dung</span>
                </>
              ) : (
                <>
                  <Plus size={14} />
                  <span>Tiếp tục sinh mẫu</span>
                </>
              )}
            </button>
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button onClick={() => { setFilter('All'); setActiveIndex(0); }} className={`px-3 py-1.5 text-xs font-semibold rounded-md ${filter === 'All' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>Tất cả</button>
              <button onClick={() => { setFilter('Pending'); setActiveIndex(0); }} className={`px-3 py-1.5 text-xs font-semibold rounded-md ${filter === 'Pending' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>Chưa duyệt</button>
              <button onClick={() => { setFilter('Reviewed'); setActiveIndex(0); }} className={`px-3 py-1.5 text-xs font-semibold rounded-md ${filter === 'Reviewed' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>Đã duyệt</button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 pt-8">
        <div className="relative mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Tìm kiếm trong câu hỏi và câu trả lời..."
            className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setActiveIndex(0); }}
          />
        </div>

        {filteredQAs.length > 0 && (
          <div className="mb-4 flex items-center justify-between text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <Info size={16} className="text-blue-500" />
              <span>Đang hiển thị {filteredQAs.length} mẫu. Sử dụng phím mũi tên để duyệt nhanh.</span>
            </div>
            <span className="font-mono text-xs">Mẫu {activeIndex + 1} / {filteredQAs.length}</span>
          </div>
        )}

        <div className="space-y-6">
          {filteredQAs.length > 0 ? (
            filteredQAs.map((qa, idx) => (
              <QACard
                key={qa.id}
                qa={qa}
                isActive={idx === activeIndex}
                onUpdate={onUpdateQA}
                onDelete={onDeleteQA}
                onSelect={() => setActiveIndex(idx)}
              />
            ))
          ) : (
            <div className="text-center py-20 bg-white border border-dashed border-gray-200 rounded-2xl">
              <Search size={48} className="mx-auto text-gray-200 mb-4" />
              <p className="text-gray-500 font-medium">Không tìm thấy kết quả nào.</p>
              <button onClick={() => {setFilter('All'); setSearchTerm('');}} className="mt-2 text-blue-600 font-semibold hover:underline">Xóa tất cả bộ lọc</button>
            </div>
          )}
        </div>
      </main>

      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-gray-900 text-white px-6 py-3 rounded-full shadow-2xl z-40 border border-gray-800">
        <button disabled={activeIndex === 0} onClick={() => setActiveIndex(prev => prev - 1)} className="p-1 hover:text-blue-400 disabled:opacity-30"><ChevronLeft size={24} /></button>
        <div className="text-sm font-bold w-20 text-center border-x border-gray-700">{activeIndex + 1} / {filteredQAs.length}</div>
        <button disabled={activeIndex === filteredQAs.length - 1} onClick={() => setActiveIndex(prev => prev + 1)} className="p-1 hover:text-blue-400 disabled:opacity-30"><ChevronRight size={24} /></button>
      </div>

      {/* Generate More Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => !isGenerating && setShowGenerateModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-gray-900 mb-4">Tiếp tục sinh mẫu Q&A</h3>
            <p className="text-sm text-gray-600 mb-6">
              Tài liệu hiện có <strong>{document.totalSamples}</strong> mẫu Q&A. Bạn muốn sinh thêm bao nhiêu mẫu?
            </p>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Số lượng mẫu cần sinh (1-20)
              </label>
              <input
                type="number"
                min="1"
                max="20"
                value={generateCount}
                onChange={(e) => setGenerateCount(Math.max(1, Math.min(20, parseInt(e.target.value) || 5)))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                disabled={isGenerating}
              />
            </div>

            {generateError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                <AlertCircle size={16} className="text-red-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-800">{generateError}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowGenerateModal(false);
                  setGenerateError(null);
                }}
                disabled={isGenerating}
                className="flex-1 px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-all disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                onClick={handleGenerateMore}
                disabled={isGenerating}
                className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Đang sinh...</span>
                  </>
                ) : (
                  'Sinh mẫu'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
