import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getSessionWallet } from '@/lib/session';
import { isValidUUID } from '@/lib/security';

/**
 * POST /api/match
 * Body: { excludeId, tier, filters?: { gender, country, ageMin, ageMax } }
 *
 * Server-side random matching. Tier gates are enforced HERE, never on the
 * client:
 *   - tier 1: fully random (global)
 *   - tier 2: may filter by gender
 *   - tier 3: may also filter by country + age
 */
export async function POST(req: NextRequest) {
  // Ensure the caller is authenticated (or dev mode)
  const sessionWallet = await getSessionWallet(req);
  if (!sessionWallet) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const body = await req.json();
  const { excludeId, tier, filters } = body;

  if (!excludeId || !isValidUUID(excludeId)) {
    return NextResponse.json({ error: 'Valid excludeId required' }, { status: 400 });
  }
  const cleanTier = Number(tier);
  // 0 = free tier (random only), 1-3 = requested pass filter level
  if (![0, 1, 2, 3].includes(cleanTier)) {
    return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
  }

  // Verify the caller actually has this tier (server-side, no client trust)
  const supabase = getSupabaseAdmin();

  const { data: me } = await supabase
    .from('bk_profiles')
    .select('id')
    .eq('wallet', sessionWallet)
    .maybeSingle();

  if (!me || me.id !== excludeId) {
    return NextResponse.json({ error: 'Invalid caller' }, { status: 403 });
  }

  const { data: sub } = await supabase
    .from('bk_subscriptions')
    .select('tier')
    .eq('user_id', me.id)
    .gt('expires_at', new Date().toISOString())
    .order('tier', { ascending: false })
    .limit(1)
    .maybeSingle();

  const effectiveTier = sub?.tier ?? 0;

  if (effectiveTier < cleanTier) {
    return NextResponse.json(
      { error: 'Your pass does not include these filters' },
      { status: 403 }
    );
  }

  // Build the query honoring the user's ACTUAL tier
  let query = supabase
    .from('bk_profiles')
    .select('id, username, gender, country, age, avatar_url')
    .eq('onboarded', true)
    .neq('id', excludeId);

  const gender = filters?.gender;
  const country = filters?.country;
  const ageMin = filters?.ageMin;
  const ageMax = filters?.ageMax;

  if (effectiveTier >= 2 && gender && gender !== 'any' && ['male', 'female', 'other'].includes(gender)) {
    query = query.eq('gender', gender);
  }
  if (effectiveTier >= 3 && country && country !== 'any' && /^[A-Z]{2}$/.test(country)) {
    query = query.eq('country', country);
  }
  if (effectiveTier >= 3 && Number.isInteger(ageMin)) {
    query = query.gte('age', ageMin);
  }
  if (effectiveTier >= 3 && Number.isInteger(ageMax)) {
    query = query.lte('age', ageMax);
  }

  const { data: pool } = await query.limit(50);
  if (!pool || pool.length === 0) {
    return NextResponse.json({ match: null });
  }

  const match = pool[Math.floor(Math.random() * pool.length)];

  return NextResponse.json({ match });
}
