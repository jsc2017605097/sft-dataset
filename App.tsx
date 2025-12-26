
import React, { useState, useEffect } from 'react';
import { AppState, ViewState, Document, QAPair } from './types';
import { Dashboard } from './components/Dashboard';
import { UploadScreen } from './components/UploadScreen';
import { ReviewScreen } from './components/ReviewScreen';
import { RemoteFilesScreen } from './components/RemoteFilesScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { LoginScreen } from './components/LoginScreen';
import { RegisterScreen } from './components/RegisterScreen';
import { UserManagementScreen } from './components/UserManagementScreen';
import { NotificationProvider, useNotification } from './contexts/NotificationContext';
import { Layout, Loader2 } from 'lucide-react';
import { 
  getDocuments, 
  getQAPairs, 
  updateQAPair, 
  deleteQAPair, 
  deleteDocument, 
  generateMoreQAPairs,
  login,
  register,
  logout as logoutApi,
  getCurrentUser,
  getToken,
  reassignDocument,
} from './services/apiService';

const AppContent: React.FC = () => {
  const { showToast, showConfirm } = useNotification();
  const [state, setState] = useState<AppState>({
    view: 'login',
    selectedDocId: null,
    documents: [],
    qaPairs: {},
    user: null,
    accessToken: null,
    isAuthenticated: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check authentication on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      setLoading(true);
      const token = getToken();
      
      if (!token) {
        // Không có token → chưa login
        setState(prev => ({ ...prev, view: 'login', isAuthenticated: false }));
        return;
      }

      // Verify token bằng cách gọi /api/auth/me
      const user = await getCurrentUser();
      setState(prev => ({
        ...prev,
        user,
        accessToken: token,
        isAuthenticated: true,
        view: 'dashboard',
      }));

      // Load documents sau khi authenticated
      loadDocuments();
    } catch (err) {
      console.error('Token invalid hoặc expired:', err);
      // Token không hợp lệ → redirect to login
      logoutApi();
      setState(prev => ({ 
        ...prev, 
        view: 'login', 
        isAuthenticated: false, 
        user: null, 
        accessToken: null 
      }));
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (username: string, password: string) => {
    const authResponse = await login(username, password);
    setState(prev => ({
      ...prev,
      user: authResponse.user,
      accessToken: authResponse.accessToken,
      isAuthenticated: true,
      view: 'dashboard',
    }));
    // Load documents sau khi login
    loadDocuments();
  };

  const handleRegister = async (username: string, password: string, email?: string) => {
    try {
      const authResponse = await register(username, password, email);
      setState(prev => ({
        ...prev,
        user: authResponse.user,
        accessToken: authResponse.accessToken,
        isAuthenticated: true,
        view: 'dashboard',
      }));
      // Load documents sau khi register
      loadDocuments();
    } catch (err: any) {
      // Check if this is "requires activation" case (HTTP 201)
      if (err.message && err.message.includes('admin kích hoạt')) {
        showToast('info', 'Đăng ký thành công! Vui lòng đợi admin kích hoạt tài khoản của bạn.', 8000);
        // Redirect về login sau 2 giây
        setTimeout(() => {
          setState(prev => ({ ...prev, view: 'login' }));
        }, 2000);
      } else {
        // Re-throw để component con handle
        throw err;
      }
    }
  };

  const handleLogout = () => {
    logoutApi();
    setState({
      view: 'login',
      selectedDocId: null,
      documents: [],
      qaPairs: {},
      user: null,
      accessToken: null,
      isAuthenticated: false,
    });
  };

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
  const goToUserManagement = () => setState(prev => ({ ...prev, view: 'user-management' }));
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
      showToast('error', `Không thể xóa tài liệu: ${err instanceof Error ? err.message : 'Lỗi không xác định'}`);
    }
  };

  const handleReassignDoc = async (docId: string, userId: string) => {
    try {
      await reassignDocument(docId, userId);
      // Reload documents sau khi reassign thành công
      await loadDocuments();
      showToast('success', 'Đã gán lại tài liệu thành công');
    } catch (err) {
      console.error('Lỗi khi gán lại document:', err);
      throw err; // Re-throw để Dashboard component có thể handle error
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
      showToast('error', `Không thể cập nhật Q&A: ${err instanceof Error ? err.message : 'Lỗi không xác định'}`);
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
      showToast('error', `Không thể xóa Q&A: ${err instanceof Error ? err.message : 'Lỗi không xác định'}`);
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

  // Show loading screen khi đang check auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-indigo-600" size={48} />
          <p className="text-gray-600">Đang kiểm tra phiên đăng nhập...</p>
        </div>
      </div>
    );
  }

  // Show Login/Register screens if not authenticated
  if (!state.isAuthenticated) {
    if (state.view === 'register') {
      return (
        <RegisterScreen 
          onRegister={handleRegister}
          onNavigateToLogin={() => setState(prev => ({ ...prev, view: 'login' }))}
        />
      );
    }
    return (
      <LoginScreen 
        onLogin={handleLogin}
        onNavigateToRegister={() => setState(prev => ({ ...prev, view: 'register' }))}
      />
    );
  }

  // Authenticated users see the main app
  return (
    <div className="min-h-screen">
      <nav className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={goToDashboard}>
            <div className="bg-white p-1 rounded-xl">
              <img src="/assets/kths.png" alt="KTHS Logo" className="w-8 h-8 object-contain" />
            </div>
            <span className="text-xl font-black tracking-tight text-gray-900">SFT<span className="text-blue-600"> KTHS</span></span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              Xin chào, <span className="font-semibold">{state.user?.username}</span>
              {state.user?.role === 'admin' && (
                <span className="ml-2 px-2 py-1 bg-purple-100 text-purple-700 text-xs font-semibold rounded">ADMIN</span>
              )}
            </span>
            <button
              onClick={handleLogout}
              className="text-sm text-red-600 hover:text-red-800 font-medium"
            >
              Đăng xuất
            </button>
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
            <Dashboard 
              documents={state.documents} 
              onUploadClick={goToUpload} 
              onViewSamples={goToReview} 
              onDeleteDoc={deleteDoc} 
              onReassignDoc={handleReassignDoc}
              onRemoteFilesClick={goToRemoteFiles} 
              onSettingsClick={goToSettings}
              onUserManagementClick={goToUserManagement}
              currentUser={state.user}
            />
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
      {state.view === 'user-management' && (
        <UserManagementScreen onBack={goToDashboard} />
      )}

      <footer className="py-12 border-t border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-sm text-gray-400">© 2026 Hệ thống Quản lý Dữ liệu SFT Pro. Giải pháp tối ưu cho gán nhãn dữ liệu pháp luật.</p>
        </div>
      </footer>
    </div>
  );
};

// Wrapper component with NotificationProvider
const App: React.FC = () => {
  return (
    <NotificationProvider>
      <AppContent />
    </NotificationProvider>
  );
};

export default App;
