/**
 * @fileoverview Profile CRUD controller for the OneForm Unified Platform.
 *
 * Implements the secure profile creation flow in the exact, unbreakable order
 * mandated by the Safe Change Policy:
 *
 * 1. Extract `tenantContext` from the request (set by tenant middleware).
 * 2. Validate `req.body` against `MasterProfileSchema` (Zod). Return HTTP 400 on failure.
 * 3. Insert the validated payload into the `Profile` table via Prisma, explicitly
 *    scoping the insert to the authenticated `tenantId`.
 *
 * All Prisma queries use parameterized bindings — raw SQL injection is impossible.
 *
 * @see {@link ../middleware/tenant.middleware} for tenantContext population
 * @see {@link ../../packages/validation/src/profile.schema} for MasterProfileSchema
 */

import { type Request, type Response, type NextFunction } from 'express';
import { PrismaClient, type Profile } from '@prisma/client';
import { MasterProfileSchema } from '@oneform/validation';
import { type ApiSuccessResponse, type ApiErrorResponse } from '@oneform/shared-types';

// ---------------------------------------------------------------------------
// Prisma singleton
// ---------------------------------------------------------------------------

// In production, import from a shared singleton module to avoid exhausting
// the connection pool. This file creates its own instance only for simplicity
// during the MVP scaffolding phase.
const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Response shape helpers
// ---------------------------------------------------------------------------

/** Minimal profile representation returned to the client after creation. */
interface ProfileCreatedResponse {
  id: string;
  tenantId: string;
  status: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// createProfile controller
// ---------------------------------------------------------------------------

/**
 * `POST /profiles`
 *
 * Creates a new citizen profile for the authenticated tenant.
 *
 * **Request body**: a JSON object conforming to {@link MasterProfile}.
 *
 * **Responses**:
 * - `201 Created`  — profile persisted; returns `{ id, tenantId, status, createdAt }`.
 * - `400 Bad Request` — Zod validation failed; returns field-level error map.
 * - `401 Unauthorized` — tenant context missing (tenant middleware not applied).
 * - `500 Internal Server Error` — unexpected database or runtime failure.
 */
export async function createProfile(
  req: Request,
  res: Response<ApiSuccessResponse<ProfileCreatedResponse> | ApiErrorResponse>,
  next: NextFunction,
): Promise<void> {
  try {
    // -----------------------------------------------------------------------
    // Step 1: Extract tenantContext
    // -----------------------------------------------------------------------
    const tenantContext = req.tenantContext;

    if (tenantContext === undefined) {
      res.status(401).json({
        success: false,
        error: {
          code: 'MISSING_TENANT_CONTEXT',
          message:
            'Tenant context is not available. Ensure tenantMiddleware is applied to this route.',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const { tenantId, userId } = tenantContext;

    // -----------------------------------------------------------------------
    // Step 2: Validate request body against MasterProfileSchema
    // -----------------------------------------------------------------------
    const parseResult = MasterProfileSchema.safeParse(req.body);

    if (!parseResult.success) {
      // Flatten the Zod error tree into a field → messages map for easy
      // consumption by the React MUI form error display.
      const flattened = parseResult.error.flatten();

      const fieldErrors: Record<string, string[]> = {};

      // Map top-level field errors
      for (const [field, messages] of Object.entries(flattened.fieldErrors)) {
        if (Array.isArray(messages) && messages.length > 0) {
          fieldErrors[field] = messages as string[];
        }
      }

      // Include form-level errors under a special '_form' key
      if (flattened.formErrors.length > 0) {
        fieldErrors['_form'] = flattened.formErrors;
      }

      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request body failed schema validation. Check fieldErrors for details.',
          fieldErrors,
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const validatedPayload = parseResult.data;

    // -----------------------------------------------------------------------
    // Step 3: Persist to PostgreSQL via Prisma parameterized query
    // -----------------------------------------------------------------------
    // The tenantId is sourced exclusively from the JWT claim (tenantContext),
    // never from the request body. This prevents tenant-spoofing attacks.
    const profile: Profile = await prisma.profile.create({
      data: {
        tenantId,
        createdBy: userId,
        profileData: validatedPayload,
        status: 'DRAFT',
      },
    });

    res.status(201).json({
      success: true,
      data: {
        id: profile.id,
        tenantId: profile.tenantId,
        status: profile.status,
        createdAt: profile.createdAt.toISOString(),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    // Delegate to the Express global error handler (defined in apps/api/src/index.ts)
    next(err);
  }
}

// ---------------------------------------------------------------------------
// getProfile controller
// ---------------------------------------------------------------------------

/**
 * `GET /profiles/:id`
 *
 * Retrieves a single profile by ID, strictly scoped to the authenticated tenant.
 * A 404 is returned if the profile does not exist OR belongs to a different tenant —
 * the response is intentionally indistinguishable to prevent data enumeration.
 */
export async function getProfile(
  req: Request<{ id: string }>,
  res: Response<ApiSuccessResponse<Profile> | ApiErrorResponse>,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantContext = req.tenantContext;

    if (tenantContext === undefined) {
      res.status(401).json({
        success: false,
        error: {
          code: 'MISSING_TENANT_CONTEXT',
          message: 'Tenant context is not available.',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const { id } = req.params;
    const { tenantId } = tenantContext;

    // Both `id` and `tenantId` are used in the WHERE clause — Prisma generates
    // a parameterized query, preventing SQL injection.
    const profile = await prisma.profile.findFirst({
      where: {
        id,
        tenantId,
      },
    });

    if (profile === null) {
      res.status(404).json({
        success: false,
        error: {
          code: 'PROFILE_NOT_FOUND',
          message: 'Profile not found.',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: profile,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// listProfiles controller
// ---------------------------------------------------------------------------

/**
 * `GET /profiles`
 *
 * Returns a paginated list of profiles belonging to the authenticated tenant.
 * Supports `?page=1&limit=20` query parameters.
 */
export async function listProfiles(
  req: Request,
  res: Response<ApiSuccessResponse<Profile[]> | ApiErrorResponse>,
  next: NextFunction,
): Promise<void> {
  try {
    const tenantContext = req.tenantContext;

    if (tenantContext === undefined) {
      res.status(401).json({
        success: false,
        error: {
          code: 'MISSING_TENANT_CONTEXT',
          message: 'Tenant context is not available.',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const page = Math.max(1, parseInt(String(req.query['page'] ?? '1'), 10));
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query['limit'] ?? '20'), 10)));
    const skip = (page - 1) * limit;

    const profiles = await prisma.profile.findMany({
      where: { tenantId: tenantContext.tenantId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    res.status(200).json({
      success: true,
      data: profiles,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
}
