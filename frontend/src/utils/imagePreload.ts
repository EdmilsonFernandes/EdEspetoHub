const MAX_TRACKED_PRELOADS = 360;
const preloadedImageUrls = new Set<string>();

type PreloadImagesOptions = {
  limit?: number;
  idleTimeoutMs?: number;
};

const normalizeImageUrl = (value?: string | null) => {
  const url = String(value || '').trim();
  if (!url || /^data:|^blob:/i.test(url)) return '';
  return url;
};

const rememberPreloadedUrl = (url: string) => {
  preloadedImageUrls.add(url);
  while (preloadedImageUrls.size > MAX_TRACKED_PRELOADS) {
    const oldest = preloadedImageUrls.values().next().value;
    if (!oldest) break;
    preloadedImageUrls.delete(oldest);
  }
};

export const preloadImageUrls = (values: Array<string | null | undefined>, options: PreloadImagesOptions = {}) => {
  if (typeof window === 'undefined' || typeof Image === 'undefined') return () => undefined;

  const limit = Math.max(1, Math.min(32, Number(options.limit || 12)));
  const urls = Array.from(new Set(values.map(normalizeImageUrl).filter(Boolean)))
    .filter((url) => !preloadedImageUrls.has(url))
    .slice(0, limit);

  if (!urls.length) return () => undefined;

  let cancelled = false;
  const pendingImages: HTMLImageElement[] = [];

  const run = () => {
    if (cancelled) return;

    urls.forEach((url) => {
      if (cancelled) return;
      rememberPreloadedUrl(url);

      const image = new Image();
      image.decoding = 'async';
      image.loading = 'eager';
      (image as any).fetchPriority = 'low';
      image.onload = image.onerror = () => {
        image.onload = null;
        image.onerror = null;
        const index = pendingImages.indexOf(image);
        if (index >= 0) pendingImages.splice(index, 1);
      };
      image.src = url;
      pendingImages.push(image);
    });
  };

  const idleTimeoutMs = Math.max(250, Number(options.idleTimeoutMs || 1200));
  const win = window as any;
  const idleId =
    typeof win.requestIdleCallback === 'function'
      ? win.requestIdleCallback(run, { timeout: idleTimeoutMs })
      : window.setTimeout(run, Math.min(idleTimeoutMs, 600));

  return () => {
    cancelled = true;
    if (typeof win.cancelIdleCallback === 'function') {
      win.cancelIdleCallback(idleId);
    } else {
      window.clearTimeout(idleId);
    }

    pendingImages.forEach((image) => {
      image.onload = null;
      image.onerror = null;
    });
    pendingImages.length = 0;
  };
};
