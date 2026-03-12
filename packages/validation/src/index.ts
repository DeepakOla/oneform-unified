/**
 * OneForm Unified Platform — @oneform/validation
 *
 * Zod validation schemas for all Indian data formats.
 * Direct copies + upgrades from OneForm v2.6.5 production validators.
 *
 * @example
 * import { AadhaarSchema, PanSchema, RegisterSchema } from '@oneform/validation';
 */

export {
  // Indian Identifiers
  AadhaarSchema,
  PanSchema,
  IndianMobileSchema,
  PincodeSchema,
  GstinSchema,
  IfscSchema,
  VoterIdSchema,
  DrivingLicenseSchema,
  PassportSchema,
  UdyamSchema,
  BankAccountSchema,
  UpiIdSchema,

  // Date validators
  DobSchema,
  DateSchema,

  // Profile schemas
  ProfileAddressSchema,
  ProfileNameSchema,
  SectionASchema,

  // Auth schemas
  LoginSchema,
  RegisterSchema,
  PhoneOtpSchema,
  SendOtpSchema,

  // Utility schemas
  PaginationSchema,
} from './profile.schema.js';
