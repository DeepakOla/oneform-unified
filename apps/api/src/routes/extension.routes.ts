import { Router, type Router as ExpressRouter } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';

export const extensionRouter: ExpressRouter = Router();

// All extension routes require authentication
extensionRouter.use(authenticate);

// Stub /getPendingJobs — returns empty job list (real impl in Phase 1)
extensionRouter.post('/getPendingJobs', (_req, res) => {
  res.json({ success: true, data: { jobs: [] } });
});

// Stub /getAutofillPayload — returns 501 until real implementation
extensionRouter.post('/getAutofillPayload', (_req, res) => {
  res.status(501).json({
    success: false,
    error: { code: 'NOT_IMPLEMENTED', message: 'Autofill payload endpoint not yet implemented.' },
  });
});

// Stub /claimJob
extensionRouter.post('/claimJob', (_req, res) => {
  res.status(501).json({
    success: false,
    error: { code: 'NOT_IMPLEMENTED', message: 'Job claim endpoint not yet implemented.' },
  });
});

// Stub /reportJobResult
extensionRouter.post('/reportJobResult', (_req, res) => {
  res.status(501).json({
    success: false,
    error: { code: 'NOT_IMPLEMENTED', message: 'Job result endpoint not yet implemented.' },
  });
});
