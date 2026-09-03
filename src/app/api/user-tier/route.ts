import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { isValidUUID } from '@/lib/security';

/**
 * GET /api/user-tier?userId=<uuid>
 * Returns the highest active subscription tier for a user (0 = none).
 * Used to show the Bronze/Silver/Gold badge next to a peer's username
 * during an active call.
 */
export async function GET(req: NextRequest) {
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
