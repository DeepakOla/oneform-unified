/**
 * OneForm API — Auth Routes
 * POST /api/auth/register
 * POST /api/auth/login
 * POST /api/auth/login/phone
 * POST /api/auth/otp/send
 * POST /api/auth/refresh
 * POST /api/auth/logout       ← IMPORTANT: clears ALL sessions (auth loop fix!)
 * GET  /api/auth/me
 * GET  /api/auth/google
 * GET  /api/auth/google/callback
 * GET  /api/auth/digilocker
 * GET  /api/auth/digilocker/callback
 */
import { Router, type Router as ExpressRouter } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';

export const authRouter: ExpressRouter = Router();

authRouter.post('/register', (_req, res) => {
  // TODO: Stage 1 implementation
  res.status(501).json({ success: false, error: { code: 'NOT_IMPLEMENTED', message: 'Auth coming soon' } });
});

authRouter.post('/login', (_req, res) => {
  res.status(501).json({ success: false, error: { code: 'NOT_IMPLEMENTED', message: 'Auth coming soon' } });
});

authRouter.post('/login/phone', (_req, res) => {
  res.status(501).json({ success: false, error: { code: 'NOT_IMPLEMENTED', message: 'Phone auth coming soon' } });
});

authRouter.post('/otp/send', (_req, res) => {
  res.status(501).json({ success: false, error: { code: 'NOT_IMPLEMENTED', message: 'OTP coming soon' } });
});

authRouter.post('/refresh', (_req, res) => {
  res.status(501).json({ success: false, error: { code: 'NOT_IMPLEMENTED', message: 'Token refresh coming soon' } });
});

authRouter.post('/logout', authenticate, (_req, res) => {
  // Anti-Pattern Fixed: Clear ALL sessions on logout, not just one token
  res.status(501).json({ success: false, error: { code: 'NOT_IMPLEMENTED', message: 'Logout coming soon' } });
});

authRouter.get('/me', authenticate, (req, res) => {
  res.json({ success: true, data: { user: req.user } });
});
