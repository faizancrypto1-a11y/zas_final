'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Heart, ArrowRight, ShoppingBag } from 'lucide-react';
import { useCommerce } from 'src/context/StoreContext';
import ProductCard from 'src/components/ProductCard';

const WishlistPage = () => {
  const { wishlist, toggleWishlist, addToCart } = useCommerce();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch all products to filter locally by wishlist IDs
  useEffect(() => {
    const fetchWishlistProducts = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/products');
        const data = await res.json();
        
        if (data.success) {
          // Filter products in active user wishlist
          const wishProducts = data.products.filter(p => wishlist.includes(p.id || p._id));
          setProducts(wishProducts);
        }
        setLoading(false);
      } catch (err) {
        console.error('Error fetching wishlist products:', err);
        setLoading(false);
      }
    };

    fetchWishlistProducts();
  }, [wishlist]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <div style={{ display: 'inline-block', width: '32px', height: '32px', border: '3px solid var(--bg-light-border)', borderTopColor: 'var(--text-dark)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <p style={{ marginTop: '10px', color: 'var(--text-dark-muted)' }}>Syncing your saved gear items...</p>
      </div>
    );
  }

  if (wishlist.length === 0 || products.length === 0) {
    return (
      <div className="container animate-fade" style={{ padding: '80px 20px', textAlign: 'center' }}>
        <Heart size={64} style={{ color: 'var(--text-dark-muted)', marginBottom: '20px' }} />
        <h2>Your Wishlist is Empty</h2>
        <p style={{ color: 'var(--text-dark-muted)', marginTop: '8px' }}>Save items you like in your wishlist to keep track of stock and purchase later.</p>
        <Link href="/shop" className="btn btn-primary" style={{ marginTop: '24px' }}>
          Explore Products <ArrowRight size={16} />
        </Link>
      </div>
    );
  }

  return (
    <div className="container animate-fade">
      <h1 style={{ fontSize: '2rem', textTransform: 'uppercase', fontFamily: 'Outfit', margin: '30px 0 10px' }}>
        Your Wishlist ({products.length})
      </h1>
      <p style={{ color: 'var(--text-dark-muted)', marginBottom: '30px' }}>
        Keep track of prices, discounts, and low stock tags on your favorite willow and gears.
      </p>

      <div className="grid grid-4 animate-fade">
        {products.map((product) => (
          <ProductCard 
            key={product.id || product._id} 
            product={product} 
            isWishlisted={true}
            onWishlistToggle={toggleWishlist}
            onAddToCart={addToCart}
          />
        ))}
      </div>
    </div>
  );
};

export default WishlistPage;
