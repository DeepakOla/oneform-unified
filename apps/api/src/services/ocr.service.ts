/**
 * OneForm API — OCR Worker Service
 * BullMQ worker for processing OCR jobs via OCR Ensemble (port 8004)
 */
import { Queue, Worker, type Job } from 'bullmq';
import { Redis } from 'ioredis';
import { logger } from '../utils/logger.js';
import { updateDocumentStatus, getDocument } from './document.service.js';
import axios from 'axios';

// ─────────────────────────────────────────────────────────────────────────────
// Redis Connection
// ─────────────────────────────────────────────────────────────────────────────

const redisUrl = process.env['REDIS_URL'] ?? 'redis://localhost:6379';
const redisConnection = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
});

// ─────────────────────────────────────────────────────────────────────────────
// OCR Queue
// ─────────────────────────────────────────────────────────────────────────────

export const ocrQueue = new Queue('ocr-processing', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      age: 86400, // Keep completed jobs for 24 hours
      count: 1000,
    },
    removeOnFail: {
      age: 604800, // Keep failed jobs for 7 days
      count: 5000,
    },
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Job Data Types
// ─────────────────────────────────────────────────────────────────────────────

export interface OcrJobData {
  documentId: string;
  tenantId: string;
  r2Url: string; // Presigned download URL
  documentType: string;
}

export interface OcrJobResult {
  success: boolean;
  extractedData?: unknown;
  error?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Queue a new OCR job
// ─────────────────────────────────────────────────────────────────────────────

export async function queueOcrJob(data: OcrJobData): Promise<string> {
  const job = await ocrQueue.add('extract-document', data, {
    jobId: `ocr-${data.documentId}`,
  });

  logger.info(
    { jobId: job.id, documentId: data.documentId, tenantId: data.tenantId },
    'OCR job queued',
  );

  return job.id ?? '';
}

// ─────────────────────────────────────────────────────────────────────────────
// OCR Worker - Processes jobs from the queue
// ─────────────────────────────────────────────────────────────────────────────

const OCR_ENSEMBLE_URL = process.env['OCR_ENSEMBLE_URL'] ?? 'http://localhost:8004';

async function processOcrJob(job: Job<OcrJobData>): Promise<OcrJobResult> {
  const { documentId, tenantId, r2Url, documentType } = job.data;

  logger.info({ jobId: job.id, documentId, tenantId }, 'Processing OCR job');

  try {
    // Update document status to OCR_PROCESSING
    await updateDocumentStatus(documentId, tenantId, 'OCR_PROCESSING');

    // Call OCR Ensemble service
    const response = await axios.post(
      `${OCR_ENSEMBLE_URL}/extract`,
      {
        imageUrl: r2Url,
        documentType,
      },
      {
        timeout: 60000, // 60 seconds timeout
      },
    );

    const extractedData = response.data;

    // Update document status to OCR_COMPLETE with results
    await updateDocumentStatus(documentId, tenantId, 'OCR_COMPLETE', extractedData);

    logger.info({ jobId: job.id, documentId, tenantId }, 'OCR job completed successfully');

    return {
      success: true,
      extractedData,
    };
  } catch (error) {
    logger.error({ jobId: job.id, documentId, tenantId, error }, 'OCR job failed');

    // Update document status back to UPLOADED (can retry later)
    await updateDocumentStatus(documentId, tenantId, 'UPLOADED');

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown OCR error',
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Start OCR Worker
// ─────────────────────────────────────────────────────────────────────────────

let ocrWorker: Worker<OcrJobData, OcrJobResult> | null = null;

export function startOcrWorker(): void {
  if (ocrWorker) {
    logger.warn('OCR worker already running');
    return;
  }

  ocrWorker = new Worker<OcrJobData, OcrJobResult>('ocr-processing', processOcrJob, {
    connection: redisConnection,
    concurrency: 5, // Process up to 5 OCR jobs concurrently
  });

  ocrWorker.on('completed', (job) => {
    logger.info({ jobId: job.id }, 'OCR job completed');
  });

  ocrWorker.on('failed', (job, error) => {
    logger.error({ jobId: job?.id, error }, 'OCR job failed');
  });

  logger.info('✅ OCR worker started (concurrency: 5)');
}

export function stopOcrWorker(): Promise<void> {
  if (!ocrWorker) {
    return Promise.resolve();
  }

  logger.info('Stopping OCR worker...');
  return ocrWorker.close();
}

// ─────────────────────────────────────────────────────────────────────────────
// Get OCR job status
// ─────────────────────────────────────────────────────────────────────────────

export async function getOcrJobStatus(jobId: string): Promise<{
  state: string;
  progress: number;
  result?: OcrJobResult;
}> {
  const job = await ocrQueue.getJob(jobId);

  if (!job) {
    throw new Error('Job not found');
  }

  const state = await job.getState();
  const progress = job.progress as number;

  return {
    state,
    progress,
    ...(job.returnvalue !== undefined && { result: job.returnvalue }),
  };
}
