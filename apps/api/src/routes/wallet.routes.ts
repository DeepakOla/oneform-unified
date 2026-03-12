/**
 * OneForm API — Wallet Routes
 * GET  /api/wallet              → Get wallet balance
 * POST /api/wallet/topup        → Initiate Razorpay payment
 * POST /api/wallet/topup/verify → Verify payment signature + credit wallet
 * GET  /api/wallet/transactions → Transaction history (paginated)
 *
 * CRITICAL SAFETY: All balance updates use PostgreSQL transactions.
 * See wallet.service.ts for the safe implementation pattern.
 */
import { Router, type Router as ExpressRouter } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';

export const walletRouter: ExpressRouter = Router();
walletRouter.use(authenticate);

walletRouter.get('/', (_req, res) => {
  res.status(501).json({ success: false, error: { code: 'NOT_IMPLEMENTED', message: 'Wallet coming soon' } });
});

walletRouter.post('/topup', (_req, res) => {
  res.status(501).json({ success: false, error: { code: 'NOT_IMPLEMENTED', message: 'Top-up coming soon' } });
});

walletRouter.post('/topup/verify', (_req, res) => {
  res.status(501).json({ success: false, error: { code: 'NOT_IMPLEMENTED', message: 'Payment verify coming soon' } });
});

walletRouter.get('/transactions', (_req, res) => {
  res.status(501).json({ success: false, error: { code: 'NOT_IMPLEMENTED', message: 'Transactions coming soon' } });
});
