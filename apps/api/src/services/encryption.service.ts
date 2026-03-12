/**
 * OneForm Unified Platform — Encryption Service
 *
 * AES-256-GCM with Envelope Encryption for Section A PII data.
 *
 * How it works:
 *   1. Generate a unique Data Encryption Key (DEK) per profile
 *   2. Encrypt the PII data (SectionA) with the DEK + AES-256-GCM
 *   3. Wrap (encrypt) the DEK with the Key Encryption Key (KEK) from env
 *   4. Store: encrypted_data + iv + wrapped_DEK + key_version in DB
 *
 * Encryption point: AT SAVE TIME (form submit), NOT at display time!
 * Decryption: Server-side ONLY, via auth-gated endpoint + audit log.
 *
 * Anti-Pattern Fixed: "Encrypt at save point, NOT display" (lesson from old project)
 *
 * @module encryption.service
 */
import crypto from 'crypto';
import type { SectionA } from '@oneform/shared-types';
import { logger } from '../utils/logger.js';

// AES-256-GCM constants
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;        // 96-bit IV recommended for GCM
const AUTH_TAG_LENGTH = 16;  // 128-bit authentication tag
const KEY_LENGTH = 32;       // 256-bit key

export interface EncryptedPayload {
  /** Base64-encoded encrypted data */
  ciphertext: string;
  /** Base64-encoded IV (nonce) */
  iv: string;
  /** Base64-encoded GCM auth tag */
  authTag: string;
  /** Base64-encoded wrapped (encrypted) DEK */
  wrappedDek: string;
  /** KEK version used — for key rotation support */
  keyVersion: number;
}

export interface DecryptedSectionA {
  data: SectionA;
  /** Audit trail: when this was decrypted */
  decryptedAt: string;
}

class EncryptionService {
  private kek: Buffer;
  private keyVersion: number;

  constructor() {
    const kekBase64 = process.env['ENCRYPTION_KEK'];

    if (!kekBase64) {
      throw new Error(
        'ENCRYPTION_KEK environment variable is required. ' +
        'Generate with: openssl rand -base64 32'
      );
    }

    const decoded = Buffer.from(kekBase64, 'base64');
    if (decoded.length !== KEY_LENGTH) {
      throw new Error(
        `ENCRYPTION_KEK must be ${KEY_LENGTH} bytes (${KEY_LENGTH * 4 / 3} base64 chars). ` +
        `Got ${decoded.length} bytes.`
      );
    }

    this.kek = decoded;
    this.keyVersion = parseInt(process.env['ENCRYPTION_KEK_VERSION'] ?? '1', 10);
  }

  /**
   * Encrypts Section A PII data.
   *
   * Call this in the profile service AT SAVE POINT (form submit).
   * NEVER call this on display or only at DB write time without user action.
   *
   * @param sectionA - The plaintext Section A data
   * @param profileId - Used to bind encryption to specific profile (prevents replay)
   */
  async encryptSectionA(sectionA: SectionA, profileId: string): Promise<EncryptedPayload> {
    try {
      // 1. Generate a unique DEK for this profile
      const dek = crypto.randomBytes(KEY_LENGTH);

      // 2. Generate a random IV
      const iv = crypto.randomBytes(IV_LENGTH);

      // 3. Create the cipher
      const cipher = crypto.createCipheriv(ALGORITHM, dek, iv, {
        authTagLength: AUTH_TAG_LENGTH,
      });

      // 4. Encrypt the Section A JSON with profile ID as Additional Authenticated Data
      // This binds the ciphertext to this specific profile (prevents cross-profile attacks)
      cipher.setAAD(Buffer.from(profileId, 'utf8'));

      const plaintext = JSON.stringify(sectionA);
      const ciphertextBuffer = Buffer.concat([
        cipher.update(plaintext, 'utf8'),
        cipher.final(),
      ]);
      const authTag = cipher.getAuthTag();

      // 5. Wrap the DEK with the KEK
      const wrappedDek = this.wrapKey(dek);

      // 6. Zero out the plaintext DEK from memory
      dek.fill(0);

      return {
        ciphertext: ciphertextBuffer.toString('base64'),
        iv: iv.toString('base64'),
        authTag: authTag.toString('base64'),
        wrappedDek,
        keyVersion: this.keyVersion,
      };
    } catch (error) {
      logger.error({ error, profileId }, 'Failed to encrypt Section A');
      throw new Error('Encryption failed. Contact support if this persists.');
    }
  }

  /**
   * Decrypts Section A PII data.
   *
   * ONLY called server-side on authenticated endpoint.
   * ALWAYS creates an audit log entry (done by the caller, not here).
   *
   * @param payload - The encrypted payload from database
   * @param profileId - The profile ID (must match the one used during encryption)
   */
  async decryptSectionA(
    payload: EncryptedPayload,
    profileId: string,
  ): Promise<DecryptedSectionA> {
    try {
      // 1. Unwrap the DEK using the KEK
      const dek = this.unwrapKey(payload.wrappedDek);

      // 2. Create the decipher
      const iv = Buffer.from(payload.iv, 'base64');
      const decipher = crypto.createDecipheriv(ALGORITHM, dek, iv, {
        authTagLength: AUTH_TAG_LENGTH,
      });

      // 3. Set the auth tag (tamper detection)
      decipher.setAuthTag(Buffer.from(payload.authTag, 'base64'));

      // 4. Set the AAD (must match what was used during encryption)
      decipher.setAAD(Buffer.from(profileId, 'utf8'));

      // 5. Decrypt
      const decryptedBuffer = Buffer.concat([
        decipher.update(Buffer.from(payload.ciphertext, 'base64')),
        decipher.final(),
      ]);

      // 6. Zero out the DEK from memory
      dek.fill(0);

      const data = JSON.parse(decryptedBuffer.toString('utf8')) as SectionA;

      return {
        data,
        decryptedAt: new Date().toISOString(),
      };
    } catch (error) {
      logger.error({ error, profileId }, 'Failed to decrypt Section A — possible tampering');
      throw new Error('Decryption failed. The data may have been tampered with.');
    }
  }

  /**
   * Wraps (encrypts) a DEK using the KEK.
   * Uses AES-256-ECB for key wrapping (standard key wrapping pattern).
   *
   * In production, replace this with a KMS call (AWS KMS, Google Cloud KMS).
   */
  private wrapKey(dek: Buffer): string {
    const cipher = crypto.createCipheriv('aes-256-ecb', this.kek, null);
    const wrapped = Buffer.concat([cipher.update(dek), cipher.final()]);
    return wrapped.toString('base64');
  }

  /**
   * Unwraps (decrypts) a DEK using the KEK.
   */
  private unwrapKey(wrappedDekBase64: string): Buffer {
    const decipher = crypto.createDecipheriv('aes-256-ecb', this.kek, null);
    const wrapped = Buffer.from(wrappedDekBase64, 'base64');
    return Buffer.concat([decipher.update(wrapped), decipher.final()]);
  }

  /**
   * Generates a new random DEK (for use when creating a new profile).
   * Returns as base64.
   */
  generateDek(): string {
    return crypto.randomBytes(KEY_LENGTH).toString('base64');
  }
}

// Export singleton — initialized once at startup
export const encryptionService = new EncryptionService();
