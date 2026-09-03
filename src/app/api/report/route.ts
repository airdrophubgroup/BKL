import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

/**
 * POST /api/report
 * Body: { reporterId, reportedId, reason }
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { reporterId, reportedId, reason } = body;

  if (!reporterId || !reportedId || !reason) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  const { error } = await supabase.from('bk_reports').insert({
    reporter_id: reporterId,
    reported_id: reportedId,
    reason,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
