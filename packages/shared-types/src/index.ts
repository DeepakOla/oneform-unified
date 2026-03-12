/**
 * OneForm Unified Platform — @oneform/shared-types
 *
 * Barrel export for all shared TypeScript types.
 * Import from this package in all apps:
 *
 * @example
 * import type { Profile, SectionA, User, AuthTokens } from '@oneform/shared-types';
 */

// Profile ABCD types
export type {
  // Enums
  ProfileType, ProfileStatus, AddressType, GenderType, MaritalStatus,
  BloodGroup, CasteCategory, EducationLevel, ServiceBranch, EmploymentType,
  LanguageProficiencyLevel, IncomeBracket,
  // Core sections
  SectionA, SectionB, SectionC, SectionD,
  // Nested types
  ProfileAddress, ProfileName, ProfileCompleteness,
  EducationRecord, Certification, WorkExperience, LanguageProficiency,
  // Extensions
  StudentExtension, FarmerExtension, BusinessExtension, ProfessionalExtension,
  // Full profile
  Profile, ProfileSummary, CreateProfileRequest, UpdateProfileRequest,
} from './profile-abcd.js';

// User & Auth types
export type {
  UserRole, UserStatus, BusinessType, OAuthProvider,
  User, SafeUser, UserSummary, UserPreferences,
  OAuthAccount, Session, GuestSession,
  LoginRequest, PhoneOtpRequest, RegisterRequest,
  AuthTokens, AuthResponse,
} from './user.js';

// Tenant & Plan types
export type {
  TenantType, TenantStatus, VerificationStatus,
  TenantBranding, TenantAddress, Tenant,
  PricingPlan,
} from './tenant.js';

// Document types
export type {
  DocumentType, DocumentStatus,
  OcrExtractionResult, Document,
  DocumentUploadRequest, DocumentUploadResponse,
} from './document.js';

// Wallet types
export type {
  TransactionType, TransactionStatus, PaymentGateway,
  Wallet, WalletTransaction,
  TopUpRequest, TopUpResponse, DeductRequest,
} from './wallet.js';

// API Envelope types
export type {
  ApiSuccess, ApiMeta, ApiErrorDetail, ApiError,
  ApiResponse, ApiErrorCode, PaginationParams,
  AuditAction, AuditLog,
} from './api-envelope.js';

export { API_ERROR_CODES } from './api-envelope.js';
