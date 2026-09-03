import { NextResponse } from 'next/server';
import crypto from 'crypto';

/**
 * GET /api/nonce — returns a fresh nonce for MiniKit.walletAuth() (SIWE).
 *
 * The nonce is alphanumeric (required by SIWE) and stored in an httpOnly
 * cookie so /api/complete-siwe can verify the user signed THIS nonce.
 */
export async function GET() {
  // 16 bytes of randomness → 32 hex chars (alphanumeric, ≥ 8 chars as SIWE requires)
  const nonce = crypto.randomBytes(16).toString('hex');

  const res = NextResponse.json({ nonce });

  res.cookies.set('bk_siwe_nonce', nonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 5, // 5 minutes
  });

  return res;
}
