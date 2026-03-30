/**
 * OneForm API — Extension Service
 * Handles job management for Chrome extension
 */
import { prisma } from '../lib/prisma.js';
import type { SyncJobStatus } from '@prisma/client';
import { decryptSectionA } from './encryption.service.js';

/**
 * Get pending jobs for a user
 */
export async function getPendingJobs(tenantId: string, userId: string) {
  const jobs = await prisma.syncJob.findMany({
    where: {
      tenant_id: tenantId,
      user_id: userId,
      status: 'QUEUED',
    },
    include: {
      profile: {
        select: {
          id: true,
          profile_name: true,
          profile_type: true,
        },
      },
      form_template: {
        select: {
          id: true,
          portal_name: true,
          portal_url: true,
          field_mappings: true,
        },
      },
    },
    orderBy: {
      created_at: 'asc',
    },
    take: 10, // Limit to 10 pending jobs at a time
  });

  return jobs;
}

/**
 * Claim a job (atomic operation to prevent double-claim)
 */
export async function claimJob(jobId: string, tenantId: string, userId: string) {
  try {
    // Use Prisma transaction for optimistic locking
    const job = await prisma.$transaction(async (tx) => {
      // First, check if job is still available
      const existingJob = await tx.syncJob.findFirst({
        where: {
          id: jobId,
          tenant_id: tenantId,
          user_id: userId,
          status: 'QUEUED',
        },
      });

      if (!existingJob) {
        throw new Error('Job not found or already claimed');
      }

      // Update job status to IN_PROGRESS
      const updatedJob = await tx.syncJob.update({
        where: { id: jobId },
        data: {
          status: 'IN_PROGRESS' as SyncJobStatus,
          claimed_at: new Date(),
        },
      });

      return updatedJob;
    });

    return job;
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Failed to claim job');
  }
}

/**
 * Get autofill payload for a job
 * This decrypts Section A and returns full profile data with form template mappings
 */
export async function getAutofillPayload(jobId: string, tenantId: string, userId: string) {
  const job = await prisma.syncJob.findFirst({
    where: {
      id: jobId,
      tenant_id: tenantId,
      user_id: userId,
    },
    include: {
      profile: true,
      form_template: true,
    },
  });

  if (!job) {
    throw new Error('Job not found');
  }

  if (job.status !== 'IN_PROGRESS') {
    throw new Error('Job must be claimed before getting payload');
  }

  // Decrypt Section A
  const decryptedSectionA = await decryptSectionA(job.profile.id, tenantId, userId, 'EXTENSION_AUTOFILL');

  // Create audit log for PII access
  await prisma.auditLog.create({
    data: {
      tenant_id: tenantId,
      user_id: userId,
      action: 'SECTION_A_DECRYPTED',
      resource_type: 'Profile',
      resource_id: job.profile.id,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      metadata: {
        reason: 'EXTENSION_AUTOFILL',
        jobId: job.id,
        formTemplate: job.form_template?.portal_name,
      } as any,
    },
  });

  // Return full profile with decrypted Section A
  return {
    jobId: job.id,
    profile: {
      id: job.profile.id,
      name: job.profile.profile_name,
      type: job.profile.profile_type,
      sectionA: decryptedSectionA,
      sectionB: job.profile.section_b,
      sectionC: job.profile.section_c,
      sectionD: job.profile.section_d,
    },
    formTemplate: job.form_template
      ? {
          id: job.form_template.id,
          portalName: job.form_template.portal_name,
          portalUrl: job.form_template.portal_url,
          fieldMappings: job.form_template.field_mappings,
        }
      : null,
  };
}

/**
 * Report job result (success or failure)
 */
export async function reportJobResult(
  jobId: string,
  tenantId: string,
  userId: string,
  result: {
    success: boolean;
    error?: string;
    submissionUrl?: string;
    referenceNumber?: string;
    screenshot?: string;
  }
) {
  const job = await prisma.syncJob.findFirst({
    where: {
      id: jobId,
      tenant_id: tenantId,
      user_id: userId,
    },
  });

  if (!job) {
    throw new Error('Job not found');
  }

  // Update job status
  const updatedJob = await prisma.syncJob.update({
    where: { id: jobId },
    data: {
      status: result.success ? ('COMPLETED' as SyncJobStatus) : ('FAILED' as SyncJobStatus),
      completed_at: new Date(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      result: result as any,
    },
  });

  // Create sync job log
  await prisma.syncJobLog.create({
    data: {
      sync_job_id: jobId,
      log_level: result.success ? 'INFO' : 'ERROR',
      message: result.success ? 'Job completed successfully' : `Job failed: ${result.error ?? 'Unknown error'}`,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      metadata: result as any,
    },
  });

  // If successful, deduct wallet balance
  if (result.success) {
    const { deductWallet } = await import('./wallet.service.js');

    // Get form template to determine cost
    const formTemplate = await prisma.formTemplate.findUnique({
      where: { id: job.form_template_id ?? '' },
    });

    if (formTemplate) {
      const costInPaisa = formTemplate.cost_in_paisa ?? 200; // Default ₹2

      try {
        await deductWallet(
          tenantId,
          userId,
          costInPaisa,
          `Form submission: ${formTemplate.portal_name}`,
          {
            jobId,
            formTemplateId: formTemplate.id,
            referenceNumber: result.referenceNumber,
          }
        );

        // If user is an OPERATOR, credit their earnings
        const user = await prisma.user.findUnique({
          where: { id: userId },
        });

        if (user?.role === 'OPERATOR') {
          const { creditWallet } = await import('./wallet.service.js');
          const operatorEarnings = Math.floor(costInPaisa * 0.7); // 70% commission

          await creditWallet(
            tenantId,
            userId,
            operatorEarnings,
            'OPERATOR_EARN',
            `Earnings from form submission: ${formTemplate.portal_name}`,
            {
              jobId,
              formTemplateId: formTemplate.id,
            }
          );
        }
      } catch (walletError) {
        console.error('Wallet deduction failed:', walletError);
        // Don't fail the job if wallet deduction fails - log it
        await prisma.syncJobLog.create({
          data: {
            sync_job_id: jobId,
            log_level: 'WARN',
            message: `Wallet deduction failed: ${walletError instanceof Error ? walletError.message : 'Unknown error'}`,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            metadata: { walletError: String(walletError) } as any,
          },
        });
      }
    }
  }

  return updatedJob;
}
