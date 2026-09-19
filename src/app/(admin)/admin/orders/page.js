'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Search, 
  X, 
  Printer, 
  Truck, 
  DollarSign, 
  User, 
  MapPin, 
  Clock, 
  SlidersHorizontal 
} from 'lucide-react';
import { formatINR } from 'src/lib/currency';

const OrdersManagement = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals state
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedPrintOrder, setSelectedPrintOrder] = useState(null);

  // Edit fields
  const [orderStatus, setOrderStatus] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [trackingId, setTrackingId] = useState('');
  const [courierName, setCourierName] = useState('');

  const fetchAdminOrders = useCallback(async () => {
    try {
      setLoading(true);
      let url = '/api/orders';
      // To bypass search limitations, we can search by orderId or fetch all and filter locally
      const res = await fetch(url);
      const data = await res.json();

      if (res.ok && data.success) {
        let filtered = data.orders || [];

        if (search) {
          filtered = filtered.filter(o =>
            (o.orderId && o.orderId.toLowerCase().includes(search.toLowerCase())) ||
            (o.shippingAddress?.fullName && o.shippingAddress.fullName.toLowerCase().includes(search.toLowerCase()))
          );
        }

        if (statusFilter) {
          filtered = filtered.filter(o => o.orderStatus === statusFilter);
        }

        setOrders(filtered);
      } else {
        setOrders([]);
      }
      setLoading(false);
    } catch (err) {
      console.log('Error fetching admin orders:', err);
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchAdminOrders();
  }, [fetchAdminOrders]);

  const handleOpenDetailsModal = (order) => {
    setSelectedOrder(order);
    setOrderStatus(order.orderStatus);
    setPaymentStatus(order.paymentStatus);
    setTrackingId(order.trackingId || '');
    setCourierName(order.courierName || '');
  };

  const handleUpdateOrder = async (e) => {
    e.preventDefault();
    if (!selectedOrder) return;

    try {
      const orderId = selectedOrder.id || selectedOrder._id;
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderStatus,
          paymentStatus,
          trackingId,
          courierName
        })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setSelectedOrder(null);
        fetchAdminOrders();
      } else {
        alert(data.error || 'Failed to update order');
      }
    } catch (err) {
      console.log('Error updating order:', err);
    }
  };

  const handlePrint = (order) => {
    setSelectedPrintOrder(order);
    // Give state some ticks to hydrarate printer-only DOM overlay
    setTimeout(() => {
      window.print();
    }, 250);
  };

  const orderStatuses = ['Pending', 'Confirmed', 'Packed', 'Shipped', 'Delivered', 'Cancelled', 'Returned'];
  const paymentStatuses = ['Pending', 'Paid', 'Failed', 'Refunded'];

  return (
    <div className="animate-fade">
      
      {/* Header */}
      <div className="admin-header-row">
        <div className="admin-title-desc">
          <h2>Order Shipments</h2>
          <p>Update logistics, print invoices, and moderate customer purchases.</p>
        </div>
      </div>

      {/* Filter Row */}
      <div className="admin-card table-filter-row" style={{ backgroundColor: 'var(--bg-dark-card)' }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <Search size={16} style={{ color: 'var(--text-light-muted)' }} />
          <input 
            type="text" 
            placeholder="Search by Order ID or Customer Name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="admin-search-input"
            style={{ width: '320px' }}
          />
        </div>
        <div className="table-filter-actions">
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="admin-select"
          >
            <option value="">All Statuses</option>
            {orderStatuses.map(st => (
              <option key={st} value={st}>{st}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Orders Table */}
      {loading ? (
        <p style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-light-muted)' }}>Loading order registries...</p>
      ) : (
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Receiver Name</th>
                <th>Date Placed</th>
                <th>Payment Status</th>
                <th>Shipment Status</th>
                <th>Total Price</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(order => (
                <tr key={order.id || order._id}>
                  <td style={{ fontWeight: 700, color: 'white' }}>{order.orderId}</td>
                  <td>{order.shippingAddress.fullName}</td>
                  <td>{new Date(order.createdAt).toLocaleDateString()}</td>
                  <td>
                    <span className={`status-badge ${order.paymentStatus === 'Paid' ? 'success' : order.paymentStatus === 'Failed' ? 'failed' : 'pending'}`}>
                      {order.paymentStatus}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge ${order.orderStatus === 'Delivered' ? 'success' : order.orderStatus === 'Cancelled' ? 'failed' : 'pending'}`}>
                      {order.orderStatus}
                    </span>
                  </td>
                  <td style={{ fontWeight: 700, color: 'white' }}>{formatINR(order.totalAmount)}</td>
                  <td>
                    <div className="action-btns">
                      <button 
                        type="button" 
                        className="action-btn edit" 
                        onClick={() => handleOpenDetailsModal(order)}
                        title="Update Logistics & Status"
                      >
                        <SlidersHorizontal size={14} />
                      </button>
                      <button 
                        type="button" 
                        className="action-btn" 
                        onClick={() => handlePrint(order)}
                        title="Print Invoice"
                      >
                        <Printer size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-light-muted)' }}>
                    No orders placed in this store yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* UPDATE STATUS & DETAILS MODAL */}
      {selectedOrder && (
        <div className="admin-modal-overlay">
          <div className="admin-modal animate-slide-up" style={{ maxWidth: '680px' }}>
            <div className="admin-modal-header">
              <h3>Order details: {selectedOrder.orderId}</h3>
              <button type="button" onClick={() => setSelectedOrder(null)} style={{ color: 'white' }}>
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleUpdateOrder}>
              <div className="admin-modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '30px', marginBottom: '24px' }}>
                  
                  {/* Address and Contact details */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-light-muted)' }}>Shipping Destination</span>
                      <p style={{ fontWeight: 600, color: 'white', marginTop: '4px' }}>{selectedOrder.shippingAddress.fullName}</p>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-light-muted)', marginTop: '2px', lineHeight: '1.4' }}>
                        {selectedOrder.shippingAddress.addressLine}, <br />
                        {selectedOrder.shippingAddress.city}, {selectedOrder.shippingAddress.state} - {selectedOrder.shippingAddress.pincode}
                      </p>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-light-muted)', marginTop: '4px' }}>Phone: {selectedOrder.shippingAddress.phone}</p>
                    </div>
                    
                    {selectedOrder.guestDetails && (
                      <div>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-light-muted)' }}>Guest Contacts</span>
                        <p style={{ fontSize: '0.85rem', color: 'white', marginTop: '4px' }}>Email: {selectedOrder.guestDetails.email}</p>
                      </div>
                    )}
                  </div>

                  {/* Logistics updates */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div className="admin-form-group">
                      <label>Shipment Status</label>
                      <select 
                        value={orderStatus} 
                        onChange={(e) => setOrderStatus(e.target.value)}
                        className="admin-select"
                        style={{ width: '100%', padding: '10px' }}
                      >
                        {orderStatuses.map(st => (
                          <option key={st} value={st}>{st}</option>
                        ))}
                      </select>
                    </div>

                    <div className="admin-form-group">
                      <label>Payment Status</label>
                      <select 
                        value={paymentStatus} 
                        onChange={(e) => setPaymentStatus(e.target.value)}
                        className="admin-select"
                        style={{ width: '100%', padding: '10px' }}
                      >
                        {paymentStatuses.map(pt => (
                          <option key={pt} value={pt}>{pt}</option>
                        ))}
                      </select>
                    </div>

                    <div className="admin-form-group">
                      <label>Courier Carrier</label>
                      <input 
                        type="text" 
                        value={courierName} 
                        onChange={(e) => setCourierName(e.target.value)}
                        placeholder="e.g. DHL Express"
                        className="admin-form-control"
                        style={{ padding: '10px' }}
                      />
                    </div>

                    <div className="admin-form-group">
                      <label>Tracking ID Number</label>
                      <input 
                        type="text" 
                        value={trackingId} 
                        onChange={(e) => setTrackingId(e.target.value)}
                        placeholder="e.g. ZAS-9812-IN"
                        className="admin-form-control"
                        style={{ padding: '10px' }}
                      />
                    </div>
                  </div>
                </div>

                {/* Items List inside details */}
                <h4 style={{ fontSize: '0.9rem', fontFamily: 'Outfit', color: 'white', borderBottom: '1px solid var(--bg-dark-border)', paddingBottom: '6px', marginBottom: '12px' }}>
                  Ordered Items
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem' }}>
                  {(selectedOrder.orderItems || []).map((item, idx) => (
                    <div key={item.id || item._id || idx} style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-light-muted)' }}>
                        {item.name} <strong>x{item.quantity}</strong>
                      </span>
                      <span style={{ fontWeight: 700, color: 'white' }}>{formatINR(item.price * item.quantity)}</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--bg-dark-border)', paddingTop: '10px', fontWeight: 700, color: 'var(--primary)', fontSize: '0.95rem' }}>
                    <span>Order Total</span>
                    <span>{formatINR(selectedOrder.totalAmount)}</span>
                  </div>
                </div>

              </div>

              <div className="admin-modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary btn-sm"
                  onClick={() => setSelectedOrder(null)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-accent btn-sm">
                  Save Logistics
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. PRINTER FRIENDLY INVOICE SHEET (Media Print Rendered Only) */}
      {selectedPrintOrder && (
        <div className="invoice-print-container" style={{ padding: '40px', fontFamily: 'sans-serif' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid black', paddingBottom: '20px', marginBottom: '30px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 800 }}>ZAS SPORTS</h2>
            </div>
            <div style={{ textAlign: 'right' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>INVOICE SHEET</h3>
              <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#555' }}>ID Reference: {selectedPrintOrder.orderId}</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', marginBottom: '40px', fontSize: '13px' }}>
            <div>
              <h4 style={{ margin: '0 0 8px', fontWeight: 700, textTransform: 'uppercase' }}>BILL TO / SHIP TO:</h4>
              <strong>{selectedPrintOrder.shippingAddress.fullName}</strong>
              <p style={{ margin: '4px 0', lineHeight: '1.4' }}>
                {selectedPrintOrder.shippingAddress.addressLine}, <br />
                {selectedPrintOrder.shippingAddress.city}, {selectedPrintOrder.shippingAddress.state} - {selectedPrintOrder.shippingAddress.pincode}
              </p>
              <p style={{ margin: '6px 0 0' }}>Phone: {selectedPrintOrder.shippingAddress.phone}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <h4 style={{ margin: '0 0 8px', fontWeight: 700, textTransform: 'uppercase' }}>ORDER DETAILS:</h4>
              <p style={{ margin: '4px 0' }}><strong>Date:</strong> {new Date(selectedPrintOrder.createdAt).toLocaleDateString()}</p>
              <p style={{ margin: '4px 0' }}><strong>Payment Method:</strong> {selectedPrintOrder.paymentMethod}</p>
              <p style={{ margin: '4px 0' }}><strong>Payment Status:</strong> {selectedPrintOrder.paymentStatus}</p>
              {selectedPrintOrder.trackingId && (
                <p style={{ margin: '4px 0' }}><strong>Shipping Tracking:</strong> {selectedPrintOrder.courierName} ({selectedPrintOrder.trackingId})</p>
              )}
            </div>
          </div>

          {/* Items Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', marginBottom: '40px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid black' }}>
                <th style={{ textAlign: 'left', padding: '10px 0', fontWeight: 700 }}>SKU</th>
                <th style={{ textAlign: 'left', padding: '10px 0', fontWeight: 700 }}>Item Description</th>
                <th style={{ textAlign: 'right', padding: '10px 0', fontWeight: 700 }}>Price</th>
                <th style={{ textAlign: 'right', padding: '10px 0', fontWeight: 700 }}>Qty</th>
                <th style={{ textAlign: 'right', padding: '10px 0', fontWeight: 700 }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {(selectedPrintOrder.orderItems || []).map((item, idx) => (
                <tr key={item.id || item._id || idx} style={{ borderBottom: '1px solid #ddd' }}>
                  <td style={{ padding: '12px 0' }}>{item.sku}</td>
                  <td style={{ padding: '12px 0' }}>
                    {item.name}
                    {item.selectedVariant && Object.keys(item.selectedVariant).length > 0 && (
                      <span style={{ display: 'block', fontSize: '10px', color: '#555', marginTop: '2px' }}>
                        {Object.entries(item.selectedVariant).map(([k, v]) => `${k}: ${v}`).join(' | ')}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '12px 0', textAlign: 'right' }}>{formatINR(item.price)}</td>
                  <td style={{ padding: '12px 0', textAlign: 'right' }}>{item.quantity}</td>
                  <td style={{ padding: '12px 0', textAlign: 'right', fontWeight: 700 }}>{formatINR(item.price * item.quantity)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Calculations right */}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{ width: '250px', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Subtotal:</span>
                <span>{formatINR(selectedPrintOrder.subtotal)}</span>
              </div>
              {selectedPrintOrder.discountAmount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Discount:</span>
                  <span>-{formatINR(selectedPrintOrder.discountAmount)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Shipping:</span>
                <span>{selectedPrintOrder.shippingPrice === 0 ? 'FREE' : formatINR(selectedPrintOrder.shippingPrice)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '16px', borderTop: '2px solid black', paddingTop: '10px', marginTop: '5px' }}>
                <span>Total Due:</span>
                <span>{formatINR(selectedPrintOrder.totalAmount)}</span>
              </div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid #ddd', marginTop: '80px', paddingTop: '20px', textAlign: 'center', fontSize: '11px', color: '#555' }}>
            Thank you for shopping at ZAS SPORTS. For return instructions, refer to return policies.
          </div>
        </div>
      )}

    </div>
  );
};

export default OrdersManagement;
