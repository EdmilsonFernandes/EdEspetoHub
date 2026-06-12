import { cacheService } from '../services/CacheService';
import { logger } from './logger';

const log = logger.child({ scope: 'cacheInvalidation' });

/**
 * Invalidate all cache entries related to public store data.
 * Called after broad changes that affect multiple stores.
 */
export async function invalidateStoreCache(): Promise<void> {
  await Promise.all([
    cacheService.invalidateByPattern('stores:*'),
    cacheService.invalidateByPattern('products:store:*'),
    cacheService.invalidateByPattern('categories:store:*'),
  ]);
  log.debug('Full store cache invalidated');
}

/**
 * Invalidate cache for a specific store by slug.
 * More targeted than full invalidation.
 */
export async function invalidateStoreBySlugCache(slug: string): Promise<void> {
  await Promise.all([
    cacheService.del('stores:portfolio'),
    cacheService.del(`stores:slug:${slug}`),
    cacheService.invalidateByPattern(`products:store:slug:${slug}`),
    cacheService.invalidateByPattern(`categories:store:slug:${slug}`),
  ]);
  log.debug('Store cache invalidated by slug', { slug });
}

/**
 * Invalidate product-related caches for a given store slug.
 * Called after product create/update/remove/stock adjust.
 */
export async function invalidateProductCache(storeSlug: string): Promise<void> {
  await Promise.all([
    cacheService.del('stores:portfolio'),
    cacheService.del(`stores:slug:${storeSlug}`),
    cacheService.invalidateByPattern(`products:store:slug:${storeSlug}`),
    cacheService.invalidateByPattern(`categories:store:slug:${storeSlug}`),
  ]);
  log.debug('Product cache invalidated', { storeSlug });
}

/**
 * Invalidate platform-level caches (metrics, home config, featured).
 */
export async function invalidatePlatformCache(): Promise<void> {
  await Promise.all([
    cacheService.invalidateByPattern('metrics:*'),
    cacheService.invalidateByPattern('config:home'),
    cacheService.invalidateByPattern('featured:*'),
  ]);
  log.debug('Platform cache invalidated');
}
