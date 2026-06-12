import Redis from 'ioredis';
import { env } from '../config/env';
import { logger } from '../utils/logger';

const log = logger.child({ scope: 'CacheService' });

class CacheService {
  private client: Redis | null = null;
  private connected = false;
  private connectionWarned = false;

  async initialize(): Promise<void> {
    if (!env.redis.url) {
      log.info('REDIS_URL not set; caching disabled');
      return;
    }
    try {
      this.client = new Redis(env.redis.url, {
        maxRetriesPerRequest: 1,
        enableReadyCheck: true,
        retryStrategy: (times) => {
          if (times > 5) {
            if (!this.connectionWarned) {
              log.warn('Redis connection retries exhausted; caching disabled');
              this.connectionWarned = true;
            }
            return null;
          }
          return Math.min(times * 200, 2000);
        },
        lazyConnect: true,
      });

      this.client.on('ready', () => {
        this.connected = true;
        this.connectionWarned = false;
        log.info('Redis connected');
      });

      this.client.on('error', (err) => {
        this.connected = false;
        log.warn('Redis error', { error: err.message });
      });

      this.client.on('close', () => {
        this.connected = false;
      });

      await this.client.connect();
    } catch (error: any) {
      log.warn('Redis initialization failed; caching disabled', { error: error.message });
      this.client = null;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.client || !this.connected) return null;
    try {
      const raw = await this.client.get(key);
      if (raw === null) return null;
      return JSON.parse(raw) as T;
    } catch (error: any) {
      log.warn('Cache get failed', { key, error: error.message });
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    if (!this.client || !this.connected) return;
    try {
      const ttl = ttlSeconds ?? env.redis.ttlDefaultSeconds;
      const serialized = JSON.stringify(value);
      await this.client.setex(key, ttl, serialized);
    } catch (error: any) {
      log.warn('Cache set failed', { key, error: error.message });
    }
  }

  async del(key: string): Promise<void> {
    if (!this.client || !this.connected) return;
    try {
      await this.client.del(key);
    } catch (error: any) {
      log.warn('Cache del failed', { key, error: error.message });
    }
  }

  async invalidateByPattern(pattern: string): Promise<void> {
    if (!this.client || !this.connected) return;
    try {
      const stream = this.client.scanStream({ match: pattern, count: 100 });
      const keys: string[] = [];
      await new Promise<void>((resolve, reject) => {
        stream.on('data', (resultKeys: string[]) => keys.push(...resultKeys));
        stream.on('end', () => resolve());
        stream.on('error', (err) => reject(err));
      });
      if (keys.length > 0) {
        await this.client.del(...keys);
        log.debug('Cache invalidated', { pattern, count: keys.length });
      }
    } catch (error: any) {
      log.warn('Cache invalidateByPattern failed', { pattern, error: error.message });
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
      this.connected = false;
    }
  }
}

export const cacheService = new CacheService();
