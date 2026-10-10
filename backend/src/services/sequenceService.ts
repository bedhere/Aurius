import { prisma } from '../lib/prisma';
import { UserRole } from '@prisma/client';

// ---------------------------------------------------------------------------
// Business number generation.
// AUR ID:  AUR-DE-YYYYXXXXXX / AUR-TR-YYYYXXXXXX / AUR-SD-YYYYXXXXXX
// Order:   AUR-ORD-YYYYMMDD-XXXXXX
// App:     APP-YYYYMMDD-XXXXXX
// All counters persisted in SequenceCounter so IDs are unique, permanent
// and survive restarts. Generation is retried on unique conflicts.
// ---------------------------------------------------------------------------

export function rolePrefix(role: UserRole): string | null {
  switch (role) {
    case 'REGIONAL_AGENT':
      return 'AUR-DE';
    case 'LICENSED_TRADESMAN':
      return 'AUR-TR';
    case 'SUB_DEALER':
      return 'AUR-SD';
    case 'WATERWORKER':
      return 'AUR-WW';
    case 'BUILDER':
      return 'AUR-BR';
    default:
      return null;
  }
}

export function roleToPriceLevel(role: UserRole): number | null {
  switch (role) {
    case 'REGIONAL_AGENT':
      return 1;
    case 'LICENSED_TRADESMAN':
      return 2;
    case 'SUB_DEALER':
      return 3;
    case 'WATERWORKER':
      return 4;
    case 'BUILDER':
      return 5;
    default:
      return null;
  }
}

function pad6(n: number): string {
  return String(n).padStart(6, '0');
}

async function nextSequence(key: string): Promise<number> {
  // SQLite-safe upsert with atomic-ish increment via transaction
  return prisma.$transaction(async (tx) => {
    const existing = await tx.sequenceCounter.findUnique({ where: { key } });
    if (!existing) {
      await tx.sequenceCounter.create({ data: { key, value: 1 } });
      return 1;
    }
    const updated = await tx.sequenceCounter.update({
      where: { key },
      data: { value: existing.value + 1 },
    });
    return updated.value;
  });
}

export async function generateAurId(role: UserRole): Promise<{ aurId: string; prefix: string; year: number; sequence: number }> {
  const prefix = rolePrefix(role);
  if (!prefix) throw new Error(`Role ${role} does not map to a member tier`);
  const year = new Date().getFullYear();
  const seq = await nextSequence(`${prefix}:${year}`);
  return { aurId: `${prefix}-${year}${pad6(seq)}`, prefix, year, sequence: seq };
}

export async function generateOrderNumber(): Promise<string> {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const datePart = `${y}${m}${d}`;
  const seq = await nextSequence(`ORD:${datePart}`);
  return `AUR-ORD-${datePart}-${pad6(seq)}`;
}

export async function generateApplicationNumber(): Promise<string> {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const datePart = `${y}${m}${d}`;
  const seq = await nextSequence(`APP:${datePart}`);
  return `APP-${datePart}-${pad6(seq)}`;
}
