/**
 * OneForm API — Wallet Routes
 * GET  /api/wallet              → Get wallet balance
 * POST /api/wallet/topup        → Initiate Razorpay payment order
 * POST /api/wallet/topup/verify → Verify Razorpay payment + credit wallet
 * GET  /api/wallet/transactions → Transaction history (paginated)
 *
 * CRITICAL SAFETY: All balance updates use PostgreSQL transactions.
 */
import { Router, type Request, type Response, type Router as ExpressRouter } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.middleware.js';
import {
  getWallet,
  getTransactions,
  initiateTopup,
  verifyTopup,
  WalletError,
} from '../services/wallet.service.js';
import { logger } from '../utils/logger.js';

export const walletRouter: ExpressRouter = Router();
walletRouter.use(authenticate);

// ─────────────────────────────────────────────────────────────────────────────
// Error Handler
// ─────────────────────────────────────────────────────────────────────────────

function handleWalletError(res: Response, error: unknown): void {
  if (error instanceof WalletError) {
    res.status(error.statusCode).json({
      success: false,
      error: { code: error.code, message: error.message },
    });
    return;
  }
  if (error instanceof z.ZodError) {
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Invalid request data', details: error.issues },
    });
    return;
  }
  logger.error({ error }, 'Unexpected wallet error');
  res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/wallet — Get wallet balance
// ─────────────────────────────────────────────────────────────────────────────

walletRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { id: userId, tenantId } = req.user!;
    const wallet = await getWallet(userId, tenantId);
    res.json({ success: true, data: wallet });
  } catch (error) {
    handleWalletError(res, error);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/wallet/topup — Initiate Razorpay payment
// ─────────────────────────────────────────────────────────────────────────────

const TopupSchema = z.object({
  amountPaisa: z.number().int().min(100, 'Minimum top-up is ₹1 (100 paisa)'),
});

walletRouter.post('/topup', async (req: Request, res: Response) => {
  try {
    const { id: userId, tenantId } = req.user!;
    const { amountPaisa } = TopupSchema.parse(req.body);
    const result = await initiateTopup({ userId, tenantId, amountPaisa });
    res.json({ success: true, data: result });
  } catch (error) {
    handleWalletError(res, error);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/wallet/topup/verify — Verify Razorpay signature + credit wallet
// ─────────────────────────────────────────────────────────────────────────────

const VerifyTopupSchema = z.object({
  razorpayOrderId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1),
});

walletRouter.post('/topup/verify', async (req: Request, res: Response) => {
  try {
    const { id: userId, tenantId } = req.user!;
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = VerifyTopupSchema.parse(req.body);
    const result = await verifyTopup({
      userId, tenantId, razorpayOrderId, razorpayPaymentId, razorpaySignature,
    });
    res.json({ success: true, data: result });
  } catch (error) {
    handleWalletError(res, error);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/wallet/transactions — Paginated transaction history
// ─────────────────────────────────────────────────────────────────────────────

const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

walletRouter.get('/transactions', async (req: Request, res: Response) => {
  try {
    const { id: userId, tenantId } = req.user!;
    const { page, limit } = PaginationSchema.parse(req.query);
    const result = await getTransactions({ userId, tenantId, page, limit });
    res.json({ success: true, data: result });
  } catch (error) {
    handleWalletError(res, error);
  }
});
