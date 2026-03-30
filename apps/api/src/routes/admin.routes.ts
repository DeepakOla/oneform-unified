/**
 * OneForm API — Admin Routes
 * GET    /api/admin/users          → List users
 * GET    /api/admin/users/:id      → Get user details
 * PATCH  /api/admin/users/:id/status → Update user status
 * PATCH  /api/admin/users/:id/role   → Update user role
 * GET    /api/admin/tenants        → List tenants
 * GET    /api/admin/tenants/:id    → Get tenant details
 * GET    /api/admin/audit-logs     → View audit logs
 * GET    /api/admin/stats          → Platform statistics
 */
import { Router, type Router as ExpressRouter, type Request, type Response } from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';
import type { AuthenticatedRequest } from '@oneform/shared-types';
import type { UserRole, UserStatus } from '@prisma/client';
import {
  listUsers,
  getUserById,
  updateUserStatus,
  updateUserRole,
  listTenants,
  getTenantById,
  listAuditLogs,
  getPlatformStats,
} from '../services/admin.service.js';

function getParam(req: Request, name: string): string {
  const val = req.params[name];
  return Array.isArray(val) ? (val[0] ?? '') : (val ?? '');
}

export const adminRouter: ExpressRouter = Router();

// All admin routes require authentication + ADMIN or SUPER_ADMIN role
adminRouter.use(authenticate);
adminRouter.use(requireRole('ADMIN', 'SUPER_ADMIN'));

// GET /api/admin/users - List all users
adminRouter.get('/users', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const page = parseInt(String(req.query.page ?? '1'), 10);
    const limit = parseInt(String(req.query.limit ?? '50'), 10);
    const role = req.query.role as UserRole | undefined;
    const status = req.query.status as UserStatus | undefined;

    const result = await listUsers(page, limit, role, status);

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error listing users:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to list users',
      },
    });
  }
});

// GET /api/admin/users/:id - Get user details
adminRouter.get('/users/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = getParam(req, 'id');
    const user = await getUserById(userId);

    res.json({ success: true, data: user });
  } catch (error) {
    console.error('Error getting user:', error);
    res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: error instanceof Error ? error.message : 'User not found',
      },
    });
  }
});

// PATCH /api/admin/users/:id/status - Update user status
adminRouter.patch('/users/:id/status', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = getParam(req, 'id');
    const { status, reason } = req.body;

    if (!status) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'status is required',
        },
      });
      return;
    }

    const user = await updateUserStatus(userId, status as UserStatus, reason);

    res.json({ success: true, data: user });
  } catch (error) {
    console.error('Error updating user status:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to update user status',
      },
    });
  }
});

// PATCH /api/admin/users/:id/role - Update user role
adminRouter.patch('/users/:id/role', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = getParam(req, 'id');
    const { role } = req.body;

    if (!role) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'role is required',
        },
      });
      return;
    }

    const user = await updateUserRole(userId, role as UserRole);

    res.json({ success: true, data: user });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to update user role',
      },
    });
  }
});

// GET /api/admin/tenants - List all tenants
adminRouter.get('/tenants', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const page = parseInt(String(req.query.page ?? '1'), 10);
    const limit = parseInt(String(req.query.limit ?? '50'), 10);

    const result = await listTenants(page, limit);

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error listing tenants:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to list tenants',
      },
    });
  }
});

// GET /api/admin/tenants/:id - Get tenant details
adminRouter.get('/tenants/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = getParam(req, 'id');
    const tenant = await getTenantById(tenantId);

    res.json({ success: true, data: tenant });
  } catch (error) {
    console.error('Error getting tenant:', error);
    res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: error instanceof Error ? error.message : 'Tenant not found',
      },
    });
  }
});

// GET /api/admin/audit-logs - List audit logs
adminRouter.get('/audit-logs', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const page = parseInt(String(req.query.page ?? '1'), 10);
    const limit = parseInt(String(req.query.limit ?? '100'), 10);

    const filters = {
      tenantId: req.query.tenantId as string | undefined,
      userId: req.query.userId as string | undefined,
      action: req.query.action as string | undefined,
      resourceType: req.query.resourceType as string | undefined,
      resourceId: req.query.resourceId as string | undefined,
      startDate: req.query.startDate ? new Date(String(req.query.startDate)) : undefined,
      endDate: req.query.endDate ? new Date(String(req.query.endDate)) : undefined,
    };

    const result = await listAuditLogs(page, limit, filters);

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error listing audit logs:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to list audit logs',
      },
    });
  }
});

// GET /api/admin/stats - Platform statistics
adminRouter.get('/stats', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const stats = await getPlatformStats();

    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error getting platform stats:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get platform stats',
      },
    });
  }
});
