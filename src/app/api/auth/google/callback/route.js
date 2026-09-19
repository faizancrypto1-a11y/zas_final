import { NextResponse } from 'next/server';
import { prisma } from 'src/lib/prisma';
import { signToken } from 'src/lib/auth';
import {
  GOOGLE_TOKEN_URL,
  GOOGLE_USERINFO_URL,
  getRedirectUri,
  getSiteUrl
} from 'src/lib/googleAuth';

// GET /api/auth/google/callback
// Google redirects here with ?code & ?state.
// We verify state (CSRF), exchange the authorization code for an access token,
// retrieve the user's verified Google profile, find-or-create the User in Prisma,
// issue our session JWT cookie, and redirect to destination (/account or previous page).
export async function GET(request) {
  const siteUrl = getSiteUrl(request);
  const loginUrl = (err) => new URL(`/login${err ? `?error=${err}` : ''}`, siteUrl);

  try {
    const { searchParams } = request.nextUrl;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const oauthError = searchParams.get('error');

    // 1. Check if user cancelled or Google returned an error
    if (oauthError) {
      return NextResponse.redirect(loginUrl('access_denied'));
    }

    // 2. CSRF check: state must match the oauth_state cookie set in /api/auth/google
    const savedState = request.cookies.get('oauth_state')?.value;
    if (!code || !state || !savedState || state !== savedState) {
      return NextResponse.redirect(loginUrl('oauth_state'));
    }

    // 3. Ensure credentials are present
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      return NextResponse.redirect(loginUrl('oauth_config'));
    }

    // 4. Exchange authorization code for an access token
    const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: getRedirectUri(request),
        grant_type: 'authorization_code'
      })
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error('Google token exchange failed:', errText);
      return NextResponse.redirect(loginUrl('oauth_token'));
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;
    if (!accessToken) {
      console.error('Google token exchange returned no access_token');
      return NextResponse.redirect(loginUrl('oauth_token'));
    }

    // 5. Fetch user profile from Google UserInfo endpoint
    const profileRes = await fetch(GOOGLE_USERINFO_URL, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!profileRes.ok) {
      const errText = await profileRes.text();
      console.error('Google userinfo fetch failed:', errText);
      return NextResponse.redirect(loginUrl('oauth_profile'));
    }

    const profile = await profileRes.json();
    const email = profile.email;
    const isEmailVerified = profile.verified_email ?? profile.email_verified ?? true;
    const name = profile.name || (email ? email.split('@')[0] : 'User');
    const picture = profile.picture || null;

    if (!email) {
      return NextResponse.redirect(loginUrl('oauth_profile'));
    }

    if (isEmailVerified === false) {
      return NextResponse.redirect(loginUrl('email_unverified'));
    }

    const normalizedEmail = email.toLowerCase().trim();

    // 6. Find-or-create user in database via Prisma
    let user = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (user) {
      if (user.isBlocked) {
        return NextResponse.redirect(loginUrl('blocked'));
      }

      // Update avatar or provider if not already set
      const updateData = {};
      if (!user.avatar && picture) {
        updateData.avatar = picture;
      }
      if (user.provider !== 'google' && !user.password) {
        updateData.provider = 'google';
      }
      if (Object.keys(updateData).length > 0) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: updateData
        });
      }
    } else {
      user = await prisma.user.create({
        data: {
          name,
          email: normalizedEmail,
          provider: 'google',
          avatar: picture,
          role: 'customer'
        }
      });
    }

    // 7. Issue session JWT (compatible with standard auth flow)
    const token = signToken({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    });

    // 8. Determine redirect destination (from oauth_redirect cookie or /account)
    const savedRedirect = request.cookies.get('oauth_redirect')?.value;
    const destination = (savedRedirect && savedRedirect.startsWith('/') && !savedRedirect.startsWith('//'))
      ? savedRedirect
      : '/account';

    const response = NextResponse.redirect(new URL(destination, siteUrl));

    // 9. Set HTTP-only session cookie
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
      sameSite: 'lax'
    });

    // 10. Clear temporary OAuth cookies
    response.cookies.set('oauth_state', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 0,
      path: '/'
    });

    response.cookies.set('oauth_redirect', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 0,
      path: '/'
    });

    return response;

  } catch (error) {
    console.error('Google OAuth callback error:', error);
    return NextResponse.redirect(loginUrl('oauth_failed'));
  }
}
