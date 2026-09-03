import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getSessionWallet } from '@/lib/session';
import { isValidUUID } from '@/lib/security';

const DEV_MODE = process.env.NEXT_PUBLIC_ALLOW_DEV_MODE === 'true';

/**
 * GET /api/user-tier?userId=<uuid>
 * Returns the highest active subscription tier for a user (0 = none).
 * Used to show the Bronze/Silver/Gold badge next to a peer's username
 * during an active call.
 *
 * Requires an authenticated session (dev mode allows testing without one).
 */
export async function GET(req: NextRequest) {
  // Only authenticated users may look up tiers (prevents anonymous scanning)
  const wallet = await getSessionWallet(req);
  if (!wallet && !DEV_MODE) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const userId = req.nextUrl.searchParams.get('userId');
  if (!userId || !isValidUUID(userId)) {
    return NextResponse.json({ tier: 0 });
  }

  const supabase = getSupabaseAdmin();

  const { data: sub } = await supabase
    .from('bk_subscriptions')
    .select('tier')
    .eq('user_id', userId)
    .gt('expires_at', new Date().toISOString())
    .order('tier', { ascending: false })
    .limit(1)
    .maybeSingle();

  return NextResponse.json({ tier: sub?.tier ?? 0 });
}
