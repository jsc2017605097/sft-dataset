import React, { createContext, useContext, useState, useCallback } from 'react';
import { ToastContainer, ToastType, ToastProps } from '../components/Toast';
import { ConfirmDialog, ConfirmDialogProps } from '../components/ConfirmDialog';

interface NotificationContextType {
  showToast: (type: ToastType, message: string, duration?: number) => void;
  showConfirm: (options: Omit<ConfirmDialogProps, 'onConfirm' | 'onCancel'>) => Promise<boolean>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider');
  }
  return context;
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastProps[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    props: Omit<ConfirmDialogProps, 'onConfirm' | 'onCancel'>;
    resolve: (value: boolean) => void;
  } | null>(null);

  // Toast functions
  const showToast = useCallback((type: ToastType, message: string, duration: number = 5000) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    const newToast: ToastProps = {
      id,
      type,
      message,
      duration,
      onClose: (toastId) => {
        setToasts((prev) => prev.filter((t) => t.id !== toastId));
      },
    };
    setToasts((prev) => [...prev, newToast]);
  }, []);

  // Confirm dialog functions
  const showConfirm = useCallback(
    (options: Omit<ConfirmDialogProps, 'onConfirm' | 'onCancel'>): Promise<boolean> => {
      return new Promise((resolve) => {
        setConfirmDialog({
          isOpen: true,
          props: options,
          resolve,
        });
      });
    },
    []
  );

  const handleConfirm = useCallback(() => {
    if (confirmDialog) {
      confirmDialog.resolve(true);
      setConfirmDialog(null);
    }
  }, [confirmDialog]);

  const handleCancel = useCallback(() => {
    if (confirmDialog) {
      confirmDialog.resolve(false);
      setConfirmDialog(null);
    }
  }, [confirmDialog]);

  return (
    <NotificationContext.Provider value={{ showToast, showConfirm }}>
      {children}
      
      {/* Toast Container */}
      <ToastContainer toasts={toasts} />

      {/* Confirm Dialog */}
      {confirmDialog?.isOpen && (
        <ConfirmDialog
          {...confirmDialog.props}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </NotificationContext.Provider>
  );
};


