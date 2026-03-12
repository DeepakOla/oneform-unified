import { Queue } from 'bullmq';
import { Redis } from 'ioredis';

// ============================================================
// REDIS CONNECTION
// ============================================================

const redisConnection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

// ============================================================
// TYPES (From Old Service)
// ============================================================

export type CRMProvider = 
  | 'zoho_crm' | 'salesforce' | 'hubspot' | 'freshsales'
  | 'pipedrive' | 'odoo' | 'microsoft_dynamics'
  | 'keka' | 'greythr' | 'darwinbox'
  | 'salesforce_nonprofit' | 'bloomerang' | 'neon_crm'
  | 'custom_webhook';

export interface SyncJobData {
  profileId: string;
  transformedData: Record<string, unknown>;
  originalProfile?: Record<string, unknown>;
}

export interface SyncJobPayload {
  tenantId: string;
  crmProvider: CRMProvider;
  connectionId: string;
  data: SyncJobData[];
}

export interface RateLimitConfig {
  requestsPerMinute: number;
  requestsPerHour: number;
  batchSize: number;
  cooldownMs: number;
}

export interface PreFlightResult {
  valid: boolean;
  totalRecords: number;
  accepted: number;
  rejected: number;
  errors: Array<{
    profileId: string;
    field: string;
    message: string;
  }>;
  warnings: string[];
  estimatedDuration: number;
}

// ============================================================
// RATE LIMIT CONFIGURATIONS
// ============================================================

export const CRM_RATE_LIMITS: Record<CRMProvider, RateLimitConfig> = {
  zoho_crm: { requestsPerMinute: 100, requestsPerHour: 5000, batchSize: 100, cooldownMs: 1000 },
  salesforce: { requestsPerMinute: 100, requestsPerHour: 10000, batchSize: 200, cooldownMs: 600 },
  hubspot: { requestsPerMinute: 100, requestsPerHour: 10000, batchSize: 100, cooldownMs: 1000 },
  freshsales: { requestsPerMinute: 50, requestsPerHour: 2000, batchSize: 50, cooldownMs: 1200 },
  pipedrive: { requestsPerMinute: 80, requestsPerHour: 4000, batchSize: 50, cooldownMs: 800 },
  odoo: { requestsPerMinute: 60, requestsPerHour: 3000, batchSize: 50, cooldownMs: 1000 },
  microsoft_dynamics: { requestsPerMinute: 60, requestsPerHour: 4000, batchSize: 100, cooldownMs: 1000 },
  keka: { requestsPerMinute: 30, requestsPerHour: 1000, batchSize: 25, cooldownMs: 2000 },
  greythr: { requestsPerMinute: 30, requestsPerHour: 1000, batchSize: 25, cooldownMs: 2000 },
  darwinbox: { requestsPerMinute: 40, requestsPerHour: 1500, batchSize: 30, cooldownMs: 1500 },
  salesforce_nonprofit: { requestsPerMinute: 100, requestsPerHour: 10000, batchSize: 200, cooldownMs: 600 },
  bloomerang: { requestsPerMinute: 30, requestsPerHour: 1000, batchSize: 20, cooldownMs: 2000 },
  neon_crm: { requestsPerMinute: 30, requestsPerHour: 1000, batchSize: 20, cooldownMs: 2000 },
  custom_webhook: { requestsPerMinute: 60, requestsPerHour: 3000, batchSize: 50, cooldownMs: 1000 },
};

// ============================================================
// BULLMQ QUEUES
// ============================================================

export const syncQueue = new Queue<SyncJobPayload, any, string>('crm_sync_queue', {
  connection: redisConnection as any,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 60000 },
    removeOnComplete: { count: 1000, age: 24 * 3600 },
    removeOnFail: { count: 5000 },
  },
});

export const deadLetterQueue = new Queue<SyncJobPayload, any, string>('crm_sync_dlq', {
  connection: redisConnection as any,
});

// ============================================================
// VALIDATION LOGIC
// ============================================================

function validateRecord(record: SyncJobData): Array<{ field: string; message: string }> {
  const errors: Array<{ field: string; message: string }> = [];
  
  if (!record.profileId) errors.push({ field: 'profileId', message: 'Profile ID is required' });
  if (!record.transformedData || Object.keys(record.transformedData).length === 0) {
    errors.push({ field: 'transformedData', message: 'No transformed data provided' });
  }
  
  const email = record.transformedData?.email as string | undefined;
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push({ field: 'email', message: 'Invalid email format' });
  }
  
  const phone = record.transformedData?.phone as string | undefined;
  if (phone) {
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10) errors.push({ field: 'phone', message: 'Phone must have at least 10 digits' });
  }
  
  return errors;
}

export async function runPreFlightValidation(crmProvider: CRMProvider, data: SyncJobData[]): Promise<PreFlightResult> {
  const errors: PreFlightResult['errors'] = [];
  const warnings: string[] = [];
  let accepted = 0;
  let rejected = 0;
  
  // NOTE: Tenant quota check would go here hitting Prisma
  
  for (const record of data) {
    const recordErrors = validateRecord(record);
    if (recordErrors.length === 0) {
      accepted++;
    } else {
      rejected++;
      errors.push(...recordErrors.map(err => ({ profileId: record.profileId, ...err })));
    }
  }
  
  const rateLimit = CRM_RATE_LIMITS[crmProvider] || CRM_RATE_LIMITS['custom_webhook'];
  const batches = Math.ceil(data.length / rateLimit.batchSize);
  const estimatedDuration = batches * rateLimit.cooldownMs * 1.5;
  
  return {
    valid: accepted > 0 && errors.length < data.length / 2, // At least 50% valid
    totalRecords: data.length,
    accepted,
    rejected,
    errors: errors.slice(0, 50),
    warnings,
    estimatedDuration,
  };
}

// ============================================================
// QUEUE OPERATIONS
// ============================================================

export async function createSyncJob(tenantId: string, crmProvider: CRMProvider, connectionId: string, data: SyncJobData[], dryRun = false) {
  const preFlightResult = await runPreFlightValidation(crmProvider, data);
  
  if (dryRun) {
    return { success: preFlightResult.valid, preFlightResult };
  }
  
  if (!preFlightResult.valid) {
    throw new Error(`Pre-flight validation failed: ${preFlightResult.rejected} records invalid`);
  }
  
  const validData = data.filter(record => validateRecord(record).length === 0);
  
  const job = await syncQueue.add(`sync:${tenantId}:${crmProvider}:${Date.now()}`, {
    tenantId,
    crmProvider,
    connectionId,
    data: validData,
  });
  
  return { success: true, jobId: job.id, preFlightResult };
}

export async function getSyncJobStatus(jobId: string) {
  const job = await syncQueue.getJob(jobId);
  if (!job) throw new Error('Sync job not found');
  
  const state = await job.getState();
  const progress = job.progress || 0;
  
  return {
    jobId: job.id,
    status: state,
    progress,
    failedReason: job.failedReason,
    createdAt: new Date(job.timestamp).toISOString(),
    finishedOn: job.finishedOn ? new Date(job.finishedOn).toISOString() : null,
  };
}

export async function cancelSyncJob(jobId: string) {
  const job = await syncQueue.getJob(jobId);
  if (!job) throw new Error('Sync job not found');
  
  const state = await job.getState();
  if (state !== 'prioritized' && state !== 'waiting' && state !== 'delayed') {
    throw new Error(`Cannot cancel job in ${state} state`);
  }
  
  await job.remove();
  return { success: true };
}

export const syncQueueService = {
  createSyncJob,
  getSyncJobStatus,
  cancelSyncJob,
  runPreFlightValidation,
  CRM_RATE_LIMITS,
};

export default syncQueueService;
