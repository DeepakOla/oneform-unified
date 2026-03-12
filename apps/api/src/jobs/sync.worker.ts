import { Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';
import { SyncJobPayload, CRM_RATE_LIMITS, SyncJobData } from '../services/syncQueue.service.js';
// ============================================================

const redisConnection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

// ============================================================
// SLEEP UTILITY
// ============================================================

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// ============================================================
// WORKER PROCESSING LOGIC
// ============================================================

export const syncWorker = new Worker<SyncJobPayload>(
  'crm_sync_queue',
  async (job: Job<SyncJobPayload>) => {
    const { tenantId, crmProvider, data } = job.data;
    
    // Log start
    console.log(`Starting sync job ${job.id} for tenant ${tenantId} to ${crmProvider}`);
    
    const rateLimit = CRM_RATE_LIMITS[crmProvider] || CRM_RATE_LIMITS['custom_webhook'];
    
    let succeeded = 0;
    let failed = 0;
    
    // Create batches
    const batches: SyncJobData[][] = [];
    for (let i = 0; i < data.length; i += rateLimit.batchSize) {
      batches.push(data.slice(i, i + rateLimit.batchSize));
    }
    
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      if (!batch) continue;
      
      for (const record of batch) {
        try {
          // TODO: Actually call CRM adapter
          // const remoteId = await crmAdapter.syncRecord(connectionId, crmProvider, record);
          await sleep(100 + Math.random() * 200); // Simulate API latency
          
          if (Math.random() < 0.05) throw new Error('Simulated CRM API Error'); // Simulate 5% failure
          
          succeeded++;
        } catch (error) {
          console.error(`Record ${record.profileId} failed:`, error);
          failed++;
        }
        
        // Update job progress
        await job.updateProgress(Math.round(((succeeded + failed) / data.length) * 100));
      }
      
      // Cooldown between batches to respect CRM rate limits
      if (batchIndex < batches.length - 1) {
        await sleep(rateLimit.cooldownMs);
      }
    }
    
    // NOTE: In the future, log final report to Prisma db for Auditing here
    console.log(`Job ${job.id} completed. Succeeded: ${succeeded}, Failed: ${failed}`);
    
    if (failed === data.length && data.length > 0) {
      throw new Error(`All ${failed} records failed to sync.`);
    }
    
    return { succeeded, failed, total: data.length };
  },
  {
    connection: redisConnection as any,
    concurrency: 5, // Process 5 jobs concurrently across the worker
  }
);

// Listen for job completion/failure globally
syncWorker.on('completed', (job: Job) => {
  console.log(`Job ${job.id} has completed successfully`);
});

syncWorker.on('failed', (job: Job | undefined, err: Error) => {
  console.error(`Job ${job?.id} has failed with err: ${err.message}`);
});

export default syncWorker;
