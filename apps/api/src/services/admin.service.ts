/**
 * OneForm API — Admin Service
 * Provides administrative functions for user, tenant, and audit log management
 */
import { prisma } from '../lib/prisma.js';
import type { UserRole, UserStatus } from '@prisma/client';

/**
 * List all users with pagination
 */
export async function listUsers(page = 1, limit = 50, role?: UserRole, status?: UserStatus) {
  const skip = (page - 1) * limit;

  const where = {
    ...(role !== undefined && { role }),
    ...(status !== undefined && { status }),
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      select: {
        id: true,
        tenant_id: true,
        email: true,
        phone: true,
        first_name: true,
        last_name: true,
        role: true,
        status: true,
        email_verified: true,
        phone_verified: true,
        created_at: true,
        last_login_at: true,
        _count: {
          select: {
            profiles: true,
            documents: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
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

/**
 * Get user by ID with full details
 */
export async function getUserById(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      tenant: true,
      profiles: {
        select: {
          id: true,
          profile_name: true,
          profile_type: true,
          status: true,
          created_at: true,
        },
      },
      documents: {
        select: {
          id: true,
          file_name: true,
          document_type: true,
          status: true,
          created_at: true,
        },
        take: 10,
        orderBy: {
          created_at: 'desc',
        },
      },
      wallet: {
        select: {
          id: true,
          balance: true,
          total_credited: true,
          total_debited: true,
          updated_at: true,
        },
      },
    },
  });

  if (!user) {
    throw new Error('User not found');
  }

  return user;
}

/**
 * Update user status
 */
export async function updateUserStatus(userId: string, status: UserStatus, reason?: string) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { status },
  });

  // Create audit log
  await prisma.auditLog.create({
    data: {
      tenant_id: user.tenant_id,
      action: 'USER_STATUS_UPDATED',
      resource_type: 'User',
      resource_id: userId,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      metadata: {
        oldStatus: user.status,
        newStatus: status,
        reason,
      } as any,
    },
  });

  return user;
}

/**
 * Update user role
 */
export async function updateUserRole(userId: string, role: UserRole) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { role },
  });

  // Create audit log
  await prisma.auditLog.create({
    data: {
      tenant_id: user.tenant_id,
      action: 'USER_ROLE_UPDATED',
      resource_type: 'User',
      resource_id: userId,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      metadata: {
        oldRole: user.role,
        newRole: role,
      } as any,
    },
  });

  return user;
}

/**
 * List all tenants
 */
export async function listTenants(page = 1, limit = 50) {
  const skip = (page - 1) * limit;

  const [tenants, total] = await Promise.all([
    prisma.tenant.findMany({
      skip,
      take: limit,
      select: {
        id: true,
        name: true,
        subdomain: true,
        created_at: true,
        _count: {
          select: {
            users: true,
            profiles: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    }),
    prisma.tenant.count(),
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

/**
 * Get tenant by ID with full details
 */
export async function getTenantById(tenantId: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: {
      users: {
        select: {
          id: true,
          email: true,
          first_name: true,
          last_name: true,
          role: true,
          status: true,
          created_at: true,
        },
        take: 20,
        orderBy: {
          created_at: 'desc',
        },
      },
      profiles: {
        select: {
          id: true,
          profile_name: true,
          profile_type: true,
          status: true,
          created_at: true,
        },
        take: 20,
        orderBy: {
          created_at: 'desc',
        },
      },
      _count: {
        select: {
          users: true,
          profiles: true,
          documents: true,
        },
      },
    },
  });

  if (!tenant) {
    throw new Error('Tenant not found');
  }

  return tenant;
}

/**
 * List audit logs with filters
 */
export async function listAuditLogs(
  page = 1,
  limit = 100,
  filters?: {
    tenantId?: string;
    userId?: string;
    action?: string;
    resourceType?: string;
    resourceId?: string;
    startDate?: Date;
    endDate?: Date;
  }
) {
  const skip = (page - 1) * limit;

  const where = {
    ...(filters?.tenantId !== undefined && { tenant_id: filters.tenantId }),
    ...(filters?.userId !== undefined && { user_id: filters.userId }),
    ...(filters?.action !== undefined && { action: filters.action }),
    ...(filters?.resourceType !== undefined && { resource_type: filters.resourceType }),
    ...(filters?.resourceId !== undefined && { resource_id: filters.resourceId }),
    ...(filters?.startDate !== undefined &&
      filters?.endDate !== undefined && {
        created_at: {
          gte: filters.startDate,
          lte: filters.endDate,
        },
      }),
  };

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      skip,
      take: limit,
      include: {
        user: {
          select: {
            email: true,
            first_name: true,
            last_name: true,
            role: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
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

/**
 * Get platform statistics
 */
export async function getPlatformStats() {
  const [
    totalUsers,
    activeUsers,
    totalProfiles,
    verifiedProfiles,
    totalDocuments,
    ocrCompleteDocuments,
    totalWalletBalance,
    totalTransactions,
    usersByRole,
    usersByStatus,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({
      where: {
        status: 'ACTIVE',
        last_login_at: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        },
      },
    }),
    prisma.profile.count(),
    prisma.profile.count({ where: { status: 'VERIFIED' } }),
    prisma.document.count(),
    prisma.document.count({ where: { status: 'OCR_COMPLETE' } }),
    prisma.wallet.aggregate({
      _sum: { balance: true },
    }),
    prisma.walletTransaction.count(),
    prisma.user.groupBy({
      by: ['role'],
      _count: true,
    }),
    prisma.user.groupBy({
      by: ['status'],
      _count: true,
    }),
  ]);

  return {
    users: {
      total: totalUsers,
      active: activeUsers,
      byRole: usersByRole.reduce(
        (acc, item) => {
          acc[item.role] = item._count;
          return acc;
        },
        {} as Record<string, number>
      ),
      byStatus: usersByStatus.reduce(
        (acc, item) => {
          acc[item.status] = item._count;
          return acc;
        },
        {} as Record<string, number>
      ),
    },
    profiles: {
      total: totalProfiles,
      verified: verifiedProfiles,
    },
    documents: {
      total: totalDocuments,
      ocrComplete: ocrCompleteDocuments,
    },
    wallet: {
      totalBalance: totalWalletBalance._sum.balance ?? 0,
      totalTransactions,
    },
  };
}
