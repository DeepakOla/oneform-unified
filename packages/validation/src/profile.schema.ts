/**
 * @fileoverview Centralised Zod runtime validation schemas for the OneForm Unified Platform.
 *
 * These schemas are the single source of truth for input validation and are consumed by:
 * - The Express API middleware (server-side validation, preventing injection attacks)
 * - The React 18 / MUI forms (client-side instant feedback via react-hook-form + zodResolver)
 *
 * Every schema is inferred from Zod so the TypeScript types remain in perfect sync
 * with the runtime validation without maintaining duplicate definitions.
 *
 * **Security Note**: Validating all API inputs against these schemas before they reach
 * Prisma is a mandatory step in the Safe Change Policy. Never skip validation.
 */

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Re-usable primitive validators
// ---------------------------------------------------------------------------

/**
 * Standard Indian PAN (Permanent Account Number) regex validator.
 * Format: 5 uppercase alpha chars + 4 digits + 1 uppercase alpha char.
 * @example "ABCDE1234F"
 */
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

/**
 * GSTIN (GST Identification Number) regex validator.
 * 15 characters: 2-digit state code + 10-char PAN + 1 entity num + 'Z' + 1 check char.
 * @example "29ABCDE1234F1Z5"
 */
const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

/**
 * IFSC code regex validator — 11 characters: 4 alpha bank code + '0' + 6 alphanumeric.
 * @example "HDFC0001234"
 */
const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;

/**
 * ISO 8601 date string (YYYY-MM-DD) validator.
 */
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

// ---------------------------------------------------------------------------
// Section A — Identity
// ---------------------------------------------------------------------------

/**
 * Zod schema for {@link ProfileSectionA}.
 *
 * Enforces strict PAN and Aadhaar formats as mandated by Indian government standards.
 */
export const SectionASchema = z.object({
  /**
   * PAN must strictly match `^[A-Z]{5}[0-9]{4}[A-Z]{1}$`.
   * Validation rejects lowercase, partial matches, or non-standard characters.
   */
  pan_number: z
    .string()
    .trim()
    .regex(PAN_REGEX, {
      message: 'PAN must match the standard Indian format: 5 uppercase letters, 4 digits, 1 uppercase letter (e.g. ABCDE1234F)',
    }),

  /**
   * Aadhaar last-four must be exactly 4 numeric characters.
   * Only the last four digits are stored; the full Aadhaar is never persisted.
   */
  aadhaar_last_four: z
    .string()
    .trim()
    .length(4, { message: 'Aadhaar last-four must be exactly 4 digits' })
    .regex(/^[0-9]{4}$/, { message: 'Aadhaar last-four must contain only numeric characters' }),

  /** Full legal name — non-empty, trimmed, max 200 characters. */
  full_name: z
    .string()
    .trim()
    .min(1, { message: 'Full name is required' })
    .max(200, { message: 'Full name must not exceed 200 characters' }),

  /**
   * Date of birth in ISO 8601 format (YYYY-MM-DD).
   * Validated as a real calendar date; citizen must be at least 18 years old.
   */
  dob: z
    .string()
    .trim()
    .regex(ISO_DATE_REGEX, { message: 'Date of birth must be in YYYY-MM-DD format' })
    .refine(
      (val) => {
        const date = new Date(val);
        return !isNaN(date.getTime());
      },
      { message: 'Date of birth must be a valid calendar date' },
    )
    .refine(
      (val) => {
        const dob = new Date(val);
        const now = new Date();
        const age = now.getFullYear() - dob.getFullYear();
        const monthDiff = now.getMonth() - dob.getMonth();
        const dayDiff = now.getDate() - dob.getDate();
        const adjustedAge = monthDiff < 0 || (monthDiff === 0 && dayDiff < 0) ? age - 1 : age;
        return adjustedAge >= 18;
      },
      { message: 'Citizen must be at least 18 years of age' },
    ),
});

/** Inferred TypeScript type for Section A — kept in sync with the interface in shared-types. */
export type SectionA = z.infer<typeof SectionASchema>;

// ---------------------------------------------------------------------------
// Section B — Business
// ---------------------------------------------------------------------------

/** Valid Indian business entity types. */
const EntityTypeEnum = z.enum([
  'PROPRIETORSHIP',
  'PARTNERSHIP',
  'LLP',
  'PRIVATE_LIMITED',
  'PUBLIC_LIMITED',
  'OPC',
  'TRUST',
  'SOCIETY',
  'NGO',
]);

/**
 * Zod schema for {@link ProfileSectionB}.
 * GSTIN is optional — not all citizens or micro-enterprises are GST-registered.
 */
export const SectionBSchema = z.object({
  entity_type: EntityTypeEnum,

  gst_number: z
    .string()
    .trim()
    .regex(GSTIN_REGEX, {
      message:
        'GSTIN must be a valid 15-character GST Identification Number (e.g. 29ABCDE1234F1Z5)',
    })
    .optional(),
});

/** Inferred TypeScript type for Section B. */
export type SectionB = z.infer<typeof SectionBSchema>;

// ---------------------------------------------------------------------------
// Section C — Financial
// ---------------------------------------------------------------------------

const BankAccountTypeEnum = z.enum(['SAVINGS', 'CURRENT', 'OD', 'NRE', 'NRO']);

/**
 * Zod schema for {@link ProfileSectionC}.
 */
export const SectionCSchema = z.object({
  account_holder_name: z
    .string()
    .trim()
    .min(1, { message: 'Account holder name is required' })
    .max(200, { message: 'Account holder name must not exceed 200 characters' }),

  account_number: z
    .string()
    .trim()
    .min(9, { message: 'Account number must be at least 9 digits' })
    .max(18, { message: 'Account number must not exceed 18 digits' })
    .regex(/^[0-9]+$/, { message: 'Account number must contain only numeric digits' }),

  ifsc_code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(IFSC_REGEX, {
      message: 'IFSC must be an 11-character code in the format ABCD0XXXXXX',
    }),

  account_type: BankAccountTypeEnum,
});

/** Inferred TypeScript type for Section C. */
export type SectionC = z.infer<typeof SectionCSchema>;

// ---------------------------------------------------------------------------
// Section D — Miscellaneous
// ---------------------------------------------------------------------------

const DocumentAttachmentSchema = z.object({
  label: z.string().trim().min(1, { message: 'Attachment label is required' }),
  storage_key: z.string().trim().min(1, { message: 'Storage key is required' }),
  mime_type: z
    .string()
    .trim()
    .regex(/^[a-z]+\/[a-z0-9.+\-]+$/i, { message: 'Invalid MIME type format' }),
  uploaded_at: z.string().trim().datetime({ message: 'uploaded_at must be an ISO 8601 datetime' }),
});

/**
 * Zod schema for {@link ProfileSectionD}.
 */
export const SectionDSchema = z.object({
  attachments: z.array(DocumentAttachmentSchema).optional(),
  portal_credentials: z.record(z.string(), z.string()).optional(),
});

/** Inferred TypeScript type for Section D. */
export type SectionD = z.infer<typeof SectionDSchema>;

// ---------------------------------------------------------------------------
// Master ABCD Profile Schema
// ---------------------------------------------------------------------------

/**
 * The overarching MasterProfileSchema that validates a complete ABCD profile payload.
 *
 * This is the definitive schema used in:
 * - The Express profile controller (`apps/api/src/controllers/profile.controller.ts`)
 * - The React MUI profile form (client-side validation via zodResolver)
 * - The Hetzner output parser (to validate AI-generated payloads before DB insert)
 *
 * Usage in Express:
 * ```ts
 * const result = MasterProfileSchema.safeParse(req.body);
 * if (!result.success) {
 *   return res.status(400).json({ error: result.error.flatten() });
 * }
 * const validatedData = result.data;
 * ```
 */
export const MasterProfileSchema = z.object({
  section_a: SectionASchema,
  section_b: SectionBSchema,
  section_c: SectionCSchema.optional(),
  section_d: SectionDSchema.optional(),
});

/** Inferred TypeScript type for the complete validated ABCD profile. */
export type MasterProfile = z.infer<typeof MasterProfileSchema>;
