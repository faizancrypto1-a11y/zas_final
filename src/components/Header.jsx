'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Search, 
  User, 
  Heart, 
  ShoppingBag, 
  PhoneCall, 
  X,
  ChevronDown,
  Menu
} from 'lucide-react';
import { useAuth, useCommerce, useConfig, useSearch } from 'src/context/StoreContext';
import { HEADER_CATEGORIES } from 'src/lib/categories';

const Header = () => {
  const router = useRouter();
  // Subscribe narrowly: only the search context re-renders the header on every
  // keystroke; cart/wishlist/auth/categories update it only when they change.
  const { user, logoutUser } = useAuth();
  const { cart, wishlist } = useCommerce();
  const { categories } = useConfig();
  const { searchQuery, setSearchQuery } = useSearch();


  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);

  // Cart total quantities
  const cartCount = useMemo(
    () => cart.reduce((total, item) => total + item.quantity, 0),
    [cart]
  );

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/shop?search=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      router.push('/shop');
    }
    setShowMobileSearch(false);
  };



  const activeCategories = useMemo(
    () => categories.filter(c => c.isActive),
    [categories]
  );

  const displayCategories = useMemo(
    () => (activeCategories.length > 0 ? activeCategories : HEADER_CATEGORIES),
    [activeCategories]
  );

  return (
    <>
      {/* 1. TOP OFFER BAR */}
      <div className="offer-bar">
        🏏 SHIPPED ALL OVER INDIA | CASH ON DELIVERY AVAILABLE | 7 DAYS EASY RETURN & EXCHANGE 🏏
      </div>

      <header className="main-header">
        <div className="container">
          {/* 2. MAIN HEADER ROW (DESKTOP) */}
          <div className="header-top desktop-only-flex">
            {/* Logo */}
            <Link href="/" className="logo">
              <img src="/images/logo.jpeg" alt="ZAS Sports" className="logo-img" />
            </Link>

            {/* Large Search Bar */}
            <form onSubmit={handleSearchSubmit} className="search-bar-container">
              <input
                type="text"
                placeholder="Search bats, balls, gloves, shoes, protective gear..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
              <button type="submit" className="search-btn" aria-label="Search">
                <Search size={18} />
              </button>
            </form>

            {/* Header Action Items */}
            <div className="header-actions">


              {/* Support */}
              <Link href="/contact" className="action-icon-btn">
                <PhoneCall size={20} />
                <span>Support</span>
              </Link>

              {/* Wishlist */}
              <Link href="/wishlist" className="action-icon-btn">
                <Heart size={20} />
                <span>Wishlist</span>
                {wishlist.length > 0 && (
                  <span className="icon-badge">{wishlist.length}</span>
                )}
              </Link>

              {/* Cart */}
              <Link href="/cart" className="action-icon-btn">
                <ShoppingBag size={20} />
                <span>Cart</span>
                {cartCount > 0 && (
                  <span className="icon-badge">{cartCount}</span>
                )}
              </Link>

              {/* Authentication Portal */}
              <div className="position-relative" style={{ position: 'relative' }}>
                {user ? (
                  <div 
                    className="action-icon-btn" 
                    onClick={() => setShowUserDropdown(!showUserDropdown)}
                    style={{ cursor: 'pointer' }}
                  >
                    <User size={20} />
                    <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                      Profile <ChevronDown size={10} />
                    </span>
                  </div>
                ) : (
                  <Link href="/login" className="action-icon-btn">
                    <User size={20} />
                    <span>Sign In</span>
                  </Link>
                )}

                {user && showUserDropdown && (
                  <div 
                    className="user-dropdown-menu" 
                    onMouseLeave={() => setShowUserDropdown(false)}
                  >
                    <Link 
                      href={user.role === 'admin' ? '/admin' : '/account'} 
                      className="dropdown-link"
                      onClick={() => setShowUserDropdown(false)}
                    >
                      {user.role === 'admin' ? 'Admin Dashboard' : 'My Account'}
                    </Link>
                    {user.role !== 'admin' && (
                      <Link 
                        href="/account#orders" 
                        className="dropdown-link"
                        onClick={() => setShowUserDropdown(false)}
                      >
                        My Orders
                      </Link>
                    )}
                    <button 
                      type="button" 
                      className="dropdown-link text-danger" 
                      onClick={() => {
                        logoutUser();
                        setShowUserDropdown(false);
                      }}
                    >
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 3. MOBILE HEADER ROW */}
          <div className="header-top mobile-only-flex">
            <button 
              type="button" 
              className="mobile-menu-trigger" 
              onClick={() => setShowMobileMenu(true)}
              aria-label="Open Menu"
            >
              <Menu size={24} />
            </button>

            <Link href="/" className="logo">
              <img src="/images/logo.jpeg" alt="ZAS Sports" className="logo-img" />
            </Link>

            <div className="header-actions">
              <button 
                type="button" 
                className="mobile-action-btn"
                onClick={() => setShowMobileSearch(!showMobileSearch)}
              >
                <Search size={22} />
              </button>
              <Link href="/wishlist" className="mobile-action-btn position-relative">
                <Heart size={22} />
                {wishlist.length > 0 && <span className="icon-badge">{wishlist.length}</span>}
              </Link>
              <Link href="/cart" className="mobile-action-btn position-relative">
                <ShoppingBag size={22} />
                {cartCount > 0 && <span className="icon-badge">{cartCount}</span>}
              </Link>
            </div>
          </div>
        </div>

        {/* 4. SECONDARY NAVIGATION (DESKTOP) */}
        <nav className="nav-bar desktop-only-flex">
          <div className="container">
            <ul className="nav-links">
              {displayCategories.map((cat) => (
                <li key={cat.id || cat._id || cat.slug} className="nav-item">
                  <Link href={`/shop?category=${cat.slug}`} className="nav-link">
                    {cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        {/* Mobile Search Bar Toggle Dropdown */}
        {showMobileSearch && (
          <div className="mobile-search-dropdown animate-slide-down">
            <div className="container">
              <form onSubmit={handleSearchSubmit} className="search-bar-container">
                <input
                  type="text"
                  placeholder="Search cricket gear..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input"
                  autoFocus
                />
                <button type="submit" className="search-btn" aria-label="Search">
                  <Search size={18} />
                </button>
              </form>
            </div>
          </div>
        )}
      </header>

      {/* 5. MOBILE NAVIGATION CATEGORY DRAWER */}
      {showMobileMenu && (
        <>
          <div className="drawer-overlay" style={{ zIndex: 199 }} onClick={() => setShowMobileMenu(false)} />
          <div className="mobile-category-drawer animate-fade" style={{ zIndex: 200 }}>
            <div className="drawer-header" style={{ display: 'flex', justifyContent: 'space-between', padding: '20px 20px', borderBottom: '1px solid var(--bg-light-border)' }}>
              <span className="logo">
                <img src="/images/logo.jpeg" alt="ZAS Sports" className="logo-img" />
              </span>
              <button type="button" onClick={() => setShowMobileMenu(false)}>
                <X size={22} />
              </button>
            </div>
            
            <div className="drawer-body" style={{ padding: '20px 0', overflowY: 'auto', height: 'calc(100% - 70px)' }}>
              <div className="drawer-section">
                <h4 className="drawer-section-title">Sports Categories</h4>
                <ul className="drawer-menu-links">
                  <li>
                    <Link href="/shop" onClick={() => setShowMobileMenu(false)}>
                      All Sports Catalog
                    </Link>
                  </li>
                  {displayCategories.map(cat => (
                    <li key={cat.id || cat._id || cat.slug}>
                      <Link href={`/shop?category=${cat.slug}`} onClick={() => setShowMobileMenu(false)}>
                        {cat.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="drawer-section" style={{ borderTop: '1px solid var(--bg-light-border)', paddingTop: '20px', marginTop: '20px' }}>
                <h4 className="drawer-section-title">Shop by Segment</h4>
                <ul className="drawer-menu-links">
                  <li>
                    <Link href="/shop?ageGroup=Men" onClick={() => setShowMobileMenu(false)}>
                      Men&apos;s Section
                    </Link>
                  </li>
                  <li>
                    <Link href="/shop?ageGroup=Women" onClick={() => setShowMobileMenu(false)}>
                      Women&apos;s Section
                    </Link>
                  </li>
                  <li>
                    <Link href="/shop?ageGroup=Kids" onClick={() => setShowMobileMenu(false)}>
                      Kids&apos; Section
                    </Link>
                  </li>
                </ul>
              </div>



              <div className="drawer-section" style={{ borderTop: '1px solid var(--bg-light-border)', paddingTop: '20px', marginTop: '20px' }}>
                <h4 className="drawer-section-title">User Account</h4>
                <ul className="drawer-menu-links">
                  {user ? (
                    <>
                      <li>
                        <Link href={user.role === 'admin' ? '/admin' : '/account'} onClick={() => setShowMobileMenu(false)}>
                          {user.role === 'admin' ? 'Admin Dashboard' : 'My Profile'}
                        </Link>
                      </li>
                      <li>
                        <button 
                          type="button" 
                          className="text-danger" 
                          style={{ width: '100%', textAlign: 'left', fontWeight: 'bold', padding: '12px 20px' }}
                          onClick={() => {
                            logoutUser();
                            setShowMobileMenu(false);
                          }}
                        >
                          Sign Out
                        </button>
                      </li>
                    </>
                  ) : (
                    <li>
                      <Link href="/login" onClick={() => setShowMobileMenu(false)}>
                        Sign In
                      </Link>
                    </li>
                  )}
                  <li>
                    <Link href="/contact" onClick={() => setShowMobileMenu(false)}>
                      Contact Support
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </>
      )}


    </>
  );
};

export default Header;
