import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getSessionWallet } from '@/lib/session';

/**
 * GET /api/leaderboard?limit=50
 * Returns top BKL token holders ranked by total balance (public),
 * plus the signed-in user's own rank.
 */
export async function GET(req: NextRequest) {
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') || '50'), 100);
  const supabase = getSupabaseAdmin();

  // Fast path: SQL function (added to supabase/schema.sql)
  const { data: rows, error } = await supabase.rpc('bk_leaderboard_ranked', { p_limit: limit });

  let top: any[] = [];
  if (!error && Array.isArray(rows)) {
    top = rows;
  } else {
    // Fallback: manual aggregation
    const { data: profiles } = await supabase.from('bk_profiles').select('id, username, avatar_url, country');
    const { data: tokenAgg } = await supabase.from('bk_bkl_tokens').select('user_id, amount');

    const balanceMap = new Map<string, number>();
    tokenAgg?.forEach((t) => {
      balanceMap.set(t.user_id, (balanceMap.get(t.user_id) || 0) + t.amount);
    });

    const ranked = (profiles || [])
      .map((p) => ({
        id: p.id,
        username: p.username,
        avatar_url: p.avatar_url,
        country: p.country,
        balance: balanceMap.get(p.id) || 0,
      }))
      .filter((u) => u.balance > 0)
      .sort((a, b) => b.balance - a.balance);

    top = ranked.slice(0, limit).map((u, i) => ({
      rank: i + 1,
      username: u.username,
      avatar_url: u.avatar_url,
      country: u.country,
      balance: u.balance,
    }));

    // own rank (only in fallback path)
    const wallet = await getSessionWallet(req);
    if (wallet) {
      const { data: me } = await supabase
        .from('bk_profiles')
        .select('id')
        .eq('wallet', wallet)
        .maybeSingle();
      if (me) {
        const idx = ranked.findIndex((u) => u.id === me.id);
        if (idx >= 0) {
          return NextResponse.json({
            leaderboard: top,
            userRank: {
              rank: idx + 1,
              username: ranked[idx].username,
              balance: ranked[idx].balance,
            },
          });
        }
      }
    }
    return NextResponse.json({ leaderboard: top, userRank: null });
  }

  // Fast path: resolve own rank
  const wallet = await getSessionWallet(req);
  let userRank = null;
  if (wallet) {
    const { data: me } = await supabase
      .from('bk_profiles')
      .select('id')
      .eq('wallet', wallet)
      .maybeSingle();
    if (me) {
      const { data: tokens } = await supabase
        .from('bk_bkl_tokens')
        .select('amount')
        .eq('user_id', me.id);
      const balance = tokens?.reduce((s, t) => s + t.amount, 0) ?? 0;
      if (balance > 0) {
        const { data: all } = await supabase.from('bk_profiles').select('id');
        const { data: allTokens } = await supabase.from('bk_bkl_tokens').select('user_id, amount');
        const map = new Map<string, number>();
        allTokens?.forEach((t) => map.set(t.user_id, (map.get(t.user_id) || 0) + t.amount));
        const sorted = (all || [])
          .map((p) => ({ id: p.id, balance: map.get(p.id) || 0 }))
          .filter((u) => u.balance > 0)
          .sort((a, b) => b.balance - a.balance);
        const idx = sorted.findIndex((u) => u.id === me.id);
        if (idx >= 0) userRank = { rank: idx + 1, balance };
      }
    }
  }

  return NextResponse.json({ leaderboard: top, userRank });
}
