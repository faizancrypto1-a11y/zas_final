'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  User, 
  MapPin, 
  ShoppingBag, 
  Trash2, 
  Plus, 
  Check, 
  Truck, 
  LogOut,
  Mail,
  Phone,
  ShieldCheck
} from 'lucide-react';
import { useStore } from 'src/context/StoreContext';
import { formatINR } from 'src/lib/currency';

const CustomerAccountPage = () => {
  const router = useRouter();
  const { user, loginUser, logoutUser } = useStore();

  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [activeTab, setActiveTab] = useState('profile'); // profile, orders, addresses

  // Address Form State
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [fullName, setFullName] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [phoneInput, setPhoneInput] = useState('');

  const fetchUserOrders = useCallback(async () => {
    try {
      setLoadingOrders(true);
      const res = await fetch('/api/orders');
      const data = await res.json();
      if (data.success) {
        setOrders(data.orders);
      }
      setLoadingOrders(false);
    } catch (err) {
      console.log('Error loading customer orders:', err);
      setLoadingOrders(false);
    }
  }, []);

  // 1. Initial access authentication check
  useEffect(() => {
    if (user) {
      const timer = setTimeout(() => {
        fetchUserOrders();
      }, 0);
      return () => clearTimeout(timer);
    } else {
      // Give store context some time to load user session, else redirect
      const checkTimer = setTimeout(() => {
        if (!user) {
          router.push('/login');
        }
      }, 1500);
      return () => clearTimeout(checkTimer);
    }
  }, [user, fetchUserOrders, router]);

  // 2. Address CRUD handlers
  const handleAddAddress = async (e) => {
    e.preventDefault();
    if (!fullName || !addressLine || !city || !state || !pincode || !phoneInput) return;

    try {
      const newAddress = {
        fullName,
        addressLine,
        city,
        state,
        pincode,
        phone: phoneInput,
        isDefault: user.addresses.length === 0 // default if first
      };

      const updatedAddresses = [...user.addresses, newAddress];
      const res = await fetch('/api/auth/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ addresses: updatedAddresses })
      });
      const data = await res.json();

      if (data.success && data.user) {
        loginUser(data.user); // update global context user
        setShowAddressForm(false);
        setFullName('');
        setAddressLine('');
        setCity('');
        setState('');
        setPincode('');
        setPhoneInput('');
      } else {
        alert(data.error || 'Failed to save address');
      }
    } catch (err) {
      console.error('Error saving address:', err);
    }
  };

  const handleDeleteAddress = async (indexToDelete) => {
    try {
      const updatedAddresses = user.addresses.filter((_, idx) => idx !== indexToDelete);
      
      // If we deleted default, set another default
      if (user.addresses[indexToDelete]?.isDefault && updatedAddresses.length > 0) {
        updatedAddresses[0].isDefault = true;
      }

      const res = await fetch('/api/auth/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ addresses: updatedAddresses })
      });
      const data = await res.json();

      if (data.success && data.user) {
        loginUser(data.user);
      }
    } catch (err) {
      console.error('Error deleting address:', err);
    }
  };

  const handleSetDefaultAddress = async (indexToDefault) => {
    try {
      const updatedAddresses = user.addresses.map((addr, idx) => ({
        ...addr,
        isDefault: idx === indexToDefault
      }));

      const res = await fetch('/api/auth/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ addresses: updatedAddresses })
      });
      const data = await res.json();

      if (data.success && data.user) {
        loginUser(data.user);
      }
    } catch (err) {
      console.error('Error setting default address:', err);
    }
  };

  const handleLogout = async () => {
    await logoutUser();
    router.push('/');
  };

  if (!user) {
    return (
      <div style={{ textAlign: 'center', padding: '120px 0' }}>
        <p style={{ color: 'var(--text-dark-muted)', fontWeight: 600 }}>Authenticating player credentials...</p>
      </div>
    );
  }

  return (
    <div className="container animate-fade" style={{ margin: '40px auto 60px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '40px' }}>
        
        {/* Navigation Tabs */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ padding: '20px', backgroundColor: 'white', border: '1px solid var(--bg-light-border)', borderRadius: 'var(--border-radius-md)', textAlign: 'center', marginBottom: '15px' }}>
            <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: 'var(--bg-light)', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontWeight: 800, fontSize: '1.4rem' }}>
              {user.name.charAt(0).toUpperCase()}
            </div>
            <h4 style={{ fontSize: '1rem', fontFamily: 'Outfit' }}>{user.name}</h4>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-dark-muted)' }}>Club Member</span>
          </div>

          <button 
            type="button" 
            className={`btn btn-secondary btn-full btn-sm ${activeTab === 'profile' ? 'btn-primary' : ''}`}
            onClick={() => setActiveTab('profile')}
            style={{ justifyContent: 'flex-start', gap: '10px' }}
          >
            <User size={16} /> Player Profile
          </button>
          <button 
            type="button" 
            className={`btn btn-secondary btn-full btn-sm ${activeTab === 'orders' ? 'btn-primary' : ''}`}
            onClick={() => setActiveTab('orders')}
            style={{ justifyContent: 'flex-start', gap: '10px' }}
          >
            <ShoppingBag size={16} /> My Orders ({orders.length})
          </button>
          <button 
            type="button" 
            className={`btn btn-secondary btn-full btn-sm ${activeTab === 'addresses' ? 'btn-primary' : ''}`}
            onClick={() => setActiveTab('addresses')}
            style={{ justifyContent: 'flex-start', gap: '10px' }}
          >
            <MapPin size={16} /> Saved Addresses
          </button>
          <button 
            type="button" 
            className="btn btn-secondary btn-full btn-sm text-danger" 
            onClick={handleLogout}
            style={{ justifyContent: 'flex-start', gap: '10px', marginTop: '30px' }}
          >
            <LogOut size={16} /> Sign Out
          </button>
        </aside>

        {/* Content Pane */}
        <main style={{ backgroundColor: 'white', border: '1px solid var(--bg-light-border)', borderRadius: 'var(--border-radius-md)', padding: '35px' }}>
          
          {/* PROFILE TAB */}
          {activeTab === 'profile' && (
            <div className="animate-fade">
              <h2 style={{ fontSize: '1.5rem', fontFamily: 'Outfit', textTransform: 'uppercase', marginBottom: '24px' }}>Player Profile</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div style={{ display: 'flex', gap: '15px', paddingBottom: '15px', borderBottom: '1px solid var(--bg-light-border)' }}>
                  <User style={{ color: 'var(--text-dark-muted)' }} />
                  <div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-dark-muted)' }}>Name</span>
                    <p style={{ fontWeight: 600 }}>{user.name}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '15px', paddingBottom: '15px', borderBottom: '1px solid var(--bg-light-border)' }}>
                  <Mail style={{ color: 'var(--text-dark-muted)' }} />
                  <div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-dark-muted)' }}>Email Address</span>
                    <p style={{ fontWeight: 600 }}>{user.email}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '15px' }}>
                  <ShieldCheck style={{ color: 'var(--success)' }} />
                  <div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-dark-muted)' }}>Account Status</span>
                    <p style={{ fontWeight: 600, color: 'var(--success)' }}>Active Club Member</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ORDERS TAB */}
          {activeTab === 'orders' && (
            <div className="animate-fade">
              <h2 style={{ fontSize: '1.5rem', fontFamily: 'Outfit', textTransform: 'uppercase', marginBottom: '24px' }}>My Orders</h2>
              {loadingOrders ? (
                <p style={{ color: 'var(--text-dark-muted)' }}>Loading purchase histories...</p>
              ) : orders.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <ShoppingBag size={40} style={{ color: 'var(--text-dark-muted)', marginBottom: '10px' }} />
                  <p style={{ color: 'var(--text-dark-muted)' }}>You haven&apos;t placed any orders yet.</p>
                  <Link href="/shop" className="btn btn-primary btn-sm" style={{ marginTop: '15px' }}>Shop Gear</Link>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {orders.map(order => (
                    <div key={order._id} style={{ border: '1px solid var(--bg-light-border)', borderRadius: 'var(--border-radius-md)', overflow: 'hidden' }}>
                      <div style={{ backgroundColor: 'var(--bg-light)', padding: '15px 20px', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', borderBottom: '1px solid var(--bg-light-border)' }}>
                        <div>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-dark-muted)', fontWeight: 700 }}>ORDER ID</span>
                          <p style={{ fontWeight: 700, fontSize: '0.95rem' }}>{order.orderId}</p>
                        </div>
                        <div>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-dark-muted)', fontWeight: 700 }}>DATE PLACED</span>
                          <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>{new Date(order.createdAt).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-dark-muted)', fontWeight: 700 }}>TOTAL AMOUNT</span>
                          <p style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-dark)' }}>{formatINR(order.totalAmount)}</p>
                          {order.paymentMethod === 'COD' && order.amountDue > 0 && (
                            <span style={{ fontSize: '0.7rem', color: '#b45309', display: 'block' }}>
                              Adv: {formatINR(order.amountPaid || order.codAdvanceAmount)} | Due: {formatINR(order.amountDue)}
                            </span>
                          )}
                        </div>
                        <div>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-dark-muted)', fontWeight: 700, display: 'block', textAlign: 'right' }}>STATUS</span>
                          <span className={`status-badge ${order.orderStatus === 'Delivered' ? 'success' : order.orderStatus === 'Cancelled' ? 'failed' : 'pending'}`}>
                            {order.orderStatus}
                          </span>
                        </div>
                      </div>
                      
                      {/* Items loop inside order card */}
                      <div style={{ padding: '20px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '15px' }}>
                          {order.orderItems.map((item, idx) => (
                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                              <span style={{ color: 'var(--text-dark-muted)' }}>
                                {item.name} <strong>x{item.quantity}</strong>
                              </span>
                              <span style={{ fontWeight: 600 }}>{formatINR(item.price * item.quantity)}</span>
                            </div>
                          ))}
                        </div>
                        
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid var(--bg-light-border)', paddingTop: '15px' }}>
                          <Link 
                            href={`/track-order?orderId=${order.orderId}`} 
                            className="btn btn-secondary btn-sm"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                          >
                            <Truck size={14} /> Track Delivery
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ADDRESSES TAB */}
          {activeTab === 'addresses' && (
            <div className="animate-fade">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 style={{ fontSize: '1.5rem', fontFamily: 'Outfit', textTransform: 'uppercase' }}>Saved Addresses</h2>
                <button 
                  type="button" 
                  className="btn btn-primary btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                  onClick={() => setShowAddressForm(!showAddressForm)}
                >
                  <Plus size={16} /> {showAddressForm ? 'Cancel' : 'Add Address'}
                </button>
              </div>

              {/* Add Address Form */}
              {showAddressForm && (
                <form onSubmit={handleAddAddress} style={{ padding: '20px', border: '1px solid var(--bg-light-border)', borderRadius: 'var(--border-radius-md)', backgroundColor: 'var(--bg-light)', marginBottom: '30px' }} className="animate-slide-up">
                  <h4 style={{ marginBottom: '15px', fontFamily: 'Outfit' }}>New Delivery Address</h4>
                  <div className="grid grid-2">
                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                      <label className="form-label">Full Name</label>
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
                      <label className="form-label">Contact Phone</label>
                      <input 
                        type="tel" 
                        value={phoneInput}
                        onChange={(e) => setPhoneInput(e.target.value)}
                        className="form-control"
                        required
                      />
                    </div>
                  </div>
                  <button type="submit" className="btn btn-primary btn-sm" style={{ marginTop: '10px' }}>Save Address</button>
                </form>
              )}

              {/* Address list */}
              {user.addresses?.length === 0 ? (
                <p style={{ color: 'var(--text-dark-muted)', fontStyle: 'italic' }}>No addresses saved yet. Add one to speed up checkout.</p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
                  {user.addresses.map((addr, idx) => (
                    <div 
                      key={idx}
                      style={{ 
                        border: '1px solid var(--bg-light-border)', 
                        borderRadius: 'var(--border-radius-md)', 
                        padding: '20px',
                        backgroundColor: addr.isDefault ? '#f0fdf4' : 'transparent',
                        borderColor: addr.isDefault ? 'var(--success)' : 'var(--bg-light-border)',
                        position: 'relative'
                      }}
                    >
                      {addr.isDefault && (
                        <span 
                          style={{ 
                            fontSize: '0.65rem', 
                            color: 'var(--success)', 
                            backgroundColor: '#dcfce7', 
                            padding: '2px 8px', 
                            borderRadius: '4px',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            position: 'absolute',
                            top: '12px',
                            right: '12px'
                          }}
                        >
                          Default
                        </span>
                      )}

                      <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '8px' }}>{addr.fullName}</h4>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-dark-muted)', lineHeight: '1.4' }}>
                        {addr.addressLine}, <br />
                        {addr.city}, {addr.state} - {addr.pincode}
                      </p>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-dark-muted)', display: 'block', marginTop: '10px' }}>
                        Phone: {addr.phone}
                      </span>

                      <div style={{ display: 'flex', gap: '15px', marginTop: '15px', borderTop: '1px solid var(--bg-light-border)', paddingTop: '12px', fontSize: '0.8rem' }}>
                        {!addr.isDefault && (
                          <button 
                            type="button" 
                            className="text-success" 
                            style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '2px' }}
                            onClick={() => handleSetDefaultAddress(idx)}
                          >
                            <Check size={12} /> Set Default
                          </button>
                        )}
                        <button 
                          type="button" 
                          className="text-danger" 
                          style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '2px' }}
                          onClick={() => handleDeleteAddress(idx)}
                        >
                          <Trash2 size={12} /> Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </main>
      </div>
    </div>
  );
};

export default CustomerAccountPage;
