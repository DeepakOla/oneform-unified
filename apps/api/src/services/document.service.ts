/**
 * OneForm API — Document Service
 * Handles document upload, storage in R2, and OCR processing
 */
import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { prisma } from '../lib/prisma.js';
import type { DocumentType, DocumentStatus } from '@prisma/client';
import { addOcrJob } from './ocr.service.js';

const s3Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT ?? 'https://[account-id].r2.cloudflarestorage.com',
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? '',
  },
});

const R2_BUCKET = process.env.R2_BUCKET ?? 'oneform-documents';
const UPLOAD_URL_EXPIRY = 3600; // 1 hour

interface GenerateUploadUrlParams {
  tenantId: string;
  userId: string;
  profileId?: string;
  fileName: string;
  fileType: string;
  documentType: DocumentType;
}

interface GenerateUploadUrlResult {
  uploadUrl: string;
  documentId: string;
  key: string;
}

/**
 * Generate a presigned URL for uploading a document to R2
 */
export async function generateUploadUrl(params: GenerateUploadUrlParams): Promise<GenerateUploadUrlResult> {
  const { tenantId, userId, profileId, fileName, fileType, documentType } = params;

  // Generate unique key for R2 storage
  const timestamp = Date.now();
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const key = `${tenantId}/${userId}/${timestamp}-${sanitizedFileName}`;

  // Create document record in database
  const document = await prisma.document.create({
    data: {
      tenant_id: tenantId,
      user_id: userId,
      ...(profileId !== undefined && { profile_id: profileId }),
      file_name: fileName,
      r2_key: key,
      file_type: fileType,
      document_type: documentType,
      status: 'UPLOADED' as DocumentStatus,
    },
  });

  // Generate presigned upload URL
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    ContentType: fileType,
  });

  const uploadUrl = await getSignedUrl(s3Client, command, {
    expiresIn: UPLOAD_URL_EXPIRY,
  });

  return {
    uploadUrl,
    documentId: document.id,
    key,
  };
}

/**
 * List documents for a user
 */
export async function listDocuments(tenantId: string, userId: string, profileId?: string) {
  const where = {
    tenant_id: tenantId,
    user_id: userId,
    ...(profileId !== undefined && { profile_id: profileId }),
  };

  const documents = await prisma.document.findMany({
    where,
    orderBy: {
      created_at: 'desc',
    },
    select: {
      id: true,
      file_name: true,
      file_type: true,
      file_size: true,
      document_type: true,
      status: true,
      ocr_text: true,
      metadata: true,
      created_at: true,
      updated_at: true,
    },
  });

  return documents;
}

/**
 * Get document by ID
 */
export async function getDocument(documentId: string, tenantId: string, userId: string) {
  const document = await prisma.document.findFirst({
    where: {
      id: documentId,
      tenant_id: tenantId,
      user_id: userId,
    },
  });

  if (!document) {
    throw new Error('Document not found');
  }

  return document;
}

/**
 * Generate presigned URL for downloading a document from R2
 */
export async function generateDownloadUrl(documentId: string, tenantId: string, userId: string): Promise<string> {
  const document = await getDocument(documentId, tenantId, userId);

  const command = new GetObjectCommand({
    Bucket: R2_BUCKET,
    Key: document.r2_key,
  });

  const downloadUrl = await getSignedUrl(s3Client, command, {
    expiresIn: UPLOAD_URL_EXPIRY,
  });

  return downloadUrl;
}

/**
 * Trigger OCR processing for a document
 */
export async function triggerOcr(documentId: string, tenantId: string, userId: string) {
  const document = await getDocument(documentId, tenantId, userId);

  // Update status to OCR_PROCESSING
  await prisma.document.update({
    where: { id: documentId },
    data: { status: 'OCR_PROCESSING' as DocumentStatus },
  });

  // Add OCR job to queue
  await addOcrJob({
    documentId,
    r2Key: document.r2_key,
    tenantId,
    userId,
  });

  return { success: true, message: 'OCR job queued' };
}

/**
 * Delete document from R2 and database
 */
export async function deleteDocument(documentId: string, tenantId: string, userId: string) {
  const document = await getDocument(documentId, tenantId, userId);

  // Delete from R2
  try {
    const command = new DeleteObjectCommand({
      Bucket: R2_BUCKET,
      Key: document.r2_key,
    });
    await s3Client.send(command);
  } catch (error) {
    console.error('Failed to delete from R2:', error);
    // Continue with DB deletion even if R2 deletion fails
  }

  // Delete from database
  await prisma.document.delete({
    where: { id: documentId },
  });

  return { success: true, message: 'Document deleted' };
}

/**
 * Update document metadata after successful upload
 */
export async function updateDocumentMetadata(
  documentId: string,
  tenantId: string,
  fileSize: number,
  metadata?: Record<string, unknown>
) {
  const document = await prisma.document.findFirst({
    where: {
      id: documentId,
      tenant_id: tenantId,
    },
  });

  if (!document) {
    throw new Error('Document not found');
  }

  await prisma.document.update({
    where: { id: documentId },
    data: {
      file_size: fileSize,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(metadata !== undefined && { metadata: metadata as any }),
    },
  });

  return { success: true };
}
