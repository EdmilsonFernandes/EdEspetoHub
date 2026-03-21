// @ts-nocheck
import React, { createContext, useContext, useState, useCallback } from 'react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
<<<<<<< HEAD
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
=======
  actionLabel?: string;
  onAction?: () => void;
}

interface ToastContextType {
  showToast: (
    message: string,
    type?: ToastType,
    options?: {
      actionLabel?: string;
      onAction?: () => void;
      durationMs?: number;
    }
  ) => void;
>>>>>>> main
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

<<<<<<< HEAD
  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(7);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  }, [removeToast]);

  const getToastStyles = (type: ToastType) => {
    switch (type) {
      case 'success':
        return 'bg-emerald-50 border-emerald-200 text-emerald-800';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'warning':
        return 'bg-amber-50 border-amber-200 text-amber-800';
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800';
=======
  const showToast = useCallback((
    message: string,
    type: ToastType = 'info',
    options?: {
      actionLabel?: string;
      onAction?: () => void;
      durationMs?: number;
    }
  ) => {
    const id = Math.random().toString(36).substring(7);
    setToasts((prev) => [...prev, { id, message, type, actionLabel: options?.actionLabel, onAction: options?.onAction }]);
    setTimeout(() => {
      removeToast(id);
    }, Math.max(1500, Number(options?.durationMs || 4000)));
  }, [removeToast]);

  const getToastClass = (type: ToastType) => {
    switch (type) {
      case 'success':
        return 'ds-toast-success';
      case 'error':
        return 'ds-toast-error';
      case 'warning':
        return 'ds-toast-warning';
      default:
        return 'ds-toast-info';
>>>>>>> main
    }
  };

  const getIcon = (type: ToastType) => {
    switch (type) {
      case 'success':
        return '✓';
      case 'error':
        return '✕';
      case 'warning':
        return '⚠';
      default:
        return 'ℹ';
    }
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
<<<<<<< HEAD
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 space-y-2">
=======
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 space-y-2 px-3 w-full max-w-xl">
>>>>>>> main
        {toasts.map((toast) => (
          <div
            key={toast.id}
            onClick={() => removeToast(toast.id)}
            role="button"
<<<<<<< HEAD
            className={`border rounded-xl px-4 py-3 shadow-lg animate-slide-in-right flex items-center gap-3 min-w-[320px] cursor-pointer ${getToastStyles(toast.type)}`}
          >
            <span className="text-lg font-bold">{getIcon(toast.type)}</span>
            <span className="text-sm font-medium flex-1">{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
=======
            className={`ds-toast animate-slide-in-right ${getToastClass(toast.type)}`}
          >
            <span className="text-lg font-bold">{getIcon(toast.type)}</span>
            <span className="text-sm font-medium flex-1">{toast.message}</span>
            {toast.actionLabel && toast.onAction && (
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  try {
                    toast.onAction?.();
                  } finally {
                    removeToast(toast.id);
                  }
                }}
                className="rounded-lg border border-white/30 bg-white/20 px-2 py-1 text-[11px] font-bold uppercase tracking-[0.08em] hover:bg-white/30 transition"
              >
                {toast.actionLabel}
              </button>
            )}
            <button
              onClick={(event) => {
                event.stopPropagation();
                removeToast(toast.id);
              }}
>>>>>>> main
              className="text-lg font-bold hover:opacity-70 transition-opacity"
              aria-label="Fechar"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
