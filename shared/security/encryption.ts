/**
 * Data Encryption Utilities
 * For PHI (Protected Health Information) encryption at rest
 * HIPAA Compliant
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

class EncryptionService {
  private encryptionKey: Buffer;

  constructor() {
    const key = process.env.ENCRYPTION_KEY;
    
    if (!key) {
      throw new Error('ENCRYPTION_KEY environment variable is required');
    }

    // Derive key from secret
    this.encryptionKey = crypto.pbkdf2Sync(
      key,
      'healthflow-salt',
      100000,
      KEY_LENGTH,
      'sha256'
    );
  }

  /**
   * Encrypt sensitive data
   */
  encrypt(data: string): string {
    try {
      const iv = crypto.randomBytes(IV_LENGTH);
      const cipher = crypto.createCipheriv(ALGORITHM, this.encryptionKey, iv);

      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      const authTag = cipher.getAuthTag();

      // Combine IV + Auth Tag + Encrypted Data
      return iv.toString('hex') + authTag.toString('hex') + encrypted;
    } catch (error) {
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  /**
   * Decrypt sensitive data
   */
  decrypt(encryptedData: string): string {
    try {
      // Extract IV, Auth Tag, and Encrypted Data
      const iv = Buffer.from(encryptedData.slice(0, IV_LENGTH * 2), 'hex');
      const authTag = Buffer.from(
        encryptedData.slice(IV_LENGTH * 2, (IV_LENGTH + AUTH_TAG_LENGTH) * 2),
        'hex'
      );
      const encrypted = encryptedData.slice((IV_LENGTH + AUTH_TAG_LENGTH) * 2);

      const decipher = crypto.createDecipheriv(ALGORITHM, this.encryptionKey, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  /**
   * Hash sensitive data (one-way)
   */
  hash(data: string): string {
    return crypto
      .createHash('sha256')
      .update(data)
      .digest('hex');
  }

  /**
   * Generate secure random token
   */
  generateToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Encrypt object (serialize and encrypt)
   */
  encryptObject(obj: any): string {
    const json = JSON.stringify(obj);
    return this.encrypt(json);
  }

  /**
   * Decrypt object (decrypt and deserialize)
   */
  decryptObject<T>(encryptedData: string): T {
    const json = this.decrypt(encryptedData);
    return JSON.parse(json);
  }
}

export const encryptionService = new EncryptionService();
