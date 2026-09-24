import { NextResponse } from 'next/server';
import { prisma } from 'src/lib/prisma';
import { getCanonicalPolicy, POLICY_SLUG_ALIASES } from 'src/lib/policies';

export async function GET(request, { params }) {
  const { slug } = await params;
  const resolvedSlug = POLICY_SLUG_ALIASES[slug] || slug;

  try {
    let page = await prisma.page.findUnique({ where: { slug: resolvedSlug } });
    if (!page && slug !== resolvedSlug) {
      page = await prisma.page.findUnique({ where: { slug } });
    }

    // If page is not in DB yet, but is a canonical policy, auto-create it in DB
    const canonical = getCanonicalPolicy(resolvedSlug) || getCanonicalPolicy(slug);
    if (!page && canonical) {
      try {
        page = await prisma.page.create({
          data: {
            title: canonical.title,
            slug: canonical.slug,
            content: canonical.content,
          }
        });
      } catch (createErr) {
        // If race condition or create error, try fetching again
        page = await prisma.page.findUnique({ where: { slug: canonical.slug } });
        if (!page) {
          page = {
            id: `canonical-${canonical.slug}`,
            title: canonical.title,
            slug: canonical.slug,
            content: canonical.content,
            updatedAt: new Date().toISOString(),
          };
        }
      }
    }

    if (!page) {
      return NextResponse.json(
        { success: false, error: 'Page content not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      page
    });

  } catch (error) {
    console.error('Page fetch API error:', error);
    const canonical = getCanonicalPolicy(resolvedSlug) || getCanonicalPolicy(slug);
    if (canonical) {
      return NextResponse.json({
        success: true,
        page: {
          id: `canonical-${canonical.slug}`,
          title: canonical.title,
          slug: canonical.slug,
          content: canonical.content,
          updatedAt: new Date().toISOString(),
        }
      });
    }

    return NextResponse.json(
      { success: false, error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

