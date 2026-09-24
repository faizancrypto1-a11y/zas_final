'use client';

import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ShieldCheck, CreditCard, Banknote, ArrowRight, Tag, Percent } from 'lucide-react';
import { useStore } from 'src/context/StoreContext';
import { formatINR } from 'src/lib/currency';
import { getVariantPricing, extractCleanAttributes, getCartItemKey } from 'src/lib/productPricing';
import { calculatePaymentBreakdown } from 'src/lib/paymentCalculations';

const CheckoutContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { cart, user, clearCart, settings } = useStore();

  const couponParam = searchParams.get('coupon') || '';

  const [fullName, setFullName] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [phone, setPhone] = useState('');

  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');

  // Default to Online or COD
  const [paymentMethod, setPaymentMethod] = useState('Online');
  const [placingOrder, setPlacingOrder] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState(null);

  const orderCompletedRef = useRef(false);
  const orderPayloadRef = useRef(null);
  const userLoadedRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => setRazorpayLoaded(true);
    script.onerror = () => {
      console.warn('Razorpay script failed to load.');
    };
    document.body.appendChild(script);
    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  const calculateCartSubtotal = useCallback(() => {
    return cart.reduce((total, item) => {
      const pricing = getVariantPricing(item.product, item.selectedVariant);
      return total + (pricing.sellingPrice * item.quantity);
    }, 0);
  }, [cart]);

  const validateUrlCoupon = useCallback(async (code) => {
    if (!code) return;
    try {
      const sub = calculateCartSubtotal();
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, subtotal: sub })
      });
      const data = await res.json();
      if (data.success) {
        setAppliedCoupon({
          code: code.toUpperCase(),
          discountType: data.discountType,
          discountValue: data.discountValue,
          discountAmount: data.discountAmount
        });
      }
    } catch (err) {
      console.log('Error validating URL coupon:', err);
    }
  }, [calculateCartSubtotal]);

  // Handle redirects and user address pre-fill
  useEffect(() => {
    if (orderCompletedRef.current) return;
    if (cart.length === 0) {
      router.push('/cart');
      return;
    }

    if (user && !userLoadedRef.current) {
      userLoadedRef.current = true;
      const defaultAddr = user.addresses?.find(addr => addr.isDefault) || user.addresses?.[0];
      const timer = setTimeout(() => {
        setFullName(defaultAddr?.fullName || user.name || '');
        setGuestName(user.name || '');
        setGuestEmail(user.email || '');
        if (defaultAddr) {
          setAddressLine(defaultAddr.addressLine || '');
          setCity(defaultAddr.city || '');
          setState(defaultAddr.state || '');
          setPincode(defaultAddr.pincode || '');
          setPhone(defaultAddr.phone || '');
        }
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [user, cart, router]);

  // Validate coupon from URL once
  useEffect(() => {
    if (couponParam) {
      const timer = setTimeout(() => {
        validateUrlCoupon(couponParam);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [couponParam, validateUrlCoupon]);

  const subtotal = calculateCartSubtotal();

  let discountAmount = 0;
  if (appliedCoupon) {
    if (appliedCoupon.discountType === 'percentage') {
      discountAmount = Math.round(subtotal * (appliedCoupon.discountValue / 100));
    } else {
      discountAmount = Math.min(appliedCoupon.discountValue, subtotal);
    }
  }

  const freeShippingThreshold = settings?.freeShippingMinAmount ?? 100;
  const shippingCharges = subtotal >= freeShippingThreshold ? 0 : (settings?.shippingCharges ?? 10);

  // Authoritative payment breakdown calculated using shared formula
  const breakdown = calculatePaymentBreakdown({
    subtotal,
    couponDiscount: discountAmount,
    shipping: shippingCharges,
    paymentMethod
  });

  const buildOrderPayload = () => {
    const payload = {
      orderItems: cart.map(item => {
        const pricing = getVariantPricing(item.product, item.selectedVariant);
        return {
          product: item.product.id || item.product._id,
          price: pricing.sellingPrice,
          quantity: item.quantity,
          selectedVariant: item.selectedVariant
        };
      }),
      shippingAddress: { fullName, addressLine, city, state, pincode, phone },
      paymentMethod,
      couponCode: appliedCoupon ? appliedCoupon.code : ''
    };
    if (!user) {
      payload.guestDetails = {
        name: guestName || fullName,
        email: guestEmail,
        phone: guestPhone || phone
      };
    }
    return payload;
  };

  const handlePaymentFlow = async () => {
    try {
      setPlacingOrder(true);
      setErrorMessage('');

      const payload = buildOrderPayload();
      orderPayloadRef.current = payload;

      const createRes = await fetch('/api/payments/razorpay/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const createData = await createRes.json();

      if (!createRes.ok || !createData.success) {
        setErrorMessage(createData.error || 'Failed to initialize payment. Please try again.');
        setPlacingOrder(false);
        return;
      }

      const { razorpayOrderId, amount, currency, keyId, prefill } = createData;

      if (!razorpayLoaded || typeof window.Razorpay === 'undefined') {
        setErrorMessage('Payment gateway is still loading. Please wait a moment and try again.');
        setPlacingOrder(false);
        return;
      }

      setIsProcessingPayment(true);

      const isCOD = paymentMethod === 'COD';
      const description = isCOD
        ? `COD 10% Advance Payment - ${formatINR(amount / 100)}`
        : `Prepaid Order Payment - ${formatINR(amount / 100)}`;

      const options = {
        key: keyId,
        amount: amount,
        currency: currency,
        name: 'ZAS SPORTS',
        description,
        order_id: razorpayOrderId,
        prefill: prefill || {},
        notes: {
          address: `${addressLine}, ${city}, ${state} - ${pincode}`,
          paymentMethod
        },
        theme: { color: '#1a1a2e' },
        handler: async function (response) {
          try {
            const verifyPayload = {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              orderItems: orderPayloadRef.current ? orderPayloadRef.current.orderItems : [],
              shippingAddress: orderPayloadRef.current ? orderPayloadRef.current.shippingAddress : null,
              paymentMethod,
              couponCode: orderPayloadRef.current ? orderPayloadRef.current.couponCode : '',
              guestDetails: orderPayloadRef.current ? orderPayloadRef.current.guestDetails : null
            };

            const verifyRes = await fetch('/api/payments/razorpay/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(verifyPayload)
            });

            const verifyData = await verifyRes.json();

            if (verifyRes.ok && verifyData.success) {
              orderCompletedRef.current = true;
              clearCart();
              router.replace(`/order-success?orderId=${verifyData.orderId}`);
            } else {
              setErrorMessage(verifyData.error || 'Payment verification failed. Please contact support if amount was deducted.');
              setIsProcessingPayment(false);
              setPlacingOrder(false);
            }
          } catch (err) {
            console.error('Payment verification error:', err);
            setErrorMessage('Payment verification failed. Please contact support if amount was deducted.');
            setIsProcessingPayment(false);
            setPlacingOrder(false);
          }
        },
        modal: {
          ondismiss: function () {
            setIsProcessingPayment(false);
            setPlacingOrder(false);
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();

    } catch (err) {
      console.error('Payment flow error:', err);
      setErrorMessage('Something went wrong during payment initialization. Please try again.');
      setPlacingOrder(false);
      setIsProcessingPayment(false);
    }
  };

  const handlePlaceOrderSubmit = async (e) => {
    e.preventDefault();
    if (placingOrder || isProcessingPayment) return;

    try {
      await handlePaymentFlow();
    } catch (err) {
      console.error('Checkout submit error:', err);
      setErrorMessage('Network error completing checkout process.');
      setPlacingOrder(false);
      setIsProcessingPayment(false);
    }
  };

  return (
    <div className="container animate-fade">
      <h1 style={{ fontSize: '2rem', textTransform: 'uppercase', fontFamily: 'Outfit', margin: '30px 0 10px' }}>
        Secure Checkout
      </h1>

      {errorMessage && (
        <div style={{ backgroundColor: '#fee2e2', color: 'var(--danger)', padding: '15px 20px', borderRadius: 'var(--border-radius-md)', fontWeight: 600, marginBottom: '20px' }}>
          {errorMessage}
        </div>
      )}

      <form onSubmit={handlePlaceOrderSubmit} className="checkout-grid">
        <div>
          {!user && (
            <div className="checkout-section">
              <h3>Contact Information</h3>
              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input
                    type="text"
                    value={guestName}
                    onChange={(e) => { setGuestName(e.target.value); if (!fullName) setFullName(e.target.value); }}
                    className="form-control"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input
                    type="email"
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    className="form-control"
                    required
                  />
                </div>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Phone Number (Order Updates)</label>
                  <input
                    type="tel"
                    value={guestPhone}
                    onChange={(e) => { setGuestPhone(e.target.value); if (!phone) setPhone(e.target.value); }}
                    className="form-control"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          <div className="checkout-section">
            <h3>Delivery Address</h3>
            <div className="grid grid-2">
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Receiver&apos;s Full Name</label>
                <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="form-control" required />
              </div>
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Street Address & Landmark</label>
                <input type="text" value={addressLine} onChange={(e) => setAddressLine(e.target.value)} className="form-control" required />
              </div>
              <div className="form-group">
                <label className="form-label">City</label>
                <input type="text" value={city} onChange={(e) => setCity(e.target.value)} className="form-control" required />
              </div>
              <div className="form-group">
                <label className="form-label">State</label>
                <input type="text" value={state} onChange={(e) => setState(e.target.value)} className="form-control" required />
              </div>
              <div className="form-group">
                <label className="form-label">Pincode</label>
                <input type="text" value={pincode} onChange={(e) => setPincode(e.target.value)} className="form-control" required />
              </div>
              <div className="form-group">
                <label className="form-label">Contact Number</label>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="form-control" required />
              </div>
            </div>
          </div>

          <div className="checkout-section">
            <h3>Payment Method</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Online Payment Option */}
              <label
                className={'form-control ' + (paymentMethod === 'Online' ? 'active' : '')}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '15px',
                  cursor: 'pointer',
                  padding: '16px',
                  border: paymentMethod === 'Online' ? '2px solid var(--primary, #0f172a)' : '1px solid var(--bg-light-border)',
                  borderRadius: 'var(--border-radius-md)',
                  backgroundColor: paymentMethod === 'Online' ? 'rgba(16, 185, 129, 0.04)' : 'transparent',
                  transition: 'all 0.2s ease'
                }}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="Online"
                  checked={paymentMethod === 'Online'}
                  onChange={() => setPaymentMethod('Online')}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--primary, #0f172a)', marginTop: '3px' }}
                />
                <CreditCard size={22} style={{ color: 'var(--primary, #0f172a)', flexShrink: 0, marginTop: '2px' }} />
                <div style={{ flexGrow: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Online Payment</span>
                    <span style={{
                      backgroundColor: '#dcfce7',
                      color: '#15803d',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: '12px',
                      letterSpacing: '0.02em',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px'
                    }}>
                      <Percent size={11} /> SAVE EXTRA 2.5%
                    </span>
                  </div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-dark-muted)', display: 'block', marginTop: '4px' }}>
                    Pay now and get 2.5% extra discount. Supports UPI, Cards, Net Banking, and Wallets.
                  </span>
                </div>
              </label>

              {/* Cash on Delivery Option */}
              <label
                className={'form-control ' + (paymentMethod === 'COD' ? 'active' : '')}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '15px',
                  cursor: 'pointer',
                  padding: '16px',
                  border: paymentMethod === 'COD' ? '2px solid var(--primary, #0f172a)' : '1px solid var(--bg-light-border)',
                  borderRadius: 'var(--border-radius-md)',
                  backgroundColor: paymentMethod === 'COD' ? 'rgba(245, 158, 11, 0.04)' : 'transparent',
                  transition: 'all 0.2s ease'
                }}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="COD"
                  checked={paymentMethod === 'COD'}
                  onChange={() => setPaymentMethod('COD')}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--primary, #0f172a)', marginTop: '3px' }}
                />
                <Banknote size={22} style={{ color: 'var(--primary, #0f172a)', flexShrink: 0, marginTop: '2px' }} />
                <div style={{ flexGrow: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Cash on Delivery</span>
                    <span style={{
                      backgroundColor: '#fef3c7',
                      color: '#b45309',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: '12px',
                      letterSpacing: '0.02em'
                    }}>
                      10% ADVANCE REQUIRED
                    </span>
                  </div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-dark-muted)', display: 'block', marginTop: '4px' }}>
                    Pay 10% advance now and the remaining amount on delivery.
                  </span>
                </div>
              </label>
            </div>
          </div>
        </div>

        <aside className="summary-box">
          <h3 className="summary-title">Order Items</h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px', borderBottom: '1px solid var(--bg-light-border)', paddingBottom: '15px' }}>
            {cart.map((item, idx) => {
              const pricing = getVariantPricing(item.product, item.selectedVariant);
              const cleanAttrs = extractCleanAttributes(item.selectedVariant);
              const variantDesc = Object.values(cleanAttrs).join(' / ');
              const itemKey = getCartItemKey(item.product?.id || item.product?._id || idx, item.selectedVariant);

              return (
                <div key={itemKey} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-dark-muted)', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.product.name} {variantDesc ? <strong style={{ color: 'var(--text-dark)' }}>({variantDesc})</strong> : ''} <strong>x{item.quantity}</strong>
                  </span>
                  <span style={{ fontWeight: 600 }}>{formatINR(pricing.sellingPrice * item.quantity)}</span>
                </div>
              );
            })}
          </div>

          <div className="summary-row">
            <span>Subtotal</span>
            <span>{formatINR(subtotal)}</span>
          </div>

          {appliedCoupon && (
            <div className="summary-row" style={{ color: 'var(--success)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Tag size={13} /> Coupon ({appliedCoupon.code})
              </span>
              <span>-{formatINR(discountAmount)}</span>
            </div>
          )}

          <div className="summary-row">
            <span>Shipping Charges</span>
            {shippingCharges === 0 ? (
              <span style={{ color: 'var(--success)', fontWeight: 600 }}>FREE</span>
            ) : (
              <span>{formatINR(shippingCharges)}</span>
            )}
          </div>

          {/* Conditional Payment Rule Breakdown */}
          {paymentMethod === 'Online' ? (
            <>
              {breakdown.prepaidDiscountAmount > 0 && (
                <div className="summary-row" style={{ color: '#15803d', fontWeight: 600 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Percent size={13} /> Prepaid Discount (2.5%)
                  </span>
                  <span>-{formatINR(breakdown.prepaidDiscountAmount)}</span>
                </div>
              )}

              <div
                style={{
                  backgroundColor: '#ecfdf5',
                  border: '1px solid #a7f3d0',
                  color: '#065f46',
                  padding: '10px 14px',
                  borderRadius: 'var(--border-radius-sm)',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  margin: '12px 0 6px'
                }}
              >
                🎉 Save extra 2.5% with prepaid online payment
              </div>

              <div className="summary-row total" style={{ marginTop: '10px' }}>
                <span>Pay Now</span>
                <span style={{ color: 'var(--primary, #0f172a)' }}>{formatINR(breakdown.payNowAmount)}</span>
              </div>
            </>
          ) : (
            <>
              <div className="summary-row" style={{ fontWeight: 600 }}>
                <span>Order Total</span>
                <span>{formatINR(breakdown.totalAmount)}</span>
              </div>

              <div
                style={{
                  backgroundColor: '#fffbeb',
                  border: '1px solid #fde68a',
                  color: '#92400e',
                  padding: '10px 14px',
                  borderRadius: 'var(--border-radius-sm)',
                  fontSize: '0.78rem',
                  lineHeight: '1.4',
                  fontWeight: 600,
                  margin: '12px 0 6px'
                }}
              >
                10% advance required to confirm your COD order.
              </div>

              <div className="summary-row" style={{ color: '#b45309', fontWeight: 700 }}>
                <span>Pay Now (10% Advance)</span>
                <span>{formatINR(breakdown.payNowAmount)}</span>
              </div>

              <div className="summary-row" style={{ color: 'var(--text-dark-muted)', fontSize: '0.85rem' }}>
                <span>Pay on Delivery</span>
                <span>{formatINR(breakdown.payOnDeliveryAmount)}</span>
              </div>

              <div className="summary-row total" style={{ marginTop: '8px' }}>
                <span>Pay Now</span>
                <span style={{ color: 'var(--primary, #0f172a)' }}>{formatINR(breakdown.payNowAmount)}</span>
              </div>
            </>
          )}

          <button
            type="submit"
            className="btn btn-accent btn-full"
            disabled={placingOrder || isProcessingPayment}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '16px' }}
          >
            {placingOrder || isProcessingPayment
              ? 'Opening Payment Gateway...'
              : paymentMethod === 'Online'
                ? `Pay Now ${formatINR(breakdown.payNowAmount)}`
                : `Pay 10% Advance (${formatINR(breakdown.payNowAmount)})`}
            <ArrowRight size={16} />
          </button>

          <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-dark-muted)', fontSize: '0.75rem' }}>
            <ShieldCheck size={18} className="text-success" style={{ flexShrink: 0 }} />
            <span>Secured checkouts via Razorpay. Stock holds only after payment verification.</span>
          </div>
        </aside>
      </form>
    </div>
  );
};

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div>Loading Checkout Details...</div>}>
      <CheckoutContent />
    </Suspense>
  );
}
