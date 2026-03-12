/**
 * OneForm Unified Platform — Standard API Response Envelope
 *
 * All API responses follow this format for consistency.
 * Frontend services and Zod schemas parse these envelopes.
 *
 * @module api-envelope
 */

// ─────────────────────────────────────────────────────────────────────────────
// SUCCESS RESPONSE
// ─────────────────────────────────────────────────────────────────────────────

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: ApiMeta | undefined;
  requestId?: string | undefined;
}

export interface ApiMeta {
  /** Current page (1-indexed) */
  page?: number | undefined;
  /** Items per page */
  limit?: number | undefined;
  /** Total number of items */
  total?: number | undefined;
  /** Total pages */
  totalPages?: number | undefined;
  /** Whether there are more items */
  hasNext?: boolean | undefined;
  hasPrev?: boolean | undefined;
}

// ─────────────────────────────────────────────────────────────────────────────
// ERROR RESPONSE
// ─────────────────────────────────────────────────────────────────────────────

export interface ApiErrorDetail {
  field?: string | undefined;      // Which field has the error
  code: string;                    // Machine-readable error code
  message: string;                 // Human-readable message
}

export interface ApiError {
  success: false;
  error: {
    code: string;                  // "VALIDATION_ERROR", "UNAUTHORIZED", etc.
    message: string;
    details?: ApiErrorDetail[] | undefined;
    requestId?: string | undefined;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// ─────────────────────────────────────────────────────────────────────────────
// COMMON ERROR CODES
// ─────────────────────────────────────────────────────────────────────────────

export const API_ERROR_CODES = {
  // Auth
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  INVALID_TOKEN: "INVALID_TOKEN",
  TOKEN_EXPIRED: "TOKEN_EXPIRED",
  INVALID_CREDENTIALS: "INVALID_CREDENTIALS",
  EMAIL_NOT_VERIFIED: "EMAIL_NOT_VERIFIED",
  ACCOUNT_SUSPENDED: "ACCOUNT_SUSPENDED",

  // Resources
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  ALREADY_EXISTS: "ALREADY_EXISTS",

  // Validation
  VALIDATION_ERROR: "VALIDATION_ERROR",
  INVALID_FORMAT: "INVALID_FORMAT",
  REQUIRED_FIELD: "REQUIRED_FIELD",

  // Tenant
  TENANT_NOT_FOUND: "TENANT_NOT_FOUND",
  TENANT_SUSPENDED: "TENANT_SUSPENDED",
  PLAN_LIMIT_EXCEEDED: "PLAN_LIMIT_EXCEEDED",

  // Encryption (Section A)
  DECRYPTION_FAILED: "DECRYPTION_FAILED",
  ENCRYPTION_KEY_NOT_FOUND: "ENCRYPTION_KEY_NOT_FOUND",

  // Wallet
  INSUFFICIENT_BALANCE: "INSUFFICIENT_BALANCE",
  PAYMENT_FAILED: "PAYMENT_FAILED",

  // Rate Limiting
  RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED",
  TOO_MANY_REQUESTS: "TOO_MANY_REQUESTS",

  // Server
  INTERNAL_ERROR: "INTERNAL_ERROR",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
} as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[keyof typeof API_ERROR_CODES];

// ─────────────────────────────────────────────────────────────────────────────
// PAGINATION REQUEST
// ─────────────────────────────────────────────────────────────────────────────

export interface PaginationParams {
  page?: number | undefined;        // Default: 1
  limit?: number | undefined;       // Default: 20, Max: 100
  sortBy?: string | undefined;
  sortOrder?: "asc" | "desc" | undefined;
  search?: string | undefined;
}

// ─────────────────────────────────────────────────────────────────────────────
// AUDIT LOG TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type AuditAction =
  | "SECTION_A_READ"              // Sensitive — always logged
  | "SECTION_A_WRITE"
  | "PROFILE_CREATE"
  | "PROFILE_UPDATE"
  | "PROFILE_DELETE"
  | "DOCUMENT_UPLOAD"
  | "DOCUMENT_DELETE"
  | "WALLET_CREDIT"
  | "WALLET_DEBIT"
  | "USER_LOGIN"
  | "USER_LOGOUT"
  | "USER_REGISTER"
  | "OPERATOR_CONSENT_GRANT"
  | "OPERATOR_CONSENT_REVOKE"
  | "AUTOFILL_TRIGGERED"
  | "TEMPLATE_APPROVED"
  | "ADMIN_USER_SUSPEND";

export interface AuditLog {
  id: string;
  tenantId: string;
  userId?: string | undefined;
  action: AuditAction;
  resourceType: string;
  resourceId: string;
  ipAddress?: string | undefined;
  userAgent?: string | undefined;
  metadata?: Record<string, unknown> | undefined;
  createdAt: string;
}
