'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import Toast from 'src/components/Toast';
import { areVariantsEqual, getCartItemKey } from 'src/lib/productPricing';

// Split into focused contexts so a change in one area only re-renders the
// components that actually subscribe to it. In particular, search state lives in
// its own context so typing in the header no longer notifies cart, wishlist,
// settings or product-grid consumers.
const AuthContext = createContext();      // user + auth operations
const ConfigContext = createContext();    // categories, settings, pincode
const CommerceContext = createContext();  // cart + wishlist operations, toasts
const SearchContext = createContext();    // search query only

export function StoreProvider({ children }) {
  const [user, setUser] = useState(null);
  const [cart, setCart] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [categories, setCategories] = useState([]);
  const [settings, setSettings] = useState({
    storeName: 'Zassports',
    contactNumber: '8860654659',
    whatsappNumber: '918860654659',
    email: 'info@zassports.com',
    address: 'Main road, Deepak Vihar, near Indus Valley Public School, Khora Colony, Noida Sec 62, Uttar Pradesh - 201309',
    shippingCharges: 100,
    freeShippingMinAmount: 999,
    codEnabled: true,
    onlinePaymentEnabled: true,
    taxPercent: 12,
    gstDetails: '09AACCZ4143L1ZY',
    socialLinks: {
      facebook: 'https://facebook.com',
      instagram: 'https://www.instagram.com/zas.india?igsh=MWx2cTk1Z2g3czZlNA%3D%3D&utm_source=qr',
      twitter: 'https://twitter.com',
      youtube: 'https://youtube.com/@brandedmalikboss?si=z7IYvk_dR1mPFkVH'
    }
  });
  const [pincode, setPincode] = useState('');
  const [pincodeStatus, setPincodeStatus] = useState(null); // 'deliverable' | 'undeliverable'
  const [searchQuery, setSearchQuery] = useState('');

  // Toast / snackbar notifications (used by cart actions)
  const [toasts, setToasts] = useState([]);
  const toastTimers = useRef({});
  const toastSeq = useRef(0);

  // Refs mirror the latest cart/wishlist/user so callbacks can read current
  // values without depending on them — keeping the callback identities stable
  // so memoized consumers (ProductCard, grids) don't re-render on every change.
  const cartRef = useRef(cart);
  const wishlistRef = useRef(wishlist);
  const userRef = useRef(user);
  useEffect(() => { cartRef.current = cart; }, [cart]);
  useEffect(() => { wishlistRef.current = wishlist; }, [wishlist]);
  useEffect(() => { userRef.current = user; }, [user]);

  // Hydration is tracked as STATE (not a ref) so flipping it triggers a later
  // render in which the persistence effects run for the first time. Until then
  // they bail out, so the empty initial state can never overwrite a returning
  // guest's saved cart/wishlist.
  const [hydrated, setHydrated] = useState(false);

  // Core API fetches
  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data.success && data.settings) {
        setSettings(data.settings);
      }
    } catch (err) {
      console.log('Error fetching store settings:', err);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/categories');
      const data = await res.json();
      if (data.success && data.categories) {
        setCategories(data.categories.filter(c => c.isActive));
      }
    } catch (err) {
      console.log('Error fetching categories:', err);
    }
  }, []);

  const checkCurrentUser = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (data.success && data.user) {
        setUser(data.user);
        // If user logged in, sync remote cart/wishlist if available
        if (data.user.wishlist) {
          setWishlist(data.user.wishlist);
        }
      }
    } catch (err) {
      console.log('User session not logged in.');
    }
  }, []);

  // 1. Initial mounting checks: read localStorage first, then mark hydration
  //    complete via a state update.
  useEffect(() => {
    // Read local storage for guest session backups (parse defensively)
    const localCart = localStorage.getItem('zas_cart');
    if (localCart) {
      try { setCart(JSON.parse(localCart)); } catch (e) {}
    }

    const localWishlist = localStorage.getItem('zas_wishlist');
    if (localWishlist) {
      try { setWishlist(JSON.parse(localWishlist)); } catch (e) {}
    }

    const localPincode = localStorage.getItem('zas_pincode');
    if (localPincode) {
      setPincode(localPincode);
      setPincodeStatus('deliverable'); // default mock check
    }

    // Marks storage hydration complete — schedules a render in which the
    // persistence effects below are allowed to run.
    setHydrated(true);

    // Load store settings, user details, and categories from APIs
    fetchSettings();
    fetchCategories();
    checkCurrentUser();
  }, [fetchSettings, fetchCategories, checkCurrentUser]);

  // 2. Local storage syncing for Cart (only after hydration completes)
  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem('zas_cart', JSON.stringify(cart));
  }, [cart, hydrated]);

  // 3. Local storage syncing for Wishlist (only after hydration completes)
  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem('zas_wishlist', JSON.stringify(wishlist));
  }, [wishlist, hydrated]);

  // Toast notification helpers ------------------------------------------------
  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    if (toastTimers.current[id]) {
      clearTimeout(toastTimers.current[id]);
      delete toastTimers.current[id];
    }
  }, []);

  const showToast = useCallback((toast) => {
    const duration = toast.duration || 3500;
    // A dedupeKey gives a stable id so repeated clicks refresh the same toast
    // instead of stacking a new one each time.
    const id = toast.dedupeKey ? `k:${toast.dedupeKey}` : `t:${++toastSeq.current}`;

    setToasts((prev) => {
      let next = toast.dedupeKey
        ? prev.filter((t) => t.dedupeKey !== toast.dedupeKey)
        : prev.slice();
      next.push({ ...toast, id });
      // Never let more than 3 notifications stack up at once.
      const MAX_VISIBLE = 3;
      if (next.length > MAX_VISIBLE) {
        next = next.slice(next.length - MAX_VISIBLE);
      }
      return next;
    });

    // Reset the auto-dismiss timer (covers the refreshed-toast case too).
    if (toastTimers.current[id]) clearTimeout(toastTimers.current[id]);
    toastTimers.current[id] = setTimeout(() => dismissToast(id), duration);
  }, [dismissToast]);

  const showCartToast = useCallback((product, alreadyInCart, selectedVariant = {}) => {
    const image =
      Array.isArray(product.images) && product.images.length > 0
        ? product.images[0]
        : null;

    const dedupeKey = `cart-${getCartItemKey(product.id || product._id, selectedVariant)}`;

    showToast({
      type: alreadyInCart ? 'info' : 'success',
      title: alreadyInCart
        ? 'Quantity updated in your cart'
        : 'Product added to cart successfully',
      name: product.name,
      image,
      dedupeKey,
      duration: 3500,
      action: { label: 'View Cart', href: '/cart' },
    });
  }, [showToast]);

  // Clear any pending timers when the provider unmounts.
  useEffect(() => {
    return () => {
      Object.values(toastTimers.current).forEach(clearTimeout);
      toastTimers.current = {};
    };
  }, []);

  // Cart operations
  const addToCart = useCallback((product, selectedVariant = {}, quantity = 1, options = {}) => {
    const { silent = false } = options;
    try {
      const productId = product?.id || product?._id;
      if (!product || !productId) {
        if (!silent) {
          showToast({
            type: 'error',
            title: "Couldn't add to cart",
            message: 'Something went wrong. Please try again.',
            duration: 4000,
          });
        }
        return { success: false, alreadyInCart: false };
      }

      // Was this exact product + variant already in the cart? (drives the message)
      // Read from the ref so this callback stays stable across cart changes.
      const alreadyInCart = cartRef.current.some(
        (item) =>
          (item.product?.id || item.product?._id) === productId &&
          areVariantsEqual(item.selectedVariant, selectedVariant)
      );

      setCart((prevCart) => {
        // Find matching item index by ID and variant parameters
        const existingIndex = prevCart.findIndex(
          (item) =>
            (item.product?.id || item.product?._id) === productId &&
            areVariantsEqual(item.selectedVariant, selectedVariant)
        );

        if (existingIndex > -1) {
          const newCart = [...prevCart];
          newCart[existingIndex] = {
            ...newCart[existingIndex],
            quantity: newCart[existingIndex].quantity + quantity,
          };
          return newCart;
        } else {
          return [...prevCart, { product, selectedVariant, quantity }];
        }
      });

      if (!silent) showCartToast(product, alreadyInCart, selectedVariant);
      return { success: true, alreadyInCart };
    } catch (err) {
      console.log('Error adding to cart:', err);
      if (!silent) {
        showToast({
          type: 'error',
          title: "Couldn't add to cart",
          message: 'Something went wrong. Please try again.',
          duration: 4000,
        });
      }
      return { success: false, alreadyInCart: false };
    }
  }, [showToast, showCartToast]);

  const removeFromCart = useCallback((productId, selectedVariant = {}) => {
    setCart((prevCart) =>
      prevCart.filter(
        (item) =>
          !((item.product?.id || item.product?._id) === productId &&
            areVariantsEqual(item.selectedVariant, selectedVariant))
      )
    );
  }, []);

  const updateCartQty = useCallback((productId, selectedVariant = {}, qty) => {
    if (qty <= 0) {
      removeFromCart(productId, selectedVariant);
      return;
    }
    setCart((prevCart) => {
      return prevCart.map((item) => {
        if (
          (item.product?.id || item.product?._id) === productId &&
          areVariantsEqual(item.selectedVariant, selectedVariant)
        ) {
          return { ...item, quantity: qty };
        }
        return item;
      });
    });
  }, [removeFromCart]);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  // Wishlist operations
  const toggleWishlist = useCallback(async (productId) => {
    // Toggle in local state using the functional updater + latest ref value.
    const currentlyWishlisted = wishlistRef.current.includes(productId);
    setWishlist((prev) =>
      currentlyWishlisted
        ? prev.filter((id) => id !== productId)
        : [...prev, productId]
    );

    // If logged in, update remote database
    if (userRef.current) {
      try {
        await fetch('/api/wishlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId })
        });
      } catch (err) {
        console.log('Error syncing wishlist to DB:', err);
      }
    }
  }, []);

  // Pincode validation helper (Decathlon style checker)
  const verifyPincode = useCallback(async (code) => {
    if (!code || !/^[1-9][0-9]{5}$/.test(code)) {
      setPincodeStatus('undeliverable');
      return false;
    }

    // Delivery to all over India is enabled for any valid 6-digit pincode
    setPincode(code);
    localStorage.setItem('zas_pincode', code);
    setPincodeStatus('deliverable');
    return true;
  }, []);

  const clearPincode = useCallback(() => {
    setPincode('');
    setPincodeStatus(null);
    localStorage.removeItem('zas_pincode');
  }, []);

  // Authentication controllers
  const loginUser = useCallback((userData) => {
    setUser(userData);
    if (userData.wishlist) {
      setWishlist(userData.wishlist);
    }
  }, []);

  const logoutUser = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
      setWishlist([]);
      localStorage.removeItem('zas_wishlist');
    } catch (err) {
      console.log('Error logging out:', err);
    }
  }, []);

  // --- Per-context memoized values -----------------------------------------
  // Each only changes when its own slice of state changes; all callbacks above
  // are stable references.
  const authValue = useMemo(() => ({
    user,
    loginUser,
    logoutUser,
    refreshUser: checkCurrentUser,
  }), [user, loginUser, logoutUser, checkCurrentUser]);

  const configValue = useMemo(() => ({
    categories,
    settings,
    pincode,
    pincodeStatus,
    verifyPincode,
    clearPincode,
  }), [categories, settings, pincode, pincodeStatus, verifyPincode, clearPincode]);

  const commerceValue = useMemo(() => ({
    cart,
    wishlist,
    addToCart,
    removeFromCart,
    updateCartQty,
    clearCart,
    toggleWishlist,
    showToast,
    dismissToast,
  }), [cart, wishlist, addToCart, removeFromCart, updateCartQty, clearCart, toggleWishlist, showToast, dismissToast]);

  const searchValue = useMemo(() => ({
    searchQuery,
    setSearchQuery,
  }), [searchQuery]);

  return (
    <AuthContext.Provider value={authValue}>
      <ConfigContext.Provider value={configValue}>
        <CommerceContext.Provider value={commerceValue}>
          <SearchContext.Provider value={searchValue}>
            {children}
            <Toast toasts={toasts} onDismiss={dismissToast} />
          </SearchContext.Provider>
        </CommerceContext.Provider>
      </ConfigContext.Provider>
    </AuthContext.Provider>
  );
}

// --- Narrow hooks: subscribe only to the slice you use --------------------
export function useAuth() {
  return useContext(AuthContext);
}

export function useConfig() {
  return useContext(ConfigContext);
}

export function useCommerce() {
  return useContext(CommerceContext);
}

export function useSearch() {
  return useContext(SearchContext);
}

// Backward-compatible aggregate hook. Intentionally does NOT subscribe to the
// search context, so typing in the header never re-renders `useStore()`
// consumers. Prefer the narrow hooks above in performance-critical components.
export function useStore() {
  const auth = useContext(AuthContext);
  const config = useContext(ConfigContext);
  const commerce = useContext(CommerceContext);
  return { ...auth, ...config, ...commerce };
}
