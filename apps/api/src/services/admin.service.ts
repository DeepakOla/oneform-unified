/**
 * OneForm API — Admin Service
 * Administrative operations: user management, tenant management, audit logs, statistics
 */
import { prisma } from '../lib/prisma.js';
import { logger } from '../utils/logger.js';
import type { User, Tenant, AuditLog, UserStatus, UserRole } from '@prisma/client';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface UserListOptions {
  tenantId?: string;
  role?: UserRole;
  status?: UserStatus;
  search?: string;
  page?: number;
  limit?: number;
}

export interface UserListResult {
  users: User[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface TenantListOptions {
  type?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface TenantListResult {
  tenants: Tenant[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AuditLogListOptions {
  tenantId?: string;
  userId?: string;
  action?: string;
  resourceType?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

export interface AuditLogListResult {
  logs: AuditLog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PlatformStats {
  users: {
    total: number;
    active: number;
    byRole: Record<string, number>;
  };
  tenants: {
    total: number;
    active: number;
  };
  profiles: {
    total: number;
    verified: number;
  };
  documents: {
    total: number;
    byType: Record<string, number>;
  };
  transactions: {
    totalVolumePaisa: bigint;
    count: number;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// User Management
// ─────────────────────────────────────────────────────────────────────────────

/**
 * List users with filtering and pagination
 */
export async function listUsers(options: UserListOptions): Promise<UserListResult> {
  const page = options.page ?? 1;
  const limit = options.limit ?? 20;
  const skip = (page - 1) * limit;

  const where: {
    tenantId?: string;
    role?: UserRole;
    status?: UserStatus;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    OR?: any;
  } = {};

  if (options.tenantId !== undefined) {
    where.tenantId = options.tenantId;
  }
  if (options.role !== undefined) {
    where.role = options.role;
  }
  if (options.status !== undefined) {
    where.status = options.status;
  }
  if (options.search !== undefined) {
    where.OR = [
      { email: { contains: options.search, mode: 'insensitive' } },
      { firstName: { contains: options.search, mode: 'insensitive' } },
      { lastName: { contains: options.search, mode: 'insensitive' } },
    ] as typeof where.OR;
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        tenantId: true,
        email: true,
        emailVerified: true,
        phone: true,
        phoneVerified: true,
        firstName: true,
        lastName: true,
        displayName: true,
        avatarUrl: true,
        role: true,
        businessType: true,
        permissions: true,
        status: true,
        lastLoginAt: true,
        lastLoginIp: true,
        preferences: true,
        createdAt: true,
        updatedAt: true,
        // Exclude passwordHash for security
        passwordHash: false,
      },
    }),
    prisma.user.count({ where }),
  ]);

  return {
    users: users as User[],
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Update user status (activate, suspend, deactivate)
 */
export async function updateUserStatus(
  userId: string,
  status: UserStatus,
  adminId: string,
): Promise<User> {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { status },
  });

  // Log the action
  await prisma.auditLog.create({
    data: {
      tenantId: user.tenantId,
      userId: adminId,
      action: 'USER_STATUS_UPDATED',
      resourceType: 'User',
      resourceId: userId,
      metadata: { newStatus: status },
    },
  });

  logger.info({ userId, status, adminId }, 'User status updated');

  return user;
}

/**
 * Get user details with related data
 */
export async function getUserDetails(userId: string): Promise<User & { _count: unknown } | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      _count: {
        select: {
          profiles: true,
          documents: true,
          sessions: true,
        },
      },
      wallet: {
        select: {
          balancePaisa: true,
          totalCreditedPaisa: true,
          totalDebitedPaisa: true,
        },
      },
    },
  });

  return user as (User & { _count: unknown }) | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Tenant Management
// ─────────────────────────────────────────────────────────────────────────────

/**
 * List tenants with filtering and pagination
 */
export async function listTenants(options: TenantListOptions): Promise<TenantListResult> {
  const page = options.page ?? 1;
  const limit = options.limit ?? 20;
  const skip = (page - 1) * limit;

  const where: {
    type?: { equals: string };
    status?: { equals: string };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    OR?: any;
  } = {};

  if (options.type !== undefined) {
    where.type = { equals: options.type } as typeof where.type;
  }
  if (options.status !== undefined) {
    where.status = { equals: options.status } as typeof where.status;
  }
  if (options.search !== undefined) {
    where.OR = [
      { name: { contains: options.search, mode: 'insensitive' } },
      { slug: { contains: options.search, mode: 'insensitive' } },
      { email: { contains: options.search, mode: 'insensitive' } },
    ];
  }

  const [tenants, total] = await Promise.all([
    prisma.tenant.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
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
    tenants: tenants as Tenant[],
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Get tenant details with related data
 */
export async function getTenantDetails(tenantId: string): Promise<Tenant & { _count: unknown } | null> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: {
      _count: {
        select: {
          users: true,
          profiles: true,
          documents: true,
          FormTemplate: true,
        },
      },
    },
  });

  return tenant as (Tenant & { _count: unknown }) | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Audit Logs
// ─────────────────────────────────────────────────────────────────────────────

/**
 * List audit logs with filtering and pagination
 */
export async function listAuditLogs(options: AuditLogListOptions): Promise<AuditLogListResult> {
  const page = options.page ?? 1;
  const limit = options.limit ?? 50;
  const skip = (page - 1) * limit;

  const where: {
    tenantId?: string;
    userId?: string;
    action?: string;
    resourceType?: string;
    createdAt?: { gte?: Date; lte?: Date };
  } = {};

  if (options.tenantId !== undefined) {
    where.tenantId = options.tenantId;
  }
  if (options.userId !== undefined) {
    where.userId = options.userId;
  }
  if (options.action !== undefined) {
    where.action = options.action;
  }
  if (options.resourceType !== undefined) {
    where.resourceType = options.resourceType;
  }
  if (options.startDate !== undefined || options.endDate !== undefined) {
    where.createdAt = {};
    if (options.startDate !== undefined) {
      where.createdAt.gte = options.startDate;
    }
    if (options.endDate !== undefined) {
      where.createdAt.lte = options.endDate;
    }
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    logs: logs as AuditLog[],
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Platform Statistics
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get platform-wide statistics
 */
export async function getPlatformStats(): Promise<PlatformStats> {
  const [
    totalUsers,
    activeUsers,
    usersByRole,
    totalTenants,
    activeTenants,
    totalProfiles,
    verifiedProfiles,
    totalDocuments,
    documentsByType,
    transactionStats,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { status: 'ACTIVE' } }),
    prisma.user.groupBy({
      by: ['role'],
      _count: true,
    }),
    prisma.tenant.count(),
    prisma.tenant.count({ where: { status: 'ACTIVE' } }),
    prisma.profile.count(),
    prisma.profile.count({ where: { status: 'VERIFIED' } }),
    prisma.document.count(),
    prisma.document.groupBy({
      by: ['type'],
      _count: true,
    }),
    prisma.walletTransaction.aggregate({
      _sum: {
        amountPaisa: true,
      },
      _count: true,
      where: {
        status: 'COMPLETED',
      },
    }),
  ]);

  const usersByRoleMap: Record<string, number> = {};
  for (const group of usersByRole) {
    usersByRoleMap[group.role] = group._count;
  }

  const documentsByTypeMap: Record<string, number> = {};
  for (const group of documentsByType) {
    documentsByTypeMap[group.type] = group._count;
  }

  return {
    users: {
      total: totalUsers,
      active: activeUsers,
      byRole: usersByRoleMap,
    },
    tenants: {
      total: totalTenants,
      active: activeTenants,
    },
    profiles: {
      total: totalProfiles,
      verified: verifiedProfiles,
    },
    documents: {
      total: totalDocuments,
      byType: documentsByTypeMap,
    },
    transactions: {
      totalVolumePaisa: transactionStats._sum.amountPaisa ?? BigInt(0),
      count: transactionStats._count,
    },
  };
}
