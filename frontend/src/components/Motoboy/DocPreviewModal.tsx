import { X } from '@phosphor-icons/react';

type DocPreviewModalProps = {
  open: boolean;
  title: string;
  src: string | null;
  onClose: () => void;
};

export function DocPreviewModal({ open, title, src, onClose }: DocPreviewModalProps) {
  if (!open) return null;
  const normalized = String(src || '').toLowerCase();
  const isImage =
    normalized.startsWith('data:image/') ||
    /\.(png|jpe?g|webp|gif|bmp|svg)(\?.*)?$/.test(normalized);
  const isPdf = normalized.startsWith('data:application/pdf') || /\.pdf(\?.*)?$/.test(normalized);

  return (
    <div className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-3 overflow-hidden">
      <div className="w-full max-w-3xl rounded-3xl bg-white overflow-hidden shadow-2xl motoboy-fade-up max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-200">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Prévia</p>
            <p className="text-sm font-extrabold text-slate-900 truncate">{title}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn-press h-10 w-10 rounded-2xl border border-slate-200 bg-white flex items-center justify-center text-slate-700"
            aria-label="Fechar"
          >
            <X size={18} weight="bold" />
          </button>
        </div>

        <div className="bg-slate-950 min-h-0 overflow-auto">
          {src && isImage ? (
            <div className="max-h-[76vh] overflow-auto">
              <img src={src} alt={title} className="w-full h-auto max-h-[76vh] object-contain block" />
            </div>
          ) : src && isPdf ? (
            <div className="h-[76vh] bg-white">
              <iframe title={title} src={src} className="h-full w-full" />
            </div>
          ) : src ? (
            <div className="p-8 text-center text-sm text-slate-200">
              Este arquivo não tem visualização embutida. Use "Abrir em nova aba".
            </div>
          ) : (
            <div className="p-8 text-center text-sm text-slate-200">Sem prévia disponível.</div>
          )}
        </div>
        {src ? (
          <div className="px-4 py-3 border-t border-slate-200 bg-white flex items-center justify-between gap-3">
            <a
              href={src}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-extrabold text-brand-primary underline"
            >
              Abrir em nova aba
            </a>
            <button
              type="button"
              onClick={onClose}
              className="btn-press rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-extrabold text-slate-800"
            >
              Fechar
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
