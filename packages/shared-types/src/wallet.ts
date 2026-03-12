/**
 * OneForm Unified Platform — Wallet & Transaction Types
 *
 * CRITICAL SAFETY RULE: All balance updates MUST use PostgreSQL transactions.
 * Never read-modify-write a balance without a database transaction — see anti-patterns.
 *
 * @module wallet
 */

export type TransactionType =
  | "CREDIT"          // Money added
  | "DEBIT"           // Money spent
  | "REFUND"          // Refunded to wallet
  | "OPERATOR_EARN";  // Operator earning from form fills

export type TransactionStatus =
  | "PENDING"
  | "COMPLETED"
  | "FAILED"
  | "REVERSED";

export type PaymentGateway = "RAZORPAY" | "CASHFREE" | "PAYTM" | "MANUAL";

export interface Wallet {
  id: string;
  tenantId: string;
  userId: string;
  /** Balance in Indian Rupees (stored as integer paisa to avoid float errors!) */
  balancePaisa: number;
  /** Total ever credited (in paisa) */
  totalCreditedPaisa: number;
  /** Total ever debited (in paisa) */
  totalDebitedPaisa: number;
  isLocked: boolean;               // Locked during transaction
  createdAt: string;
  updatedAt: string;
}

export interface WalletTransaction {
  id: string;
  walletId: string;
  tenantId: string;
  userId: string;

  type: TransactionType;
  status: TransactionStatus;

  /** Amount in paisa (100 paisa = ₹1) */
  amountPaisa: number;
  /** Balance AFTER this transaction */
  balanceAfterPaisa: number;

  description: string;
  referenceId?: string | undefined;          // Form ID, autofill ID, Razorpay order ID

  gateway?: PaymentGateway | undefined;
  gatewayOrderId?: string | undefined;
  gatewayPaymentId?: string | undefined;

  /** Razorpay payment verification signature */
  gatewaySignature?: string | undefined;

  metadata?: Record<string, unknown> | undefined;
  createdAt: string;
}

export interface TopUpRequest {
  amountPaisa: number;
  gateway: PaymentGateway;
  successUrl: string;
  cancelUrl: string;
}

export interface TopUpResponse {
  orderId: string;
  gatewayOrderId: string;
  amountPaisa: number;
  currency: "INR";
  keyId: string;               // Razorpay key ID for frontend
}

/** For direct wallet deduction (autofill charges) */
export interface DeductRequest {
  amountPaisa: number;
  description: string;
  referenceId?: string | undefined;
}
