'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit, Trash2, X, Upload } from 'lucide-react';

const CategoriesManagement = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Form Fields
  const [name, setName] = useState('');
  const [displayOrder, setDisplayOrder] = useState(0);
  const [image, setImage] = useState('');
  const [isActive, setIsActive] = useState(true);

  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/categories?adminView=true');
      const data = await res.json();
      if (res.ok && data.success) {
        setCategories(data.categories);
      } else {
        setErrorMsg(data.error || 'Failed to load categories');
      }
    } catch (err) {
      console.log(err);
      setErrorMsg('Network error loading categories');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    fetch('/api/categories?adminView=true')
      .then(res => res.json())
      .then(data => {
        if (!ignore) {
          if (data.success) {
            setCategories(data.categories);
          } else {
            setErrorMsg(data.error || 'Failed to load categories');
          }
          setLoading(false);
        }
      })
      .catch(err => {
        if (!ignore) {
          console.log(err);
          setErrorMsg('Network error loading categories');
          setLoading(false);
        }
      });
    return () => { ignore = true; };
  }, []);

  const handleOpenAddModal = () => {
    setEditingId(null);
    setName('');
    setDisplayOrder(categories.length + 1);
    setImage('');
    setIsActive(true);
    setErrorMsg('');
    setShowModal(true);
  };

  const handleOpenEditModal = (cat) => {
    setEditingId(cat.id || cat._id);
    setName(cat.name);
    setDisplayOrder(cat.displayOrder || 0);
    setImage(cat.image || '');
    setIsActive(cat.isActive !== undefined ? cat.isActive : true);
    setErrorMsg('');
    setShowModal(true);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setUploading(true);
      setErrorMsg('');
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();

      if (res.ok && data.success && data.url) {
        setImage(data.url);
      } else {
        setErrorMsg(data.error || 'Upload failed');
      }
      setUploading(false);
    } catch (err) {
      console.error(err);
      setErrorMsg('Error uploading image.');
      setUploading(false);
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!name) return;

    setErrorMsg('');
    const payload = {
      name,
      displayOrder: Number(displayOrder),
      image,
      isActive
    };

    try {
      const url = editingId ? `/api/categories/${editingId}` : '/api/categories';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setShowModal(false);
        fetchCategories();
      } else {
        setErrorMsg(data.error || 'Failed to save category');
      }
    } catch (err) {
      console.log(err);
      setErrorMsg('Network error saving details.');
    }
  };

  const handleDeleteCategory = async (catId) => {
    if (!confirm('Are you sure you want to delete this category? All products under this category might display with fallbacks.')) return;

    try {
      const res = await fetch(`/api/categories/${catId}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok && data.success) {
        fetchCategories();
      } else {
        alert(data.error || 'Failed to delete category');
      }
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <div className="animate-fade">
      {/* Header */}
      <div className="admin-header-row">
        <div className="admin-title-desc">
          <h2>Store Categories</h2>
          <p>Configure e-commerce department labels and home display orders.</p>
        </div>
        <button 
          type="button" 
          className="btn btn-accent btn-sm"
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          onClick={handleOpenAddModal}
        >
          <Plus size={16} /> Add Category
        </button>
      </div>

      {/* Categories list */}
      {loading ? (
        <p style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-light-muted)' }}>Loading departments...</p>
      ) : (
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Display Order</th>
                <th>Category Name</th>
                <th>Category Slug</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map(cat => (
                <tr key={cat.id || cat._id || cat.slug}>
                  <td style={{ fontWeight: 700, color: 'white' }}>#{cat.displayOrder}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--bg-dark-border)', backgroundColor: 'var(--bg-dark)', flexShrink: 0 }}>
                        <img src={cat.image || 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?q=80&w=60'} alt={cat.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                      <span style={{ fontWeight: 600 }}>{cat.name}</span>
                    </div>
                  </td>
                  <td>{cat.slug}</td>
                  <td>
                    {cat.isActive ? (
                      <span className="status-badge success">Active</span>
                    ) : (
                      <span className="status-badge muted">Disabled</span>
                    )}
                  </td>
                  <td>
                    <div className="action-btns">
                      <button 
                        type="button" 
                        className="action-btn edit" 
                        onClick={() => handleOpenEditModal(cat)}
                      >
                        <Edit size={14} />
                      </button>
                      <button 
                        type="button" 
                        className="action-btn delete" 
                        onClick={() => handleDeleteCategory(cat.id || cat._id)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {categories.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-light-muted)' }}>
                    No categories created yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ADD / EDIT MODAL */}
      {showModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal animate-slide-up" style={{ maxWidth: '500px' }}>
            <div className="admin-modal-header">
              <h3>{editingId ? 'Edit Category' : 'Add Category'}</h3>
              <button type="button" onClick={() => setShowModal(false)} style={{ color: 'white' }}>
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleFormSubmit}>
              <div className="admin-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {errorMsg && (
                  <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid var(--danger)', color: 'var(--danger)', padding: '12px 16px', borderRadius: 'var(--border-radius-sm)', fontSize: '0.85rem' }}>
                    {errorMsg}
                  </div>
                )}

                <div className="admin-form-group">
                  <label>Category Name</label>
                  <input 
                    type="text" 
                    value={name} 
                    onChange={(e) => setName(e.target.value)}
                    className="admin-form-control"
                    required
                  />
                </div>

                <div className="admin-form-group">
                  <label>Display Priority Order</label>
                  <input 
                    type="number" 
                    value={displayOrder} 
                    onChange={(e) => setDisplayOrder(e.target.value)}
                    className="admin-form-control"
                    required
                  />
                </div>

                {/* Banner Image upload */}
                <div className="admin-form-group">
                  <label style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Banner/Logo Image</span>
                    <span>{uploading ? 'Uploading...' : ''}</span>
                  </label>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px' }}>
                    <label className="btn btn-secondary btn-sm" style={{ borderStyle: 'dashed', cursor: 'pointer' }}>
                      <Upload size={14} /> Upload Image
                      <input 
                        type="file" 
                        onChange={handleImageUpload} 
                        style={{ display: 'none' }} 
                        accept="image/*"
                      />
                    </label>
                  </div>
                  {image && (
                    <div style={{ width: '100px', height: '100px', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--bg-dark-border)' }}>
                      <img src={image} alt="Category preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  )}
                </div>

                <div className="admin-form-group">
                  <label className="filter-checkbox-item" style={{ color: 'white' }}>
                    <input 
                      type="checkbox" 
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                    />
                    <span>Enabled (Displays in Mega Menu and filters)</span>
                  </label>
                </div>
              </div>

              <div className="admin-modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-accent btn-sm">
                  {editingId ? 'Save Changes' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default CategoriesManagement;
