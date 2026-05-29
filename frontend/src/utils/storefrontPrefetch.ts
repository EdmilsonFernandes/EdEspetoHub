import { productService } from '../services/productService';
import { storeService } from '../services/storeService';
import { loadStorePage } from './adminRoutePrefetch';

const PREFETCH_DEDUPE_MS = 15_000;
const lastPrefetchBySlug = new Map<string, number>();

const normalizeSlug = (slug?: string | null) => String(slug || '').trim().toLowerCase();

export const prefetchStorefrontData = (slug?: string | null) => {
  const normalizedSlug = normalizeSlug(slug);
  if (!normalizedSlug) return;

  const now = Date.now();
  const lastPrefetch = Number(lastPrefetchBySlug.get(normalizedSlug) || 0);
  if (lastPrefetch && now - lastPrefetch < PREFETCH_DEDUPE_MS) return;
  lastPrefetchBySlug.set(normalizedSlug, now);

  void loadStorePage().catch(() => undefined);
  void storeService.fetchBySlug(normalizedSlug).catch(() => undefined);
  void productService.prefetchPublicBySlug(normalizedSlug).catch(() => undefined);
};
