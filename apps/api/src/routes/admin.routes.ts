/**
 * OneForm API — Admin Routes
 * GET    /api/admin/users        → List users (paginated, filterable)
 * PATCH  /api/admin/users/:id    → Update user status
 * GET    /api/admin/tenants      → List tenants (paginated)
 * GET    /api/admin/audit-logs   → View audit logs (paginated, filterable)
 * GET    /api/admin/stats        → Platform statistics
 */
import { Router, type Router as ExpressRouter, type Request, type Response } from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';
import {
  listUsers,
  updateUserStatus,
  listTenants,
  getAuditLogs,
  getPlatformStats,
  AdminError,
} from '../services/admin.service.js';
import { logger } from '../utils/logger.js';
import type { UserRole, UserStatus } from '@oneform/shared-types';

export const adminRouter: ExpressRouter = Router();

// All admin routes require authentication + ADMIN or SUPER_ADMIN role
adminRouter.use(authenticate);
adminRouter.use(requireRole('ADMIN', 'SUPER_ADMIN'));

// Helper to extract params
function getParam(req: Request, name: string): string {
  const val = req.params[name];
  return Array.isArray(val) ? (val[0] ?? '') : (val ?? '');
}

// GET /api/admin/users — List users
adminRouter.get('/users', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user!;
    const { role, status, search, page, limit } = req.query as {
      role?: UserRole;
      status?: UserStatus;
      search?: string;
      page?: string;
      limit?: string;
    };

    const result = await listUsers(tenantId, {
      ...(role !== undefined && { role }),
      ...(status !== undefined && { status }),
      ...(search !== undefined && { search }),
      ...(page !== undefined && { page: parseInt(page, 10) }),
      ...(limit !== undefined && { limit: parseInt(limit, 10) }),
    });

    res.json({ success: true, data: result });
  } catch (error) {
    logger.error({ error }, 'Failed to list users');
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to list users' },
    });
  }
});

// PATCH /api/admin/users/:id — Update user status
adminRouter.patch('/users/:id', async (req: Request, res: Response) => {
  try {
    const adminId = req.user!.id;
    const userId = getParam(req, 'id');
    const { status } = req.body as { status: UserStatus };

    if (!status) {
      res.status(400).json({
        success: false,
        error: { code: 'MISSING_FIELD', message: 'status is required' },
      });
      return;
    }

    const user = await updateUserStatus(userId, status, adminId);

    res.json({ success: true, data: user });
  } catch (error) {
    if (error instanceof AdminError) {
      res.status(error.statusCode).json({
        success: false,
        error: { code: error.code, message: error.message },
      });
    } else {
      logger.error({ error }, 'Failed to update user status');
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to update user status' },
      });
    }
  }
});

// GET /api/admin/tenants — List tenants
adminRouter.get('/tenants', async (req: Request, res: Response) => {
  try {
    const { search, page, limit } = req.query as {
      search?: string;
      page?: string;
      limit?: string;
    };

    const result = await listTenants({
      ...(search !== undefined && { search }),
      ...(page !== undefined && { page: parseInt(page, 10) }),
      ...(limit !== undefined && { limit: parseInt(limit, 10) }),
    });

    res.json({ success: true, data: result });
  } catch (error) {
    logger.error({ error }, 'Failed to list tenants');
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to list tenants' },
    });
  }
});

// GET /api/admin/audit-logs — View audit logs
adminRouter.get('/audit-logs', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user!;
    const { userId, action, startDate, endDate, page, limit } = req.query as {
      userId?: string;
      action?: string;
      startDate?: string;
      endDate?: string;
      page?: string;
      limit?: string;
    };

    const result = await getAuditLogs(tenantId, {
      ...(userId !== undefined && { userId }),
      ...(action !== undefined && { action }),
      ...(startDate !== undefined && { startDate }),
      ...(endDate !== undefined && { endDate }),
      ...(page !== undefined && { page: parseInt(page, 10) }),
      ...(limit !== undefined && { limit: parseInt(limit, 10) }),
    });

    res.json({ success: true, data: result });
  } catch (error) {
    logger.error({ error }, 'Failed to get audit logs');
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get audit logs' },
    });
  }
});

// GET /api/admin/stats — Platform statistics
adminRouter.get('/stats', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.user!;

    const stats = await getPlatformStats(tenantId);

    res.json({ success: true, data: stats });
  } catch (error) {
    logger.error({ error }, 'Failed to get platform stats');
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get platform stats' },
    });
  }
});
