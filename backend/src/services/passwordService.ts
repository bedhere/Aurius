import bcrypt from 'bcryptjs';

const ROUNDS = 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/**
 * Password policy: min 8 chars, uppercase, lowercase, digit, special char.
 */
export function validatePasswordPolicy(pw: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (pw.length < 8) errors.push('Password must be at least 8 characters long');
  if (!/[A-Z]/.test(pw)) errors.push('Password must contain at least one uppercase letter');
  if (!/[a-z]/.test(pw)) errors.push('Password must contain at least one lowercase letter');
  if (!/[0-9]/.test(pw)) errors.push('Password must contain at least one digit');
  if (!/[^A-Za-z0-9]/.test(pw)) errors.push('Password must contain at least one special character');
  return { valid: errors.length === 0, errors };
}
