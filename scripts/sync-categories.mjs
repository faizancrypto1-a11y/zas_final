/**
 * Synchronize website header categories with MySQL Category table.
 * Idempotent:
 * - If slug already exists, updates displayOrder and ensures isActive: true without duplicating.
 * - If slug does not exist, creates the category with isActive: true and its exact displayOrder.
 * - Does not delete any existing products or unrelated categories.
 */
import { PrismaClient } from '@prisma/client';
import { HEADER_CATEGORIES } from '../src/lib/categories.js';

export async function syncCategories(prismaInstance) {
  const prisma = prismaInstance || new PrismaClient();
  const existingFound = [];
  const missingAdded = [];
  const updatedExisting = [];

  try {
    const existingCategories = await prisma.category.findMany();
    const existingMap = new Map(existingCategories.map(c => [c.slug, c]));

    for (const cat of HEADER_CATEGORIES) {
      if (existingMap.has(cat.slug)) {
        existingFound.push(cat.slug);
        const existing = existingMap.get(cat.slug);
        // Ensure displayOrder and isActive match requirements
        if (existing.displayOrder !== cat.displayOrder || !existing.isActive || existing.name !== cat.name) {
          await prisma.category.update({
            where: { slug: cat.slug },
            data: {
              name: cat.name,
              displayOrder: cat.displayOrder,
              isActive: true,
            },
          });
          updatedExisting.push(cat.slug);
        }
      } else {
        await prisma.category.create({
          data: {
            name: cat.name,
            slug: cat.slug,
            displayOrder: cat.displayOrder,
            isActive: true,
          },
        });
        missingAdded.push(cat.slug);
      }
    }

    const allCategories = await prisma.category.findMany({
      orderBy: { displayOrder: 'asc' },
    });

    console.log('=== Category Sync Report ===');
    console.log(`- Existing categories found (${existingFound.length}):`, existingFound);
    console.log(`- Missing categories added (${missingAdded.length}):`, missingAdded);
    if (updatedExisting.length > 0) {
      console.log(`- Existing categories updated with order/status (${updatedExisting.length}):`, updatedExisting);
    }
    console.log(`- Final total category count in DB: ${allCategories.length}`);
    console.log('============================');

    return {
      existingFound,
      missingAdded,
      updatedExisting,
      finalCount: allCategories.length,
      categories: allCategories,
    };
  } finally {
    if (!prismaInstance) {
      await prisma.$disconnect();
    }
  }
}

// Execute standalone if run directly
if (process.argv[1] && process.argv[1].endsWith('sync-categories.mjs')) {
  syncCategories()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Category sync error:', err);
      process.exit(1);
    });
}
