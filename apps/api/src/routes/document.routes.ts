/**
 * OneForm API — Document Routes
 * POST /api/documents/upload-url   → Get presigned R2 upload URL
 * GET  /api/documents              → List documents
 * GET  /api/documents/:id          → Get document metadata
 * POST /api/documents/:id/ocr      → Trigger OCR job (BullMQ)
 * DELETE /api/documents/:id        → Delete from R2 + DB
 */
import { Router, type Router as ExpressRouter, type Request, type Response } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import {
  generateUploadUrl,
  listDocuments,
  getDocument,
  triggerOCR,
  deleteDocument,
  DocumentError,
} from '../services/document.service.js';
import { logger } from '../utils/logger.js';
import type { DocumentType, DocumentStatus } from '@prisma/client';

export const documentRouter: ExpressRouter = Router();
documentRouter.use(authenticate);

// Helper to extract params
function getParam(req: Request, name: string): string {
  const val = req.params[name];
  return Array.isArray(val) ? (val[0] ?? '') : (val ?? '');
}

// POST /api/documents/upload-url — Generate presigned upload URL
documentRouter.post('/upload-url', async (req: Request, res: Response) => {
  try {
    const { tenantId, id: userId } = req.user!;
    const { profileId, documentType, fileName, mimeType, sizeBytes } = req.body as {
      profileId?: string;
      documentType: DocumentType;
      fileName: string;
      mimeType: string;
      sizeBytes: number;
    };

    if (!documentType || !fileName || !mimeType || !sizeBytes) {
      res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_FIELDS',
          message: 'documentType, fileName, mimeType, and sizeBytes are required',
        },
      });
      return;
    }

    const result = await generateUploadUrl({
      tenantId,
      userId,
      ...(profileId !== undefined && { profileId }),
      documentType,
      fileName,
      mimeType,
      sizeBytes,
    });

    res.json({ success: true, data: result });
  } catch (error) {
    if (error instanceof DocumentError) {
      res.status(error.statusCode).json({
        success: false,
        error: { code: error.code, message: error.message },
      });
    } else {
      logger.error({ error }, 'Failed to generate upload URL');
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to generate upload URL' },
      });
    }
  }
});

// GET /api/documents — List documents
documentRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { tenantId, id: userId } = req.user!;
    const { profileId, type, status } = req.query as {
      profileId?: string;
      type?: DocumentType;
      status?: DocumentStatus;
    };

    const documents = await listDocuments(tenantId, userId, {
      ...(profileId !== undefined && { profileId }),
      ...(type !== undefined && { type }),
      ...(status !== undefined && { status }),
    });

    res.json({ success: true, data: { documents } });
  } catch (error) {
    logger.error({ error }, 'Failed to list documents');
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to list documents' },
    });
  }
});

// GET /api/documents/:id — Get document metadata
documentRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const { tenantId, id: userId } = req.user!;
    const documentId = getParam(req, 'id');

    const document = await getDocument(documentId, tenantId, userId);

    res.json({ success: true, data: document });
  } catch (error) {
    if (error instanceof DocumentError) {
      res.status(error.statusCode).json({
        success: false,
        error: { code: error.code, message: error.message },
      });
    } else {
      logger.error({ error }, 'Failed to get document');
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to get document' },
      });
    }
  }
});

// POST /api/documents/:id/ocr — Trigger OCR job
documentRouter.post('/:id/ocr', async (req: Request, res: Response) => {
  try {
    const { tenantId, id: userId } = req.user!;
    const documentId = getParam(req, 'id');

    const result = await triggerOCR(documentId, tenantId, userId);

    res.json({ success: true, data: result });
  } catch (error) {
    if (error instanceof DocumentError) {
      res.status(error.statusCode).json({
        success: false,
        error: { code: error.code, message: error.message },
      });
    } else {
      logger.error({ error }, 'Failed to trigger OCR');
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to trigger OCR' },
      });
    }
  }
});

// DELETE /api/documents/:id — Delete document
documentRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { tenantId, id: userId } = req.user!;
    const documentId = getParam(req, 'id');

    await deleteDocument(documentId, tenantId, userId);

    res.json({ success: true, message: 'Document deleted successfully' });
  } catch (error) {
    if (error instanceof DocumentError) {
      res.status(error.statusCode).json({
        success: false,
        error: { code: error.code, message: error.message },
      });
    } else {
      logger.error({ error }, 'Failed to delete document');
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to delete document' },
      });
    }
  }
});
