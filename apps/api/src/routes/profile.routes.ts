/**
 * OneForm API — Profile Routes
 * GET    /api/profiles           → List profiles
 * POST   /api/profiles           → Create profile
 * GET    /api/profiles/:id       → Get profile
 * PUT    /api/profiles/:id       → Update profile
 * DELETE /api/profiles/:id       → Soft delete
 * GET    /api/profiles/:id/section-a → Decrypt & return Section A (AUDIT LOGGED)
 * PUT    /api/profiles/:id/section-a → Update Section A (encrypts at save!)
 */
import { Router, type Router as ExpressRouter } from 'express';
import { authenticate, injectTenantContext } from '../middleware/auth.middleware.js';

export const profileRouter: ExpressRouter = Router();

// All profile routes require authentication + tenant context
profileRouter.use(authenticate);
profileRouter.use(injectTenantContext);

profileRouter.get('/', (_req, res) => {
  res.status(501).json({ success: false, error: { code: 'NOT_IMPLEMENTED', message: 'Profile list coming soon' } });
});

profileRouter.post('/', (_req, res) => {
  res.status(501).json({ success: false, error: { code: 'NOT_IMPLEMENTED', message: 'Profile create coming soon' } });
});

profileRouter.get('/:id', (_req, res) => {
  res.status(501).json({ success: false, error: { code: 'NOT_IMPLEMENTED', message: 'Profile get coming soon' } });
});

profileRouter.put('/:id', (_req, res) => {
  res.status(501).json({ success: false, error: { code: 'NOT_IMPLEMENTED', message: 'Profile update coming soon' } });
});

profileRouter.get('/:id/section-a', (_req, res) => {
  // ⚠️ This endpoint creates an AuditLog entry on every access
  res.status(501).json({ success: false, error: { code: 'NOT_IMPLEMENTED', message: 'Section A decrypt coming soon' } });
});

profileRouter.put('/:id/section-a', (_req, res) => {
  // ⚠️ Encrypts at save point — SectionA plaintext never reaches DB
  res.status(501).json({ success: false, error: { code: 'NOT_IMPLEMENTED', message: 'Section A encrypt + save coming soon' } });
});
