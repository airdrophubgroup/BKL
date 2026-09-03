import { NextResponse } from 'next/server';
import crypto from 'crypto';

/**
 * Generate a unique nonce for MiniKit.pay() transactions.
 * 
 * This nonce is used as a "reference" in the pay command.
 * It helps correlate client payment requests with backend confirmation.
 * 
 * The nonce should be stored in your database with:
 *   - user_id (who initiated the payment)
 *   - tier (what they're buying)
 *   - status: 'pending' → 'confirmed' / 'failed'
 */
export async function POST() {
  const nonce = crypto.randomUUID();

  // In production, store this nonce in your database:
  // await supabase.from('payment_nonces').insert({
  //   nonce,
  //   status: 'pending',
  //   created_at: new Date().toISOString(),
  // });

  return NextResponse.json({ id: nonce });
}
