/**
 * Synchronize policy pages with MySQL Page table.
 * Idempotent:
 * - If slug already exists, updates title and content if modified without duplicating.
 * - If slug does not exist, creates the Page record.
 * - Does not delete any existing custom or unrelated pages.
 */
import { PrismaClient } from '@prisma/client';
import { CANONICAL_POLICIES } from '../src/lib/policies.js';

export async function syncPolicies(prismaInstance) {
  const prisma = prismaInstance || new PrismaClient();
  const existingFound = [];
  const missingAdded = [];
  const updatedExisting = [];

  try {
    const existingPages = await prisma.page.findMany();
    const existingMap = new Map(existingPages.map(p => [p.slug, p]));

    for (const policy of CANONICAL_POLICIES) {
      if (existingMap.has(policy.slug)) {
        existingFound.push(policy.slug);
        const existing = existingMap.get(policy.slug);
        if (existing.title !== policy.title || existing.content !== policy.content) {
          await prisma.page.update({
            where: { slug: policy.slug },
            data: {
              title: policy.title,
              content: policy.content,
              updatedAt: new Date(),
            },
          });
          updatedExisting.push(policy.slug);
        }
      } else {
        await prisma.page.create({
          data: {
            title: policy.title,
            slug: policy.slug,
            content: policy.content,
          },
        });
        missingAdded.push(policy.slug);
      }
    }

    const allPages = await prisma.page.findMany({
      orderBy: { title: 'asc' },
    });

    console.log('=== Policy Pages Sync Report ===');
    console.log(`- Existing policy pages found (${existingFound.length}):`, existingFound);
    console.log(`- Missing policy pages created (${missingAdded.length}):`, missingAdded);
    if (updatedExisting.length > 0) {
      console.log(`- Existing policy pages updated (${updatedExisting.length}):`, updatedExisting);
    }
    console.log(`- Final total pages count in DB: ${allPages.length}`);
    console.log('================================');

    return {
      existingFound,
      missingAdded,
      updatedExisting,
      finalCount: allPages.length,
      pages: allPages,
    };
  } catch (err) {
    console.warn('[syncPolicies] Note: Database operation failed (DB may be offline during local build):', err.message);
    return null;
  } finally {
    if (!prismaInstance) {
      await prisma.$disconnect();
    }
  }
}

// Execute standalone if run directly
if (process.argv[1] && process.argv[1].endsWith('sync-policies.mjs')) {
  syncPolicies()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Policy sync error:', err);
      process.exit(1);
    });
}
