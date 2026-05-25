import { useEffect } from 'react';

type ImagePreview = {
  src: string;
  title?: string;
};

type AppImagePreviewDialogProps = {
  image: ImagePreview | null;
  onClose: () => void;
  label?: string;
};

export function AppImagePreviewDialog({
  image,
  onClose,
  label = 'Visualizacao da imagem',
}: AppImagePreviewDialogProps) {
  useEffect(() => {
    if (!image) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [image, onClose]);

  if (!image) return null;

  const title = image.title || 'Imagem';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${label}: ${title}`}
      className="fixed inset-0 z-[300] flex items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top,rgba(51,104,134,0.24),transparent_34%),linear-gradient(180deg,rgba(2,6,23,0.84),rgba(15,23,42,0.94))] px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <figure
        className="relative grid max-h-[calc(100dvh_-_2rem_-_env(safe-area-inset-top)_-_env(safe-area-inset-bottom))] w-full max-w-4xl grid-rows-[minmax(0,1fr)_auto] overflow-hidden rounded-[2rem] border border-white/14 bg-white/10 p-2 shadow-[0_36px_110px_-46px_rgba(0,0,0,0.96)] ring-1 ring-white/10 animate-in zoom-in-95 duration-200"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="grid min-h-0 place-items-center overflow-hidden rounded-[1.55rem] bg-slate-950/45">
          <img
            src={image.src}
            alt={title}
            className="max-h-[calc(100dvh_-_8rem_-_env(safe-area-inset-top)_-_env(safe-area-inset-bottom))] w-auto max-w-full object-contain"
          />
        </div>
        <figcaption className="flex flex-col gap-3 px-3 py-3 text-white sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="truncate text-sm font-black">{title}</p>
            <p className="mt-0.5 text-[11px] font-semibold text-white/62">Toque fora da imagem para voltar.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/18 bg-white px-5 text-sm font-black text-[#153A4C] shadow-[0_18px_42px_-26px_rgba(0,0,0,0.85)] ring-1 ring-white/10 transition-all hover:bg-white/92 active:scale-[0.98]"
            aria-label="Fechar imagem ampliada"
          >
            Fechar
          </button>
        </figcaption>
      </figure>
    </div>
  );
}
