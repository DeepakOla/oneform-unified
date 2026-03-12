/**
 * OneForm Unified Platform — Logger Utility
 *
 * Anti-Pattern Fixed: NO raw console.log in production!
 * Uses pino for structured JSON logging.
 *
 * Usage:
 *   import { logger } from '@/utils/logger.js';
 *   logger.info({ userId }, 'User logged in');
 *   logger.error({ error }, 'Encryption failed');
 *
 * In production: logs go to stdout as JSON → Loki/CloudWatch
 * In development: pretty-printed colored output via pino-pretty
 */
import pino from 'pino';

const isDev = process.env.NODE_ENV !== 'production';

export const logger = pino({
  level: process.env.LOG_LEVEL ?? (isDev ? 'debug' : 'info'),
  ...(isDev
    ? {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:HH:MM:ss',
            ignore: 'pid,hostname',
          },
        },
      }
    : {
        // Production: structured JSON
        formatters: {
          level: (label: string) => ({ level: label }),
        },
        timestamp: pino.stdTimeFunctions.isoTime,
      }),
  // Redact sensitive fields from logs — NEVER log these
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'body.password',
      'body.passwordHash',
      'body.aadhaar',
      'body.pan',
      'body.otp',
      'body.token',
      'body.refreshToken',
      'body.accessToken',
      '*.sectionAEncrypted',
    ],
    censor: '[REDACTED]',
  },
});

export type Logger = typeof logger;
