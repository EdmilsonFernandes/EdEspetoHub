// @ts-nocheck
import React, { createContext, useContext, useState, useCallback } from 'react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
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
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 space-y-2 px-3 w-full max-w-xl">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            onClick={() => removeToast(toast.id)}
            role="button"
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
