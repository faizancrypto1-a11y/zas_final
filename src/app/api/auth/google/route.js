import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { GOOGLE_AUTH_URL, getRedirectUri } from 'src/lib/googleAuth';

// GET /api/auth/google
// Kicks off the Google OAuth 2.0 flow:
// 1. Validates that GOOGLE_CLIENT_ID is configured.
// 2. Generates a cryptographically random CSRF state token and stores it in an HTTP-only cookie.
// 3. Stashes any safe relative redirect path (?next= or ?redirect=) in an HTTP-only cookie.
// 4. Redirects the browser to Google's consent screen.
export async function GET(request) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.redirect(new URL('/login?error=oauth_config', request.url));
  }

  const state = randomBytes(16).toString('hex');
  const redirectUri = getRedirectUri(request);

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'online',
    include_granted_scopes: 'true',
    prompt: 'select_account',
    state
  });

  const response = NextResponse.redirect(`${GOOGLE_AUTH_URL}?${params.toString()}`);

  // CSRF protection: verified in the callback route.
  response.cookies.set('oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 10, // 10 minutes
    path: '/',
    sameSite: 'lax'
  });

  // Preserve post-login redirect destination if provided (e.g. /cart, /checkout)
  const searchParams = request.nextUrl.searchParams;
  const nextParam = searchParams.get('next') || searchParams.get('redirect');
  if (nextParam && nextParam.startsWith('/') && !nextParam.startsWith('//')) {
    response.cookies.set('oauth_redirect', nextParam, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 10,
      path: '/',
      sameSite: 'lax'
    });
  } else {
    // Clear any stale redirect cookie
    response.cookies.set('oauth_redirect', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 0,
      path: '/'
    });
  }

  return response;
}
