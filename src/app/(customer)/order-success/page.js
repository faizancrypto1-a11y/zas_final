'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, ArrowRight, ShieldCheck, MapPin, CreditCard, Banknote } from 'lucide-react';
import { formatINR } from 'src/lib/currency';

const SuccessContent = () => {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId') || 'ZAS-XXXXX-IND';

  const [order, setOrder] = useState(null);

  useEffect(() => {
    if (!orderId || orderId === 'ZAS-XXXXX-IND') return;
    let isMounted = true;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/orders/${orderId}`);
        const data = await res.json();
        if (isMounted && data.success && data.order) {
          setOrder(data.order);
        }
      } catch (err) {
        console.error('Failed to load order info on success page:', err);
      }
    }, 0);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [orderId]);

  const isOnline = order?.paymentMethod === 'Online';
  const isCOD = order?.paymentMethod === 'COD';

  return (
    <div className="container animate-fade" style={{ maxWidth: '620px', margin: '50px auto 70px', textAlign: 'center' }}>
      <div style={{ backgroundColor: 'white', border: '1px solid var(--bg-light-border)', borderRadius: 'var(--border-radius-lg)', padding: '40px 30px', boxShadow: 'var(--shadow-lg)' }}>
        <CheckCircle size={64} style={{ color: 'var(--success, #10b981)', margin: '0 auto 20px' }} />
        
        <h1 style={{ fontSize: '2rem', fontFamily: 'Outfit', textTransform: 'uppercase', marginBottom: '8px' }}>
          {isOnline ? 'Payment Successful' : isCOD ? 'COD Order Confirmed' : 'Order Confirmed!'}
        </h1>
        <p style={{ color: 'var(--text-dark-muted)', fontSize: '0.95rem', lineHeight: '1.5' }}>
          {isCOD
            ? 'Your 10% advance payment was received and your COD order is confirmed. Our team is preparing to pack your gear!'
            : 'Thank you for choosing ZAS SPORTS. We have received your order and payment. Our team is preparing to pack your gear!'}
        </p>

        {/* Order ID display box */}
        <div style={{ margin: '25px 0 20px', padding: '16px', backgroundColor: 'var(--bg-light)', border: '1px dashed var(--bg-light-border)', borderRadius: 'var(--border-radius-md)' }}>
          <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-dark-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>
            Your Order ID Reference
          </span>
          <h2 style={{ fontSize: '1.8rem', fontFamily: 'Outfit', color: 'var(--text-dark)', marginTop: '4px' }}>
            {orderId}
          </h2>
        </div>

        {/* Payment Details Banner */}
        {order && (
          <div
            style={{
              marginBottom: '30px',
              padding: '18px 20px',
              backgroundColor: isOnline ? '#ecfdf5' : '#fffbeb',
              border: `1px solid ${isOnline ? '#a7f3d0' : '#fde68a'}`,
              borderRadius: 'var(--border-radius-md)',
              textAlign: 'left',
              fontSize: '0.9rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              {isOnline ? (
                <CreditCard size={18} style={{ color: '#059669' }} />
              ) : (
                <Banknote size={18} style={{ color: '#d97706' }} />
              )}
              <strong style={{ color: isOnline ? '#065f46' : '#92400e', textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '0.05em' }}>
                {isOnline ? 'Prepaid Payment Breakdown' : 'Cash on Delivery Details'}
              </strong>
            </div>

            {isOnline ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#065f46' }}>Payment Status:</span>
                  <strong style={{ color: '#059669' }}>Paid</strong>
                </div>
                {order.prepaidDiscountAmount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#065f46' }}>Prepaid Discount (2.5%):</span>
                    <strong style={{ color: '#059669' }}>-{formatINR(order.prepaidDiscountAmount)}</strong>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #a7f3d0', paddingTop: '6px', fontWeight: 700 }}>
                  <span style={{ color: '#065f46' }}>Paid:</span>
                  <span style={{ color: '#065f46', fontSize: '1.05rem' }}>{formatINR(order.amountPaid || order.totalAmount)}</span>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#92400e' }}>Full Order Total:</span>
                  <strong style={{ color: '#92400e' }}>{formatINR(order.totalAmount)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#92400e' }}>Advance Paid (10%):</span>
                  <strong style={{ color: '#059669' }}>{formatINR(order.amountPaid || order.codAdvanceAmount || (order.totalAmount * 0.10))}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #fde68a', paddingTop: '6px', fontWeight: 700 }}>
                  <span style={{ color: '#92400e' }}>Remaining payable on delivery:</span>
                  <span style={{ color: '#b45309', fontSize: '1.05rem' }}>
                    {formatINR(order.amountDue || (order.totalAmount - (order.amountPaid || order.codAdvanceAmount || (order.totalAmount * 0.10))))}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <Link 
            href={`/track-order?orderId=${orderId}`}
            className="btn btn-primary btn-full"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            Track Order Live <MapPin size={16} />
          </Link>
          <a 
            href={`https://wa.me/918860654659?text=Hi%20Zassports%2C%20I%20just%20placed%20an%20order.%20My%20Order%20ID%20is%20${orderId}.%20Please%20confirm.`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-accent btn-full"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', backgroundColor: '#25D366', borderColor: '#25D366', color: 'white' }}
          >
            WhatsApp Order Support
          </a>
          <Link 
            href="/shop"
            className="btn btn-secondary btn-full"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            Continue Shopping <ArrowRight size={16} />
          </Link>
        </div>

        <div style={{ borderTop: '1px solid var(--bg-light-border)', marginTop: '30px', paddingTop: '20px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-dark-muted)', fontSize: '0.75rem', justifyContent: 'center' }}>
          <ShieldCheck size={18} className="text-success" />
          <span>Stock hold verified. Tracking updates sync directly to this page.</span>
        </div>
      </div>
    </div>
  );
};

export default function OrderSuccessPage() {
  return (
    <Suspense fallback={<div>Loading Order Details...</div>}>
      <SuccessContent />
    </Suspense>
  );
}
