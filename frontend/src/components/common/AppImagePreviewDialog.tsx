import { useEffect, useMemo, useState } from 'react';

type ImagePreview = {
  src: string;
  title?: string;
  images?: Array<{
    src: string;
    title?: string;
  }>;
  initialIndex?: number;
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
  const [activeIndex, setActiveIndex] = useState(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const images = useMemo(() => {
    if (!image) return [];
    const sourceImages = Array.isArray(image.images) && image.images.length ? image.images : [image];
    const unique = new Map<string, { src: string; title?: string }>();
    sourceImages
      .filter((item) => item?.src)
      .forEach((item) => {
        if (!unique.has(item.src)) unique.set(item.src, { src: item.src, title: item.title || image.title });
      });
    return Array.from(unique.values());
  }, [image]);
  const hasGallery = images.length > 1;

  useEffect(() => {
    if (!image) return;
    const preferredIndex = Number.isFinite(image.initialIndex) ? Number(image.initialIndex) : images.findIndex((item) => item.src === image.src);
    setActiveIndex(Math.max(0, Math.min(images.length - 1, preferredIndex >= 0 ? preferredIndex : 0)));
  }, [image, images.length]);

  const goToPrevious = () => setActiveIndex((current) => (images.length ? (current - 1 + images.length) % images.length : 0));
  const goToNext = () => setActiveIndex((current) => (images.length ? (current + 1) % images.length : 0));

  useEffect(() => {
    if (!image) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowLeft' && images.length > 1) goToPrevious();
      if (event.key === 'ArrowRight' && images.length > 1) goToNext();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [image, images.length, onClose]);

  if (!image) return null;

  const activeImage = images[activeIndex] || image;
  const title = activeImage.title || image.title || 'Imagem';
  const previewNextImage = images[(activeIndex + 1) % images.length]?.src;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${label}: ${title}`}
      className="fixed inset-0 z-[300] flex items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top,rgba(51,104,134,0.24),transparent_34%),linear-gradient(180deg,rgba(2,6,23,0.84),rgba(15,23,42,0.94))] px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <figure
        className="relative grid max-h-[calc(100dvh_-_2rem_-_env(safe-area-inset-top)_-_env(safe-area-inset-bottom))] w-full max-w-4xl grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-3xl border border-white/14 bg-white/10 p-2 shadow-[0_36px_110px_-46px_rgba(0,0,0,0.96)] ring-1 ring-white/10 animate-in zoom-in-95 duration-200"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 px-2 pb-2 text-white">
          <div className="min-w-0">
            <p className="truncate text-sm font-black">{title}</p>
            {hasGallery ? (
              <p className="mt-0.5 text-[11px] font-semibold text-white/62">{activeIndex + 1} de {images.length} fotos</p>
            ) : (
              <p className="mt-0.5 text-[11px] font-semibold text-white/62">Toque fora para voltar.</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 min-w-10 items-center justify-center rounded-full border border-white/18 bg-white/90 px-3 text-xs font-black text-[#153A4C] shadow-[0_18px_42px_-26px_rgba(0,0,0,0.85)] ring-1 ring-white/10 transition-all hover:bg-white active:scale-[0.98]"
            aria-label="Fechar imagem ampliada"
          >
            Fechar
          </button>
        </div>

        <div
          className="relative grid min-h-0 place-items-center overflow-hidden rounded-3xl bg-slate-950/45"
          onTouchStart={(event) => setTouchStartX(event.touches[0]?.clientX ?? null)}
          onTouchEnd={(event) => {
            if (touchStartX === null || !hasGallery) return;
            const diff = touchStartX - (event.changedTouches[0]?.clientX ?? touchStartX);
            if (Math.abs(diff) > 42) {
              if (diff > 0) goToNext();
              else goToPrevious();
            }
            setTouchStartX(null);
          }}
        >
          <img
            src={activeImage.src}
            alt={title}
            className="max-h-[calc(100dvh_-_8rem_-_env(safe-area-inset-top)_-_env(safe-area-inset-bottom))] w-auto max-w-full object-contain"
          />
          {previewNextImage && previewNextImage !== activeImage.src ? <img src={previewNextImage} alt="" className="hidden" /> : null}
          {hasGallery ? (
            <>
              <button
                type="button"
                onClick={goToPrevious}
                className="absolute left-3 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/42 text-2xl font-black text-white shadow-[0_18px_36px_-22px_rgba(0,0,0,0.85)] backdrop-blur-xl transition hover:bg-black/58 active:scale-95"
                aria-label="Ver foto anterior"
              >
                {'<'}
              </button>
              <button
                type="button"
                onClick={goToNext}
                className="absolute right-3 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/42 text-2xl font-black text-white shadow-[0_18px_36px_-22px_rgba(0,0,0,0.85)] backdrop-blur-xl transition hover:bg-black/58 active:scale-95"
                aria-label="Ver proxima foto"
              >
                {'>'}
              </button>
            </>
          ) : null}
        </div>
        <figcaption className="px-1 pt-2 text-white">
          {hasGallery ? (
            <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {images.map((item, index) => (
                <button
                  key={`${item.src}-${index}`}
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  className={`h-14 w-16 shrink-0 overflow-hidden rounded-2xl border transition ${index === activeIndex ? 'border-white shadow-[0_16px_34px_-22px_rgba(255,255,255,0.8)]' : 'border-white/14 opacity-62 hover:opacity-100'}`}
                  aria-label={`Ver foto ${index + 1}`}
                >
                  <img src={item.src} alt="" className="h-full w-full object-cover" loading="lazy" />
                </button>
              ))}
            </div>
          ) : null}
        </figcaption>
      </figure>
    </div>
  );
}
