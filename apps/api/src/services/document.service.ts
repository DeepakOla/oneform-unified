/**
 * OneForm Unified Platform — Document Service
 *
 * Handles document management with Cloudflare R2 storage:
 *   - Generate presigned upload URLs
 *   - List user documents
 *   - Trigger OCR processing via BullMQ
 *   - Delete documents from R2 + DB
 *
 * @module document.service
 */
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { prisma } from '../lib/prisma.js';
import { logger } from '../utils/logger.js';
import type { DocumentType, DocumentStatus } from '@prisma/client';

// ─────────────────────────────────────────────────────────────────────────────
// R2 Client Configuration
// ─────────────────────────────────────────────────────────────────────────────

const r2Client = new S3Client({
  region: 'auto',
  endpoint: process.env['R2_ENDPOINT'] ?? 'https://your-account-id.r2.cloudflarestorage.com',
  credentials: {
    accessKeyId: process.env['R2_ACCESS_KEY_ID'] ?? '',
    secretAccessKey: process.env['R2_SECRET_ACCESS_KEY'] ?? '',
  },
});

const R2_BUCKET = process.env['R2_BUCKET_NAME'] ?? 'oneform-documents';
const UPLOAD_URL_EXPIRY = 3600; // 1 hour

// ─────────────────────────────────────────────────────────────────────────────
// Errors
// ─────────────────────────────────────────────────────────────────────────────

export class DocumentError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code: string,
  ) {
    super(message);
    this.name = 'DocumentError';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Service Functions
// ─────────────────────────────────────────────────────────────────────────────

export interface GenerateUploadUrlParams {
  tenantId: string;
  userId: string;
  profileId?: string;
  documentType: DocumentType;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}

export interface GenerateUploadUrlResult {
  uploadUrl: string;
  documentId: string;
  r2Key: string;
  expiresAt: string;
}

/**
 * Generate a presigned R2 upload URL
 */
export async function generateUploadUrl(
  params: GenerateUploadUrlParams,
): Promise<GenerateUploadUrlResult> {
  const { tenantId, userId, profileId, documentType, fileName, mimeType, sizeBytes } = params;

  // Validate file size (max 10MB for documents)
  const MAX_SIZE = 10 * 1024 * 1024; // 10MB
  if (sizeBytes > MAX_SIZE) {
    throw new DocumentError('File size exceeds 10MB limit', 400, 'FILE_TOO_LARGE');
  }

  // Validate mime type
  const ALLOWED_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
  ];
  if (!ALLOWED_TYPES.includes(mimeType)) {
    throw new DocumentError('Invalid file type. Allowed: JPEG, PNG, WEBP, PDF', 400, 'INVALID_FILE_TYPE');
  }

  // Generate R2 key: {tenantId}/{userId}/{uuid}/{filename}
  const docId = crypto.randomUUID();
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const r2Key = `${tenantId}/${userId}/${docId}/${sanitizedFileName}`;

  // Create document record in DB (status: UPLOADED)
  const document = await prisma.document.create({
    data: {
      id: docId,
      tenantId,
      userId,
      ...(profileId !== undefined && { profileId }),
      type: documentType,
      displayName: fileName,
      r2Key,
      mimeType,
      sizeBytes: BigInt(sizeBytes),
      checksum: '', // Will be computed after upload
      status: 'UPLOADED',
    },
  });

  // Generate presigned PUT URL
  const putCommand = new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: r2Key,
    ContentType: mimeType,
  });

  const uploadUrl = await getSignedUrl(r2Client, putCommand, {
    expiresIn: UPLOAD_URL_EXPIRY,
  });

  const expiresAt = new Date(Date.now() + UPLOAD_URL_EXPIRY * 1000).toISOString();

  logger.info({ documentId: document.id, r2Key }, 'Generated presigned upload URL');

  return {
    uploadUrl,
    documentId: document.id,
    r2Key,
    expiresAt,
  };
}

/**
 * List documents for a user
 */
export async function listDocuments(
  tenantId: string,
  userId: string,
  filters?: {
    profileId?: string;
    type?: DocumentType;
    status?: DocumentStatus;
  },
) {
  const where = {
    tenantId,
    userId,
    ...(filters?.profileId !== undefined && { profileId: filters.profileId }),
    ...(filters?.type !== undefined && { type: filters.type }),
    ...(filters?.status !== undefined && { status: filters.status }),
  };

  const documents = await prisma.document.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      type: true,
      displayName: true,
      mimeType: true,
      sizeBytes: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      profileId: true,
      isDigiLocker: true,
    },
  });

  return documents.map((doc) => ({
    ...doc,
    sizeBytes: Number(doc.sizeBytes), // Convert BigInt to number for JSON
  }));
}

/**
 * Get document by ID
 */
export async function getDocument(documentId: string, tenantId: string, userId: string) {
  const document = await prisma.document.findFirst({
    where: {
      id: documentId,
      tenantId,
      userId,
    },
  });

  if (!document) {
    throw new DocumentError('Document not found', 404, 'DOCUMENT_NOT_FOUND');
  }

  return {
    ...document,
    sizeBytes: Number(document.sizeBytes),
  };
}

/**
 * Trigger OCR job for a document
 */
export async function triggerOCR(documentId: string, tenantId: string, userId: string) {
  const document = await prisma.document.findFirst({
    where: {
      id: documentId,
      tenantId,
      userId,
    },
  });

  if (!document) {
    throw new DocumentError('Document not found', 404, 'DOCUMENT_NOT_FOUND');
  }

  if (document.status === 'OCR_PROCESSING' || document.status === 'OCR_COMPLETE') {
    throw new DocumentError('OCR already processed or in progress', 400, 'OCR_ALREADY_PROCESSED');
  }

  // Update status to OCR_PROCESSING
  await prisma.document.update({
    where: { id: documentId },
    data: { status: 'OCR_PROCESSING' },
  });

  // TODO: Add OCR job to BullMQ queue
  // This will be implemented when we connect to the OCR Ensemble (port 8004)
  logger.info({ documentId }, 'OCR job queued (implementation pending)');

  return { success: true, message: 'OCR job queued' };
}

/**
 * Delete document from R2 and DB
 */
export async function deleteDocument(documentId: string, tenantId: string, userId: string) {
  const document = await prisma.document.findFirst({
    where: {
      id: documentId,
      tenantId,
      userId,
    },
  });

  if (!document) {
    throw new DocumentError('Document not found', 404, 'DOCUMENT_NOT_FOUND');
  }

  // Delete from R2
  try {
    const deleteCommand = new DeleteObjectCommand({
      Bucket: R2_BUCKET,
      Key: document.r2Key,
    });
    await r2Client.send(deleteCommand);
    logger.info({ documentId, r2Key: document.r2Key }, 'Deleted document from R2');
  } catch (error) {
    logger.error({ error, documentId }, 'Failed to delete from R2');
    // Continue with DB deletion even if R2 delete fails
  }

  // Delete from DB
  await prisma.document.delete({
    where: { id: documentId },
  });

  return { success: true };
}
