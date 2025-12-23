
import React, { useState, useEffect } from 'react';
import { AppState, ViewState, Document, QAPair } from './types';
import { Dashboard } from './components/Dashboard';
import { UploadScreen } from './components/UploadScreen';
import { ReviewScreen } from './components/ReviewScreen';
import { RemoteFilesScreen } from './components/RemoteFilesScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { Layout, Loader2 } from 'lucide-react';
import { getDocuments, getQAPairs, updateQAPair, deleteQAPair, deleteDocument, generateMoreQAPairs } from './services/apiService';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    view: 'dashboard',
    selectedDocId: null,
    documents: [],
    qaPairs: {},
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load documents từ API khi mount
  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      setError(null);
      const docs = await getDocuments();
      setState(prev => ({ ...prev, documents: docs }));
    } catch (err) {
      console.error('Lỗi khi load documents:', err);
      setError(err instanceof Error ? err.message : 'Không thể tải danh sách tài liệu');
    } finally {
      setLoading(false);
    }
  };

  // Load Q&A pairs khi vào ReviewScreen
  const loadQAPairs = async (docId: string) => {
    try {
      // Kiểm tra xem đã load chưa
      if (state.qaPairs[docId]) {
        return; // Đã có trong cache
      }

      const qaPairs = await getQAPairs(docId);
      setState(prev => ({
        ...prev,
        qaPairs: { ...prev.qaPairs, [docId]: qaPairs },
      }));
    } catch (err) {
      console.error('Lỗi khi load Q&A pairs:', err);
      setError(err instanceof Error ? err.message : 'Không thể tải Q&A pairs');
    }
  };

  const goToDashboard = () => {
    setState(prev => ({ ...prev, view: 'dashboard', selectedDocId: null }));
    // Reload documents khi quay về dashboard
    loadDocuments();
  };
  const goToUpload = () => setState(prev => ({ ...prev, view: 'upload' }));
  const goToRemoteFiles = () => setState(prev => ({ ...prev, view: 'remote-files' }));
  const goToSettings = () => setState(prev => ({ ...prev, view: 'settings' }));
  const goToReview = async (docId: string) => {
    setState(prev => ({ ...prev, view: 'review', selectedDocId: docId }));
    // Load Q&A pairs khi vào review screen
    await loadQAPairs(docId);
  };

  const deleteDoc = async (docId: string) => {
    try {
      await deleteDocument(docId);
      // Update local state sau khi xóa thành công
      setState(prev => {
        const newDocs = prev.documents.filter(d => d.id !== docId);
        const newQAs = { ...prev.qaPairs };
        delete newQAs[docId];
        return { ...prev, documents: newDocs, qaPairs: newQAs };
      });
    } catch (err) {
      console.error('Lỗi khi xóa document:', err);
      alert(`Không thể xóa tài liệu: ${err instanceof Error ? err.message : 'Lỗi không xác định'}`);
    }
  };

  const updateQA = async (qaId: string, updates: Partial<QAPair>) => {
    try {
      if (!state.selectedDocId) return;
      
      // Gọi API để update
      const updatedQA = await updateQAPair(qaId, updates);
      
      // Update local state
      setState(prev => {
        const docQAs = prev.qaPairs[prev.selectedDocId!] || [];
        const newDocQAs = docQAs.map(qa => qa.id === qaId ? updatedQA : qa);
        const reviewedCount = newDocQAs.filter(q => q.status === 'Reviewed').length;
        const newDocs = prev.documents.map(d => 
          d.id === prev.selectedDocId 
            ? { ...d, reviewedSamples: reviewedCount } 
            : d
        );
        return { 
          ...prev, 
          documents: newDocs, 
          qaPairs: { ...prev.qaPairs, [prev.selectedDocId!]: newDocQAs } 
        };
      });
    } catch (err) {
      console.error('Lỗi khi cập nhật Q&A:', err);
      alert(`Không thể cập nhật Q&A: ${err instanceof Error ? err.message : 'Lỗi không xác định'}`);
    }
  };

  const deleteQA = async (qaId: string) => {
    try {
      if (!state.selectedDocId) return;
      
      // Gọi API để xóa
      await deleteQAPair(qaId);
      
      // Update local state
      setState(prev => {
        const docQAs = prev.qaPairs[prev.selectedDocId!] || [];
        const newDocQAs = docQAs.filter(qa => qa.id !== qaId);
        const newDocs = prev.documents.map(d => 
          d.id === prev.selectedDocId 
            ? { 
                ...d, 
                totalSamples: newDocQAs.length, 
                reviewedSamples: newDocQAs.filter(q => q.status === 'Reviewed').length 
              } 
            : d
        );
        return { 
          ...prev, 
          documents: newDocs, 
          qaPairs: { ...prev.qaPairs, [prev.selectedDocId!]: newDocQAs } 
        };
      });
    } catch (err) {
      console.error('Lỗi khi xóa Q&A:', err);
      alert(`Không thể xóa Q&A: ${err instanceof Error ? err.message : 'Lỗi không xác định'}`);
    }
  };

  const handleGenerateMore = async (docId: string, count: number): Promise<QAPair[]> => {
    try {
      // Gọi API để generate thêm Q&A
      const newQAs = await generateMoreQAPairs(docId, count);
      
      if (newQAs.length === 0) {
        // Không tạo được Q&A mới → đã hết nội dung
        return [];
      }

      // Update local state: thêm Q&A mới và update totalSamples
      setState(prev => {
        const docQAs = prev.qaPairs[docId] || [];
        const newDocQAs = [...docQAs, ...newQAs];
        const newDocs = prev.documents.map(d => 
          d.id === docId 
            ? { 
                ...d, 
                totalSamples: newDocQAs.length,
                reviewedSamples: newDocQAs.filter(q => q.status === 'Reviewed').length,
              } 
            : d
        );
        return { 
          ...prev, 
          documents: newDocs, 
          qaPairs: { ...prev.qaPairs, [docId]: newDocQAs } 
        };
      });

      return newQAs;
    } catch (err) {
      console.error('Lỗi khi generate thêm Q&A:', err);
      throw err;
    }
  };

  const onUploadComplete = async (name: string, size: string, generatedQAs: any[]) => {
    // Reload documents từ API sau khi upload thành công
    // (Backend đã tự động lưu vào database)
    await loadDocuments();
    setState(prev => ({ ...prev, view: 'dashboard' }));
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
        <>
          {loading ? (
            <div className="max-w-7xl mx-auto px-4 py-12 flex items-center justify-center">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="animate-spin text-blue-600" size={48} />
                <p className="text-gray-500">Đang tải danh sách tài liệu...</p>
              </div>
            </div>
          ) : error ? (
            <div className="max-w-7xl mx-auto px-4 py-12">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800 font-medium">Lỗi: {error}</p>
                <button
                  onClick={loadDocuments}
                  className="mt-2 text-red-600 hover:text-red-800 underline text-sm"
                >
                  Thử lại
                </button>
              </div>
            </div>
          ) : (
            <Dashboard documents={state.documents} onUploadClick={goToUpload} onViewSamples={goToReview} onDeleteDoc={deleteDoc} onRemoteFilesClick={goToRemoteFiles} onSettingsClick={goToSettings} />
          )}
        </>
      )}
      {state.view === 'upload' && (
        <UploadScreen onBack={goToDashboard} onComplete={onUploadComplete} />
      )}
      {state.view === 'review' && state.selectedDocId && (
        <ReviewScreen 
          document={state.documents.find(d => d.id === state.selectedDocId)!} 
          qaPairs={state.qaPairs[state.selectedDocId] || []} 
          onBack={goToDashboard} 
          onUpdateQA={updateQA} 
          onDeleteQA={deleteQA}
          onGenerateMore={handleGenerateMore}
        />
      )}
      {state.view === 'remote-files' && (
        <RemoteFilesScreen 
          onBack={goToDashboard}
          onViewDocument={goToReview}
        />
      )}
      {state.view === 'settings' && (
        <SettingsScreen onBack={goToDashboard} />
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
