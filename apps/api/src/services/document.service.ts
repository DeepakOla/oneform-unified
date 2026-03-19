/**
 * OneForm API — Document Service
 * Handles R2 file uploads, document metadata, and OCR integration
 */
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { prisma } from '../lib/prisma.js';
import { logger } from '../utils/logger.js';
import type { Document, DocumentType, DocumentStatus } from '@prisma/client';
import crypto from 'crypto';

// ─────────────────────────────────────────────────────────────────────────────
// R2 Client Configuration
// ─────────────────────────────────────────────────────────────────────────────

const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env['R2_ACCOUNT_ID']}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env['R2_ACCESS_KEY_ID'] ?? '',
    secretAccessKey: process.env['R2_SECRET_ACCESS_KEY'] ?? '',
  },
});

const R2_BUCKET_NAME = process.env['R2_BUCKET_NAME'] ?? 'oneform-documents';
const R2_PUBLIC_URL = process.env['R2_PUBLIC_URL'] ?? 'https://documents.indianform.com';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface PresignedUploadUrlResult {
  uploadUrl: string;
  r2Key: string;
  expiresIn: number;
}

export interface DocumentListOptions {
  tenantId: string;
  userId?: string;
  profileId?: string;
  type?: DocumentType;
  status?: DocumentStatus;
  page?: number;
  limit?: number;
}

export interface DocumentListResult {
  documents: Document[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Document Service
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate a presigned R2 upload URL
 * @param tenantId - Tenant ID for path isolation
 * @param userId - User ID for path isolation
 * @param fileName - Original file name
 * @param mimeType - MIME type
 * @param sizeBytes - File size in bytes
 * @returns Presigned upload URL and R2 key
 */
export async function generatePresignedUploadUrl(
  tenantId: string,
  userId: string,
  fileName: string,
  mimeType: string,
  sizeBytes: number,
): Promise<PresignedUploadUrlResult> {
  // Generate unique R2 key: tenant/user/date/uuid-filename
  const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const uuid = crypto.randomUUID();
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  const r2Key = `${tenantId}/${userId}/${date}/${uuid}-${sanitizedFileName}`;

  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: r2Key,
    ContentType: mimeType,
    ContentLength: sizeBytes,
    Metadata: {
      tenantId,
      userId,
      originalFileName: fileName,
    },
  });

  const uploadUrl = await getSignedUrl(r2Client, command, { expiresIn: 3600 }); // 1 hour

  logger.info({ tenantId, userId, r2Key, sizeBytes }, 'Generated presigned upload URL');

  return {
    uploadUrl,
    r2Key,
    expiresIn: 3600,
  };
}

/**
 * Create document metadata in database AFTER successful R2 upload
 * @param data - Document metadata
 * @returns Created document
 */
export async function createDocument(data: {
  tenantId: string;
  userId: string;
  profileId?: string;
  type: DocumentType;
  displayName?: string;
  r2Key: string;
  mimeType: string;
  sizeBytes: bigint;
  checksum: string;
}): Promise<Document> {
  const document = await prisma.document.create({
    data: {
      tenantId: data.tenantId,
      userId: data.userId,
      ...(data.profileId !== undefined && { profileId: data.profileId }),
      type: data.type,
      ...(data.displayName !== undefined && { displayName: data.displayName }),
      r2Key: data.r2Key,
      mimeType: data.mimeType,
      sizeBytes: data.sizeBytes,
      checksum: data.checksum,
      status: 'UPLOADED',
    },
  });

  logger.info(
    { documentId: document.id, tenantId: data.tenantId, type: data.type },
    'Document metadata created',
  );

  return document;
}

/**
 * List documents with filtering and pagination
 */
export async function listDocuments(options: DocumentListOptions): Promise<DocumentListResult> {
  const page = options.page ?? 1;
  const limit = options.limit ?? 20;
  const skip = (page - 1) * limit;

  const where: {
    tenantId: string;
    userId?: string;
    profileId?: string;
    type?: DocumentType;
    status?: DocumentStatus;
  } = {
    tenantId: options.tenantId,
  };

  if (options.userId !== undefined) {
    where.userId = options.userId;
  }
  if (options.profileId !== undefined) {
    where.profileId = options.profileId;
  }
  if (options.type !== undefined) {
    where.type = options.type;
  }
  if (options.status !== undefined) {
    where.status = options.status;
  }

  const [documents, total] = await Promise.all([
    prisma.document.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.document.count({ where }),
  ]);

  return {
    documents,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Get a single document by ID
 */
export async function getDocument(documentId: string, tenantId: string): Promise<Document | null> {
  const document = await prisma.document.findFirst({
    where: {
      id: documentId,
      tenantId,
    },
  });

  return document;
}

/**
 * Generate presigned download URL for a document
 */
export async function getDownloadUrl(documentId: string, tenantId: string): Promise<string> {
  const document = await getDocument(documentId, tenantId);
  if (!document) {
    throw new Error('Document not found');
  }

  const command = new GetObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: document.r2Key,
  });

  const downloadUrl = await getSignedUrl(r2Client, command, { expiresIn: 3600 }); // 1 hour

  logger.info({ documentId, tenantId }, 'Generated presigned download URL');

  return downloadUrl;
}

/**
 * Delete a document from R2 and database
 */
export async function deleteDocument(documentId: string, tenantId: string): Promise<void> {
  const document = await getDocument(documentId, tenantId);
  if (!document) {
    throw new Error('Document not found');
  }

  // Delete from R2
  const deleteCommand = new DeleteObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: document.r2Key,
  });

  await r2Client.send(deleteCommand);

  // Delete from database
  await prisma.document.delete({
    where: { id: documentId },
  });

  logger.info({ documentId, tenantId, r2Key: document.r2Key }, 'Document deleted');
}

/**
 * Update document status (e.g., after OCR processing)
 */
export async function updateDocumentStatus(
  documentId: string,
  tenantId: string,
  status: DocumentStatus,
  ocrResult?: unknown,
): Promise<Document> {
  const document = await prisma.document.update({
    where: {
      id: documentId,
      tenantId,
    },
    data: {
      status,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(ocrResult !== undefined && { ocrResult: ocrResult as any }),
    },
  });

  logger.info({ documentId, tenantId, status }, 'Document status updated');

  return document;
}
