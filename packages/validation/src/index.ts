/**
 * @fileoverview Public barrel export for @oneform/validation.
 *
 * @example
 * ```ts
 * import { MasterProfileSchema, type MasterProfile } from '@oneform/validation';
 * ```
 */

export {
  SectionASchema,
  SectionBSchema,
  SectionCSchema,
  SectionDSchema,
  MasterProfileSchema,
} from './profile.schema.js';

export type { SectionA, SectionB, SectionC, SectionD, MasterProfile } from './profile.schema.js';
