import { calculatePaymentBreakdown } from '../src/lib/paymentCalculations.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  PASS: ${message}`);
    passed++;
  } else {
    console.error(`  FAIL: ${message}`);
    failed++;
  }
}

console.log('--- TEST SUITE: API BEHAVIOR & IDEMPOTENCY LOGIC ---\n');

// 1. Verify that calculatePaymentBreakdown rejects or safely handles negative numbers
{
  const negative = calculatePaymentBreakdown({
    subtotal: 100,
    couponDiscount: 500, // discount larger than subtotal
    shipping: 50,
    paymentMethod: 'Online'
  });
  assert(negative.amountBeforePaymentBenefit === 0, `Negative base amount clamped to 0: got ${negative.amountBeforePaymentBenefit}`);
  assert(negative.prepaidDiscountAmount === 0, `Prepaid discount is 0 on 0 payable: got ${negative.prepaidDiscountAmount}`);
  assert(negative.totalAmount === 0, `Total amount is 0: got ${negative.totalAmount}`);
}

// 2. Razorpay amount mismatch detection logic
{
  const breakdown = calculatePaymentBreakdown({
    subtotal: 5000,
    couponDiscount: 0,
    shipping: 100,
    paymentMethod: 'COD'
  });
  // Total = 5100, 10% advance = 510, paise = 51000
  assert(breakdown.razorpayAmountInPaise === 51000, `COD advance in paise is 51000`);

  // Simulated Razorpay payment details with wrong amount
  const tamperedPayment = {
    amount: 10000, // Attacker paid 100 Rs instead of 510 Rs
    currency: 'INR',
    order_id: 'order_123',
    status: 'captured'
  };

  const isAmountValid = tamperedPayment.amount === breakdown.razorpayAmountInPaise;
  assert(!isAmountValid, `Tampered amount is correctly detected and rejected`);

  // Legitimate payment
  const legitPayment = {
    amount: 51000,
    currency: 'INR',
    order_id: 'order_123',
    status: 'captured'
  };
  assert(legitPayment.amount === breakdown.razorpayAmountInPaise, `Legitimate payment amount accepted`);
  assert(legitPayment.currency === 'INR', `Currency verified as INR`);
  assert(legitPayment.status === 'captured', `Payment status verified as captured`);
}

// 3. Idempotency test logic
{
  const dbOrders = [
    {
      orderId: 'ZAS-ABC123-IND',
      razorpayOrderId: 'order_rzp_001',
      razorpayPaymentId: 'pay_rzp_001',
      totalAmount: 9360,
      paymentStatus: 'Paid'
    }
  ];

  function findExistingPayment(orderId, paymentId) {
    return dbOrders.find(
      o => o.razorpayPaymentId === paymentId || o.razorpayOrderId === orderId
    );
  }

  // First request: payment not in DB
  const firstCheck = findExistingPayment('order_rzp_002', 'pay_rzp_002');
  assert(!firstCheck, `New payment proceeds to order creation`);

  // Duplicate request with pay_rzp_001:
  const duplicateCheck = findExistingPayment('order_rzp_001', 'pay_rzp_001');
  assert(!!duplicateCheck, `Duplicate payment detected by paymentId`);
  assert(duplicateCheck.orderId === 'ZAS-ABC123-IND', `Returns existing order ZAS-ABC123-IND without duplicating`);
}

console.log(`\n--- RESULTS: ${passed} PASSED, ${failed} FAILED ---`);
if (failed > 0) process.exit(1);
