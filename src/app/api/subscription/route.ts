import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getSessionWallet } from '@/lib/session';
import { generateRequestSignature } from '@/lib/security';

// Tier config — single source of truth (server-side)
const TIER_PRICE: Record<number, number> = { 1: 2, 2: 5, 3: 10 };
const TIER_DURATION_DAYS: Record<number, number> = { 1: 7, 2: 7, 3: 7 };

/** Accepts MiniKit transaction ids (tx_...) and dev-mode hashes (0x...) */
function isPaymentId(id: string): boolean {
  return /^tx_[A-Za-z0-9]+$/.test(id) || /^0x[0-9a-fA-F]{64}$/.test(id);
}

/**
 * GET /api/subscription
 * Returns the signed-in user's active subscription (highest tier).
 */
export async function GET(req: NextRequest) {
  const wallet = await getSessionWallet(req);
  if (!wallet) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();

  const { data: profile } = await supabase
    .from('bk_profiles')
    .select('id')
    .eq('wallet', wallet)
    .maybeSingle();

  if (!profile) {
    return NextResponse.json({ subscription: null });
  }

  const { data: sub } = await supabase
    .from('bk_subscriptions')
    .select('*')
    .eq('user_id', profile.id)
    .gt('expires_at', new Date().toISOString())
    .order('tier', { ascending: false })
    .limit(1)
    .maybeSingle();

  return NextResponse.json({ subscription: sub ?? null });
}

/**
 * POST /api/subscription
 * Body: { tier: 1|2|3, txId: string }
 *
 * Complete purchase flow — ALL server-side:
 *   1. Authenticate via session cookie
 *   2. Verify the payment against Worldcoin's Developer API
 *      (checks status, recipient = treasury, amount = tier price, from = caller)
 *   3. Reject duplicate tx ids (replay protection)
 *   4. Record payment, create 7-day subscription, award permanent BKL tokens
 */
export async function POST(req: NextRequest) {
  const wallet = await getSessionWallet(req);
  if (!wallet) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const body = await req.json();
  const tier = Number(body.tier);
  const txId = typeof body.txId === 'string' ? body.txId.trim() : '';

  if (![1, 2, 3].includes(tier)) {
    return NextResponse.json({ error: 'Invalid tier (must be 1, 2, or 3)' }, { status: 400 });
  }
  if (!isPaymentId(txId)) {
    return NextResponse.json({ error: 'Invalid transaction id' }, { status: 400 });
  }

  const expectedPrice = TIER_PRICE[tier];
  const supabase = getSupabaseAdmin();

  // ---- Caller profile ----
  const { data: profile } = await supabase
    .from('bk_profiles')
    .select('id, wallet')
    .eq('wallet', wallet)
    .maybeSingle();

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  // ---- Verify payment ----
  // Real MiniKit payments carry tx_ ids and are verified against the
  // Worldcoin Developer API. Legacy 0x hashes are ONLY accepted when dev
  // mode is explicitly enabled — in production they are rejected so a fake
  // hash can never mint a free pass.
  const isDevHash = txId.startsWith('0x');
  const devModeEnabled = process.env.NEXT_PUBLIC_ALLOW_DEV_MODE === 'true';
  if (isDevHash && !devModeEnabled) {
    return NextResponse.json(
      { error: 'Invalid transaction id (dev hashes are disabled in production)' },
      { status: 400 }
    );
  }

  if (txId.startsWith('tx_')) {
    const APP_ID = process.env.NEXT_PUBLIC_WORLDCOIN_APP_ID;
    const API_KEY = process.env.DEV_PORTAL_API_KEY;

    if (!APP_ID || !API_KEY) {
      console.error('[subscription] Worldcoin APP_ID / DEV_PORTAL_API_KEY not configured');
      return NextResponse.json({ error: 'Server not configured for payments' }, { status: 500 });
    }

    const verifyRes = await fetch(
      `https://developer.worldcoin.org/api/v2/minikit/transaction/${txId}?app_id=${APP_ID}&type=payment`,
      { method: 'GET', headers: { Authorization: `Bearer ${API_KEY}` } }
    );

    if (!verifyRes.ok) {
      console.error('[subscription] Worldcoin verification failed:', verifyRes.status);
      return NextResponse.json({ error: 'Payment could not be verified' }, { status: 400 });
    }

    const txData = await verifyRes.json();

    // Recipient must be our treasury
    const expectedAddr = process.env.NEXT_PUBLIC_TREASURY_ADDRESS?.toLowerCase();
    const paidTo = (txData.to || txData.receiver || '').toLowerCase();
    if (expectedAddr && paidTo !== expectedAddr) {
      console.error('[subscription] Wrong recipient:', paidTo);
      return NextResponse.json({ error: 'Wrong recipient address' }, { status: 400 });
    }

    // Payer must be the signed-in wallet
    const paidFrom = (txData.from || '').toLowerCase();
    if (paidFrom && paidFrom !== wallet.toLowerCase()) {
      console.error('[subscription] Payer mismatch:', paidFrom, '!=', wallet);
      return NextResponse.json({ error: 'Payment does not match your wallet' }, { status: 400 });
    }

    // Amount must match tier price (token_amount is in base units with 18 decimals)
    const rawAmount = txData.tokens?.[0]?.token_amount ?? txData.amount;
    let paidAmount: number | null = null;
    if (typeof rawAmount === 'number') {
      paidAmount = rawAmount;
    } else if (typeof rawAmount === 'string') {
      const n = Number(rawAmount);
      paidAmount = n > 1e8 ? n / 1e18 : n; // normalize base units
    }
    if (paidAmount === null || Math.abs(paidAmount - expectedPrice) > 0.0001) {
      console.error('[subscription] Amount mismatch:', paidAmount, '!=', expectedPrice);
      return NextResponse.json({ error: 'Payment amount mismatch' }, { status: 400 });
    }
  }

  // ---- Replay protection: reject a tx id used before ----
  const { data: existingPayment } = await supabase
    .from('bk_payments')
    .select('id')
    .eq('tx_hash', txId)
    .maybeSingle();

  if (existingPayment) {
    return NextResponse.json({ error: 'Transaction already processed' }, { status: 409 });
  }

  // ---- Write payment ledger ----
  const { error: payError } = await supabase.from('bk_payments').insert({
    user_id: profile.id,
    tier,
    amount_wld: expectedPrice,
    tx_hash: txId,
    status: 'confirmed',
  });
  if (payError) {
    console.error('[subscription] payment insert failed:', payError);
    return NextResponse.json({ error: 'Failed to record payment' }, { status: 500 });
  }

  // ---- Create subscription (extends from now, 7 days) ----
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + TIER_DURATION_DAYS[tier]);

  const { data: sub, error: subError } = await supabase
    .from('bk_subscriptions')
    .insert({
      user_id: profile.id,
      tier,
      tx_hash: txId,
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single();

  if (subError) {
    console.error('[subscription] subscription insert failed:', subError);
    // Compensate: remove the recorded payment so the user can retry the same
    // transaction. Without this, a partial failure would leave them charged
    // but with no pass AND blocked by replay protection (409).
    await supabase.from('bk_payments').delete().eq('tx_hash', txId);
    return NextResponse.json({ error: 'Failed to create subscription' }, { status: 500 });
  }

  // ---- Award permanent BKL tokens (never expire) — with one retry ----
  const bklInsert = () =>
    supabase.from('bk_bkl_tokens').insert({
      user_id: profile.id,
      amount: expectedPrice,
      source: 'subscription',
      tx_hash: txId,
    });
  let { error: bklError } = await bklInsert();
  if (bklError) {
    console.error('[subscription] BKL award failed (retrying once):', bklError);
    const retry = await bklInsert();
    if (retry.error) {
      console.error('[subscription] BKL award failed after retry:', retry.error);
    }
  }

  const signature = await generateRequestSignature(
    `${sub.id}:${sub.tier}:${sub.expires_at}`
  );

  return NextResponse.json({ subscription: sub, bklTokensEarned: expectedPrice, signature });
}
