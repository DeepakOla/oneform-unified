/**
 * OneForm Unified Platform — Admin Service
 *
 * Admin-only operations:
 *   - User management (list, update status)
 *   - Tenant management (list)
 *   - Audit log viewing
 *   - Platform statistics
 *
 * @module admin.service
 */
import { prisma } from '../lib/prisma.js';
import { logger } from '../utils/logger.js';
import type { UserRole, UserStatus } from '@oneform/shared-types';

// ─────────────────────────────────────────────────────────────────────────────
// Errors
// ─────────────────────────────────────────────────────────────────────────────

export class AdminError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code: string,
  ) {
    super(message);
    this.name = 'AdminError';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// User Management
// ─────────────────────────────────────────────────────────────────────────────

export async function listUsers(
  tenantId: string,
  filters?: {
    role?: UserRole;
    status?: UserStatus;
    search?: string;
    page?: number;
    limit?: number;
  },
) {
  const page = filters?.page ?? 1;
  const limit = Math.min(filters?.limit ?? 50, 100); // Max 100 per page
  const skip = (page - 1) * limit;

  const where = {
    tenantId,
    ...(filters?.role !== undefined && { role: filters.role }),
    ...(filters?.status !== undefined && { status: filters.status }),
    ...(filters?.search !== undefined && filters.search.trim().length > 0
      ? {
          OR: [
            { email: { contains: filters.search, mode: 'insensitive' as const } },
            { firstName: { contains: filters.search, mode: 'insensitive' as const } },
            { lastName: { contains: filters.search, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        phone: true,
        phoneVerified: true,
        firstName: true,
        lastName: true,
        displayName: true,
        avatarUrl: true,
        role: true,
        businessType: true,
        status: true,
        lastLoginAt: true,
        lastLoginIp: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            profiles: true,
            documents: true,
          },
        },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return {
    users,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function updateUserStatus(
  userId: string,
  status: UserStatus,
  adminId: string,
) {
  // Check user exists
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new AdminError('User not found', 404, 'USER_NOT_FOUND');
  }

  // Update status
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { status },
  });

  logger.info({ userId, status, adminId }, 'Admin updated user status');

  return updated;
}

// ─────────────────────────────────────────────────────────────────────────────
// Tenant Management
// ─────────────────────────────────────────────────────────────────────────────

export async function listTenants(filters?: {
  search?: string;
  page?: number;
  limit?: number;
}) {
  const page = filters?.page ?? 1;
  const limit = Math.min(filters?.limit ?? 50, 100);
  const skip = (page - 1) * limit;

  const where =
    filters?.search !== undefined && filters.search.trim().length > 0
      ? {
          OR: [
            { name: { contains: filters.search, mode: 'insensitive' as const } },
            { slug: { contains: filters.search, mode: 'insensitive' as const } },
          ],
        }
      : {};

  const [tenants, total] = await Promise.all([
    prisma.tenant.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        slug: true,
        email: true,
        phone: true,
        branding: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            users: true,
            profiles: true,
            documents: true,
          },
        },
      },
    }),
    prisma.tenant.count({ where }),
  ]);

  return {
    tenants,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Audit Logs
// ─────────────────────────────────────────────────────────────────────────────

export async function getAuditLogs(
  tenantId: string,
  filters?: {
    userId?: string;
    action?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  },
) {
  const page = filters?.page ?? 1;
  const limit = Math.min(filters?.limit ?? 100, 200); // Audit logs can have higher limit
  const skip = (page - 1) * limit;

  const where = {
    tenantId,
    ...(filters?.userId !== undefined && { userId: filters.userId }),
    ...(filters?.action !== undefined && { action: { contains: filters.action } }),
    ...(filters?.startDate !== undefined && {
      createdAt: { gte: new Date(filters.startDate) },
    }),
    ...(filters?.endDate !== undefined && {
      createdAt: { lte: new Date(filters.endDate) },
    }),
  };

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        action: true,
        resourceType: true,
        resourceId: true,
        metadata: true,
        ipAddress: true,
        userAgent: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
      },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    logs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Platform Statistics
// ─────────────────────────────────────────────────────────────────────────────

export async function getPlatformStats(tenantId: string) {
  const [
    totalUsers,
    activeUsers,
    totalProfiles,
    totalDocuments,
    totalWalletBalance,
    recentUsers,
    usersByRole,
  ] = await Promise.all([
    // Total users
    prisma.user.count({ where: { tenantId } }),

    // Active users (logged in last 30 days)
    prisma.user.count({
      where: {
        tenantId,
        lastLoginAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
    }),

    // Total profiles
    prisma.profile.count({ where: { tenantId } }),

    // Total documents
    prisma.document.count({ where: { tenantId } }),

    // Total wallet balance (sum of all wallets)
    prisma.wallet.aggregate({
      where: { tenantId },
      _sum: { balancePaisa: true },
    }),

    // Users created in last 7 days
    prisma.user.count({
      where: {
        tenantId,
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
    }),

    // Users grouped by role
    prisma.user.groupBy({
      by: ['role'],
      where: { tenantId },
      _count: { role: true },
    }),
  ]);

  return {
    users: {
      total: totalUsers,
      active: activeUsers,
      new: recentUsers,
      byRole: usersByRole.map((r) => ({
        role: r.role,
        count: r._count.role,
      })),
    },
    profiles: {
      total: totalProfiles,
    },
    documents: {
      total: totalDocuments,
    },
    wallet: {
      totalBalance: Number(totalWalletBalance._sum?.balancePaisa ?? 0),
    },
  };
}
