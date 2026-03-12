/**
 * OneForm Unified Platform — Tenant Types
 *
 * Multi-tenancy: Every resource is scoped to a tenant.
 * Row Level Security in PostgreSQL enforces isolation.
 *
 * @module tenant
 */

export type TenantType =
  | "INDIVIDUAL"
  | "CSC_OPERATOR"
  | "CA_FIRM"
  | "HR_COMPANY"
  | "NGO"
  | "COMPANY"
  | "HOSPITAL"
  | "EDUCATIONAL"
  | "GOVERNMENT";

export type TenantStatus = "ACTIVE" | "SUSPENDED" | "TRIAL" | "CANCELLED";

export type VerificationStatus =
  | "PENDING"
  | "IN_REVIEW"
  | "VERIFIED"
  | "REJECTED";

export interface TenantBranding {
  logoUrl?: string | undefined;
  faviconUrl?: string | undefined;
  primaryColor?: string | undefined;
  secondaryColor?: string | undefined;
  appName?: string | undefined;
}

export interface TenantAddress {
  line1: string;
  line2?: string | undefined;
  city: string;
  state: string;
  pincode: string;
  country: string;
}

export interface Tenant {
  id: string;
  name: string;
  /** Subdomain slug: acme.indianform.in */
  slug: string;
  type: TenantType;
  status: TenantStatus;

  /** White-label branding configuration */
  branding?: TenantBranding | undefined;
  customDomain?: string | undefined;

  email: string;
  phone?: string | undefined;
  address?: TenantAddress | undefined;

  gstin?: string | undefined;
  pan?: string | undefined;
  verificationStatus: VerificationStatus;

  planId?: string | undefined;

  /** Max limits (can override plan defaults) */
  maxUsers?: number | undefined;
  maxProfiles?: number | undefined;
  maxStorageBytes?: number | undefined;

  /** Feature flags (override plan features) */
  features: Record<string, boolean>;

  createdAt: string;
  updatedAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// PRICING PLANS (Admin-configurable — NO hardcoded pricing!)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Pricing plan — 100% admin-configurable.
 * No hardcoded prices in frontend or backend code.
 */
export interface PricingPlan {
  id: string;
  name: string;                       // "Starter", "Professional", "Enterprise"
  type: "subscription" | "pay_per_use" | "hybrid";

  subscription?: {
    monthlyPriceInr: number;
    annualPriceInr: number;
    trialDays: number;
  } | undefined;

  usagePricing?: {
    perAutofillInr?: number | undefined;
    perSubmissionInr?: number | undefined;
    perApiCallInr?: number | undefined;
  } | undefined;

  limits: {
    profilesPerMonth: number | "unlimited";
    autofillsPerMonth: number | "unlimited";
    teamMembers: number | "unlimited";
    apiCallsPerDay: number | "unlimited";
    storageGb: number | "unlimited";
  };

  features: {
    crmIntegration: boolean;
    bulkUpload: boolean;
    whiteLabel: boolean;
    prioritySupport: boolean;
    customTemplates: boolean;
    skyvernAutomation: boolean;
    apiAccess: boolean;
    multipleProfiles: boolean;
  };

  targetRoles: ("CITIZEN" | "OPERATOR" | "BUSINESS")[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
