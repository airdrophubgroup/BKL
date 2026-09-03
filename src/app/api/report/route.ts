import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getSessionWallet } from '@/lib/session';
import { isValidUUID } from '@/lib/security';

/**
 * POST /api/report
 * Body: { reportedId, reason }
 * The reporter is derived from the session cookie (never client-supplied),
 * so a user can only report from their own account.
 */
export async function POST(req: NextRequest) {
  const wallet = await getSessionWallet(req);
  if (!wallet) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const body = await req.json();
  const reportedId = body.reportedId;
  const reason = typeof body.reason === 'string' ? body.reason.trim() : '';

  if (!reportedId || !isValidUUID(reportedId)) {
    return NextResponse.json({ error: 'Valid reportedId required' }, { status: 400 });
  }
  if (!reason || reason.length < 3 || reason.length > 300) {
    return NextResponse.json({ error: 'Reason must be 3-300 characters' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  // Resolve reporter profile from the session wallet
  const { data: reporter } = await supabase
    .from('bk_profiles')
    .select('id')
    .eq('wallet', wallet)
    .maybeSingle();

  if (!reporter) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  if (reporter.id === reportedId) {
    return NextResponse.json({ error: 'You cannot report yourself' }, { status: 400 });
  }

  // Reported user must exist
  const { data: reported } = await supabase
    .from('bk_profiles')
    .select('id')
    .eq('id', reportedId)
    .maybeSingle();

  if (!reported) {
    return NextResponse.json({ error: 'Reported user not found' }, { status: 404 });
  }

  const { error } = await supabase.from('bk_reports').insert({
    reporter_id: reporter.id,
    reported_id: reportedId,
    reason,
  });

  if (error) {
    console.error('[report] insert failed:', error);
    return NextResponse.json({ error: 'Failed to submit report' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
