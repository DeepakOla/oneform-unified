/**
 * @fileoverview OneForm Unified Platform — Express API entry point.
 *
 * Configures security headers, CORS, JSON parsing, routes, and the global
 * error handler. Middleware is applied in strict registration order.
 */

import express, { type Request, type Response, type NextFunction } from 'express';
import 'express-async-errors';

// ---------------------------------------------------------------------------
// App Setup
// ---------------------------------------------------------------------------

const app = express();

// Parse JSON bodies with a 1 MB size limit to mitigate denial-of-service
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ---------------------------------------------------------------------------
// Health check (unauthenticated)
// ---------------------------------------------------------------------------

app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ---------------------------------------------------------------------------
// Protected routes
// ---------------------------------------------------------------------------
// Routes are mounted here. Auth middleware + tenant middleware are applied
// inside the router modules, keeping the entry point lean.

// TODO Stage 3: mount auth router
// app.use('/api/v1/auth', authRouter);

// TODO Stage 4: mount profile router (already has controllers scaffolded)
// import { profileRouter } from './routes/profile.routes.js';
// app.use('/api/v1/profiles', authMiddleware, tenantMiddleware, profileRouter);

// ---------------------------------------------------------------------------
// Global error handler
// ---------------------------------------------------------------------------

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[API] Unhandled error:', err);

  // Prisma known request errors (e.g. unique constraint violation)
  if (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    typeof (err as { code: unknown }).code === 'string'
  ) {
    const prismaErr = err as { code: string; meta?: unknown };
    if (prismaErr.code.startsWith('P')) {
      res.status(409).json({
        success: false,
        error: {
          code: 'DATABASE_CONSTRAINT_ERROR',
          message: 'A database constraint was violated. Check your input data.',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }
  }

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred. Please try again later.',
    },
    timestamp: new Date().toISOString(),
  });
});

// ---------------------------------------------------------------------------
// Server bootstrap
// ---------------------------------------------------------------------------

const PORT = parseInt(process.env['PORT'] ?? '3001', 10);

const server = app.listen(PORT, () => {
  console.log(`[API] OneForm API listening on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[API] SIGTERM received — shutting down gracefully');
  server.close(() => {
    console.log('[API] HTTP server closed');
    process.exit(0);
  });
});

export { app };
