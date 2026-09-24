import { roundINR } from './productPricing.js';

/**
 * Standardized payment calculation formula for ZAS SPORTS (Whole INR Rupee pricing)
 *
 * Rules:
 * 1. Online / Prepaid:
 *    baseTotal = subtotal - couponDiscount + shipping
 *    prepaidDiscountAmount = roundINR(baseTotal * 0.025) (Whole INR rupee)
 *    finalOnlineAmount = roundINR(baseTotal - prepaidDiscountAmount) (Whole INR rupee)
 *    totalAmount = finalOnlineAmount
 *    amountPaid = finalOnlineAmount
 *    amountDue = 0
 *
 * 2. Cash on Delivery (COD):
 *    fullCodOrderTotal = subtotal - couponDiscount + shipping
 *    codAdvanceAmount = roundINR(fullCodOrderTotal * 0.10) (Whole INR rupee)
 *    codDueAmount = roundINR(fullCodOrderTotal - codAdvanceAmount) (Whole INR rupee)
 *    totalAmount = fullCodOrderTotal (IMPORTANT: remains full order value)
 *    amountPaid = codAdvanceAmount (10% advance paid online)
 *    amountDue = codDueAmount (remaining 90% due on delivery)
 *    Guarantee: amountPaid + amountDue === totalAmount exactly
 *
 * @param {Object} params
 * @param {number} params.subtotal - Authoritative subtotal
 * @param {number} [params.couponDiscount=0] - Discount from applied coupon
 * @param {number} [params.shipping=0] - Shipping charge
 * @param {string} [params.paymentMethod='COD'] - 'Online' or 'COD'
 * @returns {Object} Payment breakdown
 */
export function calculatePaymentBreakdown({
  subtotal = 0,
  couponDiscount = 0,
  shipping = 0,
  paymentMethod = 'COD'
}) {
  const safeSubtotal = Number(subtotal) || 0;
  const safeCoupon = Number(couponDiscount) || 0;
  const safeShipping = Number(shipping) || 0;

  // Base payable before payment-specific benefits
  const amountBeforePaymentBenefit = roundINR(
    Math.max(0, safeSubtotal - safeCoupon + safeShipping)
  );

  const isOnline = paymentMethod === 'Online';

  if (isOnline) {
    const prepaidDiscountAmount = roundINR(amountBeforePaymentBenefit * 0.025);
    const finalOnlineAmount = roundINR(amountBeforePaymentBenefit - prepaidDiscountAmount);

    return {
      paymentMethod: 'Online',
      subtotal: roundINR(safeSubtotal),
      couponDiscount: roundINR(safeCoupon),
      shipping: roundINR(safeShipping),
      amountBeforePaymentBenefit,
      prepaidDiscountAmount,
      codAdvanceAmount: 0,
      totalAmount: finalOnlineAmount,
      amountPaid: finalOnlineAmount,
      amountDue: 0,
      payNowAmount: finalOnlineAmount,
      payOnDeliveryAmount: 0,
      razorpayAmountInPaise: Math.round(finalOnlineAmount * 100)
    };
  }

  // Cash on Delivery
  const fullCodOrderTotal = amountBeforePaymentBenefit;
  const codAdvanceAmount = roundINR(fullCodOrderTotal * 0.10);
  const codDueAmount = roundINR(fullCodOrderTotal - codAdvanceAmount);

  return {
    paymentMethod: 'COD',
    subtotal: roundINR(safeSubtotal),
    couponDiscount: roundINR(safeCoupon),
    shipping: roundINR(safeShipping),
    amountBeforePaymentBenefit,
    prepaidDiscountAmount: 0,
    codAdvanceAmount,
    totalAmount: fullCodOrderTotal, // Full order value preserved
    amountPaid: codAdvanceAmount,
    amountDue: codDueAmount,
    payNowAmount: codAdvanceAmount,
    payOnDeliveryAmount: codDueAmount,
    razorpayAmountInPaise: Math.round(codAdvanceAmount * 100)
  };
}
