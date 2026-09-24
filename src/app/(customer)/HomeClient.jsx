'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ChevronLeft,
  ChevronRight,
  Truck,
  ShieldCheck,
  RefreshCw,
  Award,
  ArrowRight,
  MessagesSquare
} from 'lucide-react';
import { useCommerce } from 'src/context/StoreContext';
import ProductCard from 'src/components/ProductCard';

// Interactive homepage shell. The server prepares ONLY the products actually
// shown (up to 4 per grid / category row) and passes them in as `sections`, plus
// the active `categories` for the icon grid and collection banners — so the
// browser never receives the full catalogue. Only genuinely interactive pieces
// (banner carousel, wishlist/add-to-cart via context) live here.
const HomeClient = ({ sections = {}, categories = [] }) => {
  const {
    popularProducts = [],
    newArrivals = [],
    bestSellers = [],
    categoryRows = [],
  } = sections;
  const { wishlist, toggleWishlist, addToCart } = useCommerce();
  const [currentSlide, setCurrentSlide] = useState(0);

  // Hard-locked cricket banners
  const banners = [
    {
      title: 'Zassports Cricket Arena',
      subtitle: 'Unleash your true potential with professional English Willow bats and custom protective gear.',
      image: '/images/hero/cricket-bats-hero.jpg',
      link: '/shop?category=cricket-bats'
    },
    {
      title: 'Premium Cricket Leather Balls',
      subtitle: 'Alum-tanned hand-stitched four-piece leather balls for extreme seam movement and swing.',
      image: '/images/hero/cricket-balls-hero.jpg',
      link: '/shop?category=cricket-balls'
    }
  ];

  // Slide controls
  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % banners.length);
  };
  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + banners.length) % banners.length);
  };

  // Auto slide interval
  useEffect(() => {
    const interval = setInterval(nextSlide, 6000);
    return () => clearInterval(interval);
  }, []);

  const checklistItems = [
    { name: 'Bat', image: '/images/checklist/bat.jpg', link: '/shop?category=cricket-bats' },
    { name: 'Ball', image: '/images/checklist/ball.jpg', link: '/shop?category=cricket-balls' },
    { name: 'Gloves', image: '/images/checklist/gloves.jpg', link: '/shop?category=batting-gloves' },
    { name: 'Pads', image: '/images/checklist/pads.jpg', link: '/shop?category=batting-pads' },
    { name: 'Helmet', image: '/images/checklist/helmet.jpg', link: '/shop?category=cricket-helmets' },
    { name: 'Shoes', image: '/images/checklist/shoes.jpg', link: '/shop?category=cricket-shoes' },
    { name: 'Bag', image: '/images/checklist/bag.jpg', link: '/shop?category=cricket-bags' },
    { name: 'Jersey', image: '/images/checklist/jersey.jpg', link: '/shop?category=cricket-clothing&subcategory=cricket-jersey' }
  ];

  return (
    <div className="homepage-container animate-fade">
      {/* 1. HERO BANNER */}
      <div className="hero-slider">
        <div
          className="hero-slide"
          style={{ backgroundImage: `url(${banners[currentSlide].image})` }}
        >
          <div className="hero-content">
            <h1 className="hero-title">
              {banners[currentSlide].title.split(' ').map((word, idx) =>
                idx === 1 || idx === 2 ? <span key={idx}>{word} </span> : `${word} `
              )}
            </h1>
            <p className="hero-subtitle">{banners[currentSlide].subtitle}</p>
            <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
              <Link href={banners[currentSlide].link} className="btn btn-accent">
                Shop Cricket Gear <ArrowRight size={16} />
              </Link>
              <Link href="/shop" className="btn btn-secondary" style={{ color: 'white', borderColor: 'white' }}>
                Explore Categories
              </Link>
            </div>
          </div>
        </div>
        <button type="button" className="action-btn slider-control-btn left" onClick={prevSlide}>
          <ChevronLeft size={24} />
        </button>
        <button type="button" className="action-btn slider-control-btn right" onClick={nextSlide}>
          <ChevronRight size={24} />
        </button>
      </div>

      {/* 2. CATEGORY ICON GRID */}
      <section style={{ marginBottom: '60px' }}>
        <div className="section-header">
          <h2>Browse Categories</h2>
          <Link href="/shop" className="guide-link">View All <ArrowRight size={14} /></Link>
        </div>
        <div className="category-row">
          {categories.map((cat) => (
            <Link href={`/shop?category=${cat.slug}`} key={cat.id || cat._id} className="category-card">
              <div className="category-img-box" style={{ overflow: 'hidden' }}>
                <img
                  src={cat.image || `/images/categories/${cat.slug}.jpg`}
                  alt=""
                  onError={(e) => { e.target.src = '/images/categories/accessories.jpg'; }}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
              <span className="category-name">{cat.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* 3. SHOP YOUR CRICKET CHECKLIST */}
      <section style={{ marginBottom: '60px', padding: '40px 20px', backgroundColor: 'var(--bg-light-card)', borderRadius: 'var(--border-radius-lg)', border: '1px solid var(--bg-light-border)' }}>
        <div className="section-header" style={{ marginBottom: '30px' }}>
          <div>
            <h2 style={{ fontFamily: 'Outfit', textTransform: 'uppercase' }}>Shop Your Cricket Checklist</h2>
            <p style={{ color: 'var(--text-dark-muted)', fontSize: '0.9rem', marginTop: '4px' }}>Essential equipment needed for game-day preparation.</p>
          </div>
        </div>
        <div className="checklist-grid">
          {checklistItems.map((item, idx) => (
            <Link href={item.link} key={idx} className="checklist-card">
              <div className="checklist-icon-wrapper" style={{ overflow: 'hidden', padding: 0 }}>
                <img
                  src={item.image}
                  alt=""
                  onError={(e) => { e.target.src = '/images/checklist/bat.jpg'; }}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                />
              </div>
              <span className="checklist-label">{item.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* 4. MOST POPULAR PRODUCTS */}
      {popularProducts.length > 0 && (
        <section style={{ marginBottom: '60px' }}>
          <div className="section-header">
            <h2>Most Popular Products</h2>
            <Link href="/shop?sort=rating-desc" className="guide-link">View All <ArrowRight size={14} /></Link>
          </div>
          <div className="grid grid-4">
            {popularProducts.map((product) => (
              <ProductCard
                key={product.id || product._id}
                product={product}
                isWishlisted={wishlist.includes(product.id || product._id)}
                onWishlistToggle={toggleWishlist}
                onAddToCart={addToCart}
              />
            ))}
          </div>
        </section>
      )}

      {/* 5. NEW ARRIVALS */}
      {newArrivals.length > 0 && (
        <section style={{ marginBottom: '60px' }}>
          <div className="section-header">
            <h2>New Arrivals</h2>
            <Link href="/shop?sort=newest" className="guide-link">View All <ArrowRight size={14} /></Link>
          </div>
          <div className="grid grid-4">
            {newArrivals.map((product) => (
              <ProductCard
                key={product.id || product._id}
                product={product}
                isWishlisted={wishlist.includes(product.id || product._id)}
                onWishlistToggle={toggleWishlist}
                onAddToCart={addToCart}
              />
            ))}
          </div>
        </section>
      )}

      {/* 6. BEST SELLERS */}
      {bestSellers.length > 0 && (
        <section style={{ marginBottom: '60px' }}>
          <div className="section-header">
            <h2>Best Sellers</h2>
            <Link href="/shop?sort=discount-desc" className="guide-link">View All <ArrowRight size={14} /></Link>
          </div>
          <div className="grid grid-4">
            {bestSellers.map((product) => (
              <ProductCard
                key={product.id || product._id}
                product={product}
                isWishlisted={wishlist.includes(product.id || product._id)}
                onWishlistToggle={toggleWishlist}
                onAddToCart={addToCart}
              />
            ))}
          </div>
        </section>
      )}

      {/* 6b. SHOP BY CATEGORY — dynamic rows prepared on the server, one per
           active category that has products (in displayOrder). Every active
           product (including newly added ones) surfaces under its category row,
           matched by category slug — no hardcoded slugs, no marketing-flag
           dependence. */}
      {categoryRows.map((cat) => (
        <section key={cat.id || cat._id} style={{ marginBottom: '60px' }}>
          <div className="section-header">
            <h2>{cat.name}</h2>
            <Link href={`/shop?category=${cat.slug}`} className="guide-link">View All <ArrowRight size={14} /></Link>
          </div>
          <div className="grid grid-4">
            {cat.products.map((product) => (
              <ProductCard
                key={product.id || product._id}
                product={product}
                isWishlisted={wishlist.includes(product.id || product._id)}
                onWishlistToggle={toggleWishlist}
                onAddToCart={addToCart}
              />
            ))}
          </div>
        </section>
      ))}

      {/* 7. OUR CRICKET COLLECTIONS */}
      <section style={{ marginBottom: '60px' }}>
        <div className="section-header">
          <h2>Our Cricket Collections</h2>
        </div>
        <div className="grid grid-3">
          {categories.map((cat) => {
            const bgImage = cat.image || `/images/collections/${cat.slug}.jpg`;
            return (
              <Link href={`/shop?category=${cat.slug}`} key={cat.id || cat._id} className="collection-banner-card" style={{ backgroundImage: `linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url(${bgImage})` }}>
                <div className="collection-content">
                  <h3>{cat.name}</h3>
                  <span className="collection-btn">Explore Collection <ArrowRight size={14} /></span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* 8. TRUST / SERVICE STRIP */}
      <section className="trust-badges" style={{ margin: '40px 0 60px' }}>
        <div className="badge-item">
          <RefreshCw size={32} className="badge-icon" />
          <div className="badge-info">
            <h4>7 Days Return / Exchange</h4>
            <p>Easy exchanges on size adjustments</p>
          </div>
        </div>
        <div className="badge-item">
          <Truck size={32} className="badge-icon" />
          <div className="badge-info">
            <h4>All India Delivery</h4>
            <p>Fast dispatch to all pincodes</p>
          </div>
        </div>
        <div className="badge-item">
          <ShieldCheck size={32} className="badge-icon" />
          <div className="badge-info">
            <h4>COD Available</h4>
            <p>Pay cash on delivery option</p>
          </div>
        </div>
        <div className="badge-item">
          <Award size={32} className="badge-icon" />
          <div className="badge-info">
            <h4>Online Payment Available</h4>
            <p>100% secure checkout portals</p>
          </div>
        </div>
      </section>

      {/* 9. STORE / MEMBER CTA */}
      <section style={{ backgroundColor: 'var(--bg-dark)', color: 'white', borderRadius: 'var(--border-radius-lg)', padding: '60px 40px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'relative', zIndex: 2 }}>
          <h3 style={{ fontSize: '2.2rem', fontFamily: 'Outfit', fontWeight: 800, color: 'white', textTransform: 'uppercase' }}>Join the Zassports Club</h3>
          <p style={{ color: 'var(--text-light-muted)', fontSize: '0.95rem', maxWidth: '600px', margin: '15px auto 30px', lineHeight: '1.6' }}>
            Get direct WhatsApp customer support, details on new bats arrivals, and exclusive custom discounts. Subscribe below or connect directly with our experts.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', flexWrap: 'wrap' }}>
            <a href="https://wa.me/918860654659" target="_blank" rel="noopener noreferrer" className="btn btn-accent" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MessagesSquare size={18} /> WhatsApp Support
            </a>
            <Link href="/contact" className="btn btn-secondary" style={{ color: 'white', borderColor: 'rgba(255,255,255,0.2)' }}>
              Contact Details
            </Link>
          </div>
        </div>
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0.1, backgroundImage: 'radial-gradient(circle, var(--primary) 10%, transparent 11%)', backgroundSize: '20px 20px' }} />
      </section>
    </div>
  );
};

export default HomeClient;
