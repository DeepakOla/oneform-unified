/**
 * OneForm API — Auth Routes
 * POST /api/auth/register
 * POST /api/auth/login
 * POST /api/auth/refresh
 * POST /api/auth/logout
 * GET  /api/auth/me
 */
import { Router, type Router as ExpressRouter, type Request, type Response } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.middleware.js';
import {
  registerUser,
  loginWithEmail,
  rotateTokens,
  logoutUser,
  AuthError,
} from '../services/auth.service.js';
import { logger } from '../utils/logger.js';

export const authRouter: ExpressRouter = Router();

// ─────────────────────────────────────────────────────────────────────────────
// Validation schemas
// ─────────────────────────────────────────────────────────────────────────────

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(1).max(100),
  lastName: z.string().max(100).optional(),
  role: z.enum(['CITIZEN', 'OPERATOR', 'BUSINESS']).optional(),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const RefreshSchema = z.object({
  refreshToken: z.string().min(1),
});

// ─────────────────────────────────────────────────────────────────────────────
// Helper: structured error response
// ─────────────────────────────────────────────────────────────────────────────

function handleAuthError(res: Response, error: unknown): void {
  if (error instanceof AuthError) {
    res.status(error.statusCode).json({
      success: false,
      error: { code: error.code, message: error.message },
    });
    return;
  }
  if (error instanceof z.ZodError) {
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Invalid request', details: error.issues },
    });
    return;
  }
  logger.error({ error }, 'Unexpected auth error');
  res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Routes
// ─────────────────────────────────────────────────────────────────────────────

authRouter.post('/register', async (req: Request, res: Response) => {
  try {
    const input = RegisterSchema.parse(req.body);
    const result = await registerUser({
      email: input.email,
      password: input.password,
      firstName: input.firstName,
      ...(input.lastName !== undefined && { lastName: input.lastName }),
      ...(input.role !== undefined && { role: input.role }),
    });
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    handleAuthError(res, error);
  }
});

authRouter.post('/login', async (req: Request, res: Response) => {
  try {
    const input = LoginSchema.parse(req.body);
    const ua = req.headers['user-agent'];
    const ip = (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim()
      ?? req.socket.remoteAddress;
    const result = await loginWithEmail({
      email: input.email,
      password: input.password,
      ...(ua !== undefined && { userAgent: ua }),
      ...(ip !== undefined && { ipAddress: ip }),
    });
    res.json({ success: true, data: result });
  } catch (error) {
    handleAuthError(res, error);
  }
});

authRouter.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = RefreshSchema.parse(req.body);
    const result = await rotateTokens(refreshToken);
    res.json({ success: true, data: result });
  } catch (error) {
    handleAuthError(res, error);
  }
});

authRouter.post('/logout', authenticate, async (req: Request, res: Response) => {
  try {
    // req.user is guaranteed by authenticate middleware
    const userId = req.user!.id;
    await logoutUser(userId);
    res.json({ success: true, data: { message: 'Logged out from all devices' } });
  } catch (error) {
    handleAuthError(res, error);
  }
});

authRouter.get('/me', authenticate, (req: Request, res: Response) => {
  res.json({ success: true, data: { user: req.user } });
});
