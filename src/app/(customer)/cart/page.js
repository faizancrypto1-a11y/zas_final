'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ShoppingBag, Trash2, Heart, ArrowRight, ShieldCheck, Ticket } from 'lucide-react';
import { useStore } from 'src/context/StoreContext';
import InlineSVG from 'src/components/InlineSVG';
import { formatINR } from 'src/lib/currency';

const CartPage = () => {
  const { 
    cart, 
    updateCartQty, 
    removeFromCart, 
    toggleWishlist, 
    wishlist,
    settings 
  } = useStore();

  const [couponCode, setCouponCode] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState('');
  const [couponSuccess, setCouponSuccess] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null); // { code, discountType, discountValue, discountAmount }

  // 1. Calculations
  const subtotal = cart.reduce((total, item) => total + (item.product.price * item.quantity), 0);
  
  // Calculate dynamic coupon discount amount
  let discountAmount = 0;
  if (appliedCoupon) {
    if (appliedCoupon.discountType === 'percentage') {
      discountAmount = Math.round(subtotal * (appliedCoupon.discountValue / 100));
    } else {
      discountAmount = Math.min(appliedCoupon.discountValue, subtotal);
    }
  }

  // Calculate dynamic shipping charges
  const freeShippingThreshold = settings.freeShippingMinAmount || 100;
  const shippingCharges = subtotal >= freeShippingThreshold ? 0 : (settings.shippingCharges || 10);
  const totalAmount = subtotal - discountAmount + shippingCharges;

  // 2. Validate Coupon Code on backend API
  const handleApplyCoupon = async (e) => {
    e.preventDefault();
    if (!couponCode.trim()) return;

    try {
      setCouponLoading(true);
      setCouponError('');
      setCouponSuccess('');

      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: couponCode.trim(),
          subtotal
        })
      });
      const data = await res.json();

      if (data.success) {
        setAppliedCoupon({
          code: couponCode.trim().toUpperCase(),
          discountType: data.discountType,
          discountValue: data.discountValue,
          discountAmount: data.discountAmount
        });
        setCouponSuccess(`Coupon code '${couponCode.toUpperCase()}' applied successfully!`);
      } else {
        setCouponError(data.error || 'Failed to apply coupon');
        setAppliedCoupon(null);
      }
      setCouponLoading(false);
    } catch (err) {
      console.error('Error applying coupon:', err);
      setCouponError('Network error checking coupon validity');
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponSuccess('');
    setCouponError('');
  };

  const handleMoveToWishlist = (productId, selectedVariant) => {
    toggleWishlist(productId);
    removeFromCart(productId, selectedVariant);
    alert('Item moved to wishlist!');
  };

  if (cart.length === 0) {
    return (
      <div className="container animate-fade" style={{ padding: '80px 20px', textAlign: 'center' }}>
        <ShoppingBag size={64} style={{ color: 'var(--text-dark-muted)', marginBottom: '20px' }} />
        <h2>Your Shopping Cart is Empty</h2>
        <p style={{ color: 'var(--text-dark-muted)', marginTop: '8px' }}>Looks like you haven't added any cricket gear to your cart yet.</p>
        <Link href="/shop" className="btn btn-primary" style={{ marginTop: '24px' }}>
          Explore Products <ArrowRight size={16} />
        </Link>
      </div>
    );
  }

  return (
    <div className="container animate-fade">
      <h1 style={{ fontSize: '2rem', textTransform: 'uppercase', fontFamily: 'Outfit', margin: '30px 0 10px' }}>
        Your Shopping Cart
      </h1>
      <p style={{ color: 'var(--text-dark-muted)', marginBottom: '30px' }}>
        Double check items size, hand orientation, and quantity before checking out.
      </p>

      <div className="cart-layout">
        {/* Items List */}
        <div className="cart-items">
          {cart.map((item, idx) => (
            <div key={idx} className="cart-item">
              <div className="cart-item-img">
                {item.product.images && item.product.images.length > 0 ? (
                  <img src={item.product.images[0]} alt={item.product.name} />
                ) : (
                  <InlineSVG type={item.product.category} />
                )}
              </div>

              <div className="cart-item-details">
                <div>
                  <h3 className="cart-item-title">
                    <Link href={`/product/${item.product.slug}`}>{item.product.name}</Link>
                  </h3>
                  
                  {/* Selected Variants display */}
                  {item.selectedVariant && Object.keys(item.selectedVariant).length > 0 && (
                    <div className="cart-item-variant">
                      {Object.entries(item.selectedVariant).map(([key, value]) => (
                        <span key={key} style={{ marginRight: '10px' }}>
                          <strong>{key.charAt(0).toUpperCase() + key.slice(1)}:</strong> {value}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="cart-item-actions">
                  <div style={{ display: 'flex', gap: '15px' }}>
                    <button 
                      type="button" 
                      className="cart-remove-btn"
                      onClick={() => removeFromCart(item.product.id || item.product._id, item.selectedVariant)}
                    >
                      <Trash2 size={14} /> Remove
                    </button>
                    <button 
                      type="button" 
                      style={{ fontSize: '0.8rem', color: 'var(--text-dark-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}
                      onClick={() => handleMoveToWishlist(item.product.id || item.product._id, item.selectedVariant)}
                    >
                      <Heart size={14} /> Move to Wishlist
                    </button>
                  </div>

                  {/* Quantity controls */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div className="qty-selector" style={{ border: '1px solid var(--bg-light-border)' }}>
                      <button 
                        type="button" 
                        className="qty-btn" 
                        style={{ padding: '4px 10px' }}
                        onClick={() => updateCartQty(item.product.id || item.product._id, item.selectedVariant, item.quantity - 1)}
                      >
                        -
                      </button>
                      <span className="qty-input" style={{ width: '30px' }}>{item.quantity}</span>
                      <button 
                        type="button" 
                        className="qty-btn" 
                        style={{ padding: '4px 10px' }}
                        onClick={() => updateCartQty(item.product.id || item.product._id, item.selectedVariant, item.quantity + 1)}
                      >
                        +
                      </button>
                    </div>
                    <span className="cart-item-price">{formatINR(item.product.price * item.quantity)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Order Summary box */}
        <aside className="summary-box">
          <h3 className="summary-title">Summary</h3>

          {/* Coupon Code Input */}
          <div className="coupon-box">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Ticket size={14} /> Promo Coupon Code
            </label>
            {!appliedCoupon ? (
              <form onSubmit={handleApplyCoupon} className="coupon-input-row">
                <input 
                  type="text" 
                  placeholder="e.g. APEX10" 
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  className="form-control"
                  style={{ textTransform: 'uppercase' }}
                />
                <button type="submit" className="btn btn-secondary btn-sm" disabled={couponLoading}>
                  {couponLoading ? '...' : 'Apply'}
                </button>
              </form>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', padding: '10px 14px', backgroundColor: 'var(--bg-light)', borderRadius: 'var(--border-radius-sm)' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{appliedCoupon.code} Applied</span>
                <button type="button" className="text-danger" style={{ fontSize: '0.8rem', fontWeight: 600 }} onClick={handleRemoveCoupon}>Remove</button>
              </div>
            )}
            {couponError && <p style={{ fontSize: '0.75rem', color: 'var(--danger)', fontWeight: 600, marginTop: '5px' }}>{couponError}</p>}
            {couponSuccess && <p style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: 600, marginTop: '5px' }}>{couponSuccess}</p>}
          </div>

          {/* Calculations list */}
          <div className="summary-row">
            <span>Subtotal</span>
            <span style={{ fontWeight: 600, color: 'var(--text-dark)' }}>{formatINR(subtotal)}</span>
          </div>

          {appliedCoupon && (
            <div className="summary-row" style={{ color: 'var(--success)' }}>
              <span>Coupon Discount ({appliedCoupon.code})</span>
              <span style={{ fontWeight: 600 }}>-{formatINR(discountAmount)}</span>
            </div>
          )}

          <div className="summary-row">
            <span>Shipping Fees</span>
            {shippingCharges === 0 ? (
              <span style={{ color: 'var(--success)', fontWeight: 600 }}>FREE</span>
            ) : (
              <span style={{ fontWeight: 600, color: 'var(--text-dark)' }}>{formatINR(shippingCharges)}</span>
            )}
          </div>
          
          {subtotal < freeShippingThreshold && (
            <p style={{ fontSize: '0.75rem', color: 'var(--text-dark-muted)', marginTop: '-8px', marginBottom: '12px' }}>
              Add <strong>{formatINR(freeShippingThreshold - subtotal)}</strong> more for FREE Shipping!
            </p>
          )}

          <div className="summary-row total">
            <span>Total</span>
            <span>{formatINR(totalAmount)}</span>
          </div>

          <Link 
            href={{
              pathname: '/checkout',
              query: appliedCoupon ? { coupon: appliedCoupon.code } : {}
            }}
            className="btn btn-primary btn-full"
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            Proceed to Checkout <ArrowRight size={16} />
          </Link>

          <div style={{ marginTop: '20px', borderTop: '1px solid var(--bg-light-border)', paddingTop: '15px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-dark-muted)', fontSize: '0.75rem' }}>
            <ShieldCheck size={18} className="text-success" style={{ flexShrink: 0 }} />
            <span>Fully secured e-commerce platform. Price checked and validated directly.</span>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default CartPage;
