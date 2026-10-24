import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

/**
 * Elunè database seed.
 *
 * By default this seeds ONLY the data required for the application to function:
 *   - Book categories (used by the upload form and filters)
 *   - A single administrator account (used for login and the approval workflow)
 *
 * It intentionally does NOT create any dummy/sample books. The database is the
 * source of truth and should start empty of books so real user uploads are the
 * only content.
 *
 * Optional demo content (sample books + extra demo users) is only created when
 * the environment variable SEED_DEMO_DATA="true" is set, so normal startup and
 * `prisma migrate`/`prisma db seed` never reintroduce dummy books.
 */
async function main() {
  console.log('Seeding Elunè database (categories + admin account)...');

  // 1. Categories — required for the upload form and catalog filters.
  const categoriesData = [
    { name: 'Philosophy', slug: 'philosophy', description: 'Ancient and modern philosophical inquiries into ethics and mind.' },
    { name: 'Psychology', slug: 'psychology', description: 'Cognitive science, mindfulness, and mental sanctuaries.' },
    { name: 'Self Development', slug: 'self-development', description: 'Actionable frameworks for calm, deep work, and discipline.' },
    { name: 'Technology', slug: 'technology', description: 'Computing, software, and the ethics of digital innovation.' },
    { name: 'Literature', slug: 'literature', description: 'Classic and contemporary literary explorations.' }
  ];

  for (const cat of categoriesData) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat
    });
  }
  console.log(`Seeded ${categoriesData.length} categories.`);

  // 2. Administrator account — required for admin login and book approval.
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@elune.read';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  const adminHash = await bcrypt.hash(adminPassword, 10);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: Role.ADMIN },
    create: {
      name: 'Elunè Administrator',
      email: adminEmail,
      passwordHash: adminHash,
      role: Role.ADMIN
    }
  });
  console.log(`Ensured admin account: ${admin.email}`);

  // 3. Optional demo data (NOT created during normal startup).
  if (process.env.SEED_DEMO_DATA === 'true') {
    console.log('SEED_DEMO_DATA=true -> seeding demo users and sample books...');
    await seedDemoData(admin.id);
  } else {
    console.log('Skipping demo books/users (set SEED_DEMO_DATA=true to include them).');
  }

  console.log('✅ Seeding completed.');
}

/**
 * Demo-only content. Isolated so it is trivial to exclude from production and
 * normal development startup. All demo books use clearly marked IDs prefixed
 * with "demo-" so they can be identified and removed safely.
 */
async function seedDemoData(adminId: string) {
  const { Visibility, BookStatus, BlockType } = await import('@prisma/client');

  const philosophyCat = await prisma.category.findUnique({ where: { slug: 'philosophy' } });

  const userPassword = await bcrypt.hash('user123', 10);
  const standardUser = await prisma.user.upsert({
    where: { email: 'user@elune.read' },
    update: { role: Role.USER },
    create: {
      name: 'Demo User',
      email: 'user@elune.read',
      passwordHash: userPassword,
      role: Role.USER
    }
  });

  await prisma.book.upsert({
    where: { id: 'demo-meditations' },
    update: {},
    create: {
      id: 'demo-meditations',
      title: '[DEMO] Meditations',
      author: 'Marcus Aurelius',
      description: 'Demo sample book. Safe to delete.',
      totalPages: 10,
      language: 'en',
      visibility: Visibility.PUBLIC,
      status: BookStatus.APPROVED,
      categoryId: philosophyCat?.id,
      uploadedBy: adminId,
      chapters: {
        create: [
          {
            title: 'Demo Chapter',
            chapterNumber: 1,
            contentBlocks: {
              create: [
                {
                  blockIndex: 1,
                  type: BlockType.PARAGRAPH,
                  pageNumber: 1,
                  text: 'This is a demo paragraph used only when SEED_DEMO_DATA is enabled.'
                }
              ]
            }
          }
        ]
      }
    }
  });

  console.log(`Seeded demo user ${standardUser.email} and 1 demo book.`);
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
