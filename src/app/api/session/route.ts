import { NextRequest, NextResponse } from 'next/server';
import { parseSessionToken, clearSessionCookie } from '@/lib/session';

/**
 * GET /api/session — silent restore after page load.
 * Returns the signed-in wallet from the bk_session cookie.
 */
export async function GET(req: NextRequest) {
  const wallet = parseSessionToken(req.cookies.get('bk_session')?.value);
  if (!wallet) {
    return NextResponse.json({ wallet: null, verified: false });
  }
  return NextResponse.json({ wallet, verified: true });
}

/**
 * DELETE /api/session — sign out.
 */
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  return clearSessionCookie(res);
}
