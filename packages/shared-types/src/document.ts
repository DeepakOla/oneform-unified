/**
 * OneForm Unified Platform — Document Storage Types
 *
 * Documents are stored in Cloudflare R2 (zero egress fee).
 * Metadata is stored in PostgreSQL.
 *
 * @module document
 */

export type DocumentType =
  | "AADHAAR"
  | "PAN"
  | "VOTER_ID"
  | "PASSPORT"
  | "DRIVING_LICENSE"
  | "BIRTH_CERTIFICATE"
  | "CASTE_CERTIFICATE"
  | "INCOME_CERTIFICATE"
  | "DOMICILE_CERTIFICATE"
  | "DISABILITY_CERTIFICATE"
  | "EDUCATION_CERTIFICATE"
  | "MARK_SHEET"
  | "DEGREE_CERTIFICATE"
  | "EXPERIENCE_LETTER"
  | "SALARY_SLIP"
  | "BANK_STATEMENT"
  | "PROPERTY_DOCUMENT"
  | "RATION_CARD"
  | "UDID"
  | "GSTIN_CERTIFICATE"
  | "SHOP_ESTABLISHMENT"
  | "TRADE_LICENSE"
  | "UDYAM_CERTIFICATE"
  | "FSSAI_LICENSE"
  | "PHOTO"
  | "SIGNATURE"
  | "THUMB_IMPRESSION"
  | "OTHER";

export type DocumentStatus =
  | "UPLOADED"
  | "OCR_PROCESSING"
  | "OCR_COMPLETE"
  | "VERIFIED"
  | "REJECTED"
  | "EXPIRED";

export interface OcrExtractionResult {
  confidence: number;                  // 0-1 confidence score
  extractedFields: Record<string, string | undefined>;
  rawText?: string | undefined;
  processingTimeMs: number;
  engine: "surya" | "tesseract" | "qwen-vl" | "manual";
}

export interface Document {
  id: string;
  tenantId: string;
  userId: string;
  profileId?: string | undefined;

  type: DocumentType;
  displayName?: string | undefined;    // User-given name

  /** Cloudflare R2 object key (NOT the public URL — fetch through signed URL) */
  r2Key: string;
  /** MIME type: "image/jpeg", "application/pdf", etc. */
  mimeType: string;
  /** File size in bytes */
  sizeBytes: number;
  /** SHA-256 checksum for integrity verification */
  checksum: string;

  status: DocumentStatus;
  ocrResult?: OcrExtractionResult | undefined;

  /** ISO 8601 date when document expires (e.g. passport) */
  expiresAt?: string | undefined;
  /** Was this extracted from DigiLocker? */
  isDigiLocker: boolean;

  createdAt: string;
  updatedAt: string;
}

export interface DocumentUploadRequest {
  profileId?: string | undefined;
  type: DocumentType;
  displayName?: string | undefined;
}

export interface DocumentUploadResponse {
  document: Document;
  /** Presigned URL for direct upload to R2 */
  uploadUrl: string;
  /** How long the upload URL is valid (seconds) */
  uploadUrlExpiresIn: number;
}
