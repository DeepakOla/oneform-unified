/**
 * OneForm API — Extension Routes
 * POST /api/extension/getPendingJobs      → Get pending autofill jobs
 * POST /api/extension/claimJob            → Claim a job (atomic)
 * POST /api/extension/getAutofillPayload  → Get decrypted profile data for a job
 * POST /api/extension/reportJobResult     → Report job completion/failure
 */
import { Router, type Router as ExpressRouter, type Response } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import type { AuthenticatedRequest } from '@oneform/shared-types';
import {
  getPendingJobs,
  claimJob,
  getAutofillPayload,
  reportJobResult,
} from '../services/extension.service.js';

export const extensionRouter: ExpressRouter = Router();

// All extension routes require authentication
extensionRouter.use(authenticate);

// POST /api/extension/getPendingJobs - Get list of pending jobs
extensionRouter.post('/getPendingJobs', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const jobs = await getPendingJobs(req.tenantId, req.userId);

    res.json({ success: true, data: { jobs } });
  } catch (error) {
    console.error('Error getting pending jobs:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get pending jobs',
      },
    });
  }
});

// POST /api/extension/claimJob - Atomically claim a job
extensionRouter.post('/claimJob', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { jobId } = req.body;

    if (!jobId) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'jobId is required',
        },
      });
      return;
    }

    const job = await claimJob(String(jobId), req.tenantId, req.userId);

    res.json({ success: true, data: job });
  } catch (error) {
    console.error('Error claiming job:', error);
    res.status(409).json({
      success: false,
      error: {
        code: 'CONFLICT',
        message: error instanceof Error ? error.message : 'Failed to claim job',
      },
    });
  }
});

// POST /api/extension/getAutofillPayload - Get decrypted profile data
extensionRouter.post('/getAutofillPayload', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { jobId } = req.body;

    if (!jobId) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'jobId is required',
        },
      });
      return;
    }

    const payload = await getAutofillPayload(String(jobId), req.tenantId, req.userId);

    res.json({ success: true, data: payload });
  } catch (error) {
    console.error('Error getting autofill payload:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get autofill payload',
      },
    });
  }
});

// POST /api/extension/reportJobResult - Report job completion
extensionRouter.post('/reportJobResult', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { jobId, success, error, submissionUrl, referenceNumber, screenshot } = req.body;

    if (!jobId || success === undefined) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'jobId and success are required',
        },
      });
      return;
    }

    const result = await reportJobResult(String(jobId), req.tenantId, req.userId, {
      success: Boolean(success),
      error: error ? String(error) : undefined,
      submissionUrl: submissionUrl ? String(submissionUrl) : undefined,
      referenceNumber: referenceNumber ? String(referenceNumber) : undefined,
      screenshot: screenshot ? String(screenshot) : undefined,
    });

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error reporting job result:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to report job result',
      },
    });
  }
});
