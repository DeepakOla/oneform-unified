/**
 * OneForm API — Document Routes
 * POST /api/documents/upload-url   → Get presigned R2 upload URL
 * POST /api/documents              → Create document metadata after upload
 * GET  /api/documents              → List documents
 * GET  /api/documents/:id          → Get document metadata
 * GET  /api/documents/:id/download → Get presigned download URL
 * POST /api/documents/:id/ocr      → Trigger OCR job (BullMQ)
 * DELETE /api/documents/:id        → Delete from R2 + DB
 */
import { Router, type Router as ExpressRouter, type Request, type Response } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { logger } from '../utils/logger.js';
import * as documentService from '../services/document.service.js';
import * as ocrService from '../services/ocr.service.js';
import type { DocumentType } from '@prisma/client';

export const documentRouter: ExpressRouter = Router();
documentRouter.use(authenticate);

// Helper to extract single param value
function getParam(req: Request, name: string): string {
  const val = req.params[name];
  return Array.isArray(val) ? (val[0] ?? '') : (val ?? '');
}

// POST /api/documents/upload-url - Generate presigned R2 upload URL
documentRouter.post('/upload-url', async (req: Request, res: Response) => {
  try {
    const { fileName, mimeType, sizeBytes } = req.body as {
      fileName: string;
      mimeType: string;
      sizeBytes: number;
    };

    if (!fileName || !mimeType || !sizeBytes) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'fileName, mimeType, and sizeBytes are required' },
      });
      return;
    }

    const tenantId = req.tenantId!;
    const userId = req.userId!;

    const result = await documentService.generatePresignedUploadUrl(
      tenantId,
      userId,
      fileName,
      mimeType,
      sizeBytes,
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error({ error }, 'Error generating presigned upload URL');
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to generate upload URL' },
    });
  }
});

// POST /api/documents - Create document metadata after successful upload
documentRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { r2Key, type, displayName, profileId, mimeType, sizeBytes, checksum } = req.body as {
      r2Key: string;
      type: DocumentType;
      displayName?: string;
      profileId?: string;
      mimeType: string;
      sizeBytes: string; // BigInt comes as string from JSON
      checksum: string;
    };

    if (!r2Key || !type || !mimeType || !sizeBytes || !checksum) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'r2Key, type, mimeType, sizeBytes, and checksum are required' },
      });
      return;
    }

    const tenantId = req.tenantId!;
    const userId = req.userId!;

    const document = await documentService.createDocument({
      tenantId,
      userId,
      ...(profileId !== undefined && { profileId }),
      type,
      ...(displayName !== undefined && { displayName }),
      r2Key,
      mimeType,
      sizeBytes: BigInt(sizeBytes),
      checksum,
    });

    res.status(201).json({
      success: true,
      data: { document },
    });
  } catch (error) {
    logger.error({ error }, 'Error creating document metadata');
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to create document' },
    });
  }
});

// GET /api/documents - List documents with filtering
documentRouter.get('/', async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const userId = req.query['userId'] as string | undefined;
    const profileId = req.query['profileId'] as string | undefined;
    const type = req.query['type'] as DocumentType | undefined;
    const status = req.query['status'] as 'UPLOADED' | 'OCR_PROCESSING' | 'OCR_COMPLETE' | 'VERIFIED' | 'REJECTED' | 'EXPIRED' | undefined;
    const page = req.query['page'] ? parseInt(req.query['page'] as string, 10) : 1;
    const limit = req.query['limit'] ? parseInt(req.query['limit'] as string, 10) : 20;

    const result = await documentService.listDocuments({
      tenantId,
      ...(userId !== undefined && { userId }),
      ...(profileId !== undefined && { profileId }),
      ...(type !== undefined && { type }),
      ...(status !== undefined && { status }),
      page,
      limit,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error({ error }, 'Error listing documents');
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to list documents' },
    });
  }
});

// GET /api/documents/:id - Get document metadata
documentRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const documentId = getParam(req, 'id');
    const tenantId = req.tenantId!;

    const document = await documentService.getDocument(documentId, tenantId);

    if (!document) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Document not found' },
      });
      return;
    }

    res.json({
      success: true,
      data: { document },
    });
  } catch (error) {
    logger.error({ error }, 'Error getting document');
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get document' },
    });
  }
});

// GET /api/documents/:id/download - Get presigned download URL
documentRouter.get('/:id/download', async (req: Request, res: Response) => {
  try {
    const documentId = getParam(req, 'id');
    const tenantId = req.tenantId!;

    const downloadUrl = await documentService.getDownloadUrl(documentId, tenantId);

    res.json({
      success: true,
      data: { downloadUrl },
    });
  } catch (error) {
    logger.error({ error }, 'Error generating download URL');
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to generate download URL' },
    });
  }
});

// POST /api/documents/:id/ocr - Trigger OCR job
documentRouter.post('/:id/ocr', async (req: Request, res: Response) => {
  try {
    const documentId = getParam(req, 'id');
    const tenantId = req.tenantId!;

    const document = await documentService.getDocument(documentId, tenantId);

    if (!document) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Document not found' },
      });
      return;
    }

    // Generate download URL for OCR service
    const r2Url = await documentService.getDownloadUrl(documentId, tenantId);

    // Queue OCR job
    const jobId = await ocrService.queueOcrJob({
      documentId,
      tenantId,
      r2Url,
      documentType: document.type,
    });

    res.json({
      success: true,
      data: {
        jobId,
        message: 'OCR job queued successfully',
      },
    });
  } catch (error) {
    logger.error({ error }, 'Error queueing OCR job');
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to queue OCR job' },
    });
  }
});

// DELETE /api/documents/:id - Delete document
documentRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const documentId = getParam(req, 'id');
    const tenantId = req.tenantId!;

    await documentService.deleteDocument(documentId, tenantId);

    res.json({
      success: true,
      data: { message: 'Document deleted successfully' },
    });
  } catch (error) {
    logger.error({ error }, 'Error deleting document');
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to delete document' },
    });
  }
});
