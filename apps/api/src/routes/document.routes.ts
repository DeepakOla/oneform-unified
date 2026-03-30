/**
 * OneForm API — Document Routes
 * POST /api/documents/upload-url   → Get presigned R2 upload URL
 * GET  /api/documents              → List documents
 * GET  /api/documents/:id          → Get document metadata
 * GET  /api/documents/:id/download → Get presigned download URL
 * POST /api/documents/:id/ocr      → Trigger OCR job (BullMQ)
 * POST /api/documents/:id/confirm  → Confirm upload complete
 * DELETE /api/documents/:id        → Delete from R2 + DB
 */
import { Router, type Router as ExpressRouter, type Request, type Response } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import type { AuthenticatedRequest } from '@oneform/shared-types';
import type { DocumentType } from '@prisma/client';
import {
  generateUploadUrl,
  listDocuments,
  getDocument,
  generateDownloadUrl,
  triggerOcr,
  deleteDocument,
  updateDocumentMetadata,
} from '../services/document.service.js';

function getParam(req: Request, name: string): string {
  const val = req.params[name];
  return Array.isArray(val) ? (val[0] ?? '') : (val ?? '');
}

export const documentRouter: ExpressRouter = Router();
documentRouter.use(authenticate);

// POST /api/documents/upload-url - Generate presigned upload URL
documentRouter.post('/upload-url', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { fileName, fileType, documentType, profileId } = req.body;

    if (!fileName || !fileType || !documentType) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'fileName, fileType, and documentType are required',
        },
      });
      return;
    }

    const result = await generateUploadUrl({
      tenantId: req.tenantId,
      userId: req.userId,
      profileId,
      fileName: String(fileName),
      fileType: String(fileType),
      documentType: documentType as DocumentType,
    });

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error generating upload URL:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to generate upload URL',
      },
    });
  }
});

// POST /api/documents/:id/confirm - Confirm upload complete
documentRouter.post('/:id/confirm', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const documentId = getParam(req, 'id');
    const { fileSize, metadata } = req.body;

    if (!fileSize) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'fileSize is required',
        },
      });
      return;
    }

    await updateDocumentMetadata(documentId, req.tenantId, Number(fileSize), metadata);

    res.json({ success: true, message: 'Upload confirmed' });
  } catch (error) {
    console.error('Error confirming upload:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to confirm upload',
      },
    });
  }
});

// GET /api/documents - List documents
documentRouter.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { profileId } = req.query;

    const documents = await listDocuments(
      req.tenantId,
      req.userId,
      profileId ? String(profileId) : undefined
    );

    res.json({ success: true, data: { documents } });
  } catch (error) {
    console.error('Error listing documents:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to list documents',
      },
    });
  }
});

// GET /api/documents/:id - Get document metadata
documentRouter.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const documentId = getParam(req, 'id');
    const document = await getDocument(documentId, req.tenantId, req.userId);

    res.json({ success: true, data: document });
  } catch (error) {
    console.error('Error getting document:', error);
    res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: error instanceof Error ? error.message : 'Document not found',
      },
    });
  }
});

// GET /api/documents/:id/download - Get presigned download URL
documentRouter.get('/:id/download', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const documentId = getParam(req, 'id');
    const downloadUrl = await generateDownloadUrl(documentId, req.tenantId, req.userId);

    res.json({ success: true, data: { downloadUrl } });
  } catch (error) {
    console.error('Error generating download URL:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to generate download URL',
      },
    });
  }
});

// POST /api/documents/:id/ocr - Trigger OCR processing
documentRouter.post('/:id/ocr', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const documentId = getParam(req, 'id');
    const result = await triggerOcr(documentId, req.tenantId, req.userId);

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error triggering OCR:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to trigger OCR',
      },
    });
  }
});

// DELETE /api/documents/:id - Delete document
documentRouter.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const documentId = getParam(req, 'id');
    const result = await deleteDocument(documentId, req.tenantId, req.userId);

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to delete document',
      },
    });
  }
});
