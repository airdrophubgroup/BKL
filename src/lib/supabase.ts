import { createClient } from '@supabase/supabase-js';

// =============================================================
// Supabase is used ONLY server-side via the service-role client.
//
// The browser never talks to Supabase directly (RLS + anon keys are
// unsuitable because World App users never sign into Supabase Auth).
// Every request goes through our API routes (/api/*), which use the
// signed bk_session cookie to identify the wallet, then talk to
// Supabase with the service role (bypasses RLS safely).
// =============================================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/** Server-side Supabase with service role — API routes only. */
export function getSupabaseAdmin() {
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
