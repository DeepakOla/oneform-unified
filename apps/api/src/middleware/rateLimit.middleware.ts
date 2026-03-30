/**
 * OneForm API — Rate Limiting Middleware
 * Implements rate limiting using rate-limiter-flexible
 */
import { RateLimiterRedis, RateLimiterMemory } from 'rate-limiter-flexible';
import { Redis } from 'ioredis';
import type { Request, Response, NextFunction } from 'express';

const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';

let rateLimiter: RateLimiterRedis | RateLimiterMemory;

// Try to use Redis, fall back to in-memory if Redis is unavailable
try {
  const redisClient = new Redis(REDIS_URL, {
    enableOfflineQueue: false,
  });

  rateLimiter = new RateLimiterRedis({
    storeClient: redisClient,
    keyPrefix: 'rl',
    points: 5, // Number of requests
    duration: 60, // Per 60 seconds
  });
} catch (error) {
  console.warn('Redis unavailable for rate limiting, using in-memory fallback');
  rateLimiter = new RateLimiterMemory({
    points: 5,
    duration: 60,
  });
}

/**
 * Rate limit middleware for auth endpoints
 */
export async function rateLimitAuth(req: Request, res: Response, next: NextFunction) {
  try {
    // Use IP address as rate limit key
    const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown';

    await rateLimiter.consume(ip);
    next();
  } catch (error) {
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Please try again later.',
      },
    });
  }
}

/**
 * Create custom rate limiter
 */
export function createRateLimiter(points: number, duration: number) {
  try {
    const redisClient = new Redis(REDIS_URL, {
      enableOfflineQueue: false,
    });

    return new RateLimiterRedis({
      storeClient: redisClient,
      keyPrefix: `rl:custom`,
      points,
      duration,
    });
  } catch (error) {
    console.warn('Redis unavailable for custom rate limiting, using in-memory fallback');
    return new RateLimiterMemory({
      points,
      duration,
    });
  }
}

/**
 * Create rate limit middleware with custom settings
 */
export function rateLimitMiddleware(points: number, duration: number) {
  const limiter = createRateLimiter(points, duration);

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown';
      await limiter.consume(ip);
      next();
    } catch (error) {
      res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests. Please try again later.',
        },
      });
    }
  };
}
