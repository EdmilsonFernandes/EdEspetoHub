import { useMemo, useState, type SyntheticEvent } from 'react';

type AvatarFitMode = 'cover-top' | 'cover-center' | 'contain';

type AdaptiveAvatarProps = {
  src?: string | null;
  alt?: string;
  fallbackText?: string;
  sizeClassName?: string;
  containerClassName?: string;
  imageClassName?: string;
  onClick?: () => void;
  title?: string;
};

export function AdaptiveAvatar({
  src,
  alt = 'Avatar',
  fallbackText = 'A',
  sizeClassName = 'h-12 w-12',
  containerClassName = '',
  imageClassName = '',
  onClick,
  title,
}: AdaptiveAvatarProps) {
  const [fitMode, setFitMode] = useState<AvatarFitMode>('cover-center');
  const cleanSrc = String(src || '').trim();

  const computedImageClass = useMemo(() => {
    if (fitMode === 'contain') return 'h-full w-full object-contain object-center bg-slate-100';
    if (fitMode === 'cover-top') return 'h-full w-full object-cover object-[center_22%]';
    return 'h-full w-full object-cover object-center';
  }, [fitMode]);

  const handleImageLoad = (event: SyntheticEvent<HTMLImageElement>) => {
    const img = event.currentTarget;
    const width = Number(img.naturalWidth || 0);
    const height = Number(img.naturalHeight || 0);
    if (!width || !height) return;
    const ratio = width / height;
    if (ratio > 1.2) {
      setFitMode('contain');
      return;
    }
    if (ratio < 0.85) {
      setFitMode('cover-top');
      return;
    }
    setFitMode('cover-center');
  };

  const Wrapper = onClick ? 'button' : 'div';

  return (
    <Wrapper
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      title={title}
      className={[
        sizeClassName,
        'rounded-full border border-slate-200 bg-white overflow-hidden grid place-items-center text-slate-500 font-black shrink-0',
        containerClassName,
      ].join(' ')}
    >
      {cleanSrc ? (
        <img
          src={cleanSrc}
          alt={alt}
          onLoad={handleImageLoad}
          loading="lazy"
          className={`${computedImageClass} ${imageClassName}`.trim()}
        />
      ) : (
        <span>{String(fallbackText || 'A').trim().slice(0, 1).toUpperCase()}</span>
      )}
    </Wrapper>
  );
}
