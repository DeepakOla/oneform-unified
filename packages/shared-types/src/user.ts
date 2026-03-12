/**
 * OneForm Unified Platform — User, Session & Auth Types
 *
 * IMPORTANT: Dashboard Role ≠ Profile Type
 * - UserRole: what dashboard the user sees (set at signup)
 * - ProfileType: the kind of profile (student/farmer/etc) created inside dashboard
 *
 * @module user
 */

// ─────────────────────────────────────────────────────────────────────────────
// ENUMS & CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Dashboard role — determines which dashboard shell the user sees.
 * NOT the same as profile type.
 */
export type UserRole =
  | "CITIZEN"       // General dashboard: students, farmers, individuals
  | "OPERATOR"      // Operator dashboard: CSC centers, form helpers
  | "BUSINESS"      // Business dashboard: CA firms, HR companies, NGOs
  | "ADMIN"         // Admin dashboard: platform management
  | "SUPER_ADMIN";  // Platform owner — full access

export type UserStatus =
  | "ACTIVE"
  | "SUSPENDED"
  | "PENDING_VERIFICATION"
  | "DEACTIVATED";

export type BusinessType =
  | "CSC_OPERATOR"
  | "CA_FIRM"
  | "HR_COMPANY"
  | "NGO"
  | "COMPANY_OWNER"
  | "HOSPITAL"
  | "EDUCATIONAL"
  | "CHARTERED_ACCOUNTANT"
  | "ADVOCATE"
  | "DOCTOR";

export type OAuthProvider = "google" | "digilocker" | "linkedin";

// ─────────────────────────────────────────────────────────────────────────────
// USER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Core user entity. Stored in the `users` PostgreSQL table.
 * Authentication: JWT + Refresh tokens (no Firebase Auth).
 *
 * Login Methods (5 supported):
 *   1. Email + Password
 *   2. Phone + OTP (Indian users — via MSG91/2Factor)
 *   3. Google OAuth 2.0
 *   4. DigiLocker OAuth (auto-populates profile!)
 *   5. Guest mode (temp session, no account required)
 */
export interface User {
  id: string;
  tenantId: string;

  email: string;
  emailVerified: boolean;
  phone?: string | undefined;
  phoneVerified: boolean;
  /** Argon2id hashed password. null for OAuth-only users */
  passwordHash?: string | undefined;

  firstName: string;
  lastName?: string | undefined;
  displayName?: string | undefined;
  avatarUrl?: string | undefined;

  role: UserRole;
  businessType?: BusinessType | undefined;
  /** Additional granular permissions beyond role defaults */
  permissions: string[];

  status: UserStatus;
  lastLoginAt?: string | undefined;
  lastLoginIp?: string | undefined;

  preferences: UserPreferences;
  createdAt: string;
  updatedAt: string;
}

export interface UserPreferences {
  theme: "light" | "dark" | "system";
  language: string;             // BCP 47: "hi", "en", "ta"
  notifications: {
    email: boolean;
    sms: boolean;
    push: boolean;
    whatsapp: boolean;
    telegram: boolean;
  };
  /** Whether user has completed onboarding wizard */
  onboardingCompleted: boolean;
  /** Active profile ID selected for quick autofill */
  activeProfileId?: string | undefined;
}

// ─────────────────────────────────────────────────────────────────────────────
// OAUTH & SESSION
// ─────────────────────────────────────────────────────────────────────────────

export interface OAuthAccount {
  id: string;
  userId: string;
  provider: OAuthProvider;
  providerAccountId: string;
  accessToken?: string | undefined;
  refreshToken?: string | undefined;
  tokenExpiry?: string | undefined;
  createdAt: string;
  updatedAt: string;
}

export interface Session {
  id: string;
  userId: string;
  token: string;
  userAgent?: string | undefined;
  ipAddress?: string | undefined;
  expiresAt: string;
  createdAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTH REQUEST / RESPONSE TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface LoginRequest {
  email: string;
  password: string;
}

export interface PhoneOtpRequest {
  phone: string;
  otp: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName?: string | undefined;
  phone?: string | undefined;
  role: UserRole;
  businessType?: BusinessType | undefined;
  tenantId?: string | undefined;     // For operator/business invitations
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;                 // Seconds until accessToken expires
  tokenType: "Bearer";
}

export interface AuthResponse {
  user: Omit<User, "passwordHash">;
  tokens: AuthTokens;
}

/**
 * Guest session — for users who don't want to register.
 * Expires after TEMP_PROFILE_EXPIRY_HOURS (default: 8 hours).
 * Charged ₹29 per form fill.
 */
export interface GuestSession {
  sessionId: string;
  tempProfileId: string;
  createdAt: string;
  expiresAt: string;               // 8 hours from creation
  paidForms: number;               // Number of forms paid for
  totalAmountPaid: number;         // INR
}

// ─────────────────────────────────────────────────────────────────────────────
// SAFE USER (for frontend — no sensitive fields)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Safe user object for frontend state — never includes passwordHash
 * or sensitive tokens.
 */
export type SafeUser = Omit<User, "passwordHash">;

export type UserSummary = Pick<
  User,
  "id" | "displayName" | "firstName" | "lastName" | "avatarUrl" | "role" | "status"
>;
