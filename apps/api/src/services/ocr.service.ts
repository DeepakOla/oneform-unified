/**
 * OneForm API — OCR Service
 * Integrates with BullMQ for asynchronous OCR processing
 * Calls Hetzner OCR Ensemble (port 8004) for text extraction
 */
import { Queue, Worker, type Job } from 'bullmq';
import { Redis } from 'ioredis';
import { prisma } from '../lib/prisma.js';
import type { DocumentStatus } from '@prisma/client';

const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';
const OCR_QUEUE_NAME = 'ocr-processing';
const OCR_ENSEMBLE_URL = process.env.OCR_ENSEMBLE_URL ?? 'http://localhost:8004';

const redisConnection = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
});

export const ocrQueue = new Queue(OCR_QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: 100, // Keep last 100 successful jobs
    removeOnFail: 500, // Keep last 500 failed jobs
  },
});

interface OcrJobData {
  documentId: string;
  r2Key: string;
  tenantId: string;
  userId: string;
}

interface OcrEnsembleResponse {
  text: string;
  confidence: number;
  language?: string;
  blocks?: Array<{
    text: string;
    confidence: number;
    bbox?: number[];
  }>;
}

/**
 * Add OCR job to queue
 */
export async function addOcrJob(data: OcrJobData) {
  const job = await ocrQueue.add('process-ocr', data, {
    jobId: `ocr-${data.documentId}`,
  });
  return job.id;
}

/**
 * Process OCR job - called by BullMQ worker
 */
async function processOcrJob(job: Job<OcrJobData>) {
  const { documentId, r2Key, tenantId } = job.data;

  try {
    // Generate download URL for the document
    const { S3Client, GetObjectCommand } = await import('@aws-sdk/client-s3');

    const s3Client = new S3Client({
      region: 'auto',
      endpoint: process.env.R2_ENDPOINT ?? 'https://[account-id].r2.cloudflarestorage.com',
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID ?? '',
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? '',
      },
    });

    const command = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET ?? 'oneform-documents',
      Key: r2Key,
    });

    const response = await s3Client.send(command);

    // Convert stream to buffer
    const chunks: Uint8Array[] = [];
    if (response.Body) {
      const stream = response.Body as unknown as AsyncIterable<Uint8Array>;
      for await (const chunk of stream) {
        chunks.push(chunk);
      }
    }
    const imageBuffer = Buffer.concat(chunks);

    // Call OCR Ensemble API
    const formData = new FormData();
    const blob = new Blob([imageBuffer], { type: 'image/jpeg' });
    formData.append('file', blob, 'document.jpg');

    const ocrResponse = await fetch(`${OCR_ENSEMBLE_URL}/ocr`, {
      method: 'POST',
      body: formData,
    });

    if (!ocrResponse.ok) {
      throw new Error(`OCR service returned ${ocrResponse.status}: ${ocrResponse.statusText}`);
    }

    const ocrResult: OcrEnsembleResponse = await ocrResponse.json() as OcrEnsembleResponse;

    // Update document in database with OCR results
    await prisma.document.update({
      where: { id: documentId },
      data: {
        status: 'OCR_COMPLETE' as DocumentStatus,
        ocr_text: ocrResult.text,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        metadata: {
          ...(await prisma.document.findUnique({ where: { id: documentId } }))?.metadata as any,
          ocr: {
            confidence: ocrResult.confidence,
            language: ocrResult.language,
            processedAt: new Date().toISOString(),
          },
        } as any,
      },
    });

    // Create audit log entry
    await prisma.auditLog.create({
      data: {
        tenant_id: tenantId,
        action: 'OCR_COMPLETE',
        resource_type: 'Document',
        resource_id: documentId,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        metadata: {
          confidence: ocrResult.confidence,
          textLength: ocrResult.text.length,
        } as any,
      },
    });

    return { success: true, text: ocrResult.text };
  } catch (error) {
    // Update document status to indicate failure
    await prisma.document.update({
      where: { id: documentId },
      data: {
        status: 'UPLOADED' as DocumentStatus, // Revert to UPLOADED so user can retry
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        metadata: {
          ...(await prisma.document.findUnique({ where: { id: documentId } }))?.metadata as any,
          ocrError: {
            message: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString(),
          },
        } as any,
      },
    });

    throw error; // Let BullMQ handle retry logic
  }
}

/**
 * Initialize OCR worker
 * This should be called once when the API server starts
 */
export function initializeOcrWorker() {
  const worker = new Worker(OCR_QUEUE_NAME, processOcrJob, {
    connection: redisConnection,
    concurrency: 5, // Process up to 5 OCR jobs concurrently
  });

  worker.on('completed', (job) => {
    console.log(`OCR job ${job.id} completed successfully`);
  });

  worker.on('failed', (job, err) => {
    console.error(`OCR job ${job?.id} failed:`, err);
  });

  return worker;
}
