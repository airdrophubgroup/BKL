import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getSessionWallet } from '@/lib/session';

const DEV_MODE = process.env.NEXT_PUBLIC_ALLOW_DEV_MODE === 'true';

/**
 * POST /api/generate-nonce
 * Returns a unique reference id for a MiniKit.pay() transaction.
 * Requires an authenticated session (prevents anonymous nonce spam).
 */
export async function POST(req: NextRequest) {
  const wallet = await getSessionWallet(req);
  if (!wallet && !DEV_MODE) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const nonce = crypto.randomUUID();

  // In production, store this nonce in your database:
  // await supabase.from('payment_nonces').insert({
  //   nonce,
  //   status: 'pending',
  //   created_at: new Date().toISOString(),
  // });

  return NextResponse.json({ id: nonce });
}
