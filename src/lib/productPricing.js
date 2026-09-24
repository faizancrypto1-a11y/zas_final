/**
 * Authoritative Product Variant Pricing and Discount System for ZAS SPORTS
 */

/**
 * Slugify text for stable IDs
 */
export function slugify(text) {
  if (!text) return '';
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

/**
 * Round monetary value for INR currency (2 decimal places)
 */
export function roundINR(val) {
  const num = Number(val);
  if (isNaN(num)) return 0;
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

/**
 * Calculate discounted selling price from MRP and discount percentage.
 * Formula: sellingPrice = mrp * (1 - discountPercent / 100)
 *
 * @param {number} mrp
 * @param {number} discountPercent (0 - 100)
 * @returns {number} rounded to 2 decimal places
 */
export function calculateDiscountedPrice(mrp, discountPercent) {
  const m = Number(mrp) || 0;
  const d = Number(discountPercent) || 0;
  if (m <= 0) return 0;
  if (d <= 0) return roundINR(m);
  if (d >= 100) return 0;
  return roundINR(m * (1 - d / 100));
}

export function normalizeCombinationId(id) {
  if (!id) return '';
  return String(id)
    .split('_')
    .map(p => p.trim())
    .filter(Boolean)
    .sort()
    .join('_');
}

/**
 * Generate a stable ID for a combination of attributes.
 * Sorts keys so attribute order does not matter.
 * E.g. { size: "Size 5", hand: "Right Hand" } -> "hand-right-hand_size-size-5"
 */
export function generateCombinationId(attributes) {
  if (!attributes || typeof attributes !== 'object') return '';
  const keys = Object.keys(attributes).sort();
  return keys
    .map(key => `${slugify(key)}-${slugify(attributes[key])}`)
    .join('_');
}

/**
 * Generate Cartesian product combinations from an array of options.
 * Preserves existing MRP values if matching combination already exists.
 *
 * @param {Array<{ key: string, label: string, values: string[] }>} options
 * @param {Array<{ id: string, attributes: Object, mrp: number }>} existingCombinations
 * @returns {Array<{ id: string, attributes: Object, mrp: number }>}
 */
export function generateCombinationsFromOptions(options = [], existingCombinations = []) {
  const validOptions = (options || []).filter(
    opt => opt && opt.key && Array.isArray(opt.values) && opt.values.length > 0
  );

  if (validOptions.length === 0) return [];

  // Map existing combinations by ID, normalized ID, and attribute signature
  const existingMap = new Map();
  (existingCombinations || []).forEach(comb => {
    if (!comb) return;
    if (comb.id) {
      existingMap.set(comb.id, comb.mrp);
      existingMap.set(normalizeCombinationId(comb.id), comb.mrp);
    }
    if (comb.attributes) {
      const generatedId = generateCombinationId(comb.attributes);
      if (generatedId) {
        existingMap.set(generatedId, comb.mrp);
        existingMap.set(normalizeCombinationId(generatedId), comb.mrp);
      }
    }
  });

  // Cartesian product helper
  let combinationsAcc = [{}];

  for (const opt of validOptions) {
    const nextAcc = [];
    for (const current of combinationsAcc) {
      for (const val of opt.values) {
        nextAcc.push({
          ...current,
          [opt.key]: val
        });
      }
    }
    combinationsAcc = nextAcc;
  }

  return combinationsAcc.map(attributes => {
    const id = generateCombinationId(attributes);
    const normalizedId = normalizeCombinationId(id);
    const existingMrp = existingMap.has(id)
      ? existingMap.get(id)
      : existingMap.get(normalizedId);

    return {
      id,
      attributes,
      mrp: existingMrp !== undefined ? Number(existingMrp) : 0
    };
  });
}

/**
 * Check if a product has priced variants (new structure or legacy sizePrices)
 */
export function hasPricedVariants(product) {
  if (!product || !product.variants) return false;
  const v = product.variants;

  // New combinations structure
  if (Array.isArray(v.combinations) && v.combinations.length > 0) {
    return v.combinations.some(c => c && c.mrp != null && Number(c.mrp) > 0);
  }

  // Legacy sizePrices structure
  if (v.sizePrices && typeof v.sizePrices === 'object') {
    const keys = Object.keys(v.sizePrices);
    if (keys.length > 0) {
      return keys.some(k => v.sizePrices[k] != null);
    }
  }

  return false;
}

/**
 * Extract clean attributes map from a selectedVariant input,
 * ignoring meta keys such as variantId, price, mrp, stock, etc.
 */
export function extractCleanAttributes(selectedVariant) {
  if (!selectedVariant || typeof selectedVariant !== 'object') return {};
  
  // If wrapped in attributes field
  const raw = selectedVariant.attributes && typeof selectedVariant.attributes === 'object'
    ? { ...selectedVariant, ...selectedVariant.attributes }
    : selectedVariant;

  const metaKeys = new Set(['variantId', 'id', 'price', 'mrp', 'discount', 'stock', 'attributes']);
  const clean = {};

  for (const [k, v] of Object.entries(raw)) {
    if (!metaKeys.has(k) && v !== undefined && v !== null && v !== '') {
      clean[k] = String(v).trim();
    }
  }

  return clean;
}

/**
 * Resolve selected variant for a product.
 * Supports both new options/combinations schema and legacy sizePrices.
 *
 * @param {Object} product - Product record
 * @param {Object} selectedVariant - Customer's selection
 * @returns {Object} { matched: boolean, mrp, sellingPrice, discount, attributes, variantId, error? }
 */
export function resolveSelectedVariant(product, selectedVariant) {
  if (!product) {
    return { matched: false, error: 'Product not found.' };
  }

  const globalDiscount = Number(product.discount) || 0;
  const v = product.variants || {};

  // Case 1: Product uses modern combinations structure
  if (Array.isArray(v.combinations) && v.combinations.length > 0) {
    const cleanAttrs = extractCleanAttributes(selectedVariant);
    const targetVariantId = selectedVariant?.variantId || selectedVariant?.id;

    let matchedComb = null;

    // 1a: Try direct match by variantId
    if (targetVariantId) {
      matchedComb = v.combinations.find(c => c && c.id === targetVariantId);
    }

    // 1b: Try match by generated combination ID from clean attributes
    if (!matchedComb && Object.keys(cleanAttrs).length > 0) {
      const generatedId = generateCombinationId(cleanAttrs);
      matchedComb = v.combinations.find(c => c && c.id === generatedId);
    }

    // 1c: Try matching attribute values case-insensitively / slug-matched
    if (!matchedComb && Object.keys(cleanAttrs).length > 0) {
      matchedComb = v.combinations.find(c => {
        if (!c || !c.attributes) return false;
        const combAttrs = c.attributes;
        const combKeys = Object.keys(combAttrs);
        const reqKeys = Object.keys(cleanAttrs);

        if (combKeys.length !== reqKeys.length) return false;

        return reqKeys.every(k => {
          // Key could be case-insensitive
          const matchKey = combKeys.find(ck => ck.toLowerCase() === k.toLowerCase());
          if (!matchKey) return false;
          return slugify(cleanAttrs[k]) === slugify(combAttrs[matchKey]);
        });
      });
    }

    if (matchedComb) {
      const mrp = Number(matchedComb.mrp) || 0;
      const sellingPrice = calculateDiscountedPrice(mrp, globalDiscount);
      return {
        matched: true,
        combination: matchedComb,
        mrp,
        sellingPrice,
        discount: globalDiscount,
        attributes: matchedComb.attributes,
        variantId: matchedComb.id
      };
    }

    // Combinations exist but requested variant was not found
    return {
      matched: false,
      error: 'Selected product variant is no longer available.'
    };
  }

  // Case 2: Legacy sizePrices structure
  if (v.sizePrices && typeof v.sizePrices === 'object' && Object.keys(v.sizePrices).length > 0) {
    const cleanAttrs = extractCleanAttributes(selectedVariant);
    const requestedSize = cleanAttrs.size || selectedVariant?.size;

    if (requestedSize) {
      // Find matching size in sizePrices (case-insensitive fallback)
      let spKey = Object.keys(v.sizePrices).find(k => k === requestedSize);
      if (!spKey) {
        spKey = Object.keys(v.sizePrices).find(k => k.toLowerCase() === requestedSize.toLowerCase());
      }

      if (spKey && v.sizePrices[spKey] != null) {
        const spVal = v.sizePrices[spKey];
        let variantMrp;

        if (typeof spVal === 'object' && spVal !== null) {
          variantMrp = spVal.mrp != null ? Number(spVal.mrp) : (Number(spVal.price) || Number(product.mrp));
        } else {
          variantMrp = Number(spVal);
        }

        const mrp = variantMrp > 0 ? variantMrp : Number(product.mrp);
        const sellingPrice = calculateDiscountedPrice(mrp, globalDiscount);

        return {
          matched: true,
          mrp,
          sellingPrice,
          discount: globalDiscount,
          attributes: { size: spKey },
          variantId: `size-${slugify(spKey)}`
        };
      }
    }

    return {
      matched: false,
      error: 'Selected product size is no longer available.'
    };
  }

  // Case 3: Product has NO priced variants (standard product)
  const baseMrp = Number(product.mrp) || 0;
  const sellingPrice = calculateDiscountedPrice(baseMrp, globalDiscount);

  return {
    matched: true,
    mrp: baseMrp,
    sellingPrice,
    discount: globalDiscount,
    attributes: extractCleanAttributes(selectedVariant),
    variantId: null,
    isBaseProduct: true
  };
}

/**
 * Authoritative item pricing resolution for backend order creation & verification.
 * Enforces server-side integrity: never trusts frontend prices.
 *
 * @param {Object} product - Product record loaded from Prisma
 * @param {Object} selectedVariant - Customer's selected variant
 * @returns {{ success: boolean, price?: number, mrp?: number, discount?: number, selectedVariant?: Object, error?: string }}
 */
export function resolveAuthoritativeItemPricing(product, selectedVariant) {
  if (!product) {
    return { success: false, error: 'Product not found.' };
  }

  if (!product.isActive) {
    return { success: false, error: `Product '${product.name}' is no longer available for purchase.` };
  }

  const hasVariants = hasPricedVariants(product);

  if (!hasVariants) {
    // Standard product without priced variants
    const mrp = Number(product.mrp) || 0;
    const discount = Number(product.discount) || 0;
    const price = calculateDiscountedPrice(mrp, discount);

    return {
      success: true,
      price,
      mrp,
      discount,
      selectedVariant: selectedVariant || {}
    };
  }

  // Product has priced variants: must resolve exact match
  const resolved = resolveSelectedVariant(product, selectedVariant);

  if (!resolved || !resolved.matched) {
    return {
      success: false,
      error: resolved?.error || `Selected product variant is no longer available for '${product.name}'.`
    };
  }

  return {
    success: true,
    price: resolved.sellingPrice,
    mrp: resolved.mrp,
    discount: resolved.discount,
    selectedVariant: {
      ...(resolved.variantId ? { variantId: resolved.variantId } : {}),
      ...(resolved.attributes || {})
    }
  };
}

/**
 * Safe frontend helper to get current pricing for an item in cart or product page.
 * Returns valid pricing even with partial/fallback data.
 */
export function getVariantPricing(product, selectedVariant) {
  if (!product) {
    return { sellingPrice: 0, mrp: 0, discount: 0, attributes: {} };
  }

  const resolved = resolveSelectedVariant(product, selectedVariant);

  if (resolved && resolved.matched) {
    return {
      sellingPrice: resolved.sellingPrice,
      mrp: resolved.mrp,
      discount: resolved.discount,
      attributes: resolved.attributes || {},
      variantId: resolved.variantId || null
    };
  }

  // Fallback to base product pricing
  const mrp = Number(product.mrp) || 0;
  const discount = Number(product.discount) || 0;
  const sellingPrice = calculateDiscountedPrice(mrp, discount);

  return {
    sellingPrice: sellingPrice > 0 ? sellingPrice : Number(product.price) || 0,
    mrp,
    discount,
    attributes: extractCleanAttributes(selectedVariant),
    variantId: null
  };
}

/**
 * Get pricing summary for product cards and listings.
 * Detects whether variant prices differ to display "From ₹X" accurately.
 *
 * @param {Object} product
 * @returns {Object} { minPrice, maxPrice, minMrp, maxMrp, displayPrice, displayMrp, discount, isPriceRange, hasVariants }
 */
export function getProductPricingSummary(product) {
  if (!product) {
    return {
      minPrice: 0,
      maxPrice: 0,
      minMrp: 0,
      maxMrp: 0,
      displayPrice: 0,
      displayMrp: 0,
      discount: 0,
      isPriceRange: false,
      hasVariants: false
    };
  }

  const discount = Number(product.discount) || 0;
  const v = product.variants;

  // Modern combinations
  if (v && Array.isArray(v.combinations) && v.combinations.length > 0) {
    const validCombs = v.combinations.filter(c => c && c.mrp != null && Number(c.mrp) > 0);
    if (validCombs.length > 0) {
      let minMrp = Infinity;
      let maxMrp = -Infinity;
      let minComb = validCombs[0];

      validCombs.forEach(c => {
        const m = Number(c.mrp);
        if (m < minMrp) {
          minMrp = m;
          minComb = c;
        }
        if (m > maxMrp) {
          maxMrp = m;
        }
      });

      const minPrice = calculateDiscountedPrice(minMrp, discount);
      const maxPrice = calculateDiscountedPrice(maxMrp, discount);
      const isPriceRange = maxPrice > minPrice;

      return {
        minPrice,
        maxPrice,
        minMrp,
        maxMrp,
        displayPrice: minPrice,
        displayMrp: minMrp,
        discount,
        isPriceRange,
        hasVariants: true
      };
    }
  }

  // Legacy sizePrices
  if (v && v.sizePrices && typeof v.sizePrices === 'object') {
    const entries = Object.entries(v.sizePrices);
    if (entries.length > 0) {
      let minMrp = Infinity;
      let maxMrp = -Infinity;

      entries.forEach(([_, val]) => {
        let m = 0;
        if (typeof val === 'object' && val !== null) {
          m = val.mrp != null ? Number(val.mrp) : Number(val.price);
        } else {
          m = Number(val);
        }
        if (m > 0) {
          if (m < minMrp) minMrp = m;
          if (m > maxMrp) maxMrp = m;
        }
      });

      if (minMrp !== Infinity) {
        const minPrice = calculateDiscountedPrice(minMrp, discount);
        const maxPrice = calculateDiscountedPrice(maxMrp, discount);
        const isPriceRange = maxPrice > minPrice;

        return {
          minPrice,
          maxPrice,
          minMrp,
          maxMrp,
          displayPrice: minPrice,
          displayMrp: minMrp,
          discount,
          isPriceRange,
          hasVariants: true
        };
      }
    }
  }

  // Base product fallback
  const baseMrp = Number(product.mrp) || 0;
  const basePrice = product.price != null && product.price > 0
    ? Number(product.price)
    : calculateDiscountedPrice(baseMrp, discount);

  return {
    minPrice: basePrice,
    maxPrice: basePrice,
    minMrp: baseMrp,
    maxMrp: baseMrp,
    displayPrice: basePrice,
    displayMrp: baseMrp,
    discount,
    isPriceRange: false,
    hasVariants: false
  };
}

/**
 * Compare two variant configurations for equality.
 * Ignores transient keys (price, mrp, image, etc.) and compares attributes deterministically.
 */
export function areVariantsEqual(v1, v2) {
  if (v1 === v2) return true;
  if (!v1 && !v2) return true;
  if (!v1 || !v2) return false;

  // Compare variantId if both have it
  const id1 = v1.variantId || v1.id;
  const id2 = v2.variantId || v2.id;
  if (id1 && id2) return id1 === id2;

  const a1 = extractCleanAttributes(v1);
  const a2 = extractCleanAttributes(v2);

  const keys1 = Object.keys(a1).sort();
  const keys2 = Object.keys(a2).sort();

  if (keys1.length !== keys2.length) return false;

  return keys1.every(k => {
    return slugify(a1[k]) === slugify(a2[k]);
  });
}

/**
 * Generate a unique cart item key combining product ID and variant combination.
 */
export function getCartItemKey(productId, selectedVariant) {
  const pId = String(productId || '');
  if (!selectedVariant) return pId;

  const vId = selectedVariant.variantId || selectedVariant.id;
  if (vId) return `${pId}::${vId}`;

  const clean = extractCleanAttributes(selectedVariant);
  const keys = Object.keys(clean).sort();
  if (keys.length === 0) return pId;

  const attrStr = keys.map(k => `${slugify(k)}=${slugify(clean[k])}`).join('&');
  return `${pId}::${attrStr}`;
}
