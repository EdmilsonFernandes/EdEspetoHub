import { X } from '@phosphor-icons/react';

type HubMarketingPopupProps = {
  visible: boolean;
  imageUrl: string;
  title?: string;
  description?: string;
  actionUrl?: string;
  actionLabel?: string;
  actionHref?: string;
  actionExternal?: boolean;
  fit?: string;
  onDismiss: () => void;
  onOpenAction: () => void;
};

export function HubMarketingPopup({
  visible,
  imageUrl,
  title,
  description,
  actionUrl,
  actionLabel,
  actionHref,
  actionExternal,
  fit,
  onDismiss,
  onOpenAction,
}: HubMarketingPopupProps) {
  if (!visible) return null;
  const preserveArtwork = fit === 'cover' || fit === 'contain';
  const imagePaddingClass = fit === 'contain' ? 'p-3' : '';

  return (
    <div
      className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-950/48 px-4 py-[max(1rem,env(safe-area-inset-top))] backdrop-blur-md animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-label="Campanha em destaque do Já no Caminho"
    >
      <div className="relative w-full max-w-[430px] animate-in zoom-in-95 slide-in-from-bottom-3 duration-200">
        <button
          type="button"
          onClick={onDismiss}
          className="absolute -right-2 -top-2 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/80 bg-white text-slate-900 shadow-[0_14px_30px_-14px_rgba(15,23,42,0.45)] transition-all duration-150 ease-out hover:bg-slate-50 active:scale-95"
          aria-label="Fechar destaque"
          title="Fechar"
        >
          <X size={19} weight="bold" />
        </button>
        <a
          href={actionHref || '#'}
          target={actionExternal ? '_blank' : undefined}
          rel={actionExternal ? 'noopener noreferrer' : undefined}
          onClick={(event) => {
            event.preventDefault();
            onOpenAction();
          }}
          className="group block overflow-hidden rounded-[1.85rem] border border-white/80 bg-white shadow-[0_28px_70px_-32px_rgba(15,23,42,0.72)] transition-all duration-200 ease-out active:scale-[0.985]"
          aria-label={title || 'Abrir popup de marketing do Já no Caminho'}
        >
          <div className="relative aspect-[3/4] bg-slate-950">
            {preserveArtwork ? (
              <>
                <img
                  src={imageUrl}
                  alt=""
                  aria-hidden="true"
                  loading="eager"
                  fetchPriority="high"
                  decoding="async"
                  className="absolute inset-0 h-full w-full scale-110 object-cover object-center opacity-30 blur-xl"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-slate-950/10 via-white/5 to-slate-950/18" />
              </>
            ) : null}
            <img
              src={imageUrl}
              alt={title || 'Banner de marketing do Já no Caminho'}
              loading="eager"
              fetchPriority="high"
              decoding="async"
              className={`absolute inset-0 z-[1] h-full w-full object-center ${preserveArtwork ? 'object-contain' : 'object-cover'} ${imagePaddingClass}`}
            />
            <div className="absolute inset-x-0 bottom-0 z-[2] h-20 bg-gradient-to-t from-slate-950/20 to-transparent opacity-80 transition-opacity duration-200 group-active:opacity-100" />
          </div>
          {title || description || actionUrl ? (
            <div className="border-t border-slate-100 px-5 py-4">
              {title ? (
                <p className="tracking-tight text-base font-black text-slate-950">{title}</p>
              ) : null}
              {description ? (
                <p className="mt-1.5 text-sm font-medium leading-relaxed text-slate-600">
                  {description}
                </p>
              ) : null}
              {actionUrl ? (
                <div className="mt-4 inline-flex max-w-full rounded-full bg-slate-950 px-5 py-2 text-[11px] font-black uppercase tracking-[0.1em] text-white shadow-[0_12px_20px_-8px_rgba(15,23,42,0.3)] transition-colors duration-300 hover:bg-slate-800">
                  <span className="truncate">{actionLabel}</span>
                </div>
              ) : null}
            </div>
          ) : null}
        </a>
      </div>
    </div>
  );
}
