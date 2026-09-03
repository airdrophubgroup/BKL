import { NextRequest, NextResponse } from 'next/server';
import { verifySiweMessage } from '@worldcoin/minikit-js/siwe';
import type { MiniAppWalletAuthSuccessPayload } from '@worldcoin/minikit-js/commands';
import { setSessionCookie } from '@/lib/session';

/**
 * POST /api/complete-siwe
 * Body: { payload: MiniAppWalletAuthSuccessPayload, nonce: string }
 *
 * Verifies the SIWE signature produced by MiniKit.walletAuth() against
 * the nonce we issued in /api/nonce. On success, sets a signed
 * bk_session cookie so subsequent requests are authenticated.
 */
export async function POST(req: NextRequest) {
  try {
    const { payload, nonce } = (await req.json()) as {
      payload: MiniAppWalletAuthSuccessPayload;
      nonce: string;
    };

    if (!payload?.message || !payload?.signature || !nonce) {
      return NextResponse.json({ isValid: false, error: 'Missing payload or nonce' }, { status: 400 });
    }

    // The nonce must match the one we issued (stored in an httpOnly cookie)
    const issuedNonce = req.cookies.get('bk_siwe_nonce')?.value;
    if (!issuedNonce || issuedNonce !== nonce) {
      return NextResponse.json({ isValid: false, error: 'Invalid nonce' }, { status: 400 });
    }

    // Verify the SIWE signature on Worldchain
    const verification = await verifySiweMessage(payload, nonce);

    if (!verification.isValid) {
      return NextResponse.json({ isValid: false, error: 'Invalid signature' }, { status: 400 });
    }

    const wallet = verification.siweMessageData.address;

    const res = NextResponse.json({ isValid: true, wallet });
    return setSessionCookie(res, wallet);
  } catch (error: any) {
    console.error('[complete-siwe] Error:', error?.message ?? error);
    return NextResponse.json(
      { isValid: false, error: error instanceof Error ? error.message : 'Verification failed' },
      { status: 400 }
    );
  }
}
