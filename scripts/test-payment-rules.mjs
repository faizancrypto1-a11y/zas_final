import { calculatePaymentBreakdown } from '../src/lib/paymentCalculations.js';
import { roundINR, calculateDiscountedPrice } from '../src/lib/productPricing.js';

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

console.log('--- TEST SUITE: ZAS SPORTS PAYMENT RULES ---\n');

// ==========================================
// TEST 1: Standard amounts (₹1,000, no coupon, no shipping)
// ==========================================
console.log('Running Test 1 (Subtotal=1000, Coupon=0, Shipping=0)...');
{
  const online = calculatePaymentBreakdown({
    subtotal: 1000,
    couponDiscount: 0,
    shipping: 0,
    paymentMethod: 'Online'
  });

  assert(online.prepaidDiscountAmount === 25, `Online prepaid discount should be 25, got ${online.prepaidDiscountAmount}`);
  assert(online.payNowAmount === 975, `Online payNowAmount should be 975, got ${online.payNowAmount}`);
  assert(online.totalAmount === 975, `Online totalAmount should be 975, got ${online.totalAmount}`);
  assert(online.amountPaid === 975, `Online amountPaid should be 975, got ${online.amountPaid}`);
  assert(online.amountDue === 0, `Online amountDue should be 0, got ${online.amountDue}`);
  assert(online.razorpayAmountInPaise === 97500, `Online paise should be 97500, got ${online.razorpayAmountInPaise}`);

  const cod = calculatePaymentBreakdown({
    subtotal: 1000,
    couponDiscount: 0,
    shipping: 0,
    paymentMethod: 'COD'
  });

  assert(cod.prepaidDiscountAmount === 0, `COD prepaid discount should be 0, got ${cod.prepaidDiscountAmount}`);
  assert(cod.codAdvanceAmount === 100, `COD advance should be 100, got ${cod.codAdvanceAmount}`);
  assert(cod.payNowAmount === 100, `COD payNowAmount should be 100, got ${cod.payNowAmount}`);
  assert(cod.amountPaid === 100, `COD amountPaid should be 100, got ${cod.amountPaid}`);
  assert(cod.amountDue === 900, `COD due on delivery should be 900, got ${cod.amountDue}`);
  assert(cod.totalAmount === 1000, `COD full order total should be preserved as 1000, got ${cod.totalAmount}`);
  assert(cod.razorpayAmountInPaise === 10000, `COD advance paise should be 10000, got ${cod.razorpayAmountInPaise}`);
}

// ==========================================
// TEST 2: With Coupon and Shipping (Subtotal=2000, Coupon=200, Shipping=100)
// ==========================================
console.log('\nRunning Test 2 (Subtotal=2000, Coupon=200, Shipping=100)...');
{
  const basePayable = 2000 - 200 + 100; // 1900

  const online = calculatePaymentBreakdown({
    subtotal: 2000,
    couponDiscount: 200,
    shipping: 100,
    paymentMethod: 'Online'
  });

  assert(online.amountBeforePaymentBenefit === basePayable, `Base payable should be 1900, got ${online.amountBeforePaymentBenefit}`);
  assert(online.prepaidDiscountAmount === 47.50, `Online prepaid discount should be 47.50, got ${online.prepaidDiscountAmount}`);
  assert(online.payNowAmount === 1852.50, `Online final pay now should be 1852.50, got ${online.payNowAmount}`);
  assert(online.totalAmount === 1852.50, `Online totalAmount should be 1852.50, got ${online.totalAmount}`);
  assert(online.amountPaid === 1852.50, `Online amountPaid should be 1852.50, got ${online.amountPaid}`);
  assert(online.amountDue === 0, `Online amountDue should be 0, got ${online.amountDue}`);
  assert(online.razorpayAmountInPaise === 185250, `Online paise should be 185250, got ${online.razorpayAmountInPaise}`);

  const cod = calculatePaymentBreakdown({
    subtotal: 2000,
    couponDiscount: 200,
    shipping: 100,
    paymentMethod: 'COD'
  });

  assert(cod.codAdvanceAmount === 190, `COD advance should be 190, got ${cod.codAdvanceAmount}`);
  assert(cod.amountDue === 1710, `COD pay on delivery should be 1710, got ${cod.amountDue}`);
  assert(cod.totalAmount === 1900, `COD totalAmount should remain 1900, got ${cod.totalAmount}`);
  assert(cod.amountPaid === 190, `COD amountPaid should be 190, got ${cod.amountPaid}`);
  assert(cod.razorpayAmountInPaise === 19000, `COD paise should be 19000, got ${cod.razorpayAmountInPaise}`);
}

// ==========================================
// TEST 3: Variant Product with 10% discount (MRP ₹1,000 -> Selling ₹900)
// ==========================================
console.log('\nRunning Test 3 (Variant Product MRP=1000, 10% discount -> Selling=900)...');
{
  const mrp = 1000;
  const productDiscount = 10;
  const sellingPrice = calculateDiscountedPrice(mrp, productDiscount);

  assert(sellingPrice === 900, `Selling price after 10% discount should be 900, got ${sellingPrice}`);

  // Now apply payment-specific logic on the 900 selling price
  const online = calculatePaymentBreakdown({
    subtotal: sellingPrice,
    couponDiscount: 0,
    shipping: 0,
    paymentMethod: 'Online'
  });

  const expectedOnlineDiscount = roundINR(900 * 0.025); // 22.50
  const expectedOnlineTotal = roundINR(900 - 22.50); // 877.50

  assert(online.prepaidDiscountAmount === expectedOnlineDiscount, `Prepaid discount on 900 should be 22.50, got ${online.prepaidDiscountAmount}`);
  assert(online.totalAmount === expectedOnlineTotal, `Final online amount should be 877.50, got ${online.totalAmount}`);
  assert(online.payNowAmount === expectedOnlineTotal, `Pay now should be 877.50, got ${online.payNowAmount}`);

  const cod = calculatePaymentBreakdown({
    subtotal: sellingPrice,
    couponDiscount: 0,
    shipping: 0,
    paymentMethod: 'COD'
  });

  const expectedCodAdvance = roundINR(900 * 0.10); // 90
  const expectedCodDue = roundINR(900 - 90); // 810

  assert(cod.codAdvanceAmount === expectedCodAdvance, `COD advance on 900 should be 90, got ${cod.codAdvanceAmount}`);
  assert(cod.amountDue === expectedCodDue, `COD due on 900 should be 810, got ${cod.amountDue}`);
  assert(cod.totalAmount === 900, `COD totalAmount should remain 900, got ${cod.totalAmount}`);
}

// ==========================================
// TEST 4: Large Prompt Example (Subtotal=10,000, Coupon=500, Shipping=100)
// ==========================================
console.log('\nRunning Test 4 (Subtotal=10000, Coupon=500, Shipping=100)...');
{
  // Base = 10000 - 500 + 100 = 9600
  const online = calculatePaymentBreakdown({
    subtotal: 10000,
    couponDiscount: 500,
    shipping: 100,
    paymentMethod: 'Online'
  });

  assert(online.amountBeforePaymentBenefit === 9600, `Base amount should be 9600, got ${online.amountBeforePaymentBenefit}`);
  assert(online.prepaidDiscountAmount === 240, `Prepaid discount 2.5% should be 240, got ${online.prepaidDiscountAmount}`);
  assert(online.totalAmount === 9360, `Final online total should be 9360, got ${online.totalAmount}`);
  assert(online.amountPaid === 9360, `Amount paid should be 9360, got ${online.amountPaid}`);
  assert(online.amountDue === 0, `Amount due should be 0, got ${online.amountDue}`);
  assert(online.razorpayAmountInPaise === 936000, `Paise should be 936000, got ${online.razorpayAmountInPaise}`);

  const cod = calculatePaymentBreakdown({
    subtotal: 10000,
    couponDiscount: 500,
    shipping: 100,
    paymentMethod: 'COD'
  });

  assert(cod.totalAmount === 9600, `COD totalAmount must remain FULL order total 9600, got ${cod.totalAmount}`);
  assert(cod.codAdvanceAmount === 960, `COD advance should be 960, got ${cod.codAdvanceAmount}`);
  assert(cod.amountPaid === 960, `COD amountPaid should be 960, got ${cod.amountPaid}`);
  assert(cod.amountDue === 8640, `COD amountDue should be 8640, got ${cod.amountDue}`);
  assert(cod.payNowAmount === 960, `COD payNowAmount should be 960, got ${cod.payNowAmount}`);
  assert(cod.razorpayAmountInPaise === 96000, `COD advance paise should be 96000, got ${cod.razorpayAmountInPaise}`);
}

// ==========================================
// TEST 5: Edge cases (Free shipping, zero subtotal, precision decimals)
// ==========================================
console.log('\nRunning Test 5 (Edge cases: Free Shipping & Odd Decimal Subtotal)...');
{
  // Subtotal with odd cents: 1234.56
  const online = calculatePaymentBreakdown({
    subtotal: 1234.56,
    couponDiscount: 0,
    shipping: 0,
    paymentMethod: 'Online'
  });

  const expectedDiscount = roundINR(1234.56 * 0.025); // 30.86
  const expectedTotal = roundINR(1234.56 - expectedDiscount); // 1203.70
  assert(online.prepaidDiscountAmount === expectedDiscount, `Prepaid discount on 1234.56 should be ${expectedDiscount}, got ${online.prepaidDiscountAmount}`);
  assert(online.totalAmount === expectedTotal, `Total on 1234.56 should be ${expectedTotal}, got ${online.totalAmount}`);
  assert(online.razorpayAmountInPaise === Math.round(expectedTotal * 100), `Paise should match exact cents, got ${online.razorpayAmountInPaise}`);

  const cod = calculatePaymentBreakdown({
    subtotal: 1234.56,
    couponDiscount: 0,
    shipping: 0,
    paymentMethod: 'COD'
  });

  const expectedAdvance = roundINR(1234.56 * 0.10); // 123.46
  const expectedDue = roundINR(1234.56 - expectedAdvance); // 1111.10
  assert(cod.codAdvanceAmount === expectedAdvance, `COD advance on 1234.56 should be ${expectedAdvance}, got ${cod.codAdvanceAmount}`);
  assert(cod.amountDue === expectedDue, `COD due on 1234.56 should be ${expectedDue}, got ${cod.amountDue}`);
  assert(roundINR(cod.amountPaid + cod.amountDue) === 1234.56, `Advance + Due must equal full total exactly: ${cod.amountPaid + cod.amountDue}`);
}

console.log(`\n--- RESULTS: ${passed} PASSED, ${failed} FAILED ---`);
if (failed > 0) process.exit(1);
