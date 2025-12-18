
import React, { useState, useEffect } from 'react';
import { AppState, ViewState, Document, QAPair } from './types';
import { MOCK_DOCUMENTS, MOCK_QA_PAIRS } from './constants';
import { Dashboard } from './components/Dashboard';
import { UploadScreen } from './components/UploadScreen';
import { ReviewScreen } from './components/ReviewScreen';
import { Layout } from 'lucide-react';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    view: 'dashboard',
    selectedDocId: null,
    documents: MOCK_DOCUMENTS,
    qaPairs: MOCK_QA_PAIRS,
  });

  const goToDashboard = () => setState(prev => ({ ...prev, view: 'dashboard', selectedDocId: null }));
  const goToUpload = () => setState(prev => ({ ...prev, view: 'upload' }));
  const goToReview = (docId: string) => setState(prev => ({ ...prev, view: 'review', selectedDocId: docId }));

  const deleteDoc = (docId: string) => {
    setState(prev => {
      const newDocs = prev.documents.filter(d => d.id !== docId);
      const newQAs = { ...prev.qaPairs };
      delete newQAs[docId];
      return { ...prev, documents: newDocs, qaPairs: newQAs };
    });
  };

  const updateQA = (qaId: string, updates: Partial<QAPair>) => {
    setState(prev => {
      if (!prev.selectedDocId) return prev;
      const docQAs = prev.qaPairs[prev.selectedDocId] || [];
      const newDocQAs = docQAs.map(qa => qa.id === qaId ? { ...qa, ...updates } : qa);
      const reviewedCount = newDocQAs.filter(q => q.status === 'Reviewed').length;
      const newDocs = prev.documents.map(d => d.id === prev.selectedDocId ? { ...d, reviewedSamples: reviewedCount } : d);
      return { ...prev, documents: newDocs, qaPairs: { ...prev.qaPairs, [prev.selectedDocId]: newDocQAs } };
    });
  };

  const deleteQA = (qaId: string) => {
    setState(prev => {
      if (!prev.selectedDocId) return prev;
      const docQAs = prev.qaPairs[prev.selectedDocId] || [];
      const newDocQAs = docQAs.filter(qa => qa.id !== qaId);
      const newDocs = prev.documents.map(d => 
        d.id === prev.selectedDocId ? { ...d, totalSamples: newDocQAs.length, reviewedSamples: newDocQAs.filter(q => q.status === 'Reviewed').length } : d
      );
      return { ...prev, documents: newDocs, qaPairs: { ...prev.qaPairs, [prev.selectedDocId]: newDocQAs } };
    });
  };

  const onUploadComplete = (name: string, size: string, generatedQAs: any[]) => {
    const docId = `doc-${Date.now()}`;
    const newDoc: Document = {
      id: docId,
      name,
      size,
      uploadDate: new Date().toLocaleDateString('vi-VN'),
      totalSamples: generatedQAs.length,
      reviewedSamples: 0,
      status: 'Ready',
    };

    const newQAPairs: QAPair[] = generatedQAs.map((item, idx) => ({
      id: `qa-${docId}-${idx}`,
      docId,
      question: item.question,
      answer: item.answer,
      status: 'Pending',
    }));

    setState(prev => ({
      ...prev,
      documents: [newDoc, ...prev.documents],
      qaPairs: { ...prev.qaPairs, [docId]: newQAPairs },
      view: 'dashboard'
    }));
  };

  return (
    <div className="min-h-screen">
      <nav className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={goToDashboard}>
            <div className="bg-blue-600 p-2 rounded-xl text-white">
              <Layout size={24} />
            </div>
            <span className="text-xl font-black tracking-tight text-gray-900">SFT<span className="text-blue-600">DữLiệu</span></span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Phiên bản 2.0</span>
            <div className="w-8 h-8 rounded-full bg-gray-200 border-2 border-white shadow-sm" />
          </div>
        </div>
      </nav>

      {state.view === 'dashboard' && (
        <Dashboard documents={state.documents} onUploadClick={goToUpload} onViewSamples={goToReview} onDeleteDoc={deleteDoc} />
      )}
      {state.view === 'upload' && (
        <UploadScreen onBack={goToDashboard} onComplete={onUploadComplete} />
      )}
      {state.view === 'review' && state.selectedDocId && (
        <ReviewScreen document={state.documents.find(d => d.id === state.selectedDocId)!} qaPairs={state.qaPairs[state.selectedDocId] || []} onBack={goToDashboard} onUpdateQA={updateQA} onDeleteQA={deleteQA} />
      )}

      <footer className="py-12 border-t border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-sm text-gray-400">© 2024 Hệ thống Quản lý Dữ liệu SFT Pro. Giải pháp tối ưu cho gán nhãn dữ liệu pháp luật.</p>
        </div>
      </footer>
    </div>
  );
};

export default App;
