import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from 'src/lib/prisma';
import { getAuthUser } from 'src/lib/auth';
import { resolveAuthoritativeItemPricing } from 'src/lib/productPricing';
import { calculatePaymentBreakdown } from 'src/lib/paymentCalculations';

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

export async function POST(request) {
  try {
    if (!RAZORPAY_KEY_SECRET || !RAZORPAY_KEY_ID) {
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
      paymentMethod = 'Online',
      couponCode = '',
      guestDetails
    } = body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json(
        { success: false, error: 'Missing payment verification details' },
        { status: 400 }
      );
    }

    if (!orderItems || orderItems.length === 0) {
      return NextResponse.json({ success: false, error: 'Cart is empty' }, { status: 400 });
    }

    if (!shippingAddress || !shippingAddress.fullName || !shippingAddress.addressLine || !shippingAddress.city || !shippingAddress.state || !shippingAddress.pincode || !shippingAddress.phone) {
      return NextResponse.json({ success: false, error: 'Complete shipping address is required' }, { status: 400 });
    }

    const normalizedPaymentMethod = paymentMethod === 'COD' ? 'COD' : 'Online';

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

    // Step 2: Fetch and verify payment from Razorpay API
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

    if (paymentDetails.order_id !== razorpay_order_id) {
      console.error(`Razorpay order_id mismatch: payment has ${paymentDetails.order_id}, request has ${razorpay_order_id}`);
      return NextResponse.json(
        { success: false, error: 'Payment order ID mismatch. Please contact support.' },
        { status: 400 }
      );
    }

    if (paymentDetails.currency !== 'INR') {
      console.error(`Razorpay currency mismatch: expected INR, received ${paymentDetails.currency}`);
      return NextResponse.json(
        { success: false, error: 'Invalid payment currency. Please contact support.' },
        { status: 400 }
      );
    }

    // Step 3: Idempotency check - prevent duplicate order creation
    const existingOrder = await prisma.order.findFirst({
      where: {
        OR: [
          { razorpayPaymentId: razorpay_payment_id },
          { razorpayOrderId: razorpay_order_id },
          { orderId: razorpay_order_id }
        ]
      },
      include: { orderItems: true }
    });

    if (existingOrder) {
      return NextResponse.json({
        success: true,
        orderId: existingOrder.orderId,
        message: 'Order already confirmed',
        isDuplicate: true
      });
    }

    // Step 4: Resolve logged-in user association
    const authUser = getAuthUser(request);

    // Step 5: Fetch settings
    const settings = await prisma.setting.findFirst() || {
      shippingCharges: 10,
      freeShippingMinAmount: 100
    };

    // Step 6: Authoritatively re-validate products and compute totals server-side
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

      // Authoritatively resolve variant pricing on the server
      const pricingResult = resolveAuthoritativeItemPricing(product, item.selectedVariant);
      if (!pricingResult.success) {
        return NextResponse.json(
          { success: false, error: pricingResult.error || `Selected product variant is no longer available for '${product.name}'.` },
          { status: 400 }
        );
      }

      const itemPrice = pricingResult.price;
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
        selectedVariant: pricingResult.selectedVariant || {}
      });
    }

    // Step 7: Authoritatively validate and apply coupon server-side
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

    // Step 8: Compute shipping server-side
    const shippingPrice = subtotal >= settings.freeShippingMinAmount ? 0 : settings.shippingCharges;

    // Step 9: Compute payment breakdown
    const breakdown = calculatePaymentBreakdown({
      subtotal,
      couponDiscount: discountAmount,
      shipping: shippingPrice,
      paymentMethod: normalizedPaymentMethod
    });

    // Step 10: Verify Razorpay payment amount matches authoritative expected paid amount
    const expectedAmountInPaise = breakdown.razorpayAmountInPaise;
    if (paymentDetails && paymentDetails.amount !== expectedAmountInPaise) {
      console.error(`Razorpay payment amount mismatch: expected ${expectedAmountInPaise} paise, but received ${paymentDetails.amount} paise`);
      return NextResponse.json(
        { success: false, error: 'Payment amount mismatch. Please contact support.' },
        { status: 400 }
      );
    }

    // Step 11: Generate human-readable order ID
    const randomHex = crypto.randomBytes(4).toString('hex').toUpperCase();
    const orderId = `ZAS-${randomHex}-IND`;

    // Step 12: Create order in database with transaction (atomic stock decrement & coupon usage)
    const newOrder = await prisma.$transaction(async (tx) => {
      // Re-check idempotency inside transaction to prevent race conditions
      const raceCheck = await tx.order.findFirst({
        where: {
          OR: [
            { razorpayPaymentId: razorpay_payment_id },
            { razorpayOrderId: razorpay_order_id }
          ]
        },
        include: { orderItems: true }
      });

      if (raceCheck) {
        return raceCheck;
      }

      const order = await tx.order.create({
        data: {
          orderId,
          userId: authUser ? authUser.id : null,
          guestDetails: authUser ? null : (guestDetails || null),
          shippingAddress,
          paymentMethod: normalizedPaymentMethod,
          paymentStatus: normalizedPaymentMethod === 'COD' ? 'Partially Paid' : 'Paid',
          orderStatus: 'Pending',
          shippingPrice,
          discountAmount,
          prepaidDiscountAmount: breakdown.prepaidDiscountAmount,
          codAdvanceAmount: breakdown.codAdvanceAmount,
          subtotal,
          totalAmount: breakdown.totalAmount, // Preserves FULL order value for COD
          amountPaid: breakdown.amountPaid,   // 10% advance for COD, 100% for Online
          amountDue: breakdown.amountDue,     // 90% for COD, 0 for Online
          razorpayOrderId: razorpay_order_id,
          razorpayPaymentId: razorpay_payment_id,
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
      orderId: newOrder.orderId,
      paymentMethod: newOrder.paymentMethod,
      paymentStatus: newOrder.paymentStatus,
      amountPaid: newOrder.amountPaid,
      amountDue: newOrder.amountDue,
      totalAmount: newOrder.totalAmount
    });

  } catch (error) {
    console.error('Razorpay verify error:', error);
    return NextResponse.json(
      { success: false, error: process.env.NODE_ENV === 'development' ? error.message : 'Payment verification failed' },
      { status: 500 }
    );
  }
}
