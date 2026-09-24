import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { prisma } from 'src/lib/prisma';
import { verifyAdmin } from 'src/lib/auth';
import { CACHE_TAGS } from 'src/lib/storeData';
import { deleteImage } from 'src/lib/storage';
import {
  calculateDiscountedPrice,
  hasPricedVariants,
  getProductPricingSummary,
} from 'src/lib/productPricing';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request, { params }) {
  try {
    const { id } = await params;

    // Prisma: ID usually CUID (length 25+). If it's a short slug, we query by slug.
    // We can just try both if we don't know, but typically slug doesn't have spaces or certain chars.
    // A simple check: if it looks like a cuid, query id, else slug. Or just use OR.
    const product = await prisma.product.findFirst({
      where: {
        OR: [
          { id: id },
          { slug: id }
        ]
      }
    });

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      product
    });

  } catch (error) {
    console.error('Product fetch details error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch product' },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  try {
    const isAdmin = verifyAdmin(request);
    
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Admin access required' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    let finalDiscount = product.discount || 0;
    if (body.discount !== undefined) {
      const parsedDiscount = Number(body.discount);
      if (isNaN(parsedDiscount) || parsedDiscount < 0 || parsedDiscount > 100) {
        return NextResponse.json(
          { success: false, error: 'Discount must be a number between 0 and 100' },
          { status: 400 }
        );
      }
      finalDiscount = parsedDiscount;
    }

    const rawMrp = body.mrp !== undefined ? Number(body.mrp) : product.mrp;
    if (isNaN(rawMrp) || rawMrp < 0) {
      return NextResponse.json(
        { success: false, error: 'Valid MRP must be greater than or equal to 0' },
        { status: 400 }
      );
    }

    const currentVariants = body.variants !== undefined ? body.variants : product.variants;
    let finalMrp = rawMrp;
    let finalPrice = body.price !== undefined ? Number(body.price) : product.price;

    const tempProd = { variants: currentVariants, discount: finalDiscount, mrp: rawMrp, price: finalPrice };
    if (hasPricedVariants(tempProd)) {
      const summary = getProductPricingSummary(tempProd);
      if (summary.displayMrp > 0) finalMrp = summary.displayMrp;
      if (summary.displayPrice >= 0) finalPrice = summary.displayPrice;
    } else {
      finalPrice = calculateDiscountedPrice(finalMrp, finalDiscount);
    }

    body.discount = finalDiscount;
    body.mrp = finalMrp;
    body.price = finalPrice;

    if (body.name) {
      const newSlug = body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
      const existingSlug = await prisma.product.findFirst({
        where: { slug: newSlug, id: { not: id } }
      });
      body.slug = existingSlug ? `${newSlug}-${Date.now()}` : newSlug;
    }

    const safeData = {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.brand !== undefined && { brand: body.brand }),
      ...(body.slug !== undefined && { slug: body.slug }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.specs !== undefined && { specs: body.specs }),
      ...(body.price !== undefined && { price: body.price }),
      ...(body.mrp !== undefined && { mrp: body.mrp }),
      ...(body.discount !== undefined && { discount: body.discount }),
      ...(body.stock !== undefined && { stock: body.stock }),
      ...(body.sku !== undefined && { sku: body.sku }),
      ...(body.variants !== undefined && { variants: body.variants }),
      ...(body.images !== undefined && { images: body.images }),
      ...(body.ratings !== undefined && { ratingsAverage: body.ratings.average, ratingsCount: body.ratings.count }),
      ...(body.isFeatured !== undefined && { isFeatured: body.isFeatured }),
      ...(body.isBestSeller !== undefined && { isBestSeller: body.isBestSeller }),
      ...(body.isNewArrival !== undefined && { isNewArrival: body.isNewArrival }),
      ...(body.isActive !== undefined && { isActive: body.isActive }),
      ...(body.category !== undefined && { category: body.category }),
      ...(body.subcategory !== undefined && { subcategory: body.subcategory }),
    };

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: safeData
    });

    if (body.images !== undefined && Array.isArray(product.images)) {
      const currentImages = new Set(Array.isArray(body.images) ? body.images : []);
      for (const image of product.images) {
        if (!currentImages.has(image)) {
          await deleteImage(image);
        }
      }
    }

    revalidateTag(CACHE_TAGS.products);

    return NextResponse.json({
      success: true,
      message: 'Product updated successfully',
      product: updatedProduct
    });

  } catch (error) {
    console.error('Product update error:', error);
    return NextResponse.json(
      { success: false, error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const isAdmin = verifyAdmin(request);
    
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Admin access required' },
        { status: 401 }
      );
    }

    const { id } = await params;

    const productToDelete = await prisma.product.findUnique({ where: { id } });
    if (!productToDelete) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    const deletedProduct = await prisma.product.delete({
      where: { id }
    }).catch(() => null);

    if (deletedProduct) {
      if (Array.isArray(productToDelete.images)) {
        for (const img of productToDelete.images) {
          await deleteImage(img);
        }
      }
    } else {
      return NextResponse.json(
        { success: false, error: 'Product not found or could not be deleted' },
        { status: 404 }
      );
    }

    revalidateTag(CACHE_TAGS.products);

    return NextResponse.json({
      success: true,
      message: 'Product deleted successfully',
      deletedProduct
    });

  } catch (error) {
    console.error('Product delete error:', error);
    return NextResponse.json(
      { success: false, error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
