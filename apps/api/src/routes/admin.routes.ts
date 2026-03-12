/**
 * OneForm API — Admin Routes
 * GET    /api/admin/users        → List users
 * PATCH  /api/admin/users/:id    → Update user status
 * GET    /api/admin/tenants      → List tenants
 * GET    /api/admin/audit-logs   → View audit logs
 * GET    /api/admin/stats        → Platform statistics
 */
import { Router, type Router as ExpressRouter } from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';

export const adminRouter: ExpressRouter = Router();

// All admin routes require authentication + ADMIN or SUPER_ADMIN role
adminRouter.use(authenticate);
adminRouter.use(requireRole('ADMIN', 'SUPER_ADMIN'));

adminRouter.get('/users', (_req, res) => {
  res.status(501).json({ success: false, error: { code: 'NOT_IMPLEMENTED', message: 'Admin users coming soon' } });
});

adminRouter.get('/tenants', (_req, res) => {
  res.status(501).json({ success: false, error: { code: 'NOT_IMPLEMENTED', message: 'Admin tenants coming soon' } });
});

adminRouter.get('/audit-logs', (_req, res) => {
  res.status(501).json({ success: false, error: { code: 'NOT_IMPLEMENTED', message: 'Audit logs coming soon' } });
});

adminRouter.get('/stats', (_req, res) => {
  res.status(501).json({ success: false, error: { code: 'NOT_IMPLEMENTED', message: 'Stats coming soon' } });
});
