/**
 * OneForm API — Document Routes
 * POST /api/documents/upload-url   → Get presigned R2 upload URL
 * GET  /api/documents              → List documents
 * GET  /api/documents/:id          → Get document metadata
 * POST /api/documents/:id/ocr      → Trigger OCR job (BullMQ)
 * DELETE /api/documents/:id        → Delete from R2 + DB
 */
import { Router, type Router as ExpressRouter } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';

export const documentRouter: ExpressRouter = Router();
documentRouter.use(authenticate);

documentRouter.post('/upload-url', (_req, res) => {
  res.status(501).json({ success: false, error: { code: 'NOT_IMPLEMENTED', message: 'Document upload URL coming soon' } });
});

documentRouter.get('/', (_req, res) => {
  res.status(501).json({ success: false, error: { code: 'NOT_IMPLEMENTED', message: 'Document list coming soon' } });
});

documentRouter.post('/:id/ocr', (_req, res) => {
  res.status(501).json({ success: false, error: { code: 'NOT_IMPLEMENTED', message: 'OCR job queue coming soon' } });
});
