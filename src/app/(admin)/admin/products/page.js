'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  X,
  Upload,
  Percent,
  Layers
} from 'lucide-react';
import { formatINR } from 'src/lib/currency';
import {
  slugify,
  calculateDiscountedPrice,
  generateCombinationsFromOptions,
  hasPricedVariants,
  getProductPricingSummary
} from 'src/lib/productPricing';

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

  const [discount, setDiscount] = useState(0);

  // Specification Key-Values Rows
  const [specRows, setSpecRows] = useState([{ key: '', value: '' }]);

  // Modern Dynamic Variant options and combinations
  const [variantOptions, setVariantOptions] = useState([]);
  const [combinations, setCombinations] = useState([]);
  const [bulkMrpInput, setBulkMrpInput] = useState('');

  const rebuildCombinations = (opts, currentCombs) => {
    const parsedOpts = opts
      .map(o => ({
        key: o.key || slugify(o.label),
        label: o.label.trim(),
        values: o.valuesInput ? o.valuesInput.split(',').map(s => s.trim()).filter(Boolean) : []
      }))
      .filter(o => o.key && o.values.length > 0);

    if (parsedOpts.length === 0) {
      setCombinations([]);
      return;
    }

    const newCombs = generateCombinationsFromOptions(parsedOpts, currentCombs);
    setCombinations(newCombs);
  };

  const handleAddVariantOption = (defaultLabel = '', defaultKey = '') => {
    const label = defaultLabel || 'Custom Option';
    const key = defaultKey || slugify(label) || `option-${Date.now()}`;
    setVariantOptions(prev => {
      const updated = [
        ...prev,
        { id: `opt-${Date.now()}-${Math.random()}`, key, label, valuesInput: '' }
      ];
      return updated;
    });
  };

  const handleRemoveVariantOption = (id) => {
    setVariantOptions(prev => {
      const updated = prev.filter(opt => opt.id !== id);
      rebuildCombinations(updated, combinations);
      return updated;
    });
  };

  const handleOptionChange = (id, field, value) => {
    setVariantOptions(prev => {
      const updated = prev.map(opt => {
        if (opt.id === id) {
          const newOpt = { ...opt, [field]: value };
          if (field === 'label') {
            newOpt.key = slugify(value);
          }
          return newOpt;
        }
        return opt;
      });
      rebuildCombinations(updated, combinations);
      return updated;
    });
  };

  const handleCombinationMrpChange = (combId, val) => {
    const num = Math.max(0, parseFloat(val) || 0);
    setCombinations(prev => prev.map(c => c.id === combId ? { ...c, mrp: num } : c));
  };

  const handleBulkApplyMrp = () => {
    const num = Math.max(0, parseFloat(bulkMrpInput) || 0);
    if (num >= 0 && combinations.length > 0) {
      setCombinations(prev => prev.map(c => ({ ...c, mrp: num })));
    }
  };

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

  const fetchAdminProducts = useCallback(async () => {
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
  }, [search, catFilter]);

  useEffect(() => {
    fetchAdminCategories();
  }, [fetchAdminCategories]);

  useEffect(() => {
    fetchAdminProducts();
  }, [fetchAdminProducts]);

  const handleOpenAddModal = () => {
    setEditingId(null);
    setName('');
    setBrand('Zassports');
    setCategory(adminCategories.length > 0 ? adminCategories[0].slug : 'cricket-bats');
    setDescription('');
    setPrice(0);
    setMrp(0);
    setDiscount(0);
    setStock(10);
    setSku('ZAS-' + Math.floor(1000 + Math.random() * 9000));
    setImages([]);
    setIsFeatured(false);
    setIsBestSeller(false);
    setIsNewArrival(true);
    setIsActive(true);
    setSubcategory('');
    setSpecRows([{ key: '', value: '' }]);
    setVariantOptions([]);
    setCombinations([]);
    setBulkMrpInput('');
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
    setDiscount(p.discount || 0);
    setStock(p.stock);
    setSku(p.sku);
    setImages(p.images || []);
    setIsFeatured(p.isFeatured || false);
    setIsBestSeller(p.isBestSeller || false);
    setIsNewArrival(p.isNewArrival || false);
    setIsActive(p.isActive !== undefined ? p.isActive : true);
    setSubcategory(p.subcategory || '');
    setBulkMrpInput('');

    // Map specs object to key-value rows
    if (p.specs) {
      const rows = Object.entries(p.specs).map(([key, value]) => ({ key, value }));
      setSpecRows(rows.length > 0 ? rows : [{ key: '', value: '' }]);
    } else {
      setSpecRows([{ key: '', value: '' }]);
    }

    // Populate variant options and combinations
    if (p.variants?.options?.length > 0) {
      const loadedOpts = p.variants.options.map((opt, i) => ({
        id: `opt-${i}-${opt.key}`,
        key: opt.key,
        label: opt.label || opt.key,
        valuesInput: Array.isArray(opt.values) ? opt.values.join(', ') : ''
      }));
      setVariantOptions(loadedOpts);
      setCombinations(Array.isArray(p.variants.combinations) ? p.variants.combinations : []);
    } else {
      // Legacy conversion
      const legacyOpts = [];
      const v = p.variants || {};
      if (v.sizes?.length > 0) {
        legacyOpts.push({ id: 'opt-legacy-size', key: 'size', label: 'Size', valuesInput: v.sizes.join(', ') });
      }
      if (v.colors?.length > 0) {
        legacyOpts.push({ id: 'opt-legacy-color', key: 'color', label: 'Color', valuesInput: v.colors.join(', ') });
      }
      if (v.handOrientations?.length > 0) {
        legacyOpts.push({ id: 'opt-legacy-hand', key: 'handOrientation', label: 'Batting Hand', valuesInput: v.handOrientations.join(', ') });
      }
      if (v.batWoodTypes?.length > 0) {
        legacyOpts.push({ id: 'opt-legacy-wood', key: 'batWoodType', label: 'Wood Type', valuesInput: v.batWoodTypes.join(', ') });
      }
      if (v.ballTypes?.length > 0) {
        legacyOpts.push({ id: 'opt-legacy-ball', key: 'ballType', label: 'Ball Type', valuesInput: v.ballTypes.join(', ') });
      }
      setVariantOptions(legacyOpts);

      if (v.sizePrices && typeof v.sizePrices === 'object' && Object.keys(v.sizePrices).length > 0) {
        const legacyCombs = Object.entries(v.sizePrices).map(([sz, val]) => {
          let mrpVal = typeof val === 'object' && val !== null ? (val.mrp != null ? Number(val.mrp) : Number(val.price)) : Number(val);
          return {
            id: `size-${slugify(sz)}`,
            attributes: { size: sz },
            mrp: mrpVal
          };
        });
        setCombinations(legacyCombs);
      } else if (p.variants?.combinations?.length > 0) {
        setCombinations(p.variants.combinations);
      } else {
        setCombinations([]);
      }
    }

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

    const parsedDiscount = Math.min(100, Math.max(0, Number(discount) || 0));
    const numMrp = Math.max(0, Number(mrp) || 0);

    // Format specs
    const formattedSpecs = {};
    specRows.forEach(row => {
      if (row.key.trim()) {
        formattedSpecs[row.key.trim()] = row.value.trim();
      }
    });

    // Format modern variant options and combinations
    const parsedOptions = variantOptions
      .map(o => ({
        key: o.key || slugify(o.label),
        label: o.label.trim(),
        values: o.valuesInput ? o.valuesInput.split(',').map(s => s.trim()).filter(Boolean) : []
      }))
      .filter(o => o.key && o.values.length > 0);

    const parsedCombinations = combinations.map(c => ({
      id: c.id,
      attributes: c.attributes,
      mrp: Math.max(0, Number(c.mrp) || 0)
    }));

    let finalMrp = numMrp;
    let finalPrice = 0;

    if (parsedCombinations.length > 0) {
      const pricedCombs = parsedCombinations.filter(c => c.mrp > 0);
      const minComb = pricedCombs.length > 0
        ? pricedCombs.reduce((min, c) => c.mrp < min.mrp ? c : min, pricedCombs[0])
        : parsedCombinations[0];
      finalMrp = minComb ? minComb.mrp : numMrp;
      finalPrice = calculateDiscountedPrice(finalMrp, parsedDiscount);
    } else {
      finalMrp = numMrp;
      finalPrice = calculateDiscountedPrice(finalMrp, parsedDiscount);
    }

    const variantsPayload = {
      options: parsedOptions,
      combinations: parsedCombinations,
      // Backward-compatible arrays:
      sizes: parsedOptions.find(o => o.key === 'size')?.values || [],
      colors: parsedOptions.find(o => o.key === 'color')?.values || [],
      handOrientations: parsedOptions.find(o => o.key === 'handOrientation' || o.key === 'batting-hand')?.values || [],
      batWoodTypes: parsedOptions.find(o => o.key === 'batWoodType' || o.key === 'wood-type')?.values || [],
      ballTypes: parsedOptions.find(o => o.key === 'ballType' || o.key === 'ball-type')?.values || [],
    };

    const sizePrices = {};
    parsedCombinations.forEach(c => {
      if (c.attributes?.size) {
        sizePrices[c.attributes.size] = c.mrp;
      }
    });
    if (Object.keys(sizePrices).length > 0) {
      variantsPayload.sizePrices = sizePrices;
    }

    const payload = {
      name,
      brand,
      category,
      subcategory,
      description,
      price: finalPrice,
      mrp: finalMrp,
      discount: parsedDiscount,
      stock: Number(stock),
      sku,
      images,
      specs: formattedSpecs,
      variants: variantsPayload,
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

  const pricedCombinations = combinations.filter(c => Number(c.mrp) > 0);
  const lowestCombMrp = pricedCombinations.length > 0
    ? pricedCombinations.reduce((min, c) => Number(c.mrp) < min ? Number(c.mrp) : min, Number(pricedCombinations[0].mrp))
    : (combinations[0] ? Number(combinations[0].mrp) || 0 : mrp);
  const activeMrp = combinations.length > 0 ? lowestCombMrp : mrp;
  const activeCalculatedPrice = calculateDiscountedPrice(activeMrp, discount);

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
                  <td style={{ fontWeight: 600, color: 'white' }}>
                    {hasPricedVariants(p) ? 'From ' : ''}{formatINR(p.price)}
                    {p.mrp > p.price && (
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-light-muted)' }}>
                        <span style={{ textDecoration: 'line-through' }}>{formatINR(p.mrp)}</span>
                        <span style={{ color: 'var(--success)', marginLeft: '4px' }}>{p.discount}% Off</span>
                      </div>
                    )}
                  </td>
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
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Percent size={14} /> Product Discount (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={discount}
                      onChange={(e) => setDiscount(e.target.value)}
                      placeholder="e.g. 10"
                      className="admin-form-control"
                    />
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-light-muted)' }}>
                      Global discount % applied automatically to all combinations and base price.
                    </span>
                  </div>
                  <div className="admin-form-group">
                    <label>
                      Base MRP (₹)
                      {combinations.length > 0 && (
                        <span style={{ fontSize: '0.72rem', color: 'var(--accent)', marginLeft: '6px' }}>
                          (Auto from lowest variant: {formatINR(activeMrp)})
                        </span>
                      )}
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={combinations.length > 0 ? activeMrp : mrp}
                      onChange={(e) => setMrp(e.target.value)}
                      className="admin-form-control"
                      disabled={combinations.length > 0}
                      required={combinations.length === 0}
                    />
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-light-muted)' }}>
                      Calculated Base Price: <strong>{formatINR(activeCalculatedPrice)}</strong>
                    </span>
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

                  {/* Modern Dynamic Variant Options & Combinations */}
                  <div className="admin-form-group" style={{ gridColumn: 'span 2', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem', marginTop: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '8px' }}>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Layers size={16} /> Dynamic Product Variants & Pricing
                        </h4>
                        <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: 'var(--text-light-muted)' }}>
                          Configure product options (e.g. Size, Batting Hand) with comma-separated values. Combinations are generated automatically.
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleAddVariantOption('Size', 'size')}
                          style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                        >
                          + Size
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleAddVariantOption('Batting Hand', 'handOrientation')}
                          style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                        >
                          + Hand
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleAddVariantOption('Handle Type', 'handle')}
                          style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                        >
                          + Handle
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleAddVariantOption('Color', 'color')}
                          style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                        >
                          + Color
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleAddVariantOption('Wood Type', 'batWoodType')}
                          style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                        >
                          + Wood
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleAddVariantOption('Weight', 'weight')}
                          style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                        >
                          + Weight
                        </button>
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => handleAddVariantOption('', '')}
                          style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                        >
                          <Plus size={12} /> Custom Option
                        </button>
                      </div>
                    </div>

                    {variantOptions.length === 0 ? (
                      <div style={{ padding: '16px', background: 'var(--bg-light-muted, #f8f9fa)', borderRadius: '6px', border: '1px dashed var(--border-color)', textAlign: 'center', color: 'var(--text-light-muted)', fontSize: '0.82rem' }}>
                        No variant options defined. Click any button above to add Size, Hand, Wood, or Custom options. If none are added, the product sells as a single standard item.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '1rem' }}>
                        {variantOptions.map((opt) => (
                          <div
                            key={opt.id}
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '180px 1fr 36px',
                              gap: '10px',
                              alignItems: 'center',
                              background: 'var(--bg-light-muted, #f8f9fa)',
                              padding: '8px 10px',
                              borderRadius: '6px',
                              border: '1px solid var(--border-color)'
                            }}
                          >
                            <input
                              type="text"
                              className="admin-form-control"
                              style={{ padding: '6px 10px', fontSize: '0.82rem' }}
                              placeholder="Option Name (e.g. Size)"
                              value={opt.label}
                              onChange={(e) => handleOptionChange(opt.id, 'label', e.target.value)}
                            />
                            <input
                              type="text"
                              className="admin-form-control"
                              style={{ padding: '6px 10px', fontSize: '0.82rem' }}
                              placeholder="Comma-separated values (e.g. Harrow, 5, 6 or Red, Blue)"
                              value={opt.valuesInput}
                              onChange={(e) => handleOptionChange(opt.id, 'valuesInput', e.target.value)}
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveVariantOption(opt.id)}
                              className="btn btn-icon btn-sm text-danger"
                              style={{ padding: '6px', border: 'none', background: 'transparent', cursor: 'pointer' }}
                              title="Remove option"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Combinations MRP Table */}
                    {combinations.length > 0 && (
                      <div style={{ marginTop: '1rem', border: '1px solid var(--border-color)', borderRadius: '6px', overflow: 'hidden' }}>
                        <div style={{
                          padding: '10px 12px',
                          background: 'var(--bg-light-muted, #f1f3f5)',
                          borderBottom: '1px solid var(--border-color)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: '10px'
                        }}>
                          <div>
                            <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                              Variant Combinations ({combinations.length})
                            </span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-light-muted)', marginLeft: '8px' }}>
                              Set MRP for each variant. Selling price auto-calculates with {Number(discount) || 0}% discount.
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <input
                              type="number"
                              min="0"
                              placeholder="Bulk MRP (₹)"
                              value={bulkMrpInput}
                              onChange={(e) => setBulkMrpInput(e.target.value)}
                              className="admin-form-control"
                              style={{ width: '130px', padding: '4px 8px', fontSize: '0.8rem' }}
                            />
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={handleBulkApplyMrp}
                              style={{ fontSize: '0.78rem', padding: '4px 10px' }}
                            >
                              Apply to All
                            </button>
                          </div>
                        </div>

                        <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                            <thead>
                              <tr style={{ background: 'var(--bg-light, #fafafa)', borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                                <th style={{ padding: '8px 12px', fontWeight: 600 }}>Combination</th>
                                <th style={{ padding: '8px 12px', fontWeight: 600, width: '140px' }}>MRP (₹)</th>
                                <th style={{ padding: '8px 12px', fontWeight: 600, width: '100px' }}>Discount</th>
                                <th style={{ padding: '8px 12px', fontWeight: 600, width: '140px' }}>Selling Price</th>
                              </tr>
                            </thead>
                            <tbody>
                              {combinations.map((comb) => {
                                const combMrp = Number(comb.mrp) || 0;
                                const combDiscount = Number(discount) || 0;
                                const combSellingPrice = calculateDiscountedPrice(combMrp, combDiscount);
                                const attrString = Object.entries(comb.attributes || {})
                                  .map(([k, v]) => `${k.replace(/[-_]/g, ' ')}: ${v}`)
                                  .join(' / ');

                                return (
                                  <tr key={comb.id} style={{ borderBottom: '1px solid var(--border-color, #eee)' }}>
                                    <td style={{ padding: '8px 12px', fontWeight: 500 }}>
                                      {attrString || comb.id}
                                    </td>
                                    <td style={{ padding: '8px 12px' }}>
                                      <input
                                        type="number"
                                        min="0"
                                        className="admin-form-control"
                                        style={{ padding: '4px 8px', fontSize: '0.82rem' }}
                                        value={comb.mrp ?? ''}
                                        onChange={(e) => handleCombinationMrpChange(comb.id, e.target.value)}
                                        placeholder="0"
                                        required
                                      />
                                    </td>
                                    <td style={{ padding: '8px 12px', color: 'var(--accent, #e65100)', fontWeight: 600 }}>
                                      {combDiscount > 0 ? `${combDiscount}% off` : '0%'}
                                    </td>
                                    <td style={{ padding: '8px 12px', fontWeight: 700, color: 'var(--success, #2e7d32)' }}>
                                      {formatINR(combSellingPrice)}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
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
