/**
 * OneForm API — Admin Routes
 * GET    /api/admin/users        → List users
 * GET    /api/admin/users/:id    → Get user details
 * PATCH  /api/admin/users/:id    → Update user status
 * GET    /api/admin/tenants      → List tenants
 * GET    /api/admin/tenants/:id  → Get tenant details
 * GET    /api/admin/audit-logs   → View audit logs
 * GET    /api/admin/stats        → Platform statistics
 */
import { Router, type Router as ExpressRouter, type Request, type Response } from 'express';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';
import { logger } from '../utils/logger.js';
import * as adminService from '../services/admin.service.js';
import type { UserRole, UserStatus } from '@prisma/client';

export const adminRouter: ExpressRouter = Router();

// All admin routes require authentication + ADMIN or SUPER_ADMIN role
adminRouter.use(authenticate);
adminRouter.use(requireRole('ADMIN', 'SUPER_ADMIN'));

// Helper to extract single param value
function getParam(req: Request, name: string): string {
  const val = req.params[name];
  return Array.isArray(val) ? (val[0] ?? '') : (val ?? '');
}

// ─────────────────────────────────────────────────────────────────────────────
// User Management
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/admin/users - List users
adminRouter.get('/users', async (req: Request, res: Response) => {
  try {
    const tenantId = req.query['tenantId'] as string | undefined;
    const role = req.query['role'] as UserRole | undefined;
    const status = req.query['status'] as UserStatus | undefined;
    const search = req.query['search'] as string | undefined;
    const page = req.query['page'] ? parseInt(req.query['page'] as string, 10) : 1;
    const limit = req.query['limit'] ? parseInt(req.query['limit'] as string, 10) : 20;

    const result = await adminService.listUsers({
      ...(tenantId !== undefined && { tenantId }),
      ...(role !== undefined && { role }),
      ...(status !== undefined && { status }),
      ...(search !== undefined && { search }),
      page,
      limit,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error({ error }, 'Error listing users');
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to list users' },
    });
  }
});

// GET /api/admin/users/:id - Get user details
adminRouter.get('/users/:id', async (req: Request, res: Response) => {
  try {
    const userId = getParam(req, 'id');
    const user = await adminService.getUserDetails(userId);

    if (!user) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'User not found' },
      });
      return;
    }

    res.json({
      success: true,
      data: { user },
    });
  } catch (error) {
    logger.error({ error }, 'Error getting user details');
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get user details' },
    });
  }
});

// PATCH /api/admin/users/:id - Update user status
adminRouter.patch('/users/:id', async (req: Request, res: Response) => {
  try {
    const userId = getParam(req, 'id');
    const { status } = req.body as { status: UserStatus };

    if (!status) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'status is required' },
      });
      return;
    }

    const adminId = req.userId!;
    const user = await adminService.updateUserStatus(userId, status, adminId);

    res.json({
      success: true,
      data: { user },
    });
  } catch (error) {
    logger.error({ error }, 'Error updating user status');
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to update user status' },
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Tenant Management
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/admin/tenants - List tenants
adminRouter.get('/tenants', async (req: Request, res: Response) => {
  try {
    const type = req.query['type'] as string | undefined;
    const status = req.query['status'] as string | undefined;
    const search = req.query['search'] as string | undefined;
    const page = req.query['page'] ? parseInt(req.query['page'] as string, 10) : 1;
    const limit = req.query['limit'] ? parseInt(req.query['limit'] as string, 10) : 20;

    const result = await adminService.listTenants({
      ...(type !== undefined && { type }),
      ...(status !== undefined && { status }),
      ...(search !== undefined && { search }),
      page,
      limit,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error({ error }, 'Error listing tenants');
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to list tenants' },
    });
  }
});

// GET /api/admin/tenants/:id - Get tenant details
adminRouter.get('/tenants/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = getParam(req, 'id');
    const tenant = await adminService.getTenantDetails(tenantId);

    if (!tenant) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Tenant not found' },
      });
      return;
    }

    res.json({
      success: true,
      data: { tenant },
    });
  } catch (error) {
    logger.error({ error }, 'Error getting tenant details');
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get tenant details' },
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Audit Logs
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/admin/audit-logs - View audit logs
adminRouter.get('/audit-logs', async (req: Request, res: Response) => {
  try {
    const tenantId = req.query['tenantId'] as string | undefined;
    const userId = req.query['userId'] as string | undefined;
    const action = req.query['action'] as string | undefined;
    const resourceType = req.query['resourceType'] as string | undefined;
    const startDate = req.query['startDate'] ? new Date(req.query['startDate'] as string) : undefined;
    const endDate = req.query['endDate'] ? new Date(req.query['endDate'] as string) : undefined;
    const page = req.query['page'] ? parseInt(req.query['page'] as string, 10) : 1;
    const limit = req.query['limit'] ? parseInt(req.query['limit'] as string, 10) : 50;

    const result = await adminService.listAuditLogs({
      ...(tenantId !== undefined && { tenantId }),
      ...(userId !== undefined && { userId }),
      ...(action !== undefined && { action }),
      ...(resourceType !== undefined && { resourceType }),
      ...(startDate !== undefined && { startDate }),
      ...(endDate !== undefined && { endDate }),
      page,
      limit,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error({ error }, 'Error fetching audit logs');
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch audit logs' },
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Platform Statistics
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/admin/stats - Platform statistics
adminRouter.get('/stats', async (_req: Request, res: Response) => {
  try {
    const stats = await adminService.getPlatformStats();

    // Convert BigInt to string for JSON serialization
    const serializedStats = {
      ...stats,
      transactions: {
        ...stats.transactions,
        totalVolumePaisa: stats.transactions.totalVolumePaisa.toString(),
      },
    };

    res.json({
      success: true,
      data: serializedStats,
    });
  } catch (error) {
    logger.error({ error }, 'Error fetching platform stats');
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch platform statistics' },
    });
  }
});
