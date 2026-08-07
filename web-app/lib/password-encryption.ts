/// <reference types="node" />
// lib/password-encryption.ts
import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const KEY_LENGTH = 32; // 256-bit
const IV_LENGTH = 16;  // 128-bit

function getKey(): Buffer {
  const raw = process.env.PASSWORD_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error('PASSWORD_ENCRYPTION_KEY is not set in environment variables');
  }
  // Derive a 32-byte key from the env value using SHA-256
  return crypto.createHash('sha256').update(raw).digest();
}

/**
 * Encrypt a plaintext password using AES-256-CBC.
 * Returns a base64 string: IV (hex) + ':' + ciphertext (hex)
 */
export function encryptPassword(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

/**
 * Decrypt an AES-256-CBC encrypted password string.
 * Expects format: IV (hex) + ':' + ciphertext (hex)
 */
export function decryptPassword(encrypted: string): string {
  const key = getKey();
  const [ivHex, cipherHex] = encrypted.split(':');
  if (!ivHex || !cipherHex) {
    throw new Error('Invalid encrypted password format');
  }
  const iv = Buffer.from(ivHex, 'hex');
  const ciphertext = Buffer.from(cipherHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}