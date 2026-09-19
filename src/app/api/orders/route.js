import { NextResponse } from 'next/server';
import { prisma } from 'src/lib/prisma';
import { getAuthUser } from 'src/lib/auth';
import { checkRateLimit } from 'src/lib/rateLimit';

export async function GET(request) {
  try {
    const user = getAuthUser(request);

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Please sign in' },
        { status: 401 }
      );
    }

    let orders;
    if (user.role === 'admin') {
      orders = await prisma.order.findMany({
        include: { orderItems: true },
        orderBy: { createdAt: 'desc' }
      });
    } else {
      orders = await prisma.order.findMany({
        where: { userId: user.id },
        include: { orderItems: true },
        orderBy: { createdAt: 'desc' }
      });
    }

    return NextResponse.json({
      success: true,
      orders
    });

  } catch (error) {
    console.error('Orders fetch error:', error);
    return NextResponse.json(
      { success: false, error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const ip = request.headers.get('x-forwarded-for') || request.ip || 'unknown';
    if (!checkRateLimit(ip, 10, 60000)) { 
      return NextResponse.json({ success: false, error: 'Too many requests. Please slow down.' }, { status: 429 });
    }

    const user = getAuthUser(request);
    const body = await request.json();

    const { 
      orderItems = [], 
      shippingAddress, 
      paymentMethod, 
      couponCode = '', 
      guestDetails 
    } = body;

    if (orderItems.length === 0) {
      return NextResponse.json({ success: false, error: 'Cart is empty' }, { status: 400 });
    }
    if (!shippingAddress || !shippingAddress.fullName || !shippingAddress.addressLine || !shippingAddress.city || !shippingAddress.state || !shippingAddress.pincode || !shippingAddress.phone) {
      return NextResponse.json({ success: false, error: 'Complete shipping address is required' }, { status: 400 });
    }
    if (!paymentMethod) {
      return NextResponse.json({ success: false, error: 'Payment method is required' }, { status: 400 });
    }
    if (paymentMethod !== 'COD') {
      return NextResponse.json({ success: false, error: 'Online payments are currently disabled' }, { status: 400 });
    }
    if (!user && (!guestDetails || !guestDetails.name || !guestDetails.email || !guestDetails.phone)) {
      return NextResponse.json({ success: false, error: 'Guest checkout requires contact details' }, { status: 400 });
    }

    const settings = await prisma.setting.findFirst() || {
      shippingCharges: 10,
      freeShippingMinAmount: 100
    };

    let subtotal = 0;
    const validatedItems = [];

    for (const item of orderItems) {
      const productId = item.product?.id || item.product?._id || item.product;
      const product = await prisma.product.findUnique({ where: { id: productId } });
      
      if (!product) {
        return NextResponse.json(
          { success: false, error: `Product with SKU ${item.sku || 'Unknown'} not found` },
          { status: 404 }
        );
      }

      if (!product.isActive) {
        return NextResponse.json(
          { success: false, error: `Product '${product.name}' is no longer available for purchase` },
          { status: 400 }
        );
      }

      if (product.stock < item.quantity) {
        return NextResponse.json(
          { success: false, error: `Insufficient stock for product '${product.name}'. Only ${product.stock} items left.` },
          { status: 400 }
        );
      }

      const itemPrice = product.price;
      const itemSubtotal = itemPrice * item.quantity;
      subtotal += itemSubtotal;

      // Extract first image
      let firstImage = '';
      if (Array.isArray(product.images) && product.images.length > 0) {
        firstImage = product.images[0];
      }

      validatedItems.push({
        productId: product.id,
        name: product.name,
        sku: product.sku,
        image: firstImage,
        price: itemPrice,
        quantity: item.quantity,
        selectedVariant: item.selectedVariant || {}
      });
    }

    let discountAmount = 0;
    let validCoupon = null;

    if (couponCode) {
      const coupon = await prisma.coupon.findUnique({ 
        where: { code: couponCode.toUpperCase() }
      });
      if (coupon && coupon.isActive) {
        const now = new Date();
        const expiry = new Date(coupon.expiryDate);
        
        if (now <= expiry && subtotal >= coupon.minOrderValue && coupon.usedCount < coupon.usageLimit) {
          validCoupon = coupon;
          if (coupon.discountType === 'percentage') {
            discountAmount = Math.round(subtotal * (coupon.discountValue / 100));
          } else {
            discountAmount = Math.min(coupon.discountValue, subtotal);
          }
        }
      }
    }

    const shippingPrice = subtotal >= settings.freeShippingMinAmount ? 0 : settings.shippingCharges;
    const totalAmount = subtotal - discountAmount + shippingPrice;

    const crypto = require('crypto');
    const randomHex = crypto.randomBytes(4).toString('hex').toUpperCase();
    const orderId = `ZAS-${randomHex}-IND`;

    // Start a transaction to ensure atomic stock update and order creation
    const newOrder = await prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          orderId,
          userId: user ? user.id : null,
          guestDetails: user ? null : guestDetails,
          shippingAddress,
          paymentMethod,
          paymentStatus: paymentMethod === 'Online' ? 'Paid' : 'Pending',
          orderStatus: 'Pending',
          shippingPrice,
          discountAmount,
          subtotal,
          totalAmount,
          couponCode: validCoupon ? validCoupon.code : '',
          orderItems: {
            create: validatedItems.map(item => ({
              productId: item.productId,
              name: item.name,
              sku: item.sku,
              image: item.image,
              price: item.price,
              quantity: item.quantity,
              selectedVariant: item.selectedVariant
            }))
          }
        },
        include: { orderItems: true }
      });

      for (const item of validatedItems) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } }
        });
      }

      if (validCoupon) {
        await tx.coupon.update({
          where: { id: validCoupon.id },
          data: { usedCount: { increment: 1 } }
        });
      }

      return order;
    });

    return NextResponse.json({
      success: true,
      message: 'Order placed successfully',
      order: newOrder
    });

  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { success: false, error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
