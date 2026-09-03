// =============================================================
// Session helper — signed httpOnly cookie based on wallet address
//
// After a successful SIWE sign-in (/api/complete-siwe) we set a
// cookie:  bk_session = <wallet>.<hex-hmac>
//
// The HMAC (REQUEST_SIGNING_KEY) prevents the client from editing
// the wallet in the cookie. Server routes call getSessionWallet(req)
// and NEVER trust a wallet the client sends in the body/query
// (except in dev mode, where there is no World App cookie).
// =============================================================

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export const SESSION_COOKIE = 'bk_session';

const DEV_MODE = process.env.NEXT_PUBLIC_ALLOW_DEV_MODE === 'true';

function signingKey(): string {
  return process.env.REQUEST_SIGNING_KEY || 'beediyo-kall-dev-key-change-in-production';
}

/** wallet + '.' + hmac */
export function createSessionToken(wallet: string): string {
  const sig = crypto
    .createHmac('sha256', signingKey())
    .update(wallet)
    .digest('hex');
  return `${wallet}.${sig}`;
}

export function parseSessionToken(token: string | undefined | null): string | null {
  if (!token) return null;
  const dot = token.lastIndexOf('.');
  if (dot <= 0) return null;
  const wallet = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!/^0x[0-9a-fA-F]{40}$/.test(wallet)) return null;

  const expected = crypto
    .createHmac('sha256', signingKey())
    .update(wallet)
    .digest('hex');

  // Timing-safe compare
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return null;
  return crypto.timingSafeEqual(a, b) ? wallet : null;
}

/**
 * Get the authenticated wallet for a request.
 * Production: from signed bk_session cookie.
 * Dev mode: falls back to ?wallet= / body.wallet so local testing works
 * without World App.
 */
export async function getSessionWallet(req: NextRequest): Promise<string | null> {
  const cookieWallet = parseSessionToken(req.cookies.get(SESSION_COOKIE)?.value);
  if (cookieWallet) return cookieWallet;

  // Dev fallback ONLY when explicitly enabled
  if (DEV_MODE) {
    const fromQuery = req.nextUrl.searchParams.get('wallet');
    if (fromQuery && /^0x[0-9a-fA-F]{40}$/.test(fromQuery)) return fromQuery;

    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
      try {
        const body = await req.clone().json();
        if (body?.wallet && /^0x[0-9a-fA-F]{40}$/.test(body.wallet)) return body.wallet;
      } catch {
        /* not JSON */
      }
    }
  }

  return null;
}

/** Attach the session cookie to a response. */
export function setSessionCookie(res: NextResponse, wallet: string): NextResponse {
  res.cookies.set(SESSION_COOKIE, createSessionToken(wallet), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
  return res;
}

export function clearSessionCookie(res: NextResponse): NextResponse {
  res.cookies.set(SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return res;
}
