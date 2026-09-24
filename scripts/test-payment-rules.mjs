import { calculatePaymentBreakdown } from '../src/lib/paymentCalculations.js';
import { roundINR, calculateDiscountedPrice, resolveSelectedVariant } from '../src/lib/productPricing.js';
import { formatINR } from '../src/lib/currency.js';

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

console.log('--- TEST SUITE: ZAS SPORTS WHOLE RUPEE PRICING & PAYMENT RULES ---\n');

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
  assert(cod.amountPaid + cod.amountDue === cod.totalAmount, `amountPaid + amountDue === totalAmount`);
}

// ==========================================
// TEST 2: With Coupon and Shipping (Subtotal=2000, Coupon=200, Shipping=100 -> Base ₹1,900)
// Online 2.5% discount on ₹1,900: 47.50 -> rounds to ₹48, Pay Now ₹1,852, Razorpay 185200 paise
// ==========================================
console.log('\nRunning Test 2 (Subtotal=2000, Coupon=200, Shipping=100 -> Base 1900, 2.5% discount)...');
{
  const basePayable = 2000 - 200 + 100; // 1900

  const online = calculatePaymentBreakdown({
    subtotal: 2000,
    couponDiscount: 200,
    shipping: 100,
    paymentMethod: 'Online'
  });

  assert(online.amountBeforePaymentBenefit === basePayable, `Base payable should be 1900, got ${online.amountBeforePaymentBenefit}`);
  assert(online.prepaidDiscountAmount === 48, `Online prepaid discount on 1900 (2.5% = 47.50) rounds to 48, got ${online.prepaidDiscountAmount}`);
  assert(online.payNowAmount === 1852, `Online final pay now should be 1852, got ${online.payNowAmount}`);
  assert(online.totalAmount === 1852, `Online totalAmount should be 1852, got ${online.totalAmount}`);
  assert(online.amountPaid === 1852, `Online amountPaid should be 1852, got ${online.amountPaid}`);
  assert(online.amountDue === 0, `Online amountDue should be 0, got ${online.amountDue}`);
  assert(online.razorpayAmountInPaise === 185200, `Online paise should be 185200, got ${online.razorpayAmountInPaise}`);

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
  assert(cod.amountPaid + cod.amountDue === cod.totalAmount, `amountPaid + amountDue === totalAmount`);
}

// ==========================================
// TEST 3: Product Discount Examples (MRP ₹449 & ₹999 with 10% discount)
// ==========================================
console.log('\nRunning Test 3 (Product Discount Examples: MRP 449 & 999 with 10% discount)...');
{
  // MRP = ₹449, 10% discount -> 449 - 10% = 404.10 -> whole rupee 404
  const price449 = calculateDiscountedPrice(449, 10);
  assert(price449 === 404, `MRP 449 with 10% discount should be 404, got ${price449}`);

  // MRP = ₹999, 10% discount -> 999 - 10% = 899.10 -> whole rupee 899
  const price999 = calculateDiscountedPrice(999, 10);
  assert(price999 === 899, `MRP 999 with 10% discount should be 899, got ${price999}`);

  // Selling price on MRP 1000 with 10% discount
  const price1000 = calculateDiscountedPrice(1000, 10);
  assert(price1000 === 900, `MRP 1000 with 10% discount should be 900, got ${price1000}`);

  // Online breakdown on 900 selling price: 2.5% = 22.50 -> rounds to 23
  const online = calculatePaymentBreakdown({
    subtotal: price1000,
    couponDiscount: 0,
    shipping: 0,
    paymentMethod: 'Online'
  });
  assert(online.prepaidDiscountAmount === 23, `Prepaid discount on 900 (2.5% = 22.50) rounds to 23, got ${online.prepaidDiscountAmount}`);
  assert(online.payNowAmount === 877, `Pay now on 900 should be 877, got ${online.payNowAmount}`);
  assert(online.totalAmount === 877, `Total amount on 900 should be 877, got ${online.totalAmount}`);
  assert(online.razorpayAmountInPaise === 87700, `Razorpay paise should be 87700, got ${online.razorpayAmountInPaise}`);
}

// ==========================================
// TEST 4: Variant Product Pricing (MRP ₹449 with 10% discount)
// ==========================================
console.log('\nRunning Test 4 (Variant Product Pricing: Variant MRP 449 with 10% discount)...');
{
  const mockProduct = {
    id: 'prod_bat_1',
    name: 'English Willow Cricket Bat',
    discount: 10,
    variants: {
      combinations: [
        {
          id: 'size-sh_weight-2-8',
          attributes: { size: 'SH', weight: '2.8' },
          mrp: 449
        },
        {
          id: 'size-lh_weight-2-9',
          attributes: { size: 'LH', weight: '2.9' },
          mrp: 999
        }
      ]
    }
  };

  const resolvedVariant1 = resolveSelectedVariant(mockProduct, { variantId: 'size-sh_weight-2-8' });
  assert(resolvedVariant1.matched === true, `Variant 1 resolved successfully`);
  assert(resolvedVariant1.mrp === 449, `Variant 1 MRP is 449`);
  assert(resolvedVariant1.sellingPrice === 404, `Variant 1 selling price is 404 (449 - 10%), got ${resolvedVariant1.sellingPrice}`);

  const resolvedVariant2 = resolveSelectedVariant(mockProduct, { variantId: 'size-lh_weight-2-9' });
  assert(resolvedVariant2.matched === true, `Variant 2 resolved successfully`);
  assert(resolvedVariant2.mrp === 999, `Variant 2 MRP is 999`);
  assert(resolvedVariant2.sellingPrice === 899, `Variant 2 selling price is 899 (999 - 10%), got ${resolvedVariant2.sellingPrice}`);
}

// ==========================================
// TEST 5: COD 10% Advance on ₹1,999 (199.90 -> ₹200 advance, ₹1,799 due)
// ==========================================
console.log('\nRunning Test 5 (COD 10% Advance on Total ₹1,999)...');
{
  const cod = calculatePaymentBreakdown({
    subtotal: 1999,
    couponDiscount: 0,
    shipping: 0,
    paymentMethod: 'COD'
  });

  assert(cod.totalAmount === 1999, `COD totalAmount preserved as 1999, got ${cod.totalAmount}`);
  assert(cod.codAdvanceAmount === 200, `COD 10% advance on 1999 (199.90) rounds to 200, got ${cod.codAdvanceAmount}`);
  assert(cod.amountPaid === 200, `COD amountPaid is 200, got ${cod.amountPaid}`);
  assert(cod.amountDue === 1799, `COD amountDue is 1799, got ${cod.amountDue}`);
  assert(cod.payNowAmount === 200, `COD payNowAmount is 200, got ${cod.payNowAmount}`);
  assert(cod.payOnDeliveryAmount === 1799, `COD payOnDeliveryAmount is 1799, got ${cod.payOnDeliveryAmount}`);
  assert(cod.amountPaid + cod.amountDue === cod.totalAmount, `amountPaid + amountDue === totalAmount (200 + 1799 === 1999)`);
  assert(cod.razorpayAmountInPaise === 20000, `COD advance paise is 20000, got ${cod.razorpayAmountInPaise}`);
}

// ==========================================
// TEST 6: formatINR Currency Formatting
// ==========================================
console.log('\nRunning Test 6 (formatINR currency formatting without decimals)...');
{
  assert(formatINR(404.10) === '₹404', `formatINR(404.10) should be '₹404', got '${formatINR(404.10)}'`);
  assert(formatINR(404.90) === '₹405', `formatINR(404.90) should be '₹405', got '${formatINR(404.90)}'`);
  assert(formatINR(1852.50) === '₹1,853', `formatINR(1852.50) should be '₹1,853', got '${formatINR(1852.50)}'`);
  assert(formatINR(2000) === '₹2,000', `formatINR(2000) should be '₹2,000', got '${formatINR(2000)}'`);
  assert(formatINR(0) === '₹0', `formatINR(0) should be '₹0', got '${formatINR(0)}'`);
  assert(formatINR('invalid') === '₹0', `formatINR('invalid') should be '₹0', got '${formatINR('invalid')}'`);

  // Ensure no decimal points in output strings
  const testValues = [404.10, 404.90, 1852.50, 47.50, 199.90, 899.10, 1234.56];
  testValues.forEach(val => {
    const formatted = formatINR(val);
    assert(!formatted.includes('.'), `Formatted string '${formatted}' contains no decimal point`);
  });
}

// ==========================================
// TEST 7: Large Order (Subtotal=10,000, Coupon=500, Shipping=100 -> Base 9,600)
// ==========================================
console.log('\nRunning Test 7 (Subtotal=10000, Coupon=500, Shipping=100)...');
{
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
  assert(cod.amountPaid + cod.amountDue === cod.totalAmount, `amountPaid + amountDue === totalAmount`);
  assert(cod.razorpayAmountInPaise === 96000, `COD advance paise should be 96000, got ${cod.razorpayAmountInPaise}`);
}

console.log(`\n--- RESULTS: ${passed} PASSED, ${failed} FAILED ---`);
if (failed > 0) process.exit(1);
