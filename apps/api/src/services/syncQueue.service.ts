/**
 * @fileoverview Redis-backed BullMQ producer service — Hetzner AI Sync Queue.
 *
 * This service bridges the secure Project Alpha (Indian data-plane) and the
 * Project Beta execution engine (Hetzner Finland server). It exports the
 * primary function `enqueueAutomationTask` which pushes encrypted task
 * payloads onto a Redis queue for asynchronous processing by the worker.
 *
 * ## Architecture Overview
 *
 * ```
 * [Express API]  ──enqueueAutomationTask()──▶  [Redis / BullMQ Queue]
 *                                                        │
 *                              (worker process on API server)
 *                                                        │
 *                                            HTTPS POST to Hetzner webhook
 *                                                        │
 *                                          [Hetzner: Skyvern + Qwen 3.5]
 *                                                        │
 *                                            HTTPS POST status back to Alpha
 *                                                        │
 *                                           [Express webhook → DB update]
 * ```
 *
 * ## Rate-limiting Strategy
 *
 * BullMQ's built-in rate-limiter is configured to prevent overwhelming the
 * Hetzner node. The MVP uses conservative defaults:
 * - Maximum 30 jobs processed per minute (1 job per 2 seconds on average)
 * - Exponential backoff on failure (delays: 5 s, 25 s, 125 s)
 * - Maximum 3 retry attempts before marking a job as permanently failed
 *
 * ## Worker Dequeue Flow
 *
 * The companion worker process (`apps/api/src/workers/syncQueue.worker.ts`) will:
 * 1. Dequeue a `AutomationTaskJob` from this queue.
 * 2. Decrypt the sensitive payload fields using the Encryption Service.
 * 3. Construct a minimal, stateless task object (no Indian PII in transit).
 * 4. POST the task to the Hetzner webhook over mTLS.
 * 5. Update the `Profile.status` in PostgreSQL to `PROCESSING`.
 * 6. On Hetzner callback, update `Profile.status` to `COMPLETED` or `FAILED`.
 * 7. Purge the task data from Hetzner volatile memory (handled by Hetzner worker).
 *
 * ## Security Notes
 *
 * - Payloads transmitted to Hetzner must never contain raw Indian PII.
 *   Always encrypt Section A fields before enqueuing.
 * - The Redis connection must be configured with TLS in production
 *   (`REDIS_TLS=true` env variable).
 * - Job IDs are deterministically derived from `profileId + formType` to
 *   prevent duplicate submissions for the same profile.
 */

import { Queue, type JobsOptions, type RedisOptions } from 'bullmq';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * The shape of a single automation task job stored in the BullMQ queue.
 *
 * **Important**: The `payload` must be sanitised — any Section A PII (PAN,
 * Aadhaar) must be AES-256 encrypted before being passed to this function.
 */
export interface AutomationTaskJob {
  /** The CUID of the Profile record to be automated. */
  profileId: string;
  /**
   * The target government portal form type identifier.
   * @example "GST_REGISTRATION" | "PAN_CORRECTION" | "MSME_UDYAM"
   */
  formType: string;
  /**
   * The sanitised, partially-encrypted automation payload.
   * This is passed to the Hetzner worker and must not contain raw Indian PII.
   *
   * Using `Record<string, unknown>` instead of `any` enforces type safety
   * while still allowing the flexible JSONB structure of the ABCD payload.
   */
  payload: Record<string, unknown>;
  /** ISO 8601 timestamp when the task was enqueued. */
  enqueuedAt: string;
  /** Tenant CUID — used by the worker to update the correct Profile record. */
  tenantId: string;
}

// ---------------------------------------------------------------------------
// Redis connection options (BullMQ uses its own bundled ioredis)
// ---------------------------------------------------------------------------

/**
 * Returns BullMQ-compatible Redis connection options from environment variables.
 * BullMQ manages its own internal ioredis connections using these options.
 *
 * Environment variables:
 * - `REDIS_HOST`     (default: `127.0.0.1`)
 * - `REDIS_PORT`     (default: `6379`)
 * - `REDIS_PASSWORD` (optional, required in production)
 * - `REDIS_TLS`      (`"true"` enables TLS — mandatory in production)
 */
function getRedisOptions(): RedisOptions {
  const host = process.env['REDIS_HOST'] ?? '127.0.0.1';
  const port = parseInt(process.env['REDIS_PORT'] ?? '6379', 10);
  const password = process.env['REDIS_PASSWORD'];
  const tlsEnabled = process.env['REDIS_TLS'] === 'true';

  return {
    host,
    port,
    ...(password !== undefined ? { password } : {}),
    ...(tlsEnabled ? { tls: {} } : {}),
    maxRetriesPerRequest: null, // Required by BullMQ
    enableReadyCheck: false,   // Required by BullMQ
  };
}

// ---------------------------------------------------------------------------
// BullMQ Queue (singleton)
// ---------------------------------------------------------------------------

/** The canonical queue name used by both the producer and the worker. */
export const SYNC_QUEUE_NAME = 'oneform:automation:sync';

// Using Queue with explicit data type to keep the instance strongly typed.
// The second generic (ResultType) is unknown since the worker result is
// received asynchronously via a separate webhook callback.
type AutomationQueue = Queue<AutomationTaskJob, unknown, string>;

let syncQueue: AutomationQueue | null = null;

/**
 * Returns the singleton BullMQ Queue instance.
 * Creates the queue on first call with retry configuration.
 *
 * **Rate-limiting note**: In BullMQ v5+, per-queue rate limits are enforced
 * at the Worker level using `Worker({ limiter: { max, duration } })`, not on
 * the Queue itself. The companion worker (`syncQueue.worker.ts`) must set:
 * ```ts
 * new Worker(SYNC_QUEUE_NAME, processor, {
 *   connection: getRedisOptions(),
 *   limiter: { max: 30, duration: 60_000 }, // 30 jobs / minute
 * });
 * ```
 */
function getSyncQueue(): AutomationQueue {
  if (syncQueue !== null) {
    return syncQueue;
  }

  const connection = getRedisOptions();

  syncQueue = new Queue<AutomationTaskJob, unknown, string>(SYNC_QUEUE_NAME, {
    connection,
    defaultJobOptions: {
      /**
       * Exponential backoff retry configuration.
       * Attempt 1 →  5 s delay
       * Attempt 2 → 25 s delay
       * Attempt 3 → 125 s delay
       * After 3 failures the job is moved to the 'failed' set for manual review.
       */
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5_000,
      },
      /**
       * Remove successful jobs after 24 hours to keep Redis memory lean.
       * Failed jobs are kept for 7 days for debugging and audit purposes.
       */
      removeOnComplete: {
        age: 24 * 60 * 60,
        count: 1000,
      },
      removeOnFail: {
        age: 7 * 24 * 60 * 60,
        count: 500,
      },
    },
  }) as AutomationQueue;
  return syncQueue;
}

// ---------------------------------------------------------------------------
// Per-job options
// ---------------------------------------------------------------------------

/**
 * Default per-job options applied when adding tasks to the queue.
 * The actual throughput rate-limit is enforced at the Worker level.
 */
const DEFAULT_JOB_OPTIONS: JobsOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 5_000,
  },
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Enqueues a citizen automation task onto the BullMQ sync queue for async
 * processing by the worker, which transmits it to the Hetzner execution engine.
 *
 * **Caller responsibilities** (Safe Change Policy):
 * 1. Validate the full profile payload against `MasterProfileSchema` BEFORE calling this.
 * 2. AES-256 encrypt all Section A PII fields within `payload` BEFORE calling this.
 * 3. Verify the `profileId` exists and belongs to the caller's `tenantId` BEFORE calling this.
 *
 * @param profileId - CUID of the Profile record to be automated
 * @param formType  - Identifier of the target government form (e.g. `"GST_REGISTRATION"`)
 * @param payload   - Sanitised, partially-encrypted ABCD payload (no raw PII)
 * @param tenantId  - CUID of the owning tenant (from JWT tenantContext)
 * @returns The BullMQ job ID for tracking and status polling
 *
 * @example
 * ```ts
 * const jobId = await enqueueAutomationTask(
 *   profile.id,
 *   'GST_REGISTRATION',
 *   sanitisedPayload,
 *   tenantContext.tenantId,
 * );
 * console.log(`Task enqueued with job ID: ${jobId}`);
 * ```
 */
export async function enqueueAutomationTask(
  profileId: string,
  formType: string,
  payload: Record<string, unknown>,
  tenantId: string,
): Promise<string> {
  const queue = getSyncQueue();

  const jobData: AutomationTaskJob = {
    profileId,
    formType,
    payload,
    enqueuedAt: new Date().toISOString(),
    tenantId,
  };

  /**
   * Job ID is deterministic: prevents duplicate submissions if the API retries
   * the enqueue call (e.g. after a transient Redis timeout).
   * Format: `{profileId}:{formType}:{date-utc-day}`
   * The date component allows re-submission after a calendar day passes.
   */
  const today = new Date().toISOString().slice(0, 10);
  const jobId = `${profileId}:${formType}:${today}`;

  const job = await queue.add(
    `automation:${formType}`,
    jobData,
    {
      ...DEFAULT_JOB_OPTIONS,
      jobId,
    },
  );

  if (job.id === undefined) {
    throw new Error(`Failed to enqueue automation task for profileId=${profileId}`);
  }

  return job.id;
}

/**
 * Gracefully closes the BullMQ queue and its internal Redis connections.
 * Call this during application shutdown to prevent connection leaks.
 */
export async function closeSyncQueue(): Promise<void> {
  if (syncQueue !== null) {
    await syncQueue.close();
    syncQueue = null;
  }
}
