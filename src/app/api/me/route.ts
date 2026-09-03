import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getSessionWallet } from '@/lib/session';

/**
 * GET /api/me
 * Returns the signed-in user's profile. Creates one if it doesn't exist.
 * Username is synced from the World App session on every request, so a
 * user who changes their Worldcoin username sees it reflected here.
 */
export async function GET(req: NextRequest) {
  const wallet = await getSessionWallet(req);
  if (!wallet) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();

  const { data: existing } = await supabase
    .from('bk_profiles')
    .select('*')
    .eq('wallet', wallet)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ profile: existing });
  }

  // Create the profile (worldcoin_id column is unique — key it to the wallet,
  // which is our unique per-user identifier after SIWE auth)
  const { data: created, error } = await supabase
    .from('bk_profiles')
    .insert({
      worldcoin_id: wallet,
      wallet,
      username: req.nextUrl.searchParams.get('username') || 'World User',
      avatar_url: req.nextUrl.searchParams.get('avatar') || null,
    })
    .select()
    .single();

  if (error) {
    console.error('[me] create profile failed:', error);
    return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 });
  }

  return NextResponse.json({ profile: created });
}

/**
 * PATCH /api/me
 * Body: { onboarded?: { country, age, gender }, privacyAccepted?: bool, username?, avatarUrl? }
 */
export async function PATCH(req: NextRequest) {
  const wallet = await getSessionWallet(req);
  if (!wallet) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const body = await req.json();
  const supabase = getSupabaseAdmin();

  const { data: profile } = await supabase
    .from('bk_profiles')
    .select('id')
    .eq('wallet', wallet)
    .maybeSingle();

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  const updates: Record<string, unknown> = {};

  // One-time onboarding: country + age + gender — locked permanently after set
  if (body.onboarded) {
    const { country, age, gender } = body.onboarded;
    if (typeof country !== 'string' || !/^[A-Z]{2}$/.test(country)) {
      return NextResponse.json({ error: 'Valid ISO country code required' }, { status: 400 });
    }
    if (!Number.isInteger(age) || age < 18 || age > 99) {
      return NextResponse.json({ error: 'Age must be between 18 and 99' }, { status: 400 });
    }
    if (!['male', 'female', 'other'].includes(gender)) {
      return NextResponse.json({ error: 'Invalid gender' }, { status: 400 });
    }
    // Server-side guard: do not overwrite already-locked values
    const { data: current } = await supabase
      .from('bk_profiles')
      .select('country, age, gender, onboarded')
      .eq('id', profile.id)
      .single();

    if (current?.onboarded) {
      return NextResponse.json({ error: 'Profile already locked' }, { status: 409 });
    }

    updates.country = country;
    updates.age = age;
    updates.gender = gender;
    updates.onboarded = true;
  }

  if (body.privacyAccepted === true) {
    updates.privacy_accepted = true;
  }

  if (typeof body.username === 'string' && body.username.trim()) {
    updates.username = body.username.trim().slice(0, 60);
  }
  if (typeof body.avatarUrl === 'string') {
    updates.avatar_url = body.avatarUrl.slice(0, 500);
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  }

  const { data: updated, error } = await supabase
    .from('bk_profiles')
    .update(updates)
    .eq('id', profile.id)
    .select()
    .single();

  if (error) {
    console.error('[me] update failed:', error);
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }

  return NextResponse.json({ profile: updated });
}
