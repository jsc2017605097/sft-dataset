
import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Filter, Search, ChevronLeft, ChevronRight, Keyboard, Info } from 'lucide-react';
import { QAPair, Document } from '../types';
import { QACard } from './QACard';

interface ReviewScreenProps {
  document: Document;
  qaPairs: QAPair[];
  onBack: () => void;
  onUpdateQA: (qaId: string, updates: Partial<QAPair>) => void;
  onDeleteQA: (qaId: string) => void;
}

export const ReviewScreen: React.FC<ReviewScreenProps> = ({ 
  document, 
  qaPairs, 
  onBack, 
  onUpdateQA, 
  onDeleteQA 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'All' | 'Pending' | 'Reviewed'>('All');
  const [activeIndex, setActiveIndex] = useState(0);

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
  const progress = (reviewedCount / qaPairs.length) * 100;

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
              <div className="flex items-center gap-2 mt-0.5">
                <div className="w-32 h-1.5 bg-gray-100 rounded-full">
                  <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
                </div>
                <span className="text-[10px] font-bold text-gray-500 uppercase">Đã duyệt {reviewedCount} / {qaPairs.length}</span>
              </div>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-6">
            <div className="flex items-center gap-2 text-xs font-medium text-gray-400 border-r border-gray-200 pr-6">
              <Keyboard size={14} />
              <span className="bg-gray-100 px-1 rounded">Phím mũi tên</span> Di chuyển
              <span className="bg-gray-100 px-1 rounded ml-2">Ctrl+Enter</span> Phê duyệt
            </div>
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
    </div>
  );
};
