/**
 * OneForm Unified Platform — Redis 8 Client (ioredis)
 * Used for: sessions, BullMQ, rate limiting, feature flags cache.
 */
import { Redis } from 'ioredis';
import { logger } from '../utils/logger.js';

const REDIS_URL = process.env['REDIS_URL'] ?? 'redis://localhost:6379';

export const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy: (times: number) => {
    if (times > 10) {
      logger.error('Redis retry limit exceeded');
      return null; // Stop retrying
    }
    return Math.min(times * 200, 2000); // Exponential backoff, max 2s
  },
  reconnectOnError: (err: Error) => {
    logger.warn({ err: err.message }, 'Redis reconnecting after error');
    return true;
  },
  lazyConnect: false,
  enableReadyCheck: true,
  name: 'oneform-main',
});

redis.on('connect', () => logger.debug('Redis: connected'));
redis.on('ready', () => logger.info('Redis 8: ready'));
redis.on('error', (err: Error) => logger.error({ err }, 'Redis error'));
redis.on('close', () => logger.warn('Redis: connection closed'));
