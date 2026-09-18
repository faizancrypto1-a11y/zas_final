'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';
import { useStore } from 'src/context/StoreContext';

// Human-readable messages for the ?error= codes the Google OAuth routes redirect
// back with when something goes wrong.
const ERROR_MESSAGES = {
  access_denied: 'Google sign-in was cancelled. Please try again.',
  oauth_state: 'Your sign-in session expired. Please try again.',
  oauth_config: 'Google sign-in is not configured. Please contact support.',
  oauth_token: 'Could not complete Google sign-in. Please try again.',
  oauth_profile: 'Could not read your Google profile. Please try again.',
  email_unverified: 'Your Google email is not verified. Please verify it and try again.',
  blocked: 'Your account has been suspended. Please contact support.',
  oauth_failed: 'Something went wrong during sign-in. Please try again.'
};

// Official Google "G" mark (inline so it needs no external asset).
const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
  </svg>
);

const LoginPage = () => {
  const router = useRouter();
  const { user, cart } = useStore();

  const [errorMessage, setErrorMessage] = useState('');
  const [authUrl, setAuthUrl] = useState('/api/auth/google');

  // Redirect if already logged in.
  useEffect(() => {
    if (user) {
      if (cart.length > 0) {
        router.push('/cart');
      } else {
        router.push('/account');
      }
    }
  }, [user, cart]);

  // Surface any ?error= code returned by the OAuth callback and forward next/redirect.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('error');
    if (code) {
      setErrorMessage(ERROR_MESSAGES[code] || 'Sign-in failed. Please try again.');
    }
    const next = params.get('next') || params.get('redirect');
    if (next && next.startsWith('/') && !next.startsWith('//')) {
      setAuthUrl(`/api/auth/google?next=${encodeURIComponent(next)}`);
    }
  }, []);

  return (
    <div className="container animate-fade" style={{ maxWidth: '450px', margin: '60px auto' }}>
      <div style={{ backgroundColor: 'white', border: '1px solid var(--bg-light-border)', borderRadius: 'var(--border-radius-lg)', padding: '40px', boxShadow: 'var(--shadow-lg)' }}>

        <h1 style={{ fontSize: '1.8rem', fontFamily: 'Outfit', textTransform: 'uppercase', textAlign: 'center', marginBottom: '10px' }}>
          Sign In
        </h1>
        <p style={{ color: 'var(--text-dark-muted)', fontSize: '0.85rem', textAlign: 'center', marginBottom: '30px' }}>
          Sign in with Google to access your orders, wishlist, and saved addresses.
        </p>

        {errorMessage && (
          <div style={{ backgroundColor: '#fee2e2', color: 'var(--danger)', padding: '12px 16px', borderRadius: 'var(--border-radius-sm)', fontSize: '0.8rem', fontWeight: 600, marginBottom: '20px' }}>
            {errorMessage}
          </div>
        )}

        {/* Full page navigation to the OAuth start route (not client-side Link). */}
        <a
          href={authUrl}
          className="btn btn-full"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', backgroundColor: 'white', color: 'var(--text-dark)', border: '1px solid var(--bg-light-border)', fontWeight: 600, padding: '12px' }}
        >
          <GoogleIcon /> Continue with Google
        </a>

        <div style={{ borderTop: '1px solid var(--bg-light-border)', marginTop: '30px', paddingTop: '20px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-dark-muted)', fontSize: '0.75rem', justifyContent: 'center' }}>
          <ShieldCheck size={18} className="text-success" />
          <span>Secure authentication. Session holds for 7 days.</span>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
