/**
 * @fileoverview Express tenant-isolation middleware for the OneForm Unified Platform.
 *
 * This middleware is the cornerstone of multi-tenant data isolation. It extracts
 * the `tenant_id` from the decoded JWT payload (populated upstream by the auth
 * middleware) and attaches a typed `tenantContext` object to every request so
 * that all downstream controllers can safely scope database queries.
 *
 * **Security guarantee**: If `tenant_id` is absent or malformed the middleware
 * immediately terminates the request with HTTP 401 — no controller code runs.
 *
 * **Execution order** (must be registered after auth middleware):
 * ```
 * app.use(authMiddleware)    // verifies JWT, attaches req.user
 * app.use(tenantMiddleware)  // extracts tenant_id → req.tenantContext
 * app.use(router)            // protected routes
 * ```
 */

import { type Request, type Response, type NextFunction } from 'express';

// ---------------------------------------------------------------------------
// Type Extensions
// ---------------------------------------------------------------------------

/**
 * The tenant context object attached to every authenticated request.
 * All Prisma queries in controllers MUST use `tenantId` from this object.
 */
export interface TenantContext {
  /** The CUID of the authenticated tenant, sourced from the JWT claim. */
  tenantId: string;
  /** The CUID of the authenticated user, sourced from the JWT claim. */
  userId: string;
}

/**
 * The decoded JWT payload expected by this middleware.
 * Populated by the upstream auth middleware after verifying the JWT signature.
 */
export interface JwtPayload {
  /** Tenant CUID claim — identifies which tenant this user belongs to. */
  tenant_id: string;
  /** User CUID claim. */
  user_id: string;
  /** Standard JWT subject (mirrors user_id). */
  sub: string;
  /** Standard JWT expiry (Unix timestamp). */
  exp: number;
  /** Standard JWT issued-at (Unix timestamp). */
  iat: number;
}

// ---------------------------------------------------------------------------
// Express Request Augmentation
// ---------------------------------------------------------------------------

/**
 * Module augmentation so TypeScript recognises the custom properties added
 * by this middleware without requiring explicit casting in every controller.
 *
 * `req.user`          → set by the upstream JWT auth middleware
 * `req.tenantContext` → set by this tenant middleware
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** Decoded JWT payload — populated by the upstream auth middleware. */
      user?: JwtPayload;
      /** Tenant isolation context — populated by tenantMiddleware. */
      tenantContext?: TenantContext;
    }
  }
}

// ---------------------------------------------------------------------------
// Tenant ID validation helper
// ---------------------------------------------------------------------------

/**
 * Validates that a string is a non-empty CUID (Collision-resistant Unique ID).
 * CUIDs produced by Prisma start with 'c' and are 25 characters long.
 * The regex intentionally allows any alphanumeric slug to support future
 * migration to UUIDs or NanoIDs without a middleware rewrite.
 */
const TENANT_ID_REGEX = /^[a-z0-9_\-]{5,36}$/i;

function isValidTenantId(value: unknown): value is string {
  return typeof value === 'string' && TENANT_ID_REGEX.test(value);
}

function isValidUserId(value: unknown): value is string {
  return typeof value === 'string' && TENANT_ID_REGEX.test(value);
}

// ---------------------------------------------------------------------------
// Middleware Implementation
// ---------------------------------------------------------------------------

/**
 * Express middleware that enforces per-request tenant isolation.
 *
 * Reads `req.user.tenant_id` and `req.user.user_id` (both set by the auth
 * middleware after JWT verification) and attaches them to `req.tenantContext`.
 *
 * Responds with **401 Unauthorized** if:
 * - `req.user` is not present (auth middleware did not run or JWT was invalid)
 * - `req.user.tenant_id` is missing or fails format validation
 * - `req.user.user_id` is missing or fails format validation
 *
 * @param req  - Express Request (augmented with `user` and `tenantContext`)
 * @param res  - Express Response
 * @param next - Express NextFunction — called only when context is valid
 */
export function tenantMiddleware(req: Request, res: Response, next: NextFunction): void {
  const user = req.user;

  if (user === undefined || user === null) {
    res.status(401).json({
      success: false,
      error: {
        code: 'MISSING_AUTH_CONTEXT',
        message: 'Authentication context is missing. Ensure the auth middleware runs first.',
      },
      timestamp: new Date().toISOString(),
    });
    return;
  }

  const { tenant_id, user_id } = user;

  if (!isValidTenantId(tenant_id)) {
    res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_TENANT_ID',
        message:
          'The tenant_id claim in the JWT is missing or malformed. Re-authenticate and retry.',
      },
      timestamp: new Date().toISOString(),
    });
    return;
  }

  if (!isValidUserId(user_id)) {
    res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_USER_ID',
        message:
          'The user_id claim in the JWT is missing or malformed. Re-authenticate and retry.',
      },
      timestamp: new Date().toISOString(),
    });
    return;
  }

  req.tenantContext = {
    tenantId: tenant_id,
    userId: user_id,
  };

  next();
}
