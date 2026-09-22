'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ShieldCheck, Truck, CreditCard, Banknote, ArrowRight } from 'lucide-react';
import { useStore } from 'src/context/StoreContext';
import { formatINR } from 'src/lib/currency';

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

  const [paymentMethod, setPaymentMethod] = useState('COD');
  const [placingOrder, setPlacingOrder] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const orderCompletedRef = useRef(false);
  const orderPayloadRef = useRef(null);

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

  const [appliedCoupon, setAppliedCoupon] = useState(null);

  useEffect(() => {
    if (orderCompletedRef.current) return;
    if (cart.length === 0) {
      router.push('/cart');
      return;
    }
    if (user) {
      setFullName(user.name);
      setGuestName(user.name);
      setGuestEmail(user.email);
      const defaultAddr = user.addresses?.find(addr => addr.isDefault) || user.addresses?.[0];
      if (defaultAddr) {
        setFullName(defaultAddr.fullName || user.name);
        setAddressLine(defaultAddr.addressLine || '');
        setCity(defaultAddr.city || '');
        setState(defaultAddr.state || '');
        setPincode(defaultAddr.pincode || '');
        setPhone(defaultAddr.phone || '');
      }
    }
    if (couponParam) {
      validateUrlCoupon();
    }
  }, [user, cart]);

  const validateUrlCoupon = async () => {
    try {
      const sub = cart.reduce((total, item) => total + (item.product.price * item.quantity), 0);
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponParam, subtotal: sub })
      });
      const data = await res.json();
      if (data.success) {
        setAppliedCoupon({
          code: couponParam.toUpperCase(),
          discountType: data.discountType,
          discountValue: data.discountValue,
          discountAmount: data.discountAmount
        });
      }
    } catch (err) {
      console.log('Error validating URL coupon:', err);
    }
  };

  const subtotal = cart.reduce((total, item) => total + (item.product.price * item.quantity), 0);

  let discountAmount = 0;
  if (appliedCoupon) {
    if (appliedCoupon.discountType === 'percentage') {
      discountAmount = Math.round(subtotal * (appliedCoupon.discountValue / 100));
    } else {
      discountAmount = Math.min(appliedCoupon.discountValue, subtotal);
    }
  }

  const freeShippingThreshold = settings.freeShippingMinAmount || 100;
  const shippingCharges = subtotal >= freeShippingThreshold ? 0 : (settings.shippingCharges || 10);
  const totalAmount = subtotal - discountAmount + shippingCharges;

  const buildOrderPayload = () => {
    const payload = {
      orderItems: cart.map(item => ({
        product: item.product.id || item.product._id,
        price: item.product.price,
        quantity: item.quantity,
        selectedVariant: item.selectedVariant
      })),
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

  const handleCODOrder = async () => {
    const payload = buildOrderPayload();
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.success && data.order) {
      orderCompletedRef.current = true;
      clearCart();
      router.replace('/order-success?orderId=' + data.order.orderId);
    } else {
      setErrorMessage(data.error || 'Failed to place order. Please try again.');
      setPlacingOrder(false);
    }
  };

  const handleOnlinePayment = async () => {
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
        setErrorMessage('Payment gateway is loading. Please wait and try again.');
        setPlacingOrder(false);
        return;
      }

      setIsProcessingPayment(true);

      const options = {
        key: keyId,
        amount: amount,
        currency: currency,
        name: 'ZAS SPORTS',
        description: 'Order Payment - ' + formatINR(amount / 100),
        order_id: razorpayOrderId,
        prefill: prefill || {},
        notes: { address: addressLine + ', ' + city + ', ' + state + ' - ' + pincode },
        theme: { color: '#1a1a2e' },
        handler: async function (response) {
          try {
            const verifyPayload = {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              orderItems: orderPayloadRef.current ? orderPayloadRef.current.orderItems : [],
              shippingAddress: orderPayloadRef.current ? orderPayloadRef.current.shippingAddress : null,
              paymentMethod: 'Online',
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
              router.replace('/order-success?orderId=' + verifyData.orderId);
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
      console.error('Online payment error:', err);
      setErrorMessage('Something went wrong. Please try again.');
      setPlacingOrder(false);
      setIsProcessingPayment(false);
    }
  };

  const handlePlaceOrderSubmit = async (e) => {
    e.preventDefault();
    if (placingOrder || isProcessingPayment) return;

    try {
      setPlacingOrder(true);
      setErrorMessage('');

      if (paymentMethod === 'COD') {
        await handleCODOrder();
      } else {
        await handleOnlinePayment();
      }
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
                <label className="form-label">Receiver's Full Name</label>
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
              <label
                className={'form-control ' + (paymentMethod === 'COD' ? 'active' : '')}
                style={{ display: 'flex', alignItems: 'center', gap: '15px', cursor: 'pointer', padding: '16px', border: paymentMethod === 'COD' ? '2px solid var(--text-dark)' : '1px solid var(--bg-light-border)' }}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="COD"
                  checked={paymentMethod === 'COD'}
                  onChange={() => setPaymentMethod('COD')}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--text-dark)' }}
                />
                <Banknote size={20} />
                <div>
                  <span style={{ fontWeight: 700, display: 'block' }}>Cash on Delivery (COD)</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dark-muted)' }}>Pay in cash upon delivery at your doorstep.</span>
                </div>
              </label>

              <label
                className={'form-control ' + (paymentMethod === 'Online' ? 'active' : '')}
                style={{ display: 'flex', alignItems: 'center', gap: '15px', cursor: 'pointer', padding: '16px', border: paymentMethod === 'Online' ? '2px solid var(--text-dark)' : '1px solid var(--bg-light-border)' }}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="Online"
                  checked={paymentMethod === 'Online'}
                  onChange={() => setPaymentMethod('Online')}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--text-dark)' }}
                />
                <CreditCard size={20} />
                <div>
                  <span style={{ fontWeight: 700, display: 'block' }}>Online Payment</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dark-muted)' }}>Pay securely using UPI, Cards, Net Banking or Wallets.</span>
                </div>
              </label>
            </div>
          </div>
        </div>

        <aside className="summary-box">
          <h3 className="summary-title">Order Items</h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px', borderBottom: '1px solid var(--bg-light-border)', paddingBottom: '15px' }}>
            {cart.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-dark-muted)', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.product.name} {item.selectedVariant?.size ? <strong style={{ color: 'var(--text-dark)' }}>({item.selectedVariant.size})</strong> : ''} <strong>x{item.quantity}</strong>
                </span>
                <span style={{ fontWeight: 600 }}>{formatINR(item.product.price * item.quantity)}</span>
              </div>
            ))}
          </div>

          <div className="summary-row">
            <span>Subtotal</span>
            <span>{formatINR(subtotal)}</span>
          </div>

          {appliedCoupon && (
            <div className="summary-row" style={{ color: 'var(--success)' }}>
              <span>Discount ({appliedCoupon.code})</span>
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

          <div className="summary-row total">
            <span>Total</span>
            <span>{formatINR(totalAmount)}</span>
          </div>

          <button
            type="submit"
            className="btn btn-accent btn-full"
            disabled={placingOrder || isProcessingPayment}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            {placingOrder || isProcessingPayment ? 'Processing...' : 'Place Secure Order'} <ArrowRight size={16} />
          </button>

          <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-dark-muted)', fontSize: '0.75rem' }}>
            <ShieldCheck size={18} className="text-success" style={{ flexShrink: 0 }} />
            <span>Secured checkouts. Stock holds only after invoice confirmation.</span>
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
