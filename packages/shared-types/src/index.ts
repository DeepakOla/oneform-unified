/**
 * @fileoverview Public barrel export for @oneform/shared-types.
 *
 * Import shared type contracts from this entry-point to ensure
 * you always consume the canonical, version-controlled definitions.
 *
 * @example
 * ```ts
 * import type { AbcdProfile, ApiResponse } from '@oneform/shared-types';
 * ```
 */

export type {
  ProfileSectionA,
  ProfileSectionB,
  ProfileSectionC,
  ProfileSectionD,
  AbcdProfile,
  EntityType,
  BankAccountType,
  DocumentAttachment,
  ApiSuccessResponse,
  ApiErrorResponse,
  ApiResponse,
} from './profile-abcd.js';
