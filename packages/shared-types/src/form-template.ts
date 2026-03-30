/**
 * OneForm Unified Platform — FormTemplate Types
 *
 * FormTemplate represents a government form that can be autofilled
 * via the Chrome extension or Skyvern automation.
 *
 * @module shared-types/form-template
 */

export interface FormTemplate {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  portalUrl: string;
  category: string;
  fieldMappings: FieldMappings;
  skyvernScript?: SkyvernScript;
  isActive: boolean;
  isVerified: boolean;
  verifiedAt?: string; // ISO date string
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}

/**
 * Mapping from profile field path to form selector
 * Example:
 * {
 *   "sectionA.name.full": "#fullName",
 *   "sectionA.pan": "#panNumber",
 *   "sectionB.category": "select[name='category']"
 * }
 */
export type FieldMappings = Record<string, string>;

/**
 * Skyvern automation script (optional, Phase 4)
 * Format TBD based on Skyvern API
 */
export interface SkyvernScript {
  version: string;
  steps: unknown[];
  [key: string]: unknown;
}

/**
 * FormTemplate creation payload
 */
export interface CreateFormTemplatePayload {
  name: string;
  description?: string;
  portalUrl: string;
  category: string;
  fieldMappings: FieldMappings;
  skyvernScript?: SkyvernScript;
}

/**
 * FormTemplate update payload
 */
export interface UpdateFormTemplatePayload {
  name?: string;
  description?: string;
  portalUrl?: string;
  category?: string;
  fieldMappings?: FieldMappings;
  skyvernScript?: SkyvernScript;
  isActive?: boolean;
  isVerified?: boolean;
}

/**
 * Scrapling service response
 * Returns field selectors discovered from a portal URL
 */
export interface ScraplingFieldsResponse {
  fields: Record<string, string>;
  metadata?: {
    portalName?: string;
    discoveredAt: string;
    confidence: number;
  };
}
