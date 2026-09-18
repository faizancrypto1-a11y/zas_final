import { NextResponse } from 'next/server';
import { prisma } from 'src/lib/prisma';
import { comparePassword, signToken } from 'src/lib/auth';
import { checkRateLimit } from 'src/lib/rateLimit';

export async function POST(request) {
  try {
    const ip = request.headers.get('x-forwarded-for') || request.ip || 'unknown';
    if (!checkRateLimit(ip, 5, 60000)) { // 5 requests per minute
      return NextResponse.json({ success: false, error: 'Too many login attempts. Please try again later.' }, { status: 429 });
    }

    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Find user
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Check block status
    if (user.isBlocked) {
      return NextResponse.json(
        { success: false, error: 'Your account has been suspended' },
        { status: 403 }
      );
    }

    // Users registered via Google auth do not have a password
    if (!user.password) {
      return NextResponse.json(
        { success: false, error: 'This account was registered with Google. Please use Continue with Google to sign in.' },
        { status: 401 }
      );
    }

    // Compare password
    const isPasswordMatch = await comparePassword(password, user.password);
    if (!isPasswordMatch) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Create JWT
    const token = signToken({
      id: user.id, // using id instead of _id for prisma
      name: user.name,
      email: user.email,
      role: user.role
    });

    const response = NextResponse.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        addresses: user.addresses,
        // we might not fetch wishlist in this simple query, or we can just send an empty array or fetch it if needed. 
        // For simplicity, let's omit wishlist or return what we have
      }
    });

    // Set HTTP-only Cookie
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
      sameSite: 'lax'
    });

    return response;

  } catch (error) {
    console.error('Login API error:', error);
    return NextResponse.json(
      { success: false, error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
