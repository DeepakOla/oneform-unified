/**
 * OneForm Unified Platform — JWT Auth Middleware
 *
 * Verifies JWT access tokens using JOSE (modern JWT library).
 * Injects user context into the request object.
 *
 * Anti-Pattern Fixed: Clear ALL storage on logout — NO stale tokens.
 * The endpoint that handles logout is in auth.controller.ts.
 *
 * @module auth.middleware
 */
import type { Request, Response, NextFunction } from 'express';
import { jwtVerify } from 'jose';
import { prisma } from '../lib/prisma.js';
import { logger } from '../utils/logger.js';
import type { UserRole } from '@oneform/shared-types';
import { API_ERROR_CODES } from '@oneform/shared-types';

// Extend Express Request to include the auth context
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        tenantId: string;
        role: UserRole;
        permissions: string[];
      } | undefined;
      userId?: string;
      tenantId?: string;
    }
  }
}

const getJWTSecret = () => {
  const secret = process.env['JWT_ACCESS_SECRET'];
  if (!secret) throw new Error('JWT_ACCESS_SECRET not configured');
  return new TextEncoder().encode(secret);
};

/**
 * Verifies Bearer JWT token and injects user context.
 * Returns 401 if token is missing, expired, or invalid.
 */
export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      error: {
        code: API_ERROR_CODES.UNAUTHORIZED,
        message: 'Authorization header missing or invalid format.',
        requestId: req.headers['x-request-id'] as string,
      },
    });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const { payload } = await jwtVerify(token, getJWTSecret(), {
      algorithms: ['HS256'],
    });

    const userId = payload['sub'] as string | undefined;
    if (!userId) {
      throw new Error('Missing subject in token');
    }

    // Verify user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, tenantId: true, role: true, permissions: true, status: true },
    });

    if (!user || user.status !== 'ACTIVE') {
      res.status(401).json({
        success: false,
        error: {
          code: API_ERROR_CODES.ACCOUNT_SUSPENDED,
          message: 'Account is not active.',
        },
      });
      return;
    }

    // Inject user context into request
    req.user = {
      id: user.id,
      tenantId: user.tenantId,
      role: user.role as UserRole,
      permissions: user.permissions,
    };
    req.userId = user.id;
    req.tenantId = user.tenantId;

    next();
  } catch (error) {
    logger.debug({ error }, 'JWT verification failed');
    res.status(401).json({
      success: false,
      error: {
        code: API_ERROR_CODES.INVALID_TOKEN,
        message: 'Token is invalid or expired.',
        requestId: req.headers['x-request-id'] as string,
      },
    });
  }
}

/**
 * Role-based access control middleware.
 * Must be used AFTER authenticate().
 *
 * @example
 * router.get('/admin/users', authenticate, requireRole('ADMIN', 'SUPER_ADMIN'), handler);
 */
export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: {
          code: API_ERROR_CODES.FORBIDDEN,
          message: `This endpoint requires one of: [${roles.join(', ')}]`,
        },
      });
      return;
    }
    next();
  };
}

/**
 * Injects the current tenant ID into PostgreSQL session variable.
 * Required for Row Level Security to work.
 * Must be called after authenticate().
 */
export async function injectTenantContext(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  if (req.user?.tenantId) {
    try {
      await prisma.$executeRawUnsafe(
        `SELECT set_config('app.current_tenant_id', $1, true)`,
        req.user.tenantId,
      );
    } catch (error) {
      logger.error({ error }, 'Failed to set tenant context for RLS');
      res.status(500).json({
        success: false,
        error: { code: 'TENANT_CONTEXT_ERROR', message: 'Failed to initialize request context.' },
      });
      return;
    }
  }
  next();
}
