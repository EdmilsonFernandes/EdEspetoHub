import { X, CalendarBlank, Clock } from '@phosphor-icons/react';
import { type ReactNode } from 'react';

type CondominiumStatusModalProps = {
  isOpen: boolean;
  onClose: () => void;
  name: string;
  nextLabel: string;
  logoUrl?: string;
  bannerUrl?: string;
};

export function CondominiumStatusModal({
  isOpen,
  onClose,
  name,
  nextLabel,
  logoUrl,
  bannerUrl,
}: CondominiumStatusModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/50 px-4 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-[360px] overflow-hidden rounded-[2rem] bg-white shadow-[0_30px_60px_-20px_rgba(15,23,42,0.5)] animate-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-slate-500 shadow-sm transition-colors hover:bg-white hover:text-slate-900"
        >
          <X size={18} weight="bold" />
        </button>

        {/* Header Visual */}
        <div className="relative h-28 w-full bg-slate-100">
          {bannerUrl ? (
            <img src={bannerUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-slate-200 to-slate-300" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent" />
          
          <div className="absolute -bottom-8 left-6 h-16 w-16 overflow-hidden rounded-2xl border-4 border-white bg-white shadow-lg">
            {logoUrl ? (
              <img src={logoUrl} alt={name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-slate-100 text-slate-400">
                <span className="text-xl font-black">?</span>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="px-6 pb-6 pt-12">
          <h3 className="text-lg font-black text-slate-950">{name}</h3>
          <p className="mt-1 text-sm font-medium text-slate-500">
            Este condomínio não possui feira ativa agora.
          </p>

          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <div className="mt-0.5 rounded-full bg-white p-2 text-[#336886] shadow-sm">
              <CalendarBlank size={20} weight="duotone" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Próxima agenda</p>
              <p className="mt-0.5 text-sm font-bold text-slate-900">
                {nextLabel || 'A confirmar'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="mt-6 w-full rounded-xl bg-slate-900 py-3 text-sm font-black text-white transition-transform active:scale-[0.98]"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}
