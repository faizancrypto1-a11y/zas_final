// Google OAuth 2.0 helpers (manual flow — no external auth library).
// Credentials come from GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET in .env.
// The redirect URI must match the one authorized in Google Cloud console.

export const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
export const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
export const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';

const CANONICAL_PROD_URL = 'https://zassports.com';

// Normalize URL: trim trailing slash and standardize domain
export function normalizeSiteUrl(url) {
  if (!url) return '';
  let normalized = url.trim().replace(/\/+$/, '');
  if (!/^https?:\/\//i.test(normalized)) {
    normalized = `https://${normalized}`;
  }
  normalized = normalized.replace(/^(https?:\/\/)www\.zassports\.com/i, '$1zassports.com');
  return normalized;
}

// Compute the base site URL for OAuth redirects
export function getSiteUrl(request) {
  // Check if explicit override is provided in environment variables
  if (process.env.GOOGLE_REDIRECT_URI) {
    return process.env.GOOGLE_REDIRECT_URI.replace(/\/api\/auth\/google\/callback\/?$/, '');
  }

  // Detect local development request
  const host = request?.headers?.get('x-forwarded-host') || request?.headers?.get('host') || request?.nextUrl?.host || '';
  const isLocalhost = /localhost|127\.0\.0\.1/i.test(host);

  if (isLocalhost) {
    const proto = request?.headers?.get('x-forwarded-proto') || request?.nextUrl?.protocol?.replace(':', '') || 'http';
    return `${proto}://${host}`;
  }

  // In production, prioritize canonical URL or configured site URL
  const configured = process.env.NEXT_PUBLIC_CANONICAL_URL || process.env.NEXT_PUBLIC_SITE_URL;
  if (configured && !/localhost|127\.0\.0\.1/i.test(configured)) {
    return normalizeSiteUrl(configured);
  }

  return CANONICAL_PROD_URL;
}

export function getRedirectUri(request) {
  if (process.env.GOOGLE_REDIRECT_URI) {
    return process.env.GOOGLE_REDIRECT_URI;
  }
  return `${getSiteUrl(request)}/api/auth/google/callback`;
}
