/**
 * OneForm Unified Platform — API Entry Point
 *
 * Startup sequence:
 * 1. Load environment variables
 * 2. Initialize Prisma (PostgreSQL 17)
 * 3. Initialize Redis 8 client
 * 4. Start Express 5 server
 * 5. Register routes
 *
 * Anti-Pattern Fixed: Proper server cleanup on shutdown (no zombie processes)
 *
 * @module index
 */
import 'dotenv/config';
import http from 'http';
import { app, registerRoutes } from './app.js';
import { logger } from './utils/logger.js';
import { prisma } from './lib/prisma.js';
import { redis } from './lib/redis.js';

const PORT = parseInt(process.env['PORT'] ?? '4000', 10);

async function main(): Promise<void> {
  logger.info('🚀 Starting OneForm API...');

  // 1. Test database connection
  try {
    await prisma.$connect();
    logger.info('✅ PostgreSQL 17 connected');
  } catch (error) {
    logger.fatal({ error }, '❌ PostgreSQL connection failed. Exiting.');
    process.exit(1);
  }

  // 2. Test Redis connection
  try {
    await redis.ping();
    logger.info('✅ Redis 8 connected');
  } catch (error) {
    logger.fatal({ error }, '❌ Redis connection failed. Exiting.');
    process.exit(1);
  }

  // 3. Start OCR worker (BullMQ)
  try {
    const { startOcrWorker } = await import('./services/ocr.service.js');
    startOcrWorker();
  } catch (error) {
    logger.error({ error }, '⚠️ Failed to start OCR worker (continuing without it)');
  }

  // 4. Register all routes
  await registerRoutes();

  // 5. Start HTTP server
  const server = http.createServer(app);

  server.listen(PORT, () => {
    logger.info(
      {
        port: PORT,
        env: process.env['NODE_ENV'],
        nodeVersion: process.version,
      },
      `✅ OneForm API running on http://localhost:${PORT}`,
    );
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Graceful Shutdown (fixes zombie process anti-pattern)
  // ─────────────────────────────────────────────────────────────────────────

  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, '⏸️  Graceful shutdown initiated...');

    // Stop accepting new connections
    server.close(async () => {
      try {
        const { stopOcrWorker } = await import('./services/ocr.service.js');
        await stopOcrWorker();
        logger.info('✅ OCR worker stopped');
      } catch (err) {
        logger.error({ err }, 'Error stopping OCR worker');
      }

      try {
        await prisma.$disconnect();
        logger.info('✅ PostgreSQL disconnected');
      } catch (err) {
        logger.error({ err }, 'Error disconnecting PostgreSQL');
      }

      try {
        await redis.quit();
        logger.info('✅ Redis disconnected');
      } catch (err) {
        logger.error({ err }, 'Error disconnecting Redis');
      }

      logger.info('✅ Shutdown complete');
      process.exit(0);
    });

    // Force exit after 10 seconds
    setTimeout(() => {
      logger.error('⚠️  Forced shutdown after timeout');
      process.exit(1);
    }, 10_000);
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));

  // Catch unhandled rejections — log and exit (don't swallow!)
  process.on('unhandledRejection', (reason) => {
    logger.fatal({ reason }, '💥 Unhandled Promise Rejection');
    process.exit(1);
  });

  process.on('uncaughtException', (error) => {
    logger.fatal({ error }, '💥 Uncaught Exception');
    process.exit(1);
  });
}

void main();
