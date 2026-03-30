/**
 * OneForm Unified Platform — FormJob Types
 *
 * FormJob represents a single autofill job in the queue.
 * Jobs are created when a user/operator wants to fill a form,
 * then claimed by the Chrome extension for processing.
 *
 * @module shared-types/form-job
 */

export enum FormJobType {
  MANUAL = 'MANUAL', // Extension-based autofill (Phase 3)
  SKYVERN = 'SKYVERN', // Skyvern automation (Phase 4)
  BULK = 'BULK', // Batch processing (Phase 5)
}

export enum FormJobStatus {
  PENDING = 'PENDING', // Waiting to be claimed by extension
  CLAIMED = 'CLAIMED', // Extension has claimed but not started
  IN_PROGRESS = 'IN_PROGRESS', // Extension is actively filling form
  SUBMITTED = 'SUBMITTED', // Successfully submitted to portal
  FAILED = 'FAILED', // Failed after retries
  CANCELLED = 'CANCELLED', // Manually cancelled
}

export interface FormJob {
  id: string;
  tenantId: string;

  // Relations
  profileId: string;
  formTemplateId: string;
  userId: string;

  // Job metadata
  jobType: FormJobType;
  status: FormJobStatus;
  priority: number;

  // Extension metadata (filled when claimed)
  extensionId?: string;
  extensionVersion?: string;
  claimedAt?: string; // ISO date string
  claimedBy?: string; // userId

  // Results
  submittedAt?: string; // ISO date string
  submittedUrl?: string;
  acknowledgmentId?: string;
  screenshotUrl?: string;
  errorMessage?: string;
  retryCount: number;
  maxRetries: number;

  // Wallet tracking
  costPaisa: number;
  walletDeductedAt?: string; // ISO date string
  walletTxId?: string;

  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}

/**
 * Extended FormJob with related data
 */
export interface FormJobWithDetails extends FormJob {
  profile?: {
    id: string;
    profileCode: string;
    profileType: string;
  };
  formTemplate?: {
    id: string;
    name: string;
    portalUrl: string;
    category: string;
  };
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName?: string;
  };
}

/**
 * CreateFormJob payload
 */
export interface CreateFormJobPayload {
  profileId: string;
  formTemplateId: string;
  jobType?: FormJobType; // Defaults to MANUAL
  priority?: number; // Defaults to 0
  costPaisa: number; // Must be calculated based on form type
}

/**
 * ClaimFormJob payload (from extension)
 */
export interface ClaimFormJobPayload {
  jobId: string;
  extensionId: string;
  extensionVersion: string;
}

/**
 * ReportFormJobResult payload (from extension)
 */
export interface ReportFormJobResultPayload {
  jobId: string;
  status: FormJobStatus.SUBMITTED | FormJobStatus.FAILED;
  submittedUrl?: string;
  acknowledgmentId?: string;
  screenshotUrl?: string;
  errorMessage?: string;
}

/**
 * GetPendingJobs response
 */
export interface PendingJobsResponse {
  jobs: FormJobWithDetails[];
  total: number;
}

/**
 * GetAutofillPayload response (extension gets profile data + field mappings)
 */
export interface AutofillPayload {
  jobId: string;
  profile: {
    id: string;
    profileCode: string;
    sectionA: Record<string, unknown>; // Decrypted PII
    sectionB?: Record<string, unknown>;
    sectionC?: Record<string, unknown>;
    sectionD?: Record<string, unknown>;
  };
  formTemplate: {
    id: string;
    name: string;
    portalUrl: string;
    fieldMappings: Record<string, string>;
    skyvernScript?: unknown;
  };
  costPaisa: number;
}
