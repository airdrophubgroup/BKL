import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getSessionWallet } from '@/lib/session';

/**
 * GET /api/bkl-balance
 * Returns the signed-in user's total BKL token balance.
 * Tokens are permanent — never expire even if subscription lapses.
 */
export async function GET(req: NextRequest) {
  const wallet = await getSessionWallet(req);
  if (!wallet) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();

  // Find profile
  const { data: profile } = await supabase
    .from('bk_profiles')
    .select('id')
    .eq('wallet', wallet)
    .single();

  if (!profile) {
    return NextResponse.json({ balance: 0, tokens: [] });
  }

  // Get all BKL tokens
  const { data: tokens } = await supabase
    .from('bk_bkl_tokens')
    .select('*')
    .eq('user_id', profile.id)
    .order('created_at', { ascending: false });

  const balance = tokens?.reduce((sum, t) => sum + t.amount, 0) ?? 0;

  return NextResponse.json({ balance, tokens: tokens ?? [] });
}
