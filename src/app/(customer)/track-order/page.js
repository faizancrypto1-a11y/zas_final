'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search, MapPin, Truck, Box, CheckCircle2, AlertTriangle } from 'lucide-react';
import { formatINR } from 'src/lib/currency';

const TrackOrderContent = () => {
  const searchParams = useSearchParams();
  const orderIdParam = searchParams.get('orderId') || '';

  const [orderId, setOrderId] = useState('');
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleTrackOrder = useCallback(async (searchId) => {
    if (!searchId) return;

    try {
      setLoading(true);
      setError('');
      setOrder(null);

      const res = await fetch(`/api/orders/${searchId}`);
      const data = await res.json();

      if (data.success && data.order) {
        setOrder(data.order);
      } else {
        setError(data.error || 'Failed to locate order. Verify your reference ID.');
      }
      setLoading(false);
    } catch (err) {
      console.error('Tracking query error:', err);
      setError('Network error searching for order details.');
      setLoading(false);
    }
  }, []);

  // Auto trigger tracking if orderId is in URL parameters
  useEffect(() => {
    if (orderIdParam) {
      const timer = setTimeout(() => {
        setOrderId(orderIdParam);
        handleTrackOrder(orderIdParam);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [orderIdParam, handleTrackOrder]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (orderId.trim()) {
      handleTrackOrder(orderId.trim().toUpperCase());
    }
  };

  // Timeline progress configuration
  const getProgressStyles = (status) => {
    const statusMap = {
      'Pending': { width: '10%', activeNodeIndex: 0 },
      'Confirmed': { width: '32.5%', activeNodeIndex: 1 },
      'Packed': { width: '55%', activeNodeIndex: 2 },
      'Shipped': { width: '77.5%', activeNodeIndex: 3 },
      'Delivered': { width: '100%', activeNodeIndex: 4 }
    };
    return statusMap[status] || { width: '0%', activeNodeIndex: -1 };
  };

  const timelineNodes = [
    { label: 'Pending', desc: 'Order Placed' },
    { label: 'Confirmed', desc: 'Accepted' },
    { label: 'Packed', desc: 'Ready to Ship' },
    { label: 'Shipped', desc: 'In Transit' },
    { label: 'Delivered', desc: 'Handed Over' }
  ];

  const currentProgress = order ? getProgressStyles(order.orderStatus) : { width: '0%', activeNodeIndex: -1 };

  return (
    <div className="container animate-fade" style={{ maxWidth: '800px', margin: '40px auto 60px' }}>
      
      {/* 1. SEARCH FORM PANEL */}
      <div style={{ backgroundColor: 'white', border: '1px solid var(--bg-light-border)', borderRadius: 'var(--border-radius-md)', padding: '30px', boxShadow: 'var(--shadow-sm)', marginBottom: '30px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '1.5rem', fontFamily: 'Outfit', textTransform: 'uppercase', marginBottom: '8px' }}>
          Track Your Order
        </h1>
        <p style={{ color: 'var(--text-dark-muted)', fontSize: '0.85rem', marginBottom: '20px' }}>
          Enter your unique order tracking reference (e.g. ZAS-98317-IND) below to check delivery status.
        </p>

        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '8px', maxWidth: '500px', margin: '0 auto' }}>
          <input 
            type="text" 
            placeholder="e.g. ZAS-16728-IND" 
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            className="form-control"
            style={{ textTransform: 'uppercase' }}
            required
          />
          <button type="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }} disabled={loading}>
            <Search size={16} /> {loading ? 'Checking...' : 'Track'}
          </button>
        </form>
      </div>

      {error && (
        <div style={{ backgroundColor: '#fee2e2', color: 'var(--danger)', padding: '15px 20px', borderRadius: 'var(--border-radius-md)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '10px' }} className="animate-fade">
          <AlertTriangle size={18} /> {error}
        </div>
      )}

      {/* 2. TRACKER INFORMATION DETAILS */}
      {order && (
        <div className="animate-slide-up">
          {/* Timeline chart */}
          {['Cancelled', 'Returned'].includes(order.orderStatus) ? (
            <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fef3c7', color: 'var(--warning)', borderRadius: 'var(--border-radius-md)', padding: '20px', marginBottom: '30px', display: 'flex', alignItems: 'center', gap: '15px' }}>
              <AlertTriangle size={24} />
              <div>
                <h4 style={{ fontFamily: 'Outfit', fontWeight: 700 }}>Order status: {order.orderStatus}</h4>
                <p style={{ fontSize: '0.85rem', marginTop: '2px', color: 'var(--text-dark-muted)' }}>
                  This order has been {order.orderStatus.toLowerCase()} and will not follow standard delivery timelines. Refunds are processed within 5 days.
                </p>
              </div>
            </div>
          ) : (
            <div className="tracker-container" style={{ margin: '0 0 30px' }}>
              <h3 style={{ fontSize: '1.2rem', fontFamily: 'Outfit' }}>Shipment Progress</h3>
              
              <div className="tracker-timeline">
                <div 
                  className="tracker-progress-bar" 
                  style={{ width: currentProgress.width }}
                />
                {timelineNodes.map((node, index) => {
                  const isNodeActive = index <= currentProgress.activeNodeIndex;
                  return (
                    <div 
                      key={node.label}
                      className={`tracker-node ${isNodeActive ? 'active' : ''}`}
                    >
                      <div className="tracker-node-circle">
                        {isNodeActive ? '✓' : index + 1}
                      </div>
                      <span className="tracker-node-label">{node.label}</span>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-dark-muted)', marginTop: '-4px' }}>
                        {node.desc}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Details Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '30px' }}>
            {/* Order Items */}
            <div style={{ backgroundColor: 'white', border: '1px solid var(--bg-light-border)', borderRadius: 'var(--border-radius-md)', padding: '25px' }}>
              <h3 style={{ fontSize: '1.1rem', fontFamily: 'Outfit', borderBottom: '1px solid var(--bg-light-border)', paddingBottom: '10px', marginBottom: '15px' }}>
                Items Summary
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {order.orderItems.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                    <div style={{ width: '50px', height: '50px', borderRadius: '4px', border: '1px solid var(--bg-light-border)', overflow: 'hidden', backgroundColor: 'var(--bg-light)' }}>
                      <img src={item.image || 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?q=80&w=100'} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <div style={{ flexGrow: 1 }}>
                      <h4 style={{ fontSize: '0.85rem', fontWeight: 600 }}>{item.name}</h4>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-dark-muted)' }}>
                        Quantity: {item.quantity} | Price: {formatINR(item.price)}
                      </span>
                    </div>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{formatINR(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>
              
              <div style={{ borderTop: '1px solid var(--bg-light-border)', marginTop: '20px', paddingTop: '15px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Subtotal</span>
                  <span>{formatINR(order.subtotal)}</span>
                </div>
                {order.discountAmount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--success)' }}>
                    <span>Discount</span>
                    <span>-{formatINR(order.discountAmount)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Shipping Fees</span>
                  <span>{order.shippingPrice === 0 ? 'FREE' : formatINR(order.shippingPrice)}</span>
                </div>
                {order.prepaidDiscountAmount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--success)' }}>
                    <span>Prepaid Discount (2.5%)</span>
                    <span>-{formatINR(order.prepaidDiscountAmount)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1rem', borderTop: '1px solid var(--bg-light-border)', paddingTop: '10px' }}>
                  <span>Total Amount</span>
                  <span>{formatINR(order.totalAmount)}</span>
                </div>
                {order.paymentMethod === 'COD' && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#15803d' }}>
                      <span>Advance Paid</span>
                      <span>{formatINR(order.amountPaid || order.codAdvanceAmount || (order.totalAmount * 0.10))}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#b45309', fontWeight: 600 }}>
                      <span>Due on Delivery</span>
                      <span>{formatINR(order.amountDue || (order.totalAmount - (order.amountPaid || order.codAdvanceAmount || (order.totalAmount * 0.10))))}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Courier & Shipping Address */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Courier info */}
              {order.trackingId && (
                <div style={{ backgroundColor: 'white', border: '1px solid var(--bg-light-border)', borderRadius: 'var(--border-radius-md)', padding: '25px' }}>
                  <h3 style={{ fontSize: '1.1rem', fontFamily: 'Outfit', borderBottom: '1px solid var(--bg-light-border)', paddingBottom: '10px', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Truck size={18} /> Shipping Carrier
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem' }}>
                    <div>
                      <span style={{ color: 'var(--text-dark-muted)', fontSize: '0.75rem', fontWeight: 700 }}>COURIER PARTNER</span>
                      <p style={{ fontWeight: 600 }}>{order.courierName}</p>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-dark-muted)', fontSize: '0.75rem', fontWeight: 700 }}>TRACKING ID NUMBER</span>
                      <p style={{ fontWeight: 700, color: 'var(--text-dark)' }}>{order.trackingId}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Shipping Address */}
              <div style={{ backgroundColor: 'white', border: '1px solid var(--bg-light-border)', borderRadius: 'var(--border-radius-md)', padding: '25px' }}>
                <h3 style={{ fontSize: '1.1rem', fontFamily: 'Outfit', borderBottom: '1px solid var(--bg-light-border)', paddingBottom: '10px', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <MapPin size={18} /> Delivery Address
                </h3>
                <div style={{ fontSize: '0.85rem', lineHeight: '1.5' }}>
                  <h4 style={{ fontWeight: 700, marginBottom: '6px' }}>{order.shippingAddress.fullName}</h4>
                  <p style={{ color: 'var(--text-dark-muted)' }}>
                    {order.shippingAddress.addressLine}, <br />
                    {order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.pincode}
                  </p>
                  <p style={{ marginTop: '10px', color: 'var(--text-dark-muted)' }}>Phone: {order.shippingAddress.phone}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default function TrackOrderPage() {
  return (
    <Suspense fallback={<div>Loading Tracking Tools...</div>}>
      <TrackOrderContent />
    </Suspense>
  );
}
