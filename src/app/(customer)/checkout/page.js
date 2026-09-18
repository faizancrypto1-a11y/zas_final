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

  // Shipping Address Form State
  const [fullName, setFullName] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [phone, setPhone] = useState('');

  // Guest details form state
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');

  const [paymentMethod, setPaymentMethod] = useState('COD'); // COD or Online
  const [placingOrder, setPlacingOrder] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Set once an order succeeds. Stops the empty-cart effect from racing a
  // /cart redirect against the /order-success navigation after clearCart().
  const orderCompletedRef = useRef(false);

  // Coupon calculations
  const [appliedCoupon, setAppliedCoupon] = useState(null);

  // 1. Initial mounting checks
  useEffect(() => {
    // Order just completed: cart was cleared on purpose. Do not redirect to
    // /cart — the success navigation owns the transition now.
    if (orderCompletedRef.current) return;

    if (cart.length === 0) {
      router.push('/cart');
      return;
    }

    // Autofill user profile data if logged in
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

    // Load applied coupon details from API validation
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
        body: JSON.stringify({
          code: couponParam,
          subtotal: sub
        })
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

  // 2. Calculations
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

  // 3. Form Submission
  const handlePlaceOrderSubmit = async (e) => {
    e.preventDefault();
    if (placingOrder) return;

    try {
      setPlacingOrder(true);
      setErrorMessage('');

      // Build payload matching exact specifications
      const payload = {
        orderItems: cart.map(item => ({
          product: item.product.id || item.product._id,
          quantity: item.quantity,
          selectedVariant: item.selectedVariant
        })),
        shippingAddress: {
          fullName,
          addressLine,
          city,
          state,
          pincode,
          phone
        },
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

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.success && data.order) {
        // Flag completion BEFORE clearing the cart so the empty-cart effect
        // skips its /cart redirect. Keep placingOrder true so the button stays
        // locked and no duplicate order can be submitted mid-navigation.
        orderCompletedRef.current = true;
        clearCart();
        // replace() so back button cannot return to checkout and resubmit.
        router.replace(`/order-success?orderId=${data.order.orderId}`);
      } else {
        setErrorMessage(data.error || 'Failed to place order. Check stock availability.');
        setPlacingOrder(false);
      }

    } catch (err) {
      console.error('Checkout submit error:', err);
      setErrorMessage('Network error completing checkout process.');
      setPlacingOrder(false);
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
        {/* Left Forms */}
        <div>
          {/* Guest Contact Details (if not logged in) */}
          {!user && (
            <div className="checkout-section">
              <h3>Contact Information</h3>
              <div className="grid grid-2">
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input 
                    type="text" 
                    value={guestName}
                    onChange={(e) => {
                      setGuestName(e.target.value);
                      if (!fullName) setFullName(e.target.value);
                    }}
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
                    onChange={(e) => {
                      setGuestPhone(e.target.value);
                      if (!phone) setPhone(e.target.value);
                    }}
                    className="form-control"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {/* Delivery Address */}
          <div className="checkout-section">
            <h3>Delivery Address</h3>
            <div className="grid grid-2">
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Receiver's Full Name</label>
                <input 
                  type="text" 
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="form-control"
                  required
                />
              </div>
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Street Address & Landmark</label>
                <input 
                  type="text" 
                  value={addressLine}
                  onChange={(e) => setAddressLine(e.target.value)}
                  className="form-control"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">City</label>
                <input 
                  type="text" 
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="form-control"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">State</label>
                <input 
                  type="text" 
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="form-control"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Pincode</label>
                <input 
                  type="text" 
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  className="form-control"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Contact Number</label>
                <input 
                  type="tel" 
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="form-control"
                  required
                />
              </div>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div className="checkout-section">
            <h3>Payment Method</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <label 
                className={`form-control ${paymentMethod === 'COD' ? 'active' : ''}`}
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

              {/* Online Payment Option - DISABLED FOR PRODUCTION */}
              <label 
                className={`form-control ${paymentMethod === 'Online' ? 'active' : ''}`}
                style={{ display: 'flex', alignItems: 'center', gap: '15px', cursor: 'not-allowed', padding: '16px', border: paymentMethod === 'Online' ? '2px solid var(--text-dark)' : '1px solid var(--bg-light-border)', opacity: 0.6 }}
              >
                <input 
                  type="radio" 
                  name="paymentMethod" 
                  value="Online"
                  checked={paymentMethod === 'Online'}
                  onChange={() => {}}
                  disabled
                  style={{ width: '20px', height: '20px', accentColor: 'var(--text-dark)', cursor: 'not-allowed' }}
                />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontWeight: '600', fontSize: '1.05rem', color: 'var(--text-dark)' }}>Online Payment (Currently Unavailable)</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dark-muted)' }}>Online payments will be available soon.</span>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Right Summary column */}
        <aside className="summary-box">
          <h3 className="summary-title">Order Items</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px', borderBottom: '1px solid var(--bg-light-border)', paddingBottom: '15px' }}>
            {cart.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-dark-muted)', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.product.name} <strong>x{item.quantity}</strong>
                </span>
                <span style={{ fontWeight: 600 }}>{formatINR(item.product.price * item.quantity)}</span>
              </div>
            ))}
          </div>

          {/* Pricing math */}
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
            disabled={placingOrder}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            {placingOrder ? 'Processing...' : 'Place Secure Order'} <ArrowRight size={16} />
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
