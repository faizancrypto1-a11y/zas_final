'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  X,
  Upload
} from 'lucide-react';
import { formatINR } from 'src/lib/currency';

const ProductsManagement = () => {
  const [adminCategories, setAdminCategories] = useState([]);
  const [adminCategoriesLoading, setAdminCategoriesLoading] = useState(true);

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');

  // Modals state
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Form Fields
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('Apex');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState(0);
  const [mrp, setMrp] = useState(0);
  const [stock, setStock] = useState(10);
  const [sku, setSku] = useState('');
  const [images, setImages] = useState([]);
  const [isFeatured, setIsFeatured] = useState(false);
  const [isBestSeller, setIsBestSeller] = useState(false);
  const [isNewArrival, setIsNewArrival] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [subcategory, setSubcategory] = useState('');

  // Specification Key-Values Rows
  const [specRows, setSpecRows] = useState([{ key: '', value: '' }]);

  // Variant lists
  const [sizesInput, setSizesInput] = useState('');
  const [colorsInput, setColorsInput] = useState('');
  const [handsInput, setHandsInput] = useState('');
  const [woodsInput, setWoodsInput] = useState('');
  const [ballsInput, setBallsInput] = useState('');

  // File upload state
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Fetch all categories (including inactive) for admin dropdowns
  const fetchAdminCategories = useCallback(async () => {
    try {
      setAdminCategoriesLoading(true);
      const res = await fetch('/api/categories?adminView=true');
      const data = await res.json();
      if (res.ok && data.success) {
        setAdminCategories(data.categories);
      }
      setAdminCategoriesLoading(false);
    } catch (err) {
      console.log(err);
      setAdminCategoriesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAdminCategories();
  }, []);

  useEffect(() => {
    fetchAdminProducts();
  }, [search, catFilter]);

  const fetchAdminProducts = async () => {
    try {
      setLoading(true);
      let url = '/api/products?adminView=true';
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (catFilter) url += `&category=${catFilter}`;

      const res = await fetch(url, { cache: 'no-store' });
      const data = await res.json();

      if (res.ok && data.success) {
        setProducts(data.products);
      } else {
        setProducts([]);
      }
      setLoading(false);
    } catch (err) {
      console.log('Error loading admin products:', err);
      setLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingId(null);
    setName('');
    setBrand('Zassports');
    setCategory(adminCategories.length > 0 ? adminCategories[0].slug : 'cricket-bats');
    setDescription('');
    setPrice(0);
    setMrp(0);
    setStock(10);
    setSku('ZAS-' + Math.floor(1000 + Math.random() * 9000));
    setImages([]);
    setIsFeatured(false);
    setIsBestSeller(false);
    setIsNewArrival(true);
    setIsActive(true);
    setSubcategory('');
    setSpecRows([{ key: '', value: '' }]);
    setSizesInput('');
    setColorsInput('');
    setHandsInput('');
    setWoodsInput('');
    setBallsInput('');
    setErrorMsg('');
    setShowModal(true);
  };

  const handleOpenEditModal = (p) => {
    setEditingId(p.id || p._id);
    setName(p.name);
    setBrand(p.brand);
    setCategory(p.category);
    setDescription(p.description);
    setPrice(p.price);
    setMrp(p.mrp);
    setStock(p.stock);
    setSku(p.sku);
    setImages(p.images || []);
    setIsFeatured(p.isFeatured || false);
    setIsBestSeller(p.isBestSeller || false);
    setIsNewArrival(p.isNewArrival || false);
    setIsActive(p.isActive !== undefined ? p.isActive : true);
    setSubcategory(p.subcategory || '');

    // Map specs object to key-value rows
    if (p.specs) {
      const rows = Object.entries(p.specs).map(([key, value]) => ({ key, value }));
      setSpecRows(rows.length > 0 ? rows : [{ key: '', value: '' }]);
    } else {
      setSpecRows([{ key: '', value: '' }]);
    }

    setSizesInput(p.variants?.sizes?.join(', ') || '');
    setColorsInput(p.variants?.colors?.join(', ') || '');
    setHandsInput(p.variants?.handOrientations?.join(', ') || '');
    setWoodsInput(p.variants?.batWoodTypes?.join(', ') || '');
    setBallsInput(p.variants?.ballTypes?.join(', ') || '');
    setErrorMsg('');
    setShowModal(true);
  };

  // Image upload triggers
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
        setImages(prev => [...prev, data.url]);
      } else {
        setErrorMsg(data.error || 'Upload failed');
      }
      setUploading(false);
    } catch (err) {
      console.error(err);
      setErrorMsg('Error uploading image file.');
      setUploading(false);
    }
  };

  const handleDeleteImage = (indexToDelete) => {
    setImages(prev => prev.filter((_, idx) => idx !== indexToDelete));
  };

  // Specs helpers
  const handleAddSpecRow = () => {
    setSpecRows(prev => [...prev, { key: '', value: '' }]);
  };
  const handleSpecRowChange = (index, field, value) => {
    setSpecRows(prev => {
      const copy = [...prev];
      copy[index][field] = value;
      return copy;
    });
  };
  const handleRemoveSpecRow = (index) => {
    setSpecRows(prev => prev.filter((_, idx) => idx !== index));
  };

  // Form Submission
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    // Format specs and variants arrays
    const formattedSpecs = {};
    specRows.forEach(row => {
      if (row.key.trim()) {
        formattedSpecs[row.key.trim()] = row.value.trim();
      }
    });

    const parseCommaString = (str) => {
      return str ? str.split(',').map(s => s.trim()).filter(Boolean) : [];
    };

    const variants = {
      sizes: parseCommaString(sizesInput),
      colors: parseCommaString(colorsInput),
      handOrientations: parseCommaString(handsInput),
      batWoodTypes: parseCommaString(woodsInput),
      ballTypes: parseCommaString(ballsInput),
    };

    const payload = {
      name,
      brand,
      category,
      subcategory,
      description,
      price: Number(price),
      mrp: Number(mrp),
      stock: Number(stock),
      sku,
      images,
      specs: formattedSpecs,
      variants,
      isFeatured,
      isBestSeller,
      isNewArrival,
      isActive
    };

    try {
      const url = editingId ? `/api/products/${editingId}` : '/api/products';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setShowModal(false);
        fetchAdminProducts();
      } else {
        setErrorMsg(data.error || 'Failed to save product details');
      }
    } catch (err) {
      console.log('Error saving product:', err);
      setErrorMsg('Network error saving details.');
    }
  };

  const handleDeleteProduct = async (pId) => {
    if (!confirm('Are you sure you want to delete this cricket product?')) return;

    try {
      const res = await fetch(`/api/products/${pId}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok && data.success) {
        fetchAdminProducts();
      } else {
        alert(data.error || 'Failed to delete');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleActive = async (p) => {
    try {
      const res = await fetch(`/api/products/${p.id || p._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !p.isActive })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        fetchAdminProducts();
      }
    } catch (err) {
      console.log(err);
    }
  };

  // Category dropdown option list with loading state
  const categoryOptions = adminCategoriesLoading
    ? [{ id: '__loading', _id: '__loading', name: 'Loading categories...', slug: '' }]
    : adminCategories;

  return (
    <div className="animate-fade">
      {/* Header */}
      <div className="admin-header-row">
        <div className="admin-title-desc">
          <h2>Product Inventory</h2>
          <p>Create, update, and manage your online cricket stock catalog.</p>
        </div>
        <button
          type="button"
          className="btn btn-accent btn-sm"
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          onClick={handleOpenAddModal}
        >
          <Plus size={16} /> Add Product
        </button>
      </div>

      {/* Filter Row */}
      <div className="admin-card table-filter-row" style={{ backgroundColor: 'var(--bg-dark-card)' }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <Search size={16} style={{ color: 'var(--text-light-muted)' }} />
          <input
            type="text"
            placeholder="Search by name or SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="admin-search-input"
          />
        </div>
        <div className="table-filter-actions">
          <select
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value)}
            className="admin-select"
          >
            <option value="">All Categories</option>
            {categoryOptions.map(c => (
              <option key={c.id || c._id || c.slug} value={c.slug} disabled={adminCategoriesLoading}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Products Table */}
      {loading ? (
        <p style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-light-muted)' }}>Loading inventory...</p>
      ) : (
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Product Name</th>
                <th>Category</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Status</th>
                <th>Featured</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map(p => (
                <tr key={p.id || p._id}>
                  <td style={{ fontWeight: 700, color: 'white' }}>{p.sku}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--bg-dark-border)', backgroundColor: 'var(--bg-dark)', flexShrink: 0 }}>
                        <img src={p.images?.[0] || 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?q=80&w=60'} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                      <span style={{ maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                    </div>
                  </td>
                  <td>{p.category.replace('-', ' ')}</td>
                  <td style={{ fontWeight: 600, color: 'white' }}>{formatINR(p.price)}</td>
                  <td>
                    <span style={{ color: p.stock <= 5 ? 'var(--danger)' : 'inherit', fontWeight: p.stock <= 5 ? 700 : 500 }}>
                      {p.stock}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      onClick={() => handleToggleActive(p)}
                      title="Toggle active display status"
                    >
                      {p.isActive ? (
                        <span className="status-badge success">Active</span>
                      ) : (
                        <span className="status-badge muted">Disabled</span>
                      )}
                    </button>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {p.isFeatured && <span className="status-badge info" style={{ fontSize: '0.6rem' }}>Feat</span>}
                      {p.isBestSeller && <span className="status-badge warning" style={{ fontSize: '0.6rem' }}>Best</span>}
                    </div>
                  </td>
                  <td>
                    <div className="action-btns">
                      <button
                        type="button"
                        className="action-btn edit"
                        onClick={() => handleOpenEditModal(p)}
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        type="button"
                        className="action-btn delete"
                        onClick={() => handleDeleteProduct(p.id || p._id)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {products.length === 0 && (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-light-muted)' }}>
                    No products matching search criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ADD / EDIT PRODUCT MODAL */}
      {showModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal animate-slide-up" style={{ maxWidth: '750px' }}>
            <div className="admin-modal-header">
              <h3>{editingId ? 'Edit Product' : 'Add New Product'}</h3>
              <button type="button" onClick={() => setShowModal(false)} style={{ color: 'white' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleFormSubmit}>
              <div className="admin-modal-body">
                {errorMsg && (
                  <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid var(--danger)', color: 'var(--danger)', padding: '12px 16px', borderRadius: 'var(--border-radius-sm)', marginBottom: '20px', fontSize: '0.85rem' }}>
                    {errorMsg}
                  </div>
                )}

                <div className="grid grid-2">
                  <div className="admin-form-group" style={{ gridColumn: 'span 2' }}>
                    <label>Product Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="admin-form-control"
                      required
                    />
                  </div>
                  <div className="admin-form-group">
                    <label>SKU Product Code</label>
                    <input
                      type="text"
                      value={sku}
                      onChange={(e) => setSku(e.target.value)}
                      className="admin-form-control"
                      required
                    />
                  </div>
                  <div className="admin-form-group">
                    <label>Brand Name</label>
                    <input
                      type="text"
                      value={brand}
                      onChange={(e) => setBrand(e.target.value)}
                      className="admin-form-control"
                      required
                    />
                  </div>
                  <div className="admin-form-group">
                    <label>Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="admin-select"
                      style={{ width: '100%', padding: '12px' }}
                    >
                      {adminCategoriesLoading ? (
                        <option value="">Loading categories...</option>
                      ) : (
                        adminCategories.map(c => (
                          <option key={c.id || c._id || c.slug} value={c.slug}>{c.name}</option>
                        ))
                      )}
                    </select>
                  </div>
                  <div className="admin-form-group">
                    <label>Subcategory Slug</label>
                    <input
                      type="text"
                      value={subcategory}
                      onChange={(e) => setSubcategory(e.target.value)}
                      className="admin-form-control"
                      placeholder="e.g. english-willow-bat"
                    />
                  </div>
                  <div className="admin-form-group">
                    <label>Stock Quantity</label>
                    <input
                      type="number"
                      value={stock}
                      onChange={(e) => setStock(e.target.value)}
                      className="admin-form-control"
                      required
                    />
                  </div>
                  <div className="admin-form-group">
                    <label>Price (₹)</label>
                    <input
                      type="number"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="admin-form-control"
                      required
                    />
                  </div>
                  <div className="admin-form-group">
                    <label>MRP (₹)</label>
                    <input
                      type="number"
                      value={mrp}
                      onChange={(e) => setMrp(e.target.value)}
                      className="admin-form-control"
                      required
                    />
                  </div>

                  <div className="admin-form-group" style={{ gridColumn: 'span 2' }}>
                    <label>Product Description</label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="admin-form-control"
                      rows={4}
                      required
                    />
                  </div>

                  {/* Images Upload */}
                  <div className="admin-form-group" style={{ gridColumn: 'span 2' }}>
                    <label style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Product Images</span>
                      <span>{uploading ? 'Uploading...' : ''}</span>
                    </label>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <label className="btn btn-secondary btn-sm" style={{ borderStyle: 'dashed', cursor: 'pointer' }}>
                        <Upload size={14} /> Upload Image
                        <input
                          type="file"
                          onChange={handleImageUpload}
                          style={{ display: 'none' }}
                          accept="image/*"
                        />
                      </label>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-light-muted)' }}>Image is saved to the server and served directly.</span>
                    </div>

                    {images.length > 0 && (
                      <div className="image-upload-preview-box">
                        {images.map((img, idx) => (
                          <div key={idx} className="image-preview-item">
                            <img src={img} alt="Preview" />
                            <button
                              type="button"
                              className="image-preview-delete"
                              onClick={() => handleDeleteImage(idx)}
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Variants String inputs */}
                  <div className="admin-form-group">
                    <label>Sizes (Comma separated, e.g. S, M, L or Short Handle, Harrow)</label>
                    <input
                      type="text"
                      value={sizesInput}
                      onChange={(e) => setSizesInput(e.target.value)}
                      placeholder="e.g. S, M, L"
                      className="admin-form-control"
                    />
                  </div>
                  <div className="admin-form-group">
                    <label>Colors (Comma separated)</label>
                    <input
                      type="text"
                      value={colorsInput}
                      onChange={(e) => setColorsInput(e.target.value)}
                      placeholder="e.g. Red, Blue"
                      className="admin-form-control"
                    />
                  </div>
                  <div className="admin-form-group">
                    <label>Hand Orientations (e.g. Right Hand, Left Hand)</label>
                    <input
                      type="text"
                      value={handsInput}
                      onChange={(e) => setHandsInput(e.target.value)}
                      placeholder="e.g. Right Hand, Left Hand"
                      className="admin-form-control"
                    />
                  </div>
                  <div className="admin-form-group">
                    <label>Bat Wood Types (e.g. English Willow, Kashmir Willow)</label>
                    <input
                      type="text"
                      value={woodsInput}
                      onChange={(e) => setWoodsInput(e.target.value)}
                      placeholder="e.g. English Willow, Kashmir Willow"
                      className="admin-form-control"
                    />
                  </div>
                  <div className="admin-form-group" style={{ gridColumn: 'span 2' }}>
                    <label>Ball Core Types (e.g. Leather ball, Tennis ball)</label>
                    <input
                      type="text"
                      value={ballsInput}
                      onChange={(e) => setBallsInput(e.target.value)}
                      placeholder="e.g. Leather ball, Tennis ball"
                      className="admin-form-control"
                    />
                  </div>

                  {/* Specifications dynamic rows */}
                  <div className="admin-form-group" style={{ gridColumn: 'span 2' }}>
                    <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>Technical Specifications</span>
                      <button
                        type="button"
                        className="text-success"
                        style={{ fontSize: '0.8rem', fontWeight: 600 }}
                        onClick={handleAddSpecRow}
                      >
                        + Add Spec Row
                      </button>
                    </label>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {specRows.map((row, idx) => (
                        <div key={idx} style={{ display: 'flex', gap: '10px' }}>
                          <input
                            type="text"
                            placeholder="Specification Key (e.g. Weight)"
                            value={row.key}
                            onChange={(e) => handleSpecRowChange(idx, 'key', e.target.value)}
                            className="admin-form-control"
                            style={{ flex: 1 }}
                          />
                          <input
                            type="text"
                            placeholder="Specification Value (e.g. 2.7 lbs)"
                            value={row.value}
                            onChange={(e) => handleSpecRowChange(idx, 'value', e.target.value)}
                            className="admin-form-control"
                            style={{ flex: 1.2 }}
                          />
                          {specRows.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveSpecRow(idx)}
                              style={{ color: 'var(--danger)', padding: '0 10px', fontSize: '1.25rem' }}
                            >
                              ×
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Feature Checkboxes */}
                  <div className="admin-form-group" style={{ gridColumn: 'span 2', display: 'flex', gap: '20px', flexWrap: 'wrap', marginTop: '10px' }}>
                    <label className="filter-checkbox-item" style={{ color: 'white' }}>
                      <input
                        type="checkbox"
                        checked={isFeatured}
                        onChange={(e) => setIsFeatured(e.target.checked)}
                      />
                      <span>Featured Product</span>
                    </label>
                    <label className="filter-checkbox-item" style={{ color: 'white' }}>
                      <input
                        type="checkbox"
                        checked={isBestSeller}
                        onChange={(e) => setIsBestSeller(e.target.checked)}
                      />
                      <span>Bestseller</span>
                    </label>
                    <label className="filter-checkbox-item" style={{ color: 'white' }}>
                      <input
                        type="checkbox"
                        checked={isNewArrival}
                        onChange={(e) => setIsNewArrival(e.target.checked)}
                      />
                      <span>New Arrival</span>
                    </label>
                    <label className="filter-checkbox-item" style={{ color: 'white' }}>
                      <input
                        type="checkbox"
                        checked={isActive}
                        onChange={(e) => setIsActive(e.target.checked)}
                      />
                      <span>Enabled / Active Display</span>
                    </label>
                  </div>

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
                  {editingId ? 'Save Changes' : 'Create Product'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};

export default ProductsManagement;
