/**
 * @fileoverview Core ABCD Profile data contracts for the OneForm Unified Platform.
 *
 * These interfaces define the strictly-typed structure of a citizen's profile,
 * organised into four sections (A–D). They form the single source of truth
 * shared across the API, frontend, validation, and AI execution layers.
 *
 * **Data Residency Notice**: All fields in Section A containing PII (PAN, Aadhaar)
 * must be encrypted at rest using AES-256 before being committed to storage and
 * must never leave the Indian data-plane (Project Alpha) in unencrypted form.
 */

// ---------------------------------------------------------------------------
// Section A — Identity
// ---------------------------------------------------------------------------

/**
 * Section A: Citizen Identity Data.
 *
 * **PAN format**: Strictly adheres to the Government of India standard —
 * five uppercase alpha characters, four digits, one uppercase alpha character
 * (e.g. `ABCDE1234F`). Regex: `^[A-Z]{5}[0-9]{4}[A-Z]{1}$`
 *
 * **Aadhaar last-four format**: Exactly four numeric characters representing
 * the last four digits of the 12-digit Aadhaar number issued by UIDAI
 * (e.g. `5678`). The full Aadhaar number must never be stored; only the last
 * four digits are retained for partial-match deduplication.
 */
export interface ProfileSectionA {
  /**
   * Permanent Account Number issued by the Income Tax Department.
   * Must match the standard Indian format: `^[A-Z]{5}[0-9]{4}[A-Z]{1}$`
   * @example "ABCDE1234F"
   */
  pan_number: string;

  /**
   * Last four digits of the citizen's Aadhaar number (UIDAI).
   * Must be exactly 4 numeric characters.
   * @example "5678"
   */
  aadhaar_last_four: string;

  /**
   * Full legal name of the citizen as it appears on government documents.
   * Must not be empty; leading/trailing whitespace is stripped at validation.
   * @example "Ramesh Kumar Sharma"
   */
  full_name: string;

  /**
   * Date of birth in ISO 8601 format (YYYY-MM-DD).
   * Must represent a valid calendar date and the person must be at least 18.
   * @example "1990-15-08"
   */
  dob: string;
}

// ---------------------------------------------------------------------------
// Section B — Business
// ---------------------------------------------------------------------------

/**
 * Legal entity type for a registered business.
 * Covers the most common forms of Indian business registration.
 */
export type EntityType =
  | 'PROPRIETORSHIP'
  | 'PARTNERSHIP'
  | 'LLP'
  | 'PRIVATE_LIMITED'
  | 'PUBLIC_LIMITED'
  | 'OPC'
  | 'TRUST'
  | 'SOCIETY'
  | 'NGO';

/**
 * Section B: Business / Entity Data.
 *
 * **GST Number format**: Follows the GSTIN format mandated by the GST Council —
 * 2-digit state code, 10-character PAN, 1-digit entity number, 1 default character
 * `Z`, 1 check character (alphanumeric).
 * Regex: `^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$`
 */
export interface ProfileSectionB {
  /**
   * Legal form under which the business is registered in India.
   */
  entity_type: EntityType;

  /**
   * GST Identification Number (GSTIN) as allocated by the GSTN portal.
   * Must match the 15-character GSTIN format.
   * Optional: not all citizens or small businesses hold a GSTIN.
   * @example "29ABCDE1234F1Z5"
   */
  gst_number?: string;
}

// ---------------------------------------------------------------------------
// Section C — Financial
// ---------------------------------------------------------------------------

/**
 * Indian bank account type classification.
 */
export type BankAccountType = 'SAVINGS' | 'CURRENT' | 'OD' | 'NRE' | 'NRO';

/**
 * Section C: Financial & Banking Data.
 * Bank details required for government disbursements and DBT (Direct Benefit Transfer).
 */
export interface ProfileSectionC {
  /**
   * Bank account holder's name exactly as registered with the bank.
   */
  account_holder_name: string;

  /**
   * Bank account number. Length varies by bank (typically 9–18 digits).
   */
  account_number: string;

  /**
   * 11-character IFSC (Indian Financial System Code) identifying the bank branch.
   * @example "HDFC0001234"
   */
  ifsc_code: string;

  /**
   * Type of bank account.
   */
  account_type: BankAccountType;
}

// ---------------------------------------------------------------------------
// Section D — Miscellaneous
// ---------------------------------------------------------------------------

/**
 * A reference to a document or attachment uploaded by the citizen.
 */
export interface DocumentAttachment {
  /** Human-readable label for this attachment (e.g. "Aadhaar Card Front"). */
  label: string;
  /** The storage key (path) within the object store where the file resides. */
  storage_key: string;
  /** MIME type of the uploaded file (e.g. `application/pdf`, `image/jpeg`). */
  mime_type: string;
  /** Upload timestamp in ISO 8601 format. */
  uploaded_at: string;
}

/**
 * Section D: Miscellaneous & Portal-Specific Data.
 * Flexible section for portal credentials, attachments, and other auxiliary fields.
 */
export interface ProfileSectionD {
  /**
   * Array of file attachments associated with this profile.
   * Files are never embedded in the database — only their storage keys are persisted.
   */
  attachments?: DocumentAttachment[];

  /**
   * Portal-specific credentials or identifiers (e.g. EPFO UAN, GST portal username).
   * Values are encrypted via AES-256 before storage.
   */
  portal_credentials?: Record<string, string>;
}

// ---------------------------------------------------------------------------
// Master ABCD Profile
// ---------------------------------------------------------------------------

/**
 * The complete ABCD Profile payload for a citizen.
 * This is the canonical data structure stored in the `profileData` JSONB column
 * of the `Profile` table and transmitted to the Hetzner execution engine.
 *
 * All four sections must be validated by the corresponding Zod schemas in
 * `@oneform/validation` before any database write or queue operation.
 */
export interface AbcdProfile {
  /** Section A: Identity data (PAN, Aadhaar, name, DOB). Encrypted at rest. */
  section_a: ProfileSectionA;
  /** Section B: Business / entity data. */
  section_b: ProfileSectionB;
  /** Section C: Financial / banking data. Encrypted at rest. */
  section_c?: ProfileSectionC;
  /** Section D: Attachments and portal-specific credentials. */
  section_d?: ProfileSectionD;
}

// ---------------------------------------------------------------------------
// API contract helpers
// ---------------------------------------------------------------------------

/**
 * Standard API success envelope returned by the OneForm Express API.
 */
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  /** ISO 8601 timestamp of the response. */
  timestamp: string;
}

/**
 * Standard API error envelope returned on validation or server failures.
 */
export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    /** Field-level validation errors from Zod, keyed by field path. */
    fieldErrors?: Record<string, string[]>;
  };
  /** ISO 8601 timestamp of the response. */
  timestamp: string;
}

/**
 * Union type representing any API response from the OneForm backend.
 */
export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;
