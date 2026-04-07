import { type ReactNode } from 'react';
import { Warning, X } from '@phosphor-icons/react';

type ConfirmationModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  icon?: ReactNode;
  variant?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
};

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  icon,
  variant = 'danger',
  isLoading = false,
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  const variantStyles = {
    danger: {
      bg: 'bg-rose-50',
      text: 'text-rose-600',
      button: 'bg-rose-600 hover:bg-rose-700 shadow-rose-200',
      border: 'border-rose-100',
    },
    warning: {
      bg: 'bg-amber-50',
      text: 'text-amber-600',
      button: 'bg-amber-600 hover:bg-amber-700 shadow-amber-200',
      border: 'border-amber-100',
    },
    info: {
      bg: 'bg-sky-50',
      text: 'text-sky-600',
      button: 'bg-sky-600 hover:bg-sky-700 shadow-sky-200',
      border: 'border-sky-100',
    },
  };

  const style = variantStyles[variant];

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity" 
        onClick={onClose} 
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-sm overflow-hidden rounded-[2.5rem] bg-white border border-slate-100 shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="p-8">
          {/* Header/Icon */}
          <div className="flex flex-col items-center text-center">
            <div className={`mb-5 flex h-16 w-16 items-center justify-center rounded-[1.5rem] ${style.bg} ${style.text}`}>
              {icon || <Warning size={32} weight="duotone" />}
            </div>
            
            <h3 className="text-xl font-black text-slate-900 tracking-tight">{title}</h3>
            <p className="mt-3 text-sm font-medium text-slate-500 leading-relaxed">
              {description}
            </p>
          </div>

          {/* Actions */}
          <div className="mt-8 flex flex-col gap-3">
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className={`w-full rounded-2xl py-4 text-sm font-black uppercase tracking-[0.12em] text-white shadow-xl transition-all active:scale-95 disabled:opacity-50 ${style.button}`}
            >
              {isLoading ? 'Aguarde...' : confirmLabel}
            </button>
            <button
              onClick={onClose}
              className="w-full rounded-2xl border border-slate-100 bg-slate-50 py-4 text-sm font-black uppercase tracking-[0.12em] text-slate-500 transition-all hover:bg-slate-100 active:scale-95"
            >
              {cancelLabel}
            </button>
          </div>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 rounded-full p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors"
        >
          <X size={20} weight="bold" />
        </button>
      </div>
    </div>
  );
}
