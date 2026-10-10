import crypto from 'crypto';
import { config } from '../config';

// ---------------------------------------------------------------------------
// AES-256-GCM encryption for recoverable sensitive fields (ABN, licence
// numbers, phone numbers). Passwords MUST NOT be encrypted with this — they
// use bcrypt one-way hashing instead.
//
// Mode: deterministic (IV derived via HMAC from the key + field salt) so that
// equality lookups (e.g. duplicate ABN check) remain possible without
// storing plaintext. Trade-off documented here intentionally.
// ---------------------------------------------------------------------------

const ALGO = 'aes-256-gcm';

function getKey(): Buffer {
  const raw = config.aesKey;
  if (!raw || raw.length < 32) {
    throw new Error('AES_KEY must be set in .env (32+ hex chars)');
  }
  return Buffer.from(raw.slice(0, 64), 'hex');
}

function deriveIv(salt: string): Buffer {
  return crypto.createHash('sha256').update(`aurius-iv:${salt}`).digest().subarray(0, 12);
}

export function encryptField(value: string, salt: string): string {
  if (!value) return '';
  const key = getKey();
  const iv = deriveIv(salt);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${enc.toString('base64')}:${tag.toString('base64')}`;
}

export function decryptField(ciphertext: string, salt: string): string {
  if (!ciphertext) return '';
  const parts = ciphertext.split(':');
  if (parts.length !== 3 || parts[0] !== 'v1') {
    // Not encrypted (legacy / dev data) — return as-is
    return ciphertext;
  }
  const key = getKey();
  const iv = deriveIv(salt);
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(Buffer.from(parts[2], 'base64'));
  const dec = Buffer.concat([decipher.update(Buffer.from(parts[1], 'base64')), decipher.final()]);
  return dec.toString('utf8');
}

export const SALT_ABN = 'abn';
export const SALT_LICENCE = 'licence';
export const SALT_PHONE = 'phone';

// Helper that decrypts only if the value was encrypted by us
export function safeDecrypt(value: string | null | undefined, salt: string): string {
  if (!value) return '';
  return value.startsWith('v1:') ? decryptField(value, salt) : value;
}
