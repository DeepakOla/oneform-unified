/**
 * OneForm Unified Platform — Prisma Database Seed
 *
 * Creates development fixtures:
 *   - A root "OneForm Admin" tenant
 *   - A SUPER_ADMIN user (dev only — password: Admin@1234)
 *   - A sample CITIZEN user (dev only — password: Citizen@1234)
 *
 * Run: pnpm db:seed  (from monorepo root)
 * Or:  pnpm --filter @oneform/api exec tsx prisma/seed.ts
 */
import { PrismaClient } from '@prisma/client';
import { hash } from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding OneForm database...');

  // ──────────────────────────────────────────────────────
  // 1. Root admin tenant
  // ──────────────────────────────────────────────────────
  const adminTenant = await prisma.tenant.upsert({
    where: { slug: 'oneform-root' },
    update: {},
    create: {
      name: 'OneForm Platform',
      slug: 'oneform-root',
      type: 'GOVERNMENT',
      status: 'ACTIVE',
      email: 'admin@indianform.com',
      verificationStatus: 'VERIFIED',
    },
  });
  console.log(`  Tenant: ${adminTenant.name} (${adminTenant.id})`);

  // ──────────────────────────────────────────────────────
  // 2. Super-admin user
  // ──────────────────────────────────────────────────────
  const adminHash = await hash('Admin@1234');
  const admin = await prisma.user.upsert({
    where: { email: 'admin@indianform.com' },
    update: {},
    create: {
      tenantId: adminTenant.id,
      email: 'admin@indianform.com',
      firstName: 'OneForm',
      lastName: 'Admin',
      role: 'SUPER_ADMIN',
      passwordHash: adminHash,
      status: 'ACTIVE',
      emailVerified: true,
    },
  });
  console.log(`  Admin user: ${admin.email} (${admin.id})`);

  // ──────────────────────────────────────────────────────
  // 3. Dev citizen tenant + user
  // ──────────────────────────────────────────────────────
  const citizenTenant = await prisma.tenant.upsert({
    where: { slug: 'dev-citizen' },
    update: {},
    create: {
      name: "Dev Citizen's Workspace",
      slug: 'dev-citizen',
      type: 'INDIVIDUAL',
      status: 'ACTIVE',
      email: 'citizen@example.com',
    },
  });

  const citizenHash = await hash('Citizen@1234');
  const citizen = await prisma.user.upsert({
    where: { email: 'citizen@example.com' },
    update: {},
    create: {
      tenantId: citizenTenant.id,
      email: 'citizen@example.com',
      firstName: 'Ramesh',
      lastName: 'Gupta',
      role: 'CITIZEN',
      passwordHash: citizenHash,
      status: 'ACTIVE',
      emailVerified: true,
    },
  });
  console.log(`  Citizen user: ${citizen.email} (${citizen.id})`);

  // ──────────────────────────────────────────────────────
  // 4. Create wallets for seeded users
  // ──────────────────────────────────────────────────────
  await prisma.wallet.upsert({
    where: { userId: admin.id },
    update: {},
    create: {
      userId: admin.id,
      tenantId: adminTenant.id,
      balancePaisa: BigInt(0),
    },
  });

  await prisma.wallet.upsert({
    where: { userId: citizen.id },
    update: {},
    create: {
      userId: citizen.id,
      tenantId: citizenTenant.id,
      balancePaisa: BigInt(10000), // ₹100 seed balance
    },
  });

  console.log('✅ Seed complete.');
  console.log('');
  console.log('Dev credentials:');
  console.log('  Admin:   admin@indianform.com  / Admin@1234');
  console.log('  Citizen: citizen@example.com  / Citizen@1234');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
