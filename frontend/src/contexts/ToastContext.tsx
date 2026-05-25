// @ts-nocheck
import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, Info, WarningCircle, X, XCircle } from '@phosphor-icons/react';
import { normalizeUserFacingError } from '../utils/userFriendlyErrors';

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
    const safeMessage = normalizeUserFacingError(message);
    setToasts((prev) => [...prev.slice(-2), { id, message: safeMessage, type, actionLabel: options?.actionLabel, onAction: options?.onAction }]);
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
        return <CheckCircle size={20} weight="fill" />;
      case 'error':
        return <XCircle size={20} weight="fill" />;
      case 'warning':
        return <WarningCircle size={20} weight="fill" />;
      default:
        return <Info size={20} weight="fill" />;
    }
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--jnk-client-bottom-nav-height,0px)+env(safe-area-inset-bottom)+0.85rem)] z-[320] mx-auto flex w-full max-w-xl flex-col gap-2 px-3 sm:bottom-auto sm:top-[calc(env(safe-area-inset-top)+1rem)]">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            onClick={() => removeToast(toast.id)}
            role="button"
            className={`ds-toast pointer-events-auto animate-slide-in-right ${getToastClass(toast.type)}`}
          >
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/70 text-lg font-bold shadow-sm ring-1 ring-white/70">{getIcon(toast.type)}</span>
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
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/55 text-current hover:bg-white/80 transition-opacity"
              aria-label="Fechar"
            >
              <X size={14} weight="bold" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
