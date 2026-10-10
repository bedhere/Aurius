// ============================================================================
// Admin initialisation CLI (requirement 88).
// Usage:
//   set CREATE_ADMIN_PASSWORD=YourStrongPass123!  (PowerShell: $env:...)
//   npm run seed:admin   (from backend/)
// The admin email comes from ADMIN_EMAIL in .env (default admin@aurius.com.au).
// Credentials are never hardcoded in the repository.
// ============================================================================
import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const email = (process.env.ADMIN_EMAIL || 'admin@aurius.com.au').toLowerCase().trim();
  const password = process.env.CREATE_ADMIN_PASSWORD;

  if (!password || password.length < 8) {
    console.error('ERROR: CREATE_ADMIN_PASSWORD must be set to a strong password (min 8 chars).');
    process.exit(1);
  }
  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
    console.error('ERROR: password must include uppercase, lowercase, digit and special character.');
    process.exit(1);
  }

  const bcrypt = await import('bcryptjs');
  const hash = await bcrypt.hash(password, 12);
  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    if (existing.role !== UserRole.ADMIN) {
      await prisma.user.update({ where: { email }, data: { role: UserRole.ADMIN, accountStatus: 'ACTIVE' } });
      console.log(`Promoted existing user ${email} to ADMIN.`);
    } else {
      await prisma.user.update({ where: { email }, data: { passwordHash: hash } });
      console.log(`Admin ${email} already exists — password updated.`);
    }
  } else {
    await prisma.user.create({
      data: { email, passwordHash: hash, role: UserRole.ADMIN, accountStatus: 'ACTIVE' },
    });
    console.log(`Admin account created: ${email}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
