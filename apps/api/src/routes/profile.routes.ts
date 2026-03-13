/**
 * OneForm API — Profile Routes
 * GET    /api/profiles               → List profiles (paginated)
 * POST   /api/profiles               → Create profile
 * GET    /api/profiles/:id           → Get profile (no SectionA)
 * PUT    /api/profiles/:id           → Update sections B/C/D
 * GET    /api/profiles/:id/section-a → Decrypt SectionA (AUDIT LOGGED)
 * PUT    /api/profiles/:id/section-a → Update SectionA (encrypts at save!)
 */
import { Router, type Request, type Response, type Router as ExpressRouter } from 'express';
import { z } from 'zod';
import { authenticate, injectTenantContext } from '../middleware/auth.middleware.js';
import {
  createProfile,
  listProfiles,
  getProfile,
  updateProfile,
  getSectionA,
  updateSectionA,
  ProfileError,
} from '../services/profile.service.js';
import { prisma } from '../lib/prisma.js';
import { logger } from '../utils/logger.js';

export const profileRouter: ExpressRouter = Router();

// All profile routes require authentication + tenant context
profileRouter.use(authenticate);
profileRouter.use(injectTenantContext);

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Express URL params are always string in practice, but typed as string | string[] */
function getParam(req: Request, name: string): string {
  const val = req.params[name];
  return Array.isArray(val) ? (val[0] ?? '') : (val ?? '');
}

/** Safely extract first string from x-forwarded-for header */
function getClientIp(req: Request): string | undefined {
  const xff = req.headers['x-forwarded-for'];
  const xffStr = Array.isArray(xff) ? xff[0] : xff;
  return xffStr?.split(',')[0]?.trim() ?? req.socket.remoteAddress;
}

/** Check if user can access a profile — citizens can only access their own */
async function assertProfileAccess(
  profileId: string,
  userId: string,
  tenantId: string,
  role: string,
): Promise<void> {
  // Operators/admins can access all profiles in their tenant
  if (role === 'OPERATOR' || role === 'ADMIN' || role === 'SUPER_ADMIN') return;

  // Citizens: verify ownership
  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
    select: { ownerId: true, tenantId: true },
  });

  if (!profile || profile.tenantId !== tenantId) {
    throw new ProfileError('Profile not found', 404, 'NOT_FOUND');
  }

  if (profile.ownerId !== userId) {
    throw new ProfileError('Profile not found', 404, 'NOT_FOUND');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Error Handler
// ─────────────────────────────────────────────────────────────────────────────

function handleProfileError(res: Response, error: unknown): void {
  if (error instanceof ProfileError) {
    res.status(error.statusCode).json({
      success: false,
      error: { code: error.code, message: error.message },
    });
    return;
  }
  if (error instanceof z.ZodError) {
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Invalid request data', details: error.issues },
    });
    return;
  }
  logger.error({ error }, 'Unexpected profile error');
  res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Validation Schemas
// ─────────────────────────────────────────────────────────────────────────────

const CreateProfileSchema = z.object({
  profileType: z.enum(['student', 'farmer', 'business', 'professional', 'general']),
  sectionA: z.record(z.unknown()).optional(),
  sectionB: z.record(z.unknown()).optional(),
  sectionC: z.record(z.unknown()).optional(),
  sectionD: z.record(z.unknown()).optional(),
});

const UpdateProfileSchema = z.object({
  sectionB: z.record(z.unknown()).optional(),
  sectionC: z.record(z.unknown()).optional(),
  sectionD: z.record(z.unknown()).optional(),
});

const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(200).optional(),
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/profiles — List profiles
// ─────────────────────────────────────────────────────────────────────────────

profileRouter.get('/', async (req: Request, res: Response) => {
  try {
    const query = PaginationSchema.parse(req.query);
    const { id: userId, tenantId, role } = req.user!;

    const result = await listProfiles({
      tenantId,
      // Operators can list all tenant profiles; citizens see only own
      ...(role !== 'OPERATOR' && role !== 'ADMIN' && role !== 'SUPER_ADMIN'
        ? { ownerId: userId }
        : {}),
      page: query.page,
      limit: query.limit,
      ...(query.search !== undefined && { search: query.search }),
    });

    res.json({ success: true, data: result });
  } catch (error) {
    handleProfileError(res, error);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/profiles — Create profile
// ─────────────────────────────────────────────────────────────────────────────

profileRouter.post('/', async (req: Request, res: Response) => {
  try {
    const input = CreateProfileSchema.parse(req.body);
    const { id: ownerId, tenantId } = req.user!;

    const profile = await createProfile({
      ownerId,
      tenantId,
      profileType: input.profileType,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(input.sectionA !== undefined && { sectionA: input.sectionA as any }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(input.sectionB !== undefined && { sectionB: input.sectionB as any }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(input.sectionC !== undefined && { sectionC: input.sectionC as any }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(input.sectionD !== undefined && { sectionD: input.sectionD as any }),
    });

    res.status(201).json({ success: true, data: profile });
  } catch (error) {
    handleProfileError(res, error);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/profiles/:id — Get profile (no SectionA)
// ─────────────────────────────────────────────────────────────────────────────

profileRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = getParam(req, 'id');
    const { id: userId, tenantId, role } = req.user!;

    await assertProfileAccess(id, userId, tenantId, role);
    const profile = await getProfile({ id, tenantId });
    res.json({ success: true, data: profile });
  } catch (error) {
    handleProfileError(res, error);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/profiles/:id — Update sections B/C/D
// ─────────────────────────────────────────────────────────────────────────────

profileRouter.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = getParam(req, 'id');
    const { id: userId, tenantId, role } = req.user!;
    await assertProfileAccess(id, userId, tenantId, role);
    const input = UpdateProfileSchema.parse(req.body);

    const updated = await updateProfile({
      id,
      tenantId,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(input.sectionB !== undefined && { sectionB: input.sectionB as any }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(input.sectionC !== undefined && { sectionC: input.sectionC as any }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(input.sectionD !== undefined && { sectionD: input.sectionD as any }),
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    handleProfileError(res, error);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/profiles/:id/section-a — Decrypt and return SectionA (AUDIT LOGGED)
// ⚠️ Every call is permanently recorded in AuditLog
// ─────────────────────────────────────────────────────────────────────────────

profileRouter.get('/:id/section-a', async (req: Request, res: Response) => {
  try {
    const id = getParam(req, 'id');
    const { id: requestingUserId, tenantId, role } = req.user!;
    await assertProfileAccess(id, requestingUserId, tenantId, role);
    const ua = req.headers['user-agent'];
    const ip = getClientIp(req);

    const result = await getSectionA({
      profileId: id,
      tenantId,
      requestingUserId,
      ...(ip !== undefined && { ipAddress: ip }),
      ...(ua !== undefined && { userAgent: ua }),
    });

    res.json({ success: true, data: result });
  } catch (error) {
    handleProfileError(res, error);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/profiles/:id/section-a — Update SectionA (encrypts at save!)
// ⚠️ Plaintext SectionA NEVER persists to DB — encrypted immediately on receipt
// ─────────────────────────────────────────────────────────────────────────────

profileRouter.put('/:id/section-a', async (req: Request, res: Response) => {
  try {
    const id = getParam(req, 'id');
    const { id: requestingUserId, tenantId, role } = req.user!;
    await assertProfileAccess(id, requestingUserId, tenantId, role);
    const ip = getClientIp(req);

    if (!req.body || typeof req.body !== 'object') {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Request body must be a SectionA object' },
      });
      return;
    }

    const result = await updateSectionA({
      profileId: id,
      tenantId,
      requestingUserId,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sectionAData: req.body as any,
      ...(ip !== undefined && { ipAddress: ip }),
    });

    res.json({ success: true, data: result });
  } catch (error) {
    handleProfileError(res, error);
  }
});
