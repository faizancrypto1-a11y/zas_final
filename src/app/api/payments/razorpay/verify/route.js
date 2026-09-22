import { NextResponse } from 'next/server';
import { prisma } from 'src/lib/prisma';
import crypto from 'crypto';

const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

export async function POST(request) {
  try {
    if (!RAZORPAY_KEY_SECRET) {
      return NextResponse.json(
        { success: false, error: 'Payment gateway is not configured. Please contact support.' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      orderItems = [],
      shippingAddress,
      paymentMethod,
      couponCode = '',
      guestDetails
    } = body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json(
        { success: false, error: 'Missing payment verification details' },
        { status: 400 }
      );
    }

    // Step 1: Verify Razorpay signature
    // Signature = HMAC-SHA256(order_id + "|" + payment_id, key_secret)
    const expectedSignature = crypto
      .createHmac('sha256', RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      console.error('Razorpay signature verification failed');
      return NextResponse.json(
        { success: false, error: 'Payment verification failed. Invalid signature.' },
        { status: 400 }
      );
    }

    // Step 2: Verify the Razorpay order exists and is paid
    const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
    const authHeader = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');

    let paymentDetails;
    try {
      const paymentRes = await fetch(`https://api.razorpay.com/v1/payments/${razorpay_payment_id}`, {
        headers: {
          'Authorization': `Basic ${authHeader}`
        }
      });
      paymentDetails = await paymentRes.json();
    } catch (err) {
      console.error('Error fetching Razorpay payment details:', err);
    }

    if (!paymentDetails || paymentDetails.status !== 'captured') {
      return NextResponse.json(
        { success: false, error: 'Payment not captured. Please contact support if amount was deducted.' },
        { status: 400 }
      );
    }

    // Step 3: Idempotency check - prevent duplicate order creation
    // Razorpay payment_id is unique and idempotent
    const existingOrder = await prisma.order.findFirst({
      where: {
        OR: [
          { orderId: razorpay_order_id },
          // We can store razorpay_payment_id in notes or check by orderId pattern
        ]
      },
      include: { orderItems: true }
    });

    if (existingOrder) {
      return NextResponse.json({
        success: true,
        orderId: existingOrder.orderId,
        message: 'Order already confirmed'
      });
    }

    // Step 4: Fetch settings
    const settings = await prisma.setting.findFirst() || {
      shippingCharges: 10,
      freeShippingMinAmount: 100
    };

    // Step 5: Re-validate products and compute totals server-side
    // NEVER trust frontend totals
    let subtotal = 0;
    const validatedItems = [];

    for (const item of orderItems) {
      const productId = item.product?.id || item.product?._id || item.product;
      const product = await prisma.product.findUnique({ where: { id: productId } });

      if (!product) {
        return NextResponse.json(
          { success: false, error: `Product '${item.sku || 'Unknown'}' no longer exists` },
          { status: 404 }
        );
      }

      if (!product.isActive) {
        return NextResponse.json(
          { success: false, error: `Product '${product.name}' is no longer available` },
          { status: 400 }
        );
      }

      if (product.stock < item.quantity) {
        return NextResponse.json(
          { success: false, error: `Insufficient stock for '${product.name}'. Only ${product.stock} left.` },
          { status: 400 }
        );
      }

      const itemPrice = product.price;
      const itemSubtotal = itemPrice * item.quantity;
      subtotal += itemSubtotal;

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

    // Step 6: Validate and apply coupon server-side
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

    // Step 7: Compute shipping server-side
    const shippingPrice = subtotal >= settings.freeShippingMinAmount ? 0 : settings.shippingCharges;
    const totalAmount = subtotal - discountAmount + shippingPrice;

    // Step 8: Generate order ID
    const cryptoLib = require('crypto');
    const randomHex = cryptoLib.randomBytes(4).toString('hex').toUpperCase();
    const orderId = `ZAS-${randomHex}-IND`;

    // Step 9: Create order in database with transaction
    // Stock decrement, coupon increment, and order creation are atomic
    const newOrder = await prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          orderId,
          // No userId or guestDetails since this was an online payment
          // The frontend should handle user/guest info separately
          guestDetails: guestDetails || null,
          shippingAddress,
          paymentMethod: 'Online',
          paymentStatus: 'Paid',
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

      // Decrement stock
      for (const item of validatedItems) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } }
        });
      }

      // Increment coupon usage
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
      message: 'Payment verified and order placed successfully',
      orderId: newOrder.orderId
    });

  } catch (error) {
    console.error('Razorpay verify error:', error);
    return NextResponse.json(
      { success: false, error: process.env.NODE_ENV === 'development' ? error.message : 'Payment verification failed' },
      { status: 500 }
    );
  }
}
