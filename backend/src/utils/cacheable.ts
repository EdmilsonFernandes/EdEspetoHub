import { cacheService } from '../services/CacheService';
import { logger } from './logger';

const log = logger.child({ scope: 'cacheable' });

/**
 * Method decorator that caches the return value of an async method in Redis.
 *
 * @param keyPrefix - Namespace for the cache key (e.g., 'stores:portfolio')
 * @param ttlSeconds - Time-to-live in seconds
 * @param argsToKey - Optional function to derive a cache key suffix from method arguments.
 *                    Receives the spread arguments. Default: JSON.stringify all args.
 */
export function cacheable(
  keyPrefix: string,
  ttlSeconds: number,
  argsToKey?: (...args: any[]) => string,
) {
  return function (
    _target: any,
    _propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const suffix = argsToKey
        ? argsToKey(...args)
        : args.length
          ? JSON.stringify(args)
          : '';
      const cacheKey = suffix ? `${keyPrefix}:${suffix}` : keyPrefix;

      try {
        const cached = await cacheService.get(cacheKey);
        if (cached !== null) {
          log.debug('Cache hit', { key: cacheKey });
          return cached;
        }
      } catch {
        // Fall through to original method
      }

      const result = await originalMethod.apply(this, args);

      try {
        await cacheService.set(cacheKey, result, ttlSeconds);
      } catch {
        // Ignore cache write failures
      }

      return result;
    };
  };
}
