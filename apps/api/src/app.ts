/**
 * OneForm Unified Platform — Express 5 Application Setup
 *
 * Security-first configuration:
 * - Helmet.js security headers
 * - CORS restricted to allowed origins (not *)
 * - Rate limiting via Redis 8 (rate-limiter-flexible)
 * - Request ID tracking
 * - Structured pino logging
 * - Zod-based input validation
 *
 * @module app
 */
import express, { type Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import { logger } from './utils/logger.js';

// ─────────────────────────────────────────────────────────────────────────────
// Create Express 5 app
// ─────────────────────────────────────────────────────────────────────────────

export const app: Application = express();

// ─────────────────────────────────────────────────────────────────────────────
// Security Headers (Helmet)
// ─────────────────────────────────────────────────────────────────────────────

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        connectSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https://r2.dev'],  // Allow R2 images
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        fontSrc: ["'self'"],
        frameAncestors: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: true,
    crossOriginOpenerPolicy: { policy: 'same-origin' },
    strictTransportSecurity: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// CORS — Strictly limited to allowed origins (NOT *)
// ─────────────────────────────────────────────────────────────────────────────

const allowedOrigins = (process.env['ALLOWED_ORIGINS'] ?? 'http://localhost:3000')
  .split(',')
  .map((o) => o.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        logger.warn({ origin }, 'CORS rejected request from unknown origin');
        callback(new Error(`CORS: Origin ${origin} not allowed`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'X-Tenant-ID'],
    exposedHeaders: ['X-Request-ID'],
    maxAge: 86400,  // Cache preflight for 24 hours
  }),
);

// ─────────────────────────────────────────────────────────────────────────────
// Request Parsing
// ─────────────────────────────────────────────────────────────────────────────

app.use(express.json({ limit: '1mb' }));      // JSON body limit
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(compression());

// ─────────────────────────────────────────────────────────────────────────────
// Request ID (for distributed tracing)
// ─────────────────────────────────────────────────────────────────────────────

app.use((req, res, next) => {
  const requestId = (req.headers['x-request-id'] as string) ?? crypto.randomUUID();
  req.headers['x-request-id'] = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
});

// ─────────────────────────────────────────────────────────────────────────────
// HTTP Request Logging (morgan → pino)
// ─────────────────────────────────────────────────────────────────────────────

if (process.env['NODE_ENV'] !== 'test') {
  app.use(
    morgan('combined', {
      stream: {
        write: (message: string) => {
          logger.info({ type: 'http' }, message.trim());
        },
      },
      skip: (req) => req.url === '/api/health',  // Skip health check spam
    }),
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Health Check (no auth required)
// ─────────────────────────────────────────────────────────────────────────────

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'OneForm API',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    env: process.env['NODE_ENV'] ?? 'development',
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Routes (registered after middleware)
// ─────────────────────────────────────────────────────────────────────────────

// Dynamic route imports to allow tree-shaking
export async function registerRoutes(): Promise<void> {
  const { authRouter } = await import('./routes/auth.routes.js');
  const { profileRouter } = await import('./routes/profile.routes.js');
  const { documentRouter } = await import('./routes/document.routes.js');
  const { walletRouter } = await import('./routes/wallet.routes.js');
  const { adminRouter } = await import('./routes/admin.routes.js');
  const { extensionRouter } = await import('./routes/extension.routes.js');
  const { errorHandler, notFoundHandler } = await import('./middleware/error.middleware.js');

  app.use('/api/auth', authRouter);
  app.use('/api/profiles', profileRouter);
  app.use('/api/documents', documentRouter);
  app.use('/api/wallet', walletRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api', extensionRouter);

  // 404 — must be after all routes
  app.use(notFoundHandler);

  // Error handler — must be last
  app.use(errorHandler);
}
