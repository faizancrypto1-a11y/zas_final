import { NextResponse } from 'next/server';
import { prisma } from 'src/lib/prisma';
import { resolveAuthoritativeItemPricing } from 'src/lib/productPricing';
import { calculatePaymentBreakdown } from 'src/lib/paymentCalculations';

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

export async function POST(request) {
  try {
    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      return NextResponse.json(
        { success: false, error: 'Payment gateway is not configured. Please contact support.' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const {
      orderItems = [],
      shippingAddress,
      paymentMethod = 'Online',
      couponCode = '',
      guestDetails
    } = body;

    if (!orderItems || orderItems.length === 0) {
      return NextResponse.json({ success: false, error: 'Cart is empty' }, { status: 400 });
    }
    if (!shippingAddress || !shippingAddress.fullName || !shippingAddress.addressLine || !shippingAddress.city || !shippingAddress.state || !shippingAddress.pincode || !shippingAddress.phone) {
      return NextResponse.json({ success: false, error: 'Complete shipping address is required' }, { status: 400 });
    }

    const normalizedPaymentMethod = paymentMethod === 'COD' ? 'COD' : (paymentMethod === 'Online' ? 'Online' : null);
    if (!normalizedPaymentMethod) {
      return NextResponse.json({ success: false, error: 'Invalid payment method. Choose Online or COD.' }, { status: 400 });
    }

    // Fetch settings
    const settings = await prisma.setting.findFirst() || {
      shippingCharges: 10,
      freeShippingMinAmount: 100
    };

    // Validate products and calculate totals server-side
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

      // Authoritatively resolve variant pricing on the server
      const pricingResult = resolveAuthoritativeItemPricing(product, item.selectedVariant);
      if (!pricingResult.success) {
        return NextResponse.json(
          { success: false, error: pricingResult.error || 'Selected product variant is no longer available.' },
          { status: 400 }
        );
      }

      const itemPrice = pricingResult.price;
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
        selectedVariant: pricingResult.selectedVariant || {}
      });
    }

    // Validate and apply coupon server-side
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

    // Calculate shipping server-side
    const shippingPrice = subtotal >= settings.freeShippingMinAmount ? 0 : settings.shippingCharges;

    // Calculate authoritative payment breakdown
    const breakdown = calculatePaymentBreakdown({
      subtotal,
      couponDiscount: discountAmount,
      shipping: shippingPrice,
      paymentMethod: normalizedPaymentMethod
    });

    const amountInPaise = breakdown.razorpayAmountInPaise;

    if (amountInPaise < 1) {
      return NextResponse.json(
        { success: false, error: 'Invalid order amount' },
        { status: 400 }
      );
    }

    // Create Razorpay order via Orders API
    const authHeader = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');
    const receipt = `${normalizedPaymentMethod.toLowerCase()}_${Date.now()}`;

    const razorpayRes = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${authHeader}`
      },
      body: JSON.stringify({
        amount: amountInPaise,
        currency: 'INR',
        receipt,
        payment_capture: 1,
        notes: {
          paymentMethod: normalizedPaymentMethod,
          isAdvancePayment: normalizedPaymentMethod === 'COD' ? 'true' : 'false'
        }
      })
    });

    const razorpayOrder = await razorpayRes.json();

    if (!razorpayRes.ok || razorpayOrder.error) {
      console.error('Razorpay order creation failed:', razorpayOrder);
      return NextResponse.json(
        { success: false, error: razorpayOrder.error?.description || 'Failed to create payment order. Please try again.' },
        { status: 500 }
      );
    }

    // Return Razorpay order details and authoritative metadata for frontend display
    return NextResponse.json({
      success: true,
      razorpayOrderId: razorpayOrder.id,
      amount: amountInPaise,
      currency: 'INR',
      keyId: RAZORPAY_KEY_ID,
      paymentMethod: normalizedPaymentMethod,
      prefill: {
        name: shippingAddress.fullName,
        email: guestDetails?.email || '',
        contact: shippingAddress.phone
      },
      breakdown,
      // Metadata for verification step (server recalculates everything authoritatively during verify)
      _orderData: {
        orderItems: validatedItems,
        shippingAddress,
        paymentMethod: normalizedPaymentMethod,
        paymentStatus: normalizedPaymentMethod === 'COD' ? 'Partially Paid' : 'Paid',
        orderStatus: 'Pending',
        shippingPrice,
        discountAmount,
        prepaidDiscountAmount: breakdown.prepaidDiscountAmount,
        codAdvanceAmount: breakdown.codAdvanceAmount,
        subtotal,
        totalAmount: breakdown.totalAmount,
        amountPaid: breakdown.amountPaid,
        amountDue: breakdown.amountDue,
        couponCode: validCoupon ? validCoupon.code : '',
        couponId: validCoupon ? validCoupon.id : null,
        guestDetails
      }
    });

  } catch (error) {
    console.error('Razorpay create-order error:', error);
    return NextResponse.json(
      { success: false, error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
