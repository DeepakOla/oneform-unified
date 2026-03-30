/**
 * OneForm Unified Platform — Extension Service
 *
 * Handles Chrome extension endpoints for form autofill:
 *   - Get pending jobs (form fill requests)
 *   - Claim a job
 *   - Report job result (success/failure)
 *   - Get autofill payload (decrypted profile data + field mappings)
 *
 * @module extension.service
 */
import { prisma } from '../lib/prisma.js';
import { encryptionService } from './encryption.service.js';
import { logger } from '../utils/logger.js';

// ─────────────────────────────────────────────────────────────────────────────
// Errors
// ─────────────────────────────────────────────────────────────────────────────

export class ExtensionError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code: string,
  ) {
    super(message);
    this.name = 'ExtensionError';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface PendingJob {
  id: string;
  profileId: string;
  templateId: string;
  templateName: string;
  portalUrl: string;
  priority: number;
  createdAt: string;
}

export interface AutofillPayload {
  jobId: string;
  profile: {
    sectionA: unknown;
    sectionB: unknown;
    sectionC: unknown;
    sectionD: unknown;
  };
  template: {
    id: string;
    name: string;
    portalUrl: string;
    fieldMappings: Record<string, string>;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Service Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get pending autofill jobs for the current user/operator
 *
 * Note: This is a stub implementation. In production, you would:
 * 1. Create an AutofillJob model in Prisma schema
 * 2. Track job status (PENDING, CLAIMED, IN_PROGRESS, COMPLETED, FAILED)
 * 3. Associate jobs with profiles and templates
 * 4. Implement job claiming logic with timeouts
 */
export async function getPendingJobs(
  tenantId: string,
  userId: string,
): Promise<{ jobs: PendingJob[] }> {
  // TODO: Implement real job queue when AutofillJob model is added
  // For now, return empty array as a valid stub

  logger.info({ tenantId, userId }, 'Extension requested pending jobs (stub)');

  return { jobs: [] };
}

/**
 * Claim a job for processing
 *
 * Note: Stub implementation. In production:
 * 1. Verify job exists and is PENDING
 * 2. Update status to CLAIMED
 * 3. Set claimedBy userId and claimedAt timestamp
 * 4. Return job details
 */
export async function claimJob(
  jobId: string,
  tenantId: string,
  userId: string,
): Promise<{ success: boolean; message: string }> {
  logger.info({ jobId, tenantId, userId }, 'Extension claimed job (stub)');

  // TODO: Implement real job claiming logic
  return {
    success: false,
    message: 'Job claiming not yet implemented. Create AutofillJob model first.',
  };
}

/**
 * Report job completion result
 *
 * Note: Stub implementation. In production:
 * 1. Verify job exists and is claimed by this user
 * 2. Update status to COMPLETED or FAILED
 * 3. Store result data (screenshot, submission ID, errors)
 * 4. Deduct wallet balance on success
 * 5. Credit operator earnings
 */
export async function reportJobResult(
  jobId: string,
  tenantId: string,
  userId: string,
  result: {
    success: boolean;
    submissionId?: string;
    error?: string;
    screenshot?: string;
  },
): Promise<{ success: boolean }> {
  logger.info({ jobId, tenantId, userId, result }, 'Extension reported job result (stub)');

  // TODO: Implement real result handling
  return { success: true };
}

/**
 * Get autofill payload for a specific job
 *
 * This decrypts SectionA (with audit log), fetches the full profile,
 * and returns it along with the template field mappings.
 */
export async function getAutofillPayload(
  jobId: string,
  tenantId: string,
  userId: string,
  profileId: string,
  templateId: string,
): Promise<AutofillPayload> {
  // Fetch profile
  const profile = await prisma.profile.findFirst({
    where: {
      id: profileId,
      tenantId,
    },
  });

  if (!profile) {
    throw new ExtensionError('Profile not found', 404, 'PROFILE_NOT_FOUND');
  }

  // Decrypt SectionA (writes audit log)
  let sectionA: unknown = null;
  if (profile.sectionAEncrypted) {
    const encrypted = {
      ciphertext: (profile.sectionAEncrypted as Buffer).toString('base64'),
      iv: profile.sectionAIv ?? '',
      authTag: profile.sectionAAuthTag ?? '',
      wrappedDek: profile.sectionAWrappedDek ?? '',
      keyVersion: profile.sectionAKeyVersion ?? 1,
    };

    const { data } = await encryptionService.decryptSectionA(encrypted, profileId);
    sectionA = data;

    // Write audit log
    await prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action: 'DECRYPT_SECTION_A',
        resourceType: 'Profile',
        resourceId: profileId,
        ipAddress: 'extension',
        userAgent: 'OneForm Extension',
        metadata: { jobId, reason: 'autofill_job' },
      },
    });
  }

  // Fetch template
  const template = await prisma.formTemplate.findFirst({
    where: {
      id: templateId,
      tenantId,
    },
  });

  if (!template) {
    throw new ExtensionError('Template not found', 404, 'TEMPLATE_NOT_FOUND');
  }

  return {
    jobId,
    profile: {
      sectionA,
      sectionB: profile.sectionB,
      sectionC: profile.sectionC,
      sectionD: profile.sectionD,
    },
    template: {
      id: template.id,
      name: template.name,
      portalUrl: template.portalUrl,
      fieldMappings: template.fieldMappings as Record<string, string>,
    },
  };
}
