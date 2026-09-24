import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Star, Heart, ShoppingBag } from 'lucide-react';
import InlineSVG from './InlineSVG';
import { formatINR } from 'src/lib/currency';
import { getProductPricingSummary } from 'src/lib/productPricing';

const ProductCard = ({
  product, 
  isWishlisted = false, 
  onWishlistToggle = () => {}, 
  onAddToCart = () => {} 
}) => {
  const router = useRouter();

  if (!product) return null;

  const {
    id,
    _id,
    name,
    brand,
    slug,
    price,
    mrp,
    discount,
    stock,
    ratings = { average: 0, count: 0 },
    category,
    images = [],
    isBestSeller,
    isNewArrival
  } = product;

  const productId = id || _id;
  const hasImage = images && images.length > 0;
  const isOutOfStock = stock <= 0;

  const pricing = getProductPricingSummary(product);
  const displayPrice = pricing.displayPrice;
  const displayMrp = pricing.displayMrp;
  const displayDiscount = pricing.discount;
  const isFromPrice = pricing.hasVariants && pricing.isPriceRange;

  const handleWishlistClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onWishlistToggle(productId);
  };

  const handleCartClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isOutOfStock) {
      if (pricing.hasVariants) {
        router.push(`/product/${slug}`);
      } else {
        onAddToCart(product);
      }
    }
  };

  return (
    <div className="product-card animate-fade">
      <Link href={`/product/${slug}`} style={{ display: 'block', color: 'inherit' }}>
        <div className="product-image-wrapper">
          {/* Badge Tags */}
          <div className="product-tag">
            {isOutOfStock ? (
              <span className="badge badge-stock-out">Out of stock</span>
            ) : stock <= 5 ? (
              <span className="badge badge-low-stock">Only {stock} Left</span>
            ) : isBestSeller ? (
              <span className="badge badge-featured">Bestseller</span>
            ) : isNewArrival ? (
              <span className="badge badge-new">New</span>
            ) : displayDiscount >= 20 ? (
              <span className="badge badge-sale">{displayDiscount}% Off</span>
            ) : null}
          </div>

          {/* Wishlist Button */}
          <button 
            type="button"
            className={`wishlist-btn ${isWishlisted ? 'active' : ''}`}
            onClick={handleWishlistClick}
            aria-label="Toggle Wishlist"
          >
            <Heart size={18} fill={isWishlisted ? '#EF4444' : 'transparent'} stroke={isWishlisted ? '#EF4444' : 'currentColor'} />
          </button>

          {/* Product Image — fill the fixed-aspect wrapper so there's no layout
              shift; sizes matches the 2/3/4-up responsive grids. */}
          {hasImage ? (
            <Image
              src={images[0]}
              alt={name}
              className="product-image"
              fill
              sizes="(max-width: 600px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
          ) : (
            <InlineSVG type={category} className="product-image" />
          )}
        </div>

        <div className="product-info">
          <span className="product-brand">{brand}</span>
          <h3 className="product-title">{name}</h3>
          
          <div className="product-rating">
            <Star size={14} fill="#F59E0B" stroke="#F59E0B" />
            <span>{ratings.average?.toFixed(1) || '0.0'} ({ratings.count || 0})</span>
          </div>

          <div className="product-price-row">
            <span className="price-sale">
              {isFromPrice ? 'From ' : ''}{formatINR(displayPrice)}
            </span>
            {displayMrp > displayPrice && (
              <>
                <span className="price-mrp">{formatINR(displayMrp)}</span>
                <span className="price-discount">-{displayDiscount}%</span>
              </>
            )}
          </div>

          <div className="product-card-actions">
            {isOutOfStock ? (
              <button 
                type="button" 
                className="btn btn-secondary btn-sm btn-full"
                disabled
              >
                Out of Stock
              </button>
            ) : (
              <button 
                type="button" 
                className="btn btn-primary btn-sm btn-full"
                onClick={handleCartClick}
              >
                <ShoppingBag size={14} /> {pricing.hasVariants ? 'Select Options' : 'Add to Cart'}
              </button>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
};

// Memoized: with stable callback props from the store, cards in a grid don't
// re-render when unrelated state (cart count, search input, etc.) changes.
export default React.memo(ProductCard);
