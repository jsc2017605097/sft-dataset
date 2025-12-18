
import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle, Edit2, Trash2, XCircle, Save, RotateCcw } from 'lucide-react';
import { QAPair, QAStatus } from '../types';
import { Badge } from './Badge';

interface QACardProps {
  qa: QAPair;
  isActive: boolean;
  onUpdate: (id: string, updates: Partial<QAPair>) => void;
  onDelete: (id: string) => void;
  onSelect: () => void;
}

export const QACard: React.FC<QACardProps> = ({ qa, isActive, onUpdate, onDelete, onSelect }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedQuestion, setEditedQuestion] = useState(qa.question);
  const [editedAnswer, setEditedAnswer] = useState(qa.answer);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isActive && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [isActive]);

  const handleSave = () => {
    onUpdate(qa.id, {
      question: editedQuestion,
      answer: editedAnswer,
      status: 'Edited' as QAStatus,
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedQuestion(qa.question);
    setEditedAnswer(qa.answer);
    setIsEditing(false);
  };

  const handleApprove = () => {
    onUpdate(qa.id, { status: 'Reviewed' });
  };

  return (
    <div
      ref={cardRef}
      onClick={onSelect}
      className={`relative p-5 rounded-xl border transition-all duration-200 ${
        isActive 
          ? 'border-blue-500 ring-2 ring-blue-50 ring-offset-0 bg-white' 
          : 'border-gray-200 bg-white hover:border-gray-300'
      } ${isEditing ? 'z-10 shadow-lg' : ''}`}
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-2">
          {qa.status === 'Reviewed' && <Badge variant="green">Reviewed</Badge>}
          {qa.status === 'Pending' && <Badge variant="gray">Pending</Badge>}
          {qa.status === 'Edited' && <Badge variant="orange">Edited</Badge>}
          <span className="text-xs text-gray-400 font-mono uppercase tracking-wider">ID: {qa.id}</span>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-tight mb-1 block">Câu hỏi</label>
          {isEditing ? (
            <textarea
              className="w-full p-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none min-h-[60px]"
              value={editedQuestion}
              onChange={(e) => setEditedQuestion(e.target.value)}
            />
          ) : (
            <p className="text-sm font-medium text-gray-800 leading-relaxed">{qa.question}</p>
          )}
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-tight mb-1 block">Câu trả lời</label>
          {isEditing ? (
            <textarea
              className="w-full p-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none min-h-[120px]"
              value={editedAnswer}
              onChange={(e) => setEditedAnswer(e.target.value)}
            />
          ) : (
            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{qa.answer}</p>
          )}
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <button
                onClick={handleSave}
                className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
              >
                <Save size={14} /> Lưu thay đổi
              </button>
              <button
                onClick={handleCancel}
                className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50"
              >
                <RotateCcw size={14} /> Hủy
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleApprove}
                disabled={qa.status === 'Reviewed'}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  qa.status === 'Reviewed' 
                    ? 'bg-green-50 text-green-600 cursor-not-allowed' 
                    : 'bg-gray-900 text-white hover:bg-gray-800'
                }`}
              >
                <CheckCircle size={14} /> {qa.status === 'Reviewed' ? 'Đã phê duyệt' : 'Đánh dấu đã duyệt'}
              </button>
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50"
              >
                <Edit2 size={14} /> Sửa
              </button>
            </>
          )}
        </div>
        <button
          onClick={() => onDelete(qa.id)}
          className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
          title="Xóa mẫu này"
        >
          <Trash2 size={16} />
        </button>
      </div>

      {isActive && !isEditing && (
        <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-1 h-12 bg-blue-500 rounded-full" />
      )}
    </div>
  );
};
