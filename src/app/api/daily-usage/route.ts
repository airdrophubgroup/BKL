import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getSessionWallet } from '@/lib/session';
import { verifySubscription, logCallUsage } from '@/lib/security';

/**
 * GET /api/daily-usage
 * Returns today's usage and remaining free seconds for the signed-in user.
 */
export async function GET(req: NextRequest) {
  const wallet = await getSessionWallet(req);
  if (!wallet) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  const today = new Date().toISOString().split('T')[0];

  const { data: profile } = await supabase
    .from('bk_profiles')
    .select('id')
    .eq('wallet', wallet)
    .maybeSingle();

  if (!profile) {
    return NextResponse.json({ secondsUsed: 0, remaining: 60, premium: false });
  }

  // Premium = unlimited
  const sub = await verifySubscription(profile.id);
  if (sub.valid) {
    return NextResponse.json({ secondsUsed: 0, remaining: Infinity, premium: true });
  }

  const { data: usage } = await supabase
    .from('bk_daily_usage')
    .select('seconds_used')
    .eq('user_id', profile.id)
    .eq('usage_date', today)
    .maybeSingle();

  const secondsUsed = usage?.seconds_used || 0;
  const remaining = Math.max(0, 60 - secondsUsed);

  return NextResponse.json({ secondsUsed, remaining, premium: false });
}

/**
 * POST /api/daily-usage
 * Body: { seconds }
 * Logs usage server-side. Server clamps to max 60/day — the client
 * can never report more than the server allows.
 */
export async function POST(req: NextRequest) {
  const wallet = await getSessionWallet(req);
  if (!wallet) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const body = await req.json();
  const sec = parseInt(body.seconds);
  if (isNaN(sec) || sec < 1 || sec > 10) {
    return NextResponse.json({ error: 'Invalid seconds (must be 1-10)' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  const { data: profile } = await supabase
    .from('bk_profiles')
    .select('id')
    .eq('wallet', wallet)
    .maybeSingle();

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  const result = await logCallUsage(profile.id, sec);

  return NextResponse.json(result);
}
