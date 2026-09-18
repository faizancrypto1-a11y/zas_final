import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { prisma } from 'src/lib/prisma';
import { verifyAdmin } from 'src/lib/auth';
import { getPublicCategories, CACHE_TAGS } from 'src/lib/storeData';
import { HEADER_CATEGORIES } from 'src/lib/categories';

async function ensureCanonicalCategories() {
  try {
    const existing = await prisma.category.findMany({ select: { slug: true } });
    const existingSlugs = new Set(existing.map(c => c.slug));
    const missing = HEADER_CATEGORIES.filter(c => !existingSlugs.has(c.slug));

    if (missing.length > 0) {
      for (const cat of missing) {
        await prisma.category.create({
          data: {
            name: cat.name,
            slug: cat.slug,
            displayOrder: cat.displayOrder,
            isActive: true
          }
        }).catch(err => {
          console.warn(`Category creation note for ${cat.slug}:`, err?.message);
        });
      }
      revalidateTag(CACHE_TAGS.categories);
    }
  } catch (err) {
    console.warn('ensureCanonicalCategories error:', err?.message);
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const isAdminView = searchParams.get('adminView') === 'true';

    await ensureCanonicalCategories();

    if (isAdminView) {
      if (!verifyAdmin(request)) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized. Admin access required' },
          { status: 401 }
        );
      }
      
      const categories = await prisma.category.findMany({
        orderBy: [
          { displayOrder: 'asc' },
          { name: 'asc' }
        ]
      });
      return NextResponse.json({
        success: true,
        categories,
      });
    }

    const categories = await getPublicCategories();
    return NextResponse.json({
      success: true,
      categories,
    });

  } catch (error) {
    console.error('Categories fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const isAdmin = verifyAdmin(request);

    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Admin access required' },
        { status: 401 }
      );
    }

    const { name, displayOrder, image, isActive } = await request.json();

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Category name is required' },
        { status: 400 }
      );
    }

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

    const existingCategory = await prisma.category.findUnique({ where: { slug } });
    if (existingCategory) {
      return NextResponse.json(
        { success: false, error: 'Category with this name/slug already exists' },
        { status: 400 }
      );
    }

    const newCategory = await prisma.category.create({
      data: {
        name,
        slug,
        image,
        displayOrder: displayOrder || 0,
        isActive: isActive !== undefined ? isActive : true
      }
    });

    revalidateTag(CACHE_TAGS.categories);

    return NextResponse.json({
      success: true,
      message: 'Category created successfully',
      category: newCategory
    });

  } catch (error) {
    console.error('Category create error:', error);
    return NextResponse.json(
      { success: false, error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
