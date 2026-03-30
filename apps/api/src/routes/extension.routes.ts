/**
 * OneForm API — Extension Routes
 *
 * Chrome extension endpoints for form autofill:
 * POST /api/getPendingJobs       → Get list of pending form fill jobs
 * POST /api/claimJob             → Claim a job for processing
 * POST /api/reportJobResult      → Report job completion (success/failure)
 * POST /api/getAutofillPayload   → Get decrypted profile + field mappings
 */
import { Router, type Router as ExpressRouter, type Request, type Response } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import {
  getPendingJobs,
  claimJob,
  reportJobResult,
  getAutofillPayload,
  ExtensionError,
} from '../services/extension.service.js';
import { logger } from '../utils/logger.js';

export const extensionRouter: ExpressRouter = Router();

// All extension routes require authentication
extensionRouter.use(authenticate);

// POST /api/getPendingJobs — Get pending form fill jobs
extensionRouter.post('/getPendingJobs', async (req: Request, res: Response) => {
  try {
    const { tenantId, id: userId } = req.user!;

    const result = await getPendingJobs(tenantId, userId);

    res.json({ success: true, data: result });
  } catch (error) {
    logger.error({ error }, 'Failed to get pending jobs');
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get pending jobs' },
    });
  }
});

// POST /api/claimJob — Claim a job
extensionRouter.post('/claimJob', async (req: Request, res: Response) => {
  try {
    const { tenantId, id: userId } = req.user!;
    const { jobId } = req.body as { jobId: string };

    if (!jobId) {
      res.status(400).json({
        success: false,
        error: { code: 'MISSING_FIELD', message: 'jobId is required' },
      });
      return;
    }

    const result = await claimJob(jobId, tenantId, userId);

    res.json({ success: true, data: result });
  } catch (error) {
    if (error instanceof ExtensionError) {
      res.status(error.statusCode).json({
        success: false,
        error: { code: error.code, message: error.message },
      });
    } else {
      logger.error({ error }, 'Failed to claim job');
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to claim job' },
      });
    }
  }
});

// POST /api/reportJobResult — Report job completion
extensionRouter.post('/reportJobResult', async (req: Request, res: Response) => {
  try {
    const { tenantId, id: userId } = req.user!;
    const { jobId, success: jobSuccess, submissionId, error: jobError, screenshot } = req.body as {
      jobId: string;
      success: boolean;
      submissionId?: string;
      error?: string;
      screenshot?: string;
    };

    if (!jobId || jobSuccess === undefined) {
      res.status(400).json({
        success: false,
        error: { code: 'MISSING_FIELDS', message: 'jobId and success are required' },
      });
      return;
    }

    const result = await reportJobResult(jobId, tenantId, userId, {
      success: jobSuccess,
      ...(submissionId !== undefined && { submissionId }),
      ...(jobError !== undefined && { error: jobError }),
      ...(screenshot !== undefined && { screenshot }),
    });

    res.json({ success: true, data: result });
  } catch (error) {
    if (error instanceof ExtensionError) {
      res.status(error.statusCode).json({
        success: false,
        error: { code: error.code, message: error.message },
      });
    } else {
      logger.error({ error }, 'Failed to report job result');
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to report job result' },
      });
    }
  }
});

// POST /api/getAutofillPayload — Get decrypted profile + field mappings
extensionRouter.post('/getAutofillPayload', async (req: Request, res: Response) => {
  try {
    const { tenantId, id: userId } = req.user!;
    const { jobId, profileId, templateId } = req.body as {
      jobId: string;
      profileId: string;
      templateId: string;
    };

    if (!jobId || !profileId || !templateId) {
      res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_FIELDS',
          message: 'jobId, profileId, and templateId are required',
        },
      });
      return;
    }

    const payload = await getAutofillPayload(jobId, tenantId, userId, profileId, templateId);

    res.json({ success: true, data: payload });
  } catch (error) {
    if (error instanceof ExtensionError) {
      res.status(error.statusCode).json({
        success: false,
        error: { code: error.code, message: error.message },
      });
    } else {
      logger.error({ error }, 'Failed to get autofill payload');
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to get autofill payload' },
      });
    }
  }
});
