/**
 * OneForm Unified Platform — Profile Service
 *
 * Handles the ABCD profile system:
 *   Section A — Personal/Sensitive PII → AES-256-GCM encrypted at rest
 *   Section B — Demographics           → JSON, Row-Level Security
 *   Section C — Qualifications         → JSON, Row-Level Security
 *   Section D — Operational/Extensions → JSON, role-specific
 *
 * KEY RULES:
 *   - SectionA is ALWAYS encrypted via encryption.service.ts at SAVE TIME
 *   - Decryption is server-side only + writes an AuditLog entry
 *   - Profile list views NEVER return decrypted SectionA
 *   - profileCode format: "P-{YEAR}-{6 HEX CHARS}" (e.g. P-2026-A3B4C5)
 *
 * @module profile.service
 */
import crypto from 'node:crypto';
import { prisma } from '../lib/prisma.js';
import { encryptionService } from './encryption.service.js';
import { logger } from '../utils/logger.js';
import type {
  SectionA,
  SectionB,
  SectionC,
  SectionD,
  ProfileType,
  ProfileCompleteness,
} from '@oneform/shared-types';

// ─────────────────────────────────────────────────────────────────────────────
// Errors
// ─────────────────────────────────────────────────────────────────────────────

export class ProfileError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code: string,
  ) {
    super(message);
    this.name = 'ProfileError';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Completeness Calculation
// Weights: SectionA=40%, SectionB=25%, SectionC=25%, SectionD=10%
// ─────────────────────────────────────────────────────────────────────────────

function calcSectionACompleteness(sectionA: SectionA): number {
  const checks = [
    !!(sectionA.name?.first),
    !!(sectionA.name?.last),
    !!sectionA.dob,
    !!sectionA.gender,
    !!sectionA.phone,
    !!(sectionA.addresses && sectionA.addresses.length > 0),
    !!sectionA.aadhaar,
    !!sectionA.pan,
    !!sectionA.photoUrl,
    !!sectionA.emergencyContact,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

function calcSectionBCompleteness(sectionB: unknown): number {
  if (!sectionB || typeof sectionB !== 'object') return 0;
  const b = sectionB as SectionB;
  const checks = [
    !!b.caste,
    !!b.maritalStatus,
    !!b.income,
    !!b.religion,
    !!b.domicile,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

function calcSectionCCompleteness(sectionC: unknown): number {
  if (!sectionC || typeof sectionC !== 'object') return 0;
  const c = sectionC as SectionC;
  const checks = [
    !!(c.education && c.education.length > 0),
    !!(c.certifications && c.certifications.length > 0),
    !!(c.experience && c.experience.length > 0),
    !!(c.skills && c.skills.length > 0),
    !!(c.languages && c.languages.length > 0),
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

function calcSectionDCompleteness(sectionD: unknown): number {
  if (!sectionD || typeof sectionD !== 'object') return 0;
  const d = sectionD as SectionD;
  const checks = [
    !!(d.tags && d.tags.length > 0),
    !!(d.extension && Object.values(d.extension).some((v) => v !== null && v !== undefined)),
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

function calcCompleteness(
  sectionA: SectionA | undefined,
  sectionB: unknown,
  sectionC: unknown,
  sectionD: unknown,
): ProfileCompleteness {
  const a = sectionA ? calcSectionACompleteness(sectionA) : 0;
  const b = calcSectionBCompleteness(sectionB);
  const c = calcSectionCCompleteness(sectionC);
  const d = calcSectionDCompleteness(sectionD);
  const overall = Math.round(a * 0.4 + b * 0.25 + c * 0.25 + d * 0.1);
  return { sectionA: a, sectionB: b, sectionC: c, sectionD: d, overall };
}

// ─────────────────────────────────────────────────────────────────────────────
// Profile Code Generator — "P-2026-A3B4C5"
// Caller retries up to 5 times on collision (extremely rare with 16M combos)
// ─────────────────────────────────────────────────────────────────────────────

function generateProfileCode(): string {
  const year = new Date().getFullYear();
  const hex = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `P-${year}-${hex}`;
}

async function uniqueProfileCode(): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateProfileCode();
    const existing = await prisma.profile.findUnique({ where: { profileCode: code } });
    if (!existing) return code;
  }
  throw new ProfileError('Could not generate unique profile code', 500, 'INTERNAL_ERROR');
}

// ─────────────────────────────────────────────────────────────────────────────
// CREATE PROFILE
// ─────────────────────────────────────────────────────────────────────────────

export async function createProfile(input: {
  ownerId: string;
  tenantId: string;
  operatorId?: string;
  profileType: ProfileType;
  sectionA?: SectionA;
  sectionB?: SectionB;
  sectionC?: SectionC;
  sectionD?: SectionD;
}) {
  const { ownerId, tenantId, operatorId, profileType, sectionA, sectionB, sectionC, sectionD } = input;

  const profileCode = await uniqueProfileCode();

  // Generate the profile ID up-front so we can use it as AAD in AES-256-GCM.
  // This binds the ciphertext to this specific profile row — prevents cross-profile replay.
  const profileId = crypto.randomUUID();

  // Encrypt SectionA if provided
  let encryptedFields: {
    sectionAEncrypted: Buffer;
    sectionAIv: string;
    sectionAAuthTag: string;
    sectionAWrappedDek: string;
    sectionAKeyVersion: number;
    sectionAUpdatedAt: Date;
  } | undefined;

  if (sectionA) {
    const payload = await encryptionService.encryptSectionA(sectionA, profileId);
    encryptedFields = {
      sectionAEncrypted: Buffer.from(payload.ciphertext, 'base64'),
      sectionAIv: payload.iv,
      sectionAAuthTag: payload.authTag,
      sectionAWrappedDek: payload.wrappedDek,
      sectionAKeyVersion: payload.keyVersion,
      sectionAUpdatedAt: new Date(),
    };
  }

  const completeness = calcCompleteness(sectionA, sectionB, sectionC, sectionD);

  const profile = await prisma.profile.create({
    data: {
      id: profileId,
      tenantId,
      ownerId,
      ...(operatorId !== undefined && { operatorId }),
      profileCode,
      profileType,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(encryptedFields !== undefined && (encryptedFields as any)),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(sectionB !== undefined && { sectionB: sectionB as any }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(sectionC !== undefined && { sectionC: sectionC as any }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(sectionD !== undefined && { sectionD: sectionD as any }),
      completenessA: completeness.sectionA,
      completenessB: completeness.sectionB,
      completenessC: completeness.sectionC,
      completenessD: completeness.sectionD,
      completenessOverall: completeness.overall,
    },
    select: {
      id: true,
      profileCode: true,
      profileType: true,
      status: true,
      completenessA: true,
      completenessB: true,
      completenessC: true,
      completenessD: true,
      completenessOverall: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  logger.info({ profileId: profile.id, tenantId, ownerId, profileType }, 'Profile created');

  return {
    ...profile,
    completeness: {
      sectionA: profile.completenessA,
      sectionB: profile.completenessB,
      sectionC: profile.completenessC,
      sectionD: profile.completenessD,
      overall: profile.completenessOverall,
    },
    hasSectionA: !!encryptedFields,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// LIST PROFILES
// Returns lightweight summaries — NEVER returns encrypted bytes or decrypted PII
// ─────────────────────────────────────────────────────────────────────────────

export async function listProfiles(input: {
  tenantId: string;
  ownerId?: string;       // filter by owne (citizen view = own profiles only)
  operatorId?: string;    // filter by operator
  page?: number;
  limit?: number;
  search?: string;
}) {
  const {
    tenantId,
    ownerId,
    operatorId,
    page = 1,
    limit = 20,
    search,
  } = input;

  // Clamp pagination
  const safeLimit = Math.min(limit, 100);
  const skip = (page - 1) * safeLimit;

  const where = {
    tenantId,
    ...(ownerId !== undefined && { ownerId }),
    ...(operatorId !== undefined && { operatorId }),
    ...(search !== undefined && search.trim().length > 0
      ? {
          OR: [
            { profileCode: { contains: search, mode: 'insensitive' as const } },
            { profileType: { equals: search.toLowerCase() as ProfileType } },
          ],
        }
      : {}),
  };

  const [profiles, total] = await prisma.$transaction([
    prisma.profile.findMany({
      where,
      skip,
      take: safeLimit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        profileCode: true,
        profileType: true,
        status: true,
        // ⚠️ NEVER include sectionAEncrypted in list view
        completenessA: true,
        completenessB: true,
        completenessC: true,
        completenessD: true,
        completenessOverall: true,
        sectionAUpdatedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.profile.count({ where }),
  ]);

  return {
    profiles: profiles.map((p: typeof profiles[number]) => ({
      id: p.id,
      profileCode: p.profileCode,
      profileType: p.profileType,
      status: p.status,
      completeness: {
        sectionA: p.completenessA,
        sectionB: p.completenessB,
        sectionC: p.completenessC,
        sectionD: p.completenessD,
        overall: p.completenessOverall,
      },
      hasSectionA: !!p.sectionAUpdatedAt,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    })),
    pagination: {
      page,
      limit: safeLimit,
      total,
      pages: Math.ceil(total / safeLimit),
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// GET PROFILE (non-sensitive)
// Does NOT return SectionA data — see getSectionA for that
// ─────────────────────────────────────────────────────────────────────────────

export async function getProfile(input: {
  id: string;
  tenantId: string;
}) {
  const { id, tenantId } = input;

  const profile = await prisma.profile.findUnique({
    where: { id },
    select: {
      id: true,
      tenantId: true,
      ownerId: true,
      operatorId: true,
      profileCode: true,
      profileType: true,
      status: true,
      // SectionA metadata only — NOT the encrypted bytes
      sectionAKeyVersion: true,
      sectionAUpdatedAt: true,
      // Non-encrypted sections
      sectionB: true,
      sectionC: true,
      sectionD: true,
      completenessA: true,
      completenessB: true,
      completenessC: true,
      completenessD: true,
      completenessOverall: true,
      verifiedAt: true,
      verifiedBy: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!profile) {
    throw new ProfileError('Profile not found', 404, 'NOT_FOUND');
  }

  if (profile.tenantId !== tenantId) {
    throw new ProfileError('Profile not found', 404, 'NOT_FOUND');
  }

  return {
    id: profile.id,
    tenantId: profile.tenantId,
    ownerId: profile.ownerId,
    ...(profile.operatorId !== null && { operatorId: profile.operatorId }),
    profileCode: profile.profileCode,
    profileType: profile.profileType,
    status: profile.status,
    sectionAMeta: profile.sectionAKeyVersion !== null
      ? {
          keyVersion: profile.sectionAKeyVersion,
          lastUpdated: profile.sectionAUpdatedAt?.toISOString(),
        }
      : null,
    sectionB: profile.sectionB ?? null,
    sectionC: profile.sectionC ?? null,
    sectionD: profile.sectionD ?? null,
    completeness: {
      sectionA: profile.completenessA,
      sectionB: profile.completenessB,
      sectionC: profile.completenessC,
      sectionD: profile.completenessD,
      overall: profile.completenessOverall,
    },
    ...(profile.verifiedAt !== null && { verifiedAt: profile.verifiedAt.toISOString() }),
    ...(profile.verifiedBy !== null && { verifiedBy: profile.verifiedBy }),
    createdAt: profile.createdAt.toISOString(),
    updatedAt: profile.updatedAt.toISOString(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// GET SECTION A (AUDIT LOGGED — decrypts sensitive PII)
// ⚠️ Every call writes an AuditLog entry
// ─────────────────────────────────────────────────────────────────────────────

export async function getSectionA(input: {
  profileId: string;
  tenantId: string;
  requestingUserId: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  const { profileId, tenantId, requestingUserId, ipAddress, userAgent } = input;

  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
    select: {
      id: true,
      tenantId: true,
      sectionAEncrypted: true,
      sectionAIv: true,
      sectionAAuthTag: true,
      sectionAWrappedDek: true,
      sectionAKeyVersion: true,
    },
  });

  if (!profile || profile.tenantId !== tenantId) {
    throw new ProfileError('Profile not found', 404, 'NOT_FOUND');
  }

  if (
    !profile.sectionAEncrypted ||
    !profile.sectionAIv ||
    !profile.sectionAAuthTag ||
    !profile.sectionAWrappedDek ||
    profile.sectionAKeyVersion === null
  ) {
    throw new ProfileError('Section A has not been filled yet', 404, 'SECTION_A_EMPTY');
  }

  // Reconstruct the EncryptedPayload from stored fields
  const encryptedPayload = {
    ciphertext: (profile.sectionAEncrypted as Buffer).toString('base64'),
    iv: profile.sectionAIv,
    authTag: profile.sectionAAuthTag,
    wrappedDek: profile.sectionAWrappedDek,
    keyVersion: profile.sectionAKeyVersion,
  };

  const { data: sectionA, decryptedAt } = await encryptionService.decryptSectionA(
    encryptedPayload,
    profileId,
  );

  // ⚠️ ALWAYS write audit log — this is a legal/compliance requirement
  await prisma.auditLog.create({
    data: {
      tenantId,
      userId: requestingUserId,
      action: 'SECTION_A_DECRYPTED',
      resourceType: 'Profile',
      resourceId: profileId,
      ...(ipAddress !== undefined && { ipAddress }),
      ...(userAgent !== undefined && { userAgent }),
      metadata: { decryptedAt, requestingUserId },
    },
  });

  logger.info(
    { profileId, tenantId, requestingUserId },
    'Section A decrypted — AuditLog entry written',
  );

  return { sectionA, decryptedAt };
}

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE SECTION A (ENCRYPTS AT SAVE POINT)
// ⚠️ Plaintext SectionA never persists — encrypted immediately
// ─────────────────────────────────────────────────────────────────────────────

export async function updateSectionA(input: {
  profileId: string;
  tenantId: string;
  requestingUserId: string;
  sectionAData: SectionA;
  ipAddress?: string;
}) {
  const { profileId, tenantId, requestingUserId, sectionAData, ipAddress } = input;

  // Verify profile exists in this tenant
  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
    select: { id: true, tenantId: true, sectionB: true, sectionC: true, sectionD: true },
  });

  if (!profile || profile.tenantId !== tenantId) {
    throw new ProfileError('Profile not found', 404, 'NOT_FOUND');
  }

  // Encrypt at save point — plaintext never reaches DB
  const payload = await encryptionService.encryptSectionA(sectionAData, profileId);

  const completeness = calcCompleteness(
    sectionAData,
    profile.sectionB,
    profile.sectionC,
    profile.sectionD,
  );

  await prisma.$transaction([
    prisma.profile.update({
      where: { id: profileId },
      data: {
        sectionAEncrypted: Buffer.from(payload.ciphertext, 'base64'),
        sectionAIv: payload.iv,
        sectionAAuthTag: payload.authTag,
        sectionAWrappedDek: payload.wrappedDek,
        sectionAKeyVersion: payload.keyVersion,
        sectionAUpdatedAt: new Date(),
        completenessA: completeness.sectionA,
        completenessOverall: completeness.overall,
      },
    }),
    prisma.auditLog.create({
      data: {
        tenantId,
        userId: requestingUserId,
        action: 'SECTION_A_UPDATED',
        resourceType: 'Profile',
        resourceId: profileId,
        ...(ipAddress !== undefined && { ipAddress }),
        metadata: { keyVersion: payload.keyVersion },
      },
    }),
  ]);

  logger.info({ profileId, tenantId, requestingUserId }, 'Section A updated and re-encrypted');

  return { success: true, completeness };
}

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE PROFILE (non-sensitive sections B, C, D)
// ─────────────────────────────────────────────────────────────────────────────

export async function updateProfile(input: {
  id: string;
  tenantId: string;
  sectionB?: SectionB;
  sectionC?: SectionC;
  sectionD?: SectionD;
}) {
  const { id, tenantId, sectionB, sectionC, sectionD } = input;

  const existing = await prisma.profile.findUnique({
    where: { id },
    select: {
      tenantId: true,
      sectionAUpdatedAt: true,
      sectionB: true,
      sectionC: true,
      sectionD: true,
      completenessA: true,
    },
  });

  if (!existing || existing.tenantId !== tenantId) {
    throw new ProfileError('Profile not found', 404, 'NOT_FOUND');
  }

  // Merge: use provided value or fall back to existing
  const newB = sectionB ?? existing.sectionB;
  const newC = sectionC ?? existing.sectionC;
  const newD = sectionD ?? existing.sectionD;

  const b = calcSectionBCompleteness(newB);
  const c = calcSectionCCompleteness(newC);
  const d = calcSectionDCompleteness(newD);
  const overall = Math.round(existing.completenessA * 0.4 + b * 0.25 + c * 0.25 + d * 0.1);

  const profile = await prisma.profile.update({
    where: { id },
    data: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(sectionB !== undefined && { sectionB: sectionB as any }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(sectionC !== undefined && { sectionC: sectionC as any }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(sectionD !== undefined && { sectionD: sectionD as any }),
      completenessB: b,
      completenessC: c,
      completenessD: d,
      completenessOverall: overall,
    },
    select: {
      id: true,
      profileCode: true,
      profileType: true,
      status: true,
      completenessA: true,
      completenessB: true,
      completenessC: true,
      completenessD: true,
      completenessOverall: true,
      updatedAt: true,
    },
  });

  return {
    ...profile,
    completeness: {
      sectionA: profile.completenessA,
      sectionB: profile.completenessB,
      sectionC: profile.completenessC,
      sectionD: profile.completenessD,
      overall: profile.completenessOverall,
    },
  };
}
