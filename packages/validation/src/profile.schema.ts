/**
 * OneForm Unified Platform — Indian Data Validation Schemas
 *
 * Production-tested validators from OneForm v2.6.5.
 * Indian-specific: Aadhaar, PAN, GSTIN, IFSC, mobile, pincode, etc.
 *
 * Usage:
 *   import { AadhaarSchema, PanSchema, IndianMobileSchema } from '@oneform/validation';
 *   const result = AadhaarSchema.safeParse('123456789012');
 *
 * @module profile.schema
 */

import { z } from 'zod';

// ─────────────────────────────────────────────────────────────────────────────
// INDIAN IDENTIFIER VALIDATORS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Aadhaar: 12 digits, first digit cannot be 0 or 1 (as per UIDAI spec)
 */
export const AadhaarSchema = z
  .string()
  .trim()
  .regex(/^[2-9]{1}[0-9]{11}$/, {
    message: 'Invalid Aadhaar number. Must be 12 digits starting with 2-9.',
  });

/**
 * PAN: Format AAAAA9999A (5 letters, 4 numbers, 1 letter) — uppercase
 */
export const PanSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, {
    message: 'Invalid PAN. Format: AAAAA9999A (e.g. ABCDE1234F)',
  });

/**
 * Indian mobile: 10 digits starting with 6-9
 * Accepts with or without country code (+91)
 */
export const IndianMobileSchema = z
  .string()
  .trim()
  .transform((val) => val.replace(/^(\+91|91|0)/, ''))
  .pipe(
    z.string().regex(/^[6-9][0-9]{9}$/, {
      message: 'Invalid Indian mobile number. Must be 10 digits starting with 6-9.',
    }),
  );

/**
 * Indian pincode: 6 digits, first 1-9
 */
export const PincodeSchema = z
  .string()
  .trim()
  .regex(/^[1-9][0-9]{5}$/, {
    message: 'Invalid Indian pincode. Must be 6 digits.',
  });

/**
 * GSTIN: 15-character format
 * Format: 2 state code + 10 PAN + 1 entity + 1 default Z + 1 check digit
 */
export const GstinSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[A-Z0-9]{1}Z[A-Z0-9]{1}$/, {
    message: 'Invalid GSTIN. Format: 22AAAAA0000A1Z5',
  });

/**
 * IFSC Code: 11 characters (4 letters + 0 + 6 alphanumeric)
 */
export const IfscSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, {
    message: 'Invalid IFSC code. Format: SBIN0001234',
  });

/**
 * Voter ID (EPIC): Letters + numbers, 10 characters
 */
export const VoterIdSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{3}[0-9]{7}$/, {
    message: 'Invalid Voter ID (EPIC) number.',
  });

/**
 * Driving License: Format varies by state, 13-16 characters
 */
export const DrivingLicenseSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{2}[0-9]{2}[0-9]{4}[0-9]{7}$/, {
    message: 'Invalid Driving License number.',
  });

/**
 * Passport: 1 letter + 7 digits
 */
export const PassportSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z][0-9]{7}$/, {
    message: 'Invalid Passport number. Format: A1234567',
  });

/**
 * Udyam (MSME): UDYAM-XX-00-0000000
 */
export const UdyamSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^UDYAM-[A-Z]{2}-\d{2}-\d{7}$/, {
    message: 'Invalid Udyam registration number. Format: UDYAM-XX-00-0000000',
  });

/**
 * Bank Account Number: 9-18 digits
 */
export const BankAccountSchema = z
  .string()
  .trim()
  .regex(/^[0-9]{9,18}$/, {
    message: 'Invalid bank account number. Must be 9-18 digits.',
  });

/**
 * UPI ID: user@bank format
 */
export const UpiIdSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-zA-Z0-9._-]{2,256}@[a-zA-Z]{2,64}$/, {
    message: 'Invalid UPI ID. Format: username@bank',
  });

// ─────────────────────────────────────────────────────────────────────────────
// DATE VALIDATORS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Date of Birth — ISO 8601 format, must be in the past, age 1-120
 */
export const DobSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Date must be in YYYY-MM-DD format.',
  })
  .refine(
    (val) => {
      const date = new Date(val);
      const now = new Date();
      const age = now.getFullYear() - date.getFullYear();
      return !isNaN(date.getTime()) && date < now && age >= 1 && age <= 120;
    },
    { message: 'Invalid date of birth. Age must be between 1 and 120 years.' },
  );

/**
 * ISO 8601 date (YYYY-MM-DD) — general purpose
 */
export const DateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Date must be in YYYY-MM-DD format.',
  })
  .refine((val) => !isNaN(new Date(val).getTime()), {
    message: 'Invalid date.',
  });

// ─────────────────────────────────────────────────────────────────────────────
// PROFILE SECTION VALIDATORS
// ─────────────────────────────────────────────────────────────────────────────

export const ProfileAddressSchema = z.object({
  type: z.enum(['permanent', 'present', 'correspondence', 'office']),
  isPrimary: z.boolean(),
  raw: z.string().max(500).optional(),
  line1: z.string().min(3).max(200),
  line2: z.string().max(200).optional(),
  locality: z.string().max(100).optional(),
  city: z.string().min(2).max(100),
  district: z.string().min(2).max(100),
  state: z.string().min(2).max(100),
  pincode: PincodeSchema,
  country: z.string().default('India'),
  yearsAtAddress: z.number().int().min(0).max(120).optional(),
});

export const ProfileNameSchema = z.object({
  first: z.string().min(1).max(50).trim(),
  middle: z.string().max(50).trim().optional(),
  last: z.string().min(1).max(50).trim(),
  full: z.string().min(2).max(150).trim(),
  initials: z.string().max(50).trim().optional(),
  fatherName: z.string().max(150).trim().optional(),
  motherName: z.string().max(150).trim().optional(),
  spouseName: z.string().max(150).trim().optional(),
});

export const SectionASchema = z.object({
  aadhaar: AadhaarSchema.optional(),
  aadhaarVerified: z.boolean().optional(),
  pan: PanSchema.optional(),
  panVerified: z.boolean().optional(),
  name: ProfileNameSchema,
  dob: DobSchema,
  age: z.number().int().min(1).max(120).optional(),
  gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']),
  bloodGroup: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']).optional(),
  phone: IndianMobileSchema,
  altPhone: IndianMobileSchema.optional(),
  email: z.string().email().toLowerCase().trim().optional(),
  addresses: z.array(ProfileAddressSchema).min(1),
  photoUrl: z.string().url().optional(),
  signatureUrl: z.string().url().optional(),
  thumbImpressionUrl: z.string().url().optional(),
  emergencyContact: z
    .object({
      name: z.string().min(1).max(150),
      relation: z.string().min(1).max(50),
      phone: IndianMobileSchema,
    })
    .optional(),
});

// ─────────────────────────────────────────────────────────────────────────────
// AUTH VALIDATORS
// ─────────────────────────────────────────────────────────────────────────────

export const LoginSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  password: z.string().min(1, 'Password is required'),
});

export const RegisterSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Must contain at least one special character'),
  firstName: z.string().min(1).max(50).trim(),
  lastName: z.string().max(50).trim().optional(),
  phone: IndianMobileSchema.optional(),
  role: z.enum(['CITIZEN', 'OPERATOR', 'BUSINESS', 'ADMIN']),
  businessType: z.string().optional(),
  tenantId: z.string().optional(),
});

export const PhoneOtpSchema = z.object({
  phone: IndianMobileSchema,
  otp: z.string().regex(/^[0-9]{6}$/, 'OTP must be 6 digits'),
});

export const SendOtpSchema = z.object({
  phone: IndianMobileSchema,
});

// ─────────────────────────────────────────────────────────────────────────────
// PAGINATION / QUERY VALIDATORS
// ─────────────────────────────────────────────────────────────────────────────

export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  search: z.string().max(200).trim().optional(),
});
