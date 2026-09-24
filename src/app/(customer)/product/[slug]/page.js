'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { 
  Star, 
  Heart, 
  ShoppingBag, 
  MessagesSquare, 
  Truck, 
  ShieldCheck, 
  RotateCcw, 
  Sparkles,
  Info,
  ChevronRight,
  Plus,
  Minus
} from 'lucide-react';
import { useStore } from 'src/context/StoreContext';
import ProductCard from 'src/components/ProductCard';
import InlineSVG from 'src/components/InlineSVG';
import { formatINR } from 'src/lib/currency';
import { getProductOptions, resolveSelectedVariant } from 'src/lib/productPricing';

const ProductDetailPage = () => {
  const router = useRouter();
  const { slug } = useParams();
  const { cart, wishlist, toggleWishlist, addToCart, pincode, pincodeStatus, verifyPincode } = useStore();

  // Component states
  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Gallery and configuration states
  const [activeImgIndex, setActiveImgIndex] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState({});
  const [quantity, setQuantity] = useState(1);
  const [pinInput, setPinInput] = useState('');
  const [pinCheckStatus, setPinCheckStatus] = useState(null); // null, 'checking', 'valid', 'invalid'

  // Tab control
  const [activeTab, setActiveTab] = useState('description');

  // Customer reviews
  const [reviews, setReviews] = useState([]);
  const [reviewerName, setReviewerName] = useState('');
  const [reviewerEmail, setReviewerEmail] = useState('');
  const [reviewerRating, setReviewerRating] = useState(5);
  const [reviewerComment, setReviewerComment] = useState('');
  const [reviewSubmitMessage, setReviewSubmitMessage] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  const fetchProductReviews = async (pId) => {
    try {
      if (!pId) return;
      const res = await fetch(`/api/reviews?productId=${encodeURIComponent(pId)}`, {
        priority: 'low'
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data?.success && Array.isArray(data.reviews)) {
        setReviews(data.reviews);
      }
    } catch (err) {
      console.log('Error loading reviews:', err);
    }
  };

  const fetchRelatedProducts = async (currentProd) => {
    try {
      if (!currentProd?.category) {
        setRelatedProducts([]);
        return;
      }
      const categoryParam = encodeURIComponent(currentProd.category);
      const relatedRes = await fetch(
        `/api/products?category=${categoryParam}&limit=5`,
        { priority: 'low' }
      );

      if (!relatedRes.ok) {
        setRelatedProducts([]);
        return;
      }

      const relatedData = await relatedRes.json();
      if (relatedData?.success && Array.isArray(relatedData.products)) {
        const currentId = String(currentProd.id || currentProd._id || '');
        const filtered = relatedData.products
          .filter(p => p && String(p.id || p._id) !== currentId)
          .slice(0, 4);
        setRelatedProducts(filtered);
      } else {
        setRelatedProducts([]);
      }
    } catch (err) {
      console.error('Related products loading failed:', err);
      setRelatedProducts([]);
    }
  };

  // 1. Fetch product & related items by slug
  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 12000); // 12-second timeout protection for main product

    const fetchProductDetails = async () => {
      let currentProd = null;
      try {
        setLoading(true);
        setError(null);
        setRelatedProducts([]);
        setReviews([]);
        
        const res = await fetch(`/api/products/${encodeURIComponent(slug)}`, {
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!res.ok) {
          throw new Error(`Failed to load product (status ${res.status})`);
        }
        
        const data = await res.json();
        
        if (data && data.success && data.product) {
          currentProd = data.product;
          if (isMounted) {
            setProduct(currentProd);
            
            // Pre-select first variant options if available
            const options = getProductOptions(currentProd);
            const initial = {};
            if (currentProd.variants?.combinations?.length > 0) {
              const firstComb = currentProd.variants.combinations.find(c => c && c.mrp > 0) || currentProd.variants.combinations[0];
              if (firstComb && firstComb.attributes) {
                Object.assign(initial, firstComb.attributes);
              }
            }
            options.forEach(opt => {
              if (!initial[opt.key] && opt.values?.length > 0) {
                initial[opt.key] = opt.values[0];
              }
            });
            setSelectedOptions(initial);
          }
        } else {
          throw new Error(data?.error || 'Product not found');
        }
      } catch (err) {
        if (!isMounted) return;
        console.error('Error fetching details:', err);
        if (err.name === 'AbortError') {
          setError('Unable to load this product right now. Please try again.');
        } else {
          setError(err.message || 'Error loading page details');
        }
      } finally {
        clearTimeout(timeoutId);
        if (isMounted) {
          setLoading(false);
        }
      }

      // Secondary background loading: never blocks main product rendering
      if (currentProd && isMounted) {
        fetchProductReviews(currentProd.id || currentProd._id);
        fetchRelatedProducts(currentProd);
      }
    };

    if (slug) {
      fetchProductDetails();
    }

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [slug]);

  // Sync general pincode from context
  useEffect(() => {
    if (pincode) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPinInput(pincode);
      setPinCheckStatus(pincodeStatus === 'deliverable' ? 'valid' : 'invalid');
    }
  }, [pincode, pincodeStatus]);

  const handlePincodeValidate = (e) => {
    e.preventDefault();
    if (pinInput.trim()) {
      setPinCheckStatus('checking');
      setTimeout(() => {
        const isDeliverable = verifyPincode(pinInput.trim());
        setPinCheckStatus(isDeliverable ? 'valid' : 'invalid');
      }, 800);
    }
  };

  // Dynamic Options list
  const variantOptions = getProductOptions(product);

  // Authoritative variant pricing resolution on client
  const resolvedPricing = resolveSelectedVariant(product, selectedOptions);
  const effective = {
    price: resolvedPricing.sellingPrice,
    mrp: resolvedPricing.mrp,
    discount: resolvedPricing.discount,
    matched: resolvedPricing.matched,
    variantId: resolvedPricing.variantId,
    attributes: resolvedPricing.attributes || selectedOptions
  };

  const allOptionsSelected = variantOptions.every(
    opt => selectedOptions[opt.key] != null && String(selectedOptions[opt.key]).trim() !== ''
  );
  const isVariantAvailable = variantOptions.length === 0 || (allOptionsSelected && effective.matched);

  const handleAddToCart = () => {
    if (product.stock <= 0 || !isVariantAvailable) return;
    const selectedVariantPayload = {
      ...(effective.variantId ? { variantId: effective.variantId } : {}),
      ...selectedOptions
    };
    const pricedProduct = { ...product, price: effective.price, mrp: effective.mrp };
    addToCart(pricedProduct, selectedVariantPayload, quantity);
  };

  const handleBuyNow = () => {
    if (product.stock <= 0 || !isVariantAvailable) return;
    const selectedVariantPayload = {
      ...(effective.variantId ? { variantId: effective.variantId } : {}),
      ...selectedOptions
    };
    const pricedProduct = { ...product, price: effective.price, mrp: effective.mrp };
    addToCart(pricedProduct, selectedVariantPayload, quantity, { silent: true });
    router.push('/cart');
  };

  // Review submission controller
  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!reviewerComment.trim()) return;

    try {
      setReviewSubmitting(true);
      setReviewSubmitMessage('');
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id || product._id,
          rating: Number(reviewerRating),
          comment: reviewerComment,
          userName: reviewerName,
          userEmail: reviewerEmail
        })
      });
      const data = await res.json();
      
      if (data.success) {
        setReviewSubmitMessage('Thank you! Your review has been submitted for approval.');
        setReviewerComment('');
        setReviewerName('');
        setReviewerEmail('');
      } else {
        setReviewSubmitMessage(`Error: ${data.error}`);
      }
    } catch (err) {
      console.log('Error submitting review:', err);
      setReviewSubmitMessage('Error submitting your review. Please try again.');
    } finally {
      setReviewSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '120px 0' }}>
        <div style={{ display: 'inline-block', width: '40px', height: '40px', border: '4px solid var(--bg-light-border)', borderTopColor: 'var(--text-dark)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <p style={{ marginTop: '15px', color: 'var(--text-dark-muted)' }}>Retrieving product specification sheets...</p>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="container" style={{ padding: '80px 20px', textAlign: 'center' }}>
        <Info size={48} className="text-danger" style={{ marginBottom: '15px' }} />
        <h2>Product Details Not Available</h2>
        <p style={{ color: 'var(--text-dark-muted)', marginTop: '8px' }}>{error || 'The requested product does not exist in our catalog.'}</p>
        <Link href="/shop" className="btn btn-primary btn-sm" style={{ marginTop: '20px' }}>Back to Shop</Link>
      </div>
    );
  }

  const isOutOfStock = product.stock <= 0;
  const selectedSummary = Object.values(selectedOptions).filter(Boolean).join(' / ');
  const whatsappMessage = `Hi, I am interested in purchasing the *${product.name}*${selectedSummary ? ` (${selectedSummary})` : ''} (SKU: ${product.sku}) listed for ${formatINR(effective.price)} on your store. Is it available?`;
  const whatsappUrl = `https://wa.me/918860654659?text=${encodeURIComponent(whatsappMessage)}`;

  return (
    <div className="container animate-fade">
      {/* Breadcrumbs */}
      <div className="breadcrumbs">
        <Link href="/">Home</Link>
        <span>/</span>
        <Link href="/shop">Shop</Link>
        <span>/</span>
        <Link href={`/shop?category=${encodeURIComponent(product.category || '')}`}>
          {product.category ? product.category.replace(/-/g, ' ') : ''}
        </Link>
        <span>/</span>
        <span style={{ color: 'var(--text-dark)' }}>{product.name}</span>
      </div>

      <div className="detail-grid">
        {/* Gallery Panel */}
        <div className="detail-gallery">
          <div className="gallery-main">
            {product.images && product.images.length > 0 ? (
              <img src={product.images[activeImgIndex]} alt={product.name} />
            ) : (
              <InlineSVG type={product.category} />
            )}
          </div>
          {/* Thumbnails row */}
          {product.images && product.images.length > 1 && (
            <div className="gallery-thumbs">
              {product.images.map((img, idx) => (
                <div 
                  key={idx}
                  className={`gallery-thumb ${idx === activeImgIndex ? 'active' : ''}`}
                  onClick={() => setActiveImgIndex(idx)}
                >
                  <img src={img} alt={`Preview ${idx + 1}`} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info Column */}
        <div className="detail-info">
          <div className="detail-brand-sku">
            <span className="detail-brand">{product.brand}</span>
            <span>SKU: {product.sku}</span>
          </div>

          <h1 className="detail-title">{product.name}</h1>

          {/* Review stars */}
          <div className="detail-rating">
            <div className="rating-stars">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star 
                  key={i} 
                  size={16} 
                  fill={i < Math.round(Number(product.ratingsAverage ?? product.ratings?.average ?? 0)) ? '#F59E0B' : 'transparent'} 
                  stroke="#F59E0B" 
                  style={{ display: 'inline' }}
                />
              ))}
            </div>
            <span className="rating-count">
              {Number(product.ratingsAverage ?? product.ratings?.average ?? 0).toFixed(1)} ({product.ratingsCount ?? product.ratings?.count ?? 0} reviews)
            </span>
          </div>

          {/* Pricing Box */}
          <div className="detail-price-box" key={`price-${effective.price}`}>
            <span className="detail-price">{formatINR(effective.price)}</span>
            {effective.mrp > effective.price && (
              <>
                <span className="detail-mrp">{formatINR(effective.mrp)}</span>
                <span className="detail-discount">{effective.discount}% Off</span>
              </>
            )}
          </div>

          {/* VARIANTS CONFIGURATION */}
          {variantOptions.map(opt => (
            <div key={opt.key} className="detail-variants">
              <h4>Select {opt.label || opt.key}</h4>
              <div className="variant-chips">
                {opt.values.map(val => (
                  <button 
                    key={val} 
                    type="button" 
                    className={`variant-chip ${selectedOptions[opt.key] === val ? 'active' : ''}`}
                    onClick={() => setSelectedOptions(prev => ({ ...prev, [opt.key]: val }))}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>
          ))}

          {/* Quantity Selector */}
          <div className="detail-variants">
            <h4>Quantity</h4>
            <div className="qty-selector">
              <button 
                type="button" 
                className="qty-btn"
                onClick={() => setQuantity(q => Math.max(1, q - 1))}
              >
                <Minus size={14} />
              </button>
              <span className="qty-input">{quantity}</span>
              <button 
                type="button" 
                className="qty-btn"
                onClick={() => setQuantity(q => Math.min(product.stock, q + 1))}
              >
                <Plus size={14} />
              </button>
            </div>
          </div>

          {/* Delivery Pincode Checker */}
          <div className="pincode-checker-box">
            <h4 style={{ fontSize: '0.85rem' }}>Check Delivery Availability</h4>
            <form onSubmit={handlePincodeValidate} className="pincode-input-row">
              <input 
                type="text" 
                placeholder="Enter Delivery Pincode"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                maxLength={8}
                required
              />
              <button type="submit" className="btn btn-secondary btn-sm">Check</button>
            </form>
            {pinCheckStatus === 'checking' && (
              <span className="pincode-status" style={{ color: 'var(--text-dark-muted)' }}>Validating location hubs...</span>
            )}
            {pinCheckStatus === 'valid' && (
              <span className="pincode-status deliverable">✓ Standard Delivery: 3-5 days. Express Available.</span>
            )}
            {pinCheckStatus === 'invalid' && (
              <span className="pincode-status undeliverable">✗ We do not deliver to this pincode location.</span>
            )}
          </div>

          {/* Action buttons */}
          <div className="detail-actions">
            <button 
              type="button" 
              className="btn btn-primary"
              onClick={handleAddToCart}
              disabled={isOutOfStock || !isVariantAvailable}
            >
              <ShoppingBag size={18} /> {isOutOfStock ? 'Out of Stock' : !allOptionsSelected ? 'Select Options' : !effective.matched ? 'Unavailable' : 'Add to Cart'}
            </button>
            <button 
              type="button" 
              className="btn btn-accent"
              onClick={handleBuyNow}
              disabled={isOutOfStock || !isVariantAvailable}
            >
              Buy Now
            </button>
          </div>

          {/* Secondary support queries */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <a 
              href={whatsappUrl} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="btn btn-whatsapp btn-full btn-sm"
            >
              <MessagesSquare size={16} /> Inquiry on WhatsApp
            </a>
            <button 
              type="button" 
              className={`btn btn-secondary btn-sm ${wishlist.includes(product.id || product._id) ? 'active' : ''}`}
              style={{ width: 'fit-content' }}
              onClick={() => toggleWishlist(product.id || product._id)}
            >
              <Heart size={16} fill={wishlist.includes(product.id || product._id) ? '#EF4444' : 'transparent'} stroke={wishlist.includes(product.id || product._id) ? '#EF4444' : 'currentColor'} />
            </button>
          </div>

          {/* Fast trust metrics */}
          <div className="warranty-return-info">
            <div className="info-block">
              <Truck size={20} />
              <h5>Fast Delivery</h5>
              <span>Standard 3-5 days</span>
            </div>
            <div className="info-block">
              <ShieldCheck size={20} />
              <h5>Warranty</h5>
              <span>1 Year Brand Cover</span>
            </div>
            <div className="info-block">
              <RotateCcw size={20} />
              <h5>Easy Returns</h5>
              <span>7 Days Return/Exchange</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs description Specifications reviews */}
      <div className="product-tabs">
        <div className="tabs-nav">
          <button 
            type="button" 
            className={`tab-btn ${activeTab === 'description' ? 'active' : ''}`}
            onClick={() => setActiveTab('description')}
          >
            Description
          </button>
          <button 
            type="button" 
            className={`tab-btn ${activeTab === 'specifications' ? 'active' : ''}`}
            onClick={() => setActiveTab('specifications')}
          >
            Specifications
          </button>
          <button 
            type="button" 
            className={`tab-btn ${activeTab === 'reviews' ? 'active' : ''}`}
            onClick={() => setActiveTab('reviews')}
          >
            Reviews ({reviews.length})
          </button>
        </div>

        {/* Tab pane content */}
        <div className="tab-pane">
          {activeTab === 'description' && (
            <div className="animate-fade">
              <p style={{ fontSize: '1rem', color: 'var(--text-dark-muted)', lineHeight: '1.7', whiteSpace: 'pre-line' }}>
                {product.description}
              </p>
            </div>
          )}

          {activeTab === 'specifications' && (
            <div className="animate-fade" style={{ maxWidth: '600px' }}>
              {product.specs && Object.keys(product.specs).length > 0 ? (
                <table className="specs-table">
                  <tbody>
                    {Object.entries(product.specs).map(([key, value]) => (
                      <tr key={key}>
                        <td>{key}</td>
                        <td>{value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p style={{ color: 'var(--text-dark-muted)' }}>No specifications provided for this product.</p>
              )}
            </div>
          )}

          {activeTab === 'reviews' && (
            <div className="animate-fade" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '50px' }}>
              {/* Reviews List */}
              <div>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '20px' }}>Customer Feedback</h3>
                {reviews.length === 0 ? (
                  <p style={{ color: 'var(--text-dark-muted)', fontStyle: 'italic' }}>Be the first to review this product!</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {reviews.map(rev => (
                      <div key={rev._id} style={{ borderBottom: '1px solid var(--bg-light-border)', paddingBottom: '15px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{rev.userName}</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-dark-muted)' }}>{new Date(rev.createdAt).toLocaleDateString()}</span>
                        </div>
                        <div style={{ color: '#F59E0B', margin: '4px 0', fontSize: '0.85rem' }}>
                          {'★'.repeat(rev.rating)}{'☆'.repeat(5 - rev.rating)}
                        </div>
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-dark-muted)' }}>{rev.comment}</p>
                        {rev.reply && (
                          <div style={{ marginTop: '10px', padding: '10px 14px', backgroundColor: 'var(--bg-light)', borderRadius: 'var(--border-radius-sm)', borderLeft: '3px solid var(--primary)', fontSize: '0.85rem' }}>
                            <span style={{ fontWeight: 700 }}>Store Response:</span>
                            <p style={{ marginTop: '2px', fontStyle: 'italic', color: 'var(--text-dark-muted)' }}>{rev.reply}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Review submit form */}
              <div style={{ backgroundColor: 'white', padding: '24px', border: '1px solid var(--bg-light-border)', borderRadius: 'var(--border-radius-md)', height: 'fit-content' }}>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '15px' }}>Write a Review</h3>
                <form onSubmit={handleReviewSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <div className="form-group">
                    <label className="form-label">Rating</label>
                    <select 
                      value={reviewerRating} 
                      onChange={(e) => setReviewerRating(e.target.value)}
                      className="form-control"
                    >
                      <option value="5">5 Stars - Excellent</option>
                      <option value="4">4 Stars - Very Good</option>
                      <option value="3">3 Stars - Good</option>
                      <option value="2">2 Stars - Fair</option>
                      <option value="1">1 Star - Poor</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Review Comment</label>
                    <textarea 
                      placeholder="Share your experience with this equipment..."
                      value={reviewerComment}
                      onChange={(e) => setReviewerComment(e.target.value)}
                      rows={4}
                      className="form-control"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Your Name</label>
                    <input 
                      type="text"
                      placeholder="e.g. Robin Smith"
                      value={reviewerName}
                      onChange={(e) => setReviewerName(e.target.value)}
                      className="form-control"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Your Email</label>
                    <input 
                      type="email"
                      placeholder="e.g. robin@gmail.com"
                      value={reviewerEmail}
                      onChange={(e) => setReviewerEmail(e.target.value)}
                      className="form-control"
                      required
                    />
                  </div>
                  <button 
                    type="submit" 
                    className="btn btn-primary btn-sm btn-full"
                    disabled={reviewSubmitting}
                  >
                    Submit Review
                  </button>
                  {reviewSubmitMessage && (
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--success)', marginTop: '5px', textAlign: 'center' }}>
                      {reviewSubmitMessage}
                    </span>
                  )}
                </form>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Related Products Section */}
      {relatedProducts.length > 0 && (
        <section style={{ margin: '60px 0 80px' }}>
          <div className="section-header">
            <h2>Related Products</h2>
          </div>
          <div className="grid grid-4 animate-fade">
            {relatedProducts.map((prod) => (
              <ProductCard 
                key={prod.id || prod._id}
                product={prod}
                isWishlisted={wishlist.includes(prod.id || prod._id)}
                onWishlistToggle={toggleWishlist}
                onAddToCart={addToCart}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default ProductDetailPage;
