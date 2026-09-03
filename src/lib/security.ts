// =============================================================
// Beediyo Kall — Security Layer
// Server-side validation, rate limiting, anti-tamper checks
// =============================================================

import { getSupabaseAdmin } from './supabase';
import { audit } from './audit';

// ============================================================
// 1. Input Validation & Sanitization
// ============================================================

/** Valid wallet address format (0x + 40 hex chars) */
export function isValidWallet(wallet: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(wallet);
}

/** Valid UUID format */
export function isValidUUID(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

/** Sanitize string — remove HTML tags, trim, limit length */
export function sanitize(input: string, maxLength: number = 200): string {
  return input
    .replace(/<[^>]*>/g, '')    // Strip HTML
    .replace(/[<>"'`;]/g, '')   // Remove dangerous chars
    .trim()
    .slice(0, maxLength);
}

/** Valid tier number */
export function isValidTier(tier: number): boolean {
  return [1, 2, 3].includes(tier);
}

/** Valid tier price */
export function isValidPrice(tier: number, price: number): boolean {
  const validPrices: Record<number, number> = { 1: 2, 2: 5, 3: 10 };
  return validPrices[tier] === price;
}

/** Validate tx hash format */
export function isValidTxHash(hash: string): boolean {
  return /^0x[0-9a-fA-F]{64}$/.test(hash);
}

// ============================================================
// 2. Server-Side Subscription Verification
// ============================================================

export interface SubscriptionVerification {
  valid: boolean;
  tier: number;
  expiresAt: string;
  error?: string;
}

/**
 * Verify a user's subscription is active SERVER-SIDE.
 * Never trust client-side subscription state.
 */
export async function verifySubscription(userId: string): Promise<SubscriptionVerification> {
  if (!isValidUUID(userId)) {
    return { valid: false, tier: 0, expiresAt: '', error: 'Invalid user ID' };
  }

  const supabase = getSupabaseAdmin();

  const { data: sub, error } = await supabase
    .from('bk_subscriptions')
    .select('tier, expires_at')
    .eq('user_id', userId)
    .gt('expires_at', new Date().toISOString())
    .order('tier', { ascending: false })
    .limit(1)
    .single();

  if (error || !sub) {
    return { valid: false, tier: 0, expiresAt: '', error: 'No active subscription' };
  }

  return {
    valid: true,
    tier: sub.tier,
    expiresAt: sub.expires_at,
  };
}

/**
 * Verify user can start a call (has subscription OR free time remaining).
 */
export async function canStartCall(userId: string): Promise<{
  allowed: boolean;
  reason: string;
  tier: number;
  freeSecondsRemaining: number;
}> {
  if (!isValidUUID(userId)) {
    return { allowed: false, reason: 'Invalid user', tier: 0, freeSecondsRemaining: 0 };
  }

  const supabase = getSupabaseAdmin();

  // Check for active subscription
  const sub = await verifySubscription(userId);
  if (sub.valid) {
    return { allowed: true, reason: 'Active subscription', tier: sub.tier, freeSecondsRemaining: 60 };
  }

  // Check free tier remaining
  const today = new Date().toISOString().split('T')[0];
  const { data: usage } = await supabase
    .from('bk_daily_usage')
    .select('seconds_used')
    .eq('user_id', userId)
    .eq('usage_date', today)
    .single();

  const used = usage?.seconds_used || 0;
  const remaining = Math.max(0, 60 - used);

  if (remaining <= 0) {
    return { allowed: false, reason: 'Daily free limit reached', tier: 0, freeSecondsRemaining: 0 };
  }

  return { allowed: true, reason: 'Free tier available', tier: 0, freeSecondsRemaining: remaining };
}

// ============================================================
// 3. Server-Side Daily Usage Tracking
// ============================================================

/**
 * Log call usage SERVER-SIDE. Client sends elapsed seconds,
 * server validates and records.
 */
export async function logCallUsage(userId: string, seconds: number): Promise<{
  success: boolean;
  remaining: number;
  error?: string;
}> {
  if (!isValidUUID(userId)) {
    return { success: false, remaining: 0, error: 'Invalid user' };
  }

  // Sanity check: max 60 seconds per day, max 10 second increment per call
  const clampedSeconds = Math.min(Math.max(0, Math.floor(seconds)), 10);

  const supabase = getSupabaseAdmin();
  const today = new Date().toISOString().split('T')[0];

  // Check if user has active subscription (no tracking needed)
  const sub = await verifySubscription(userId);
  if (sub.valid) {
    return { success: true, remaining: 60 }; // Premium users have unlimited
  }

  // Upsert usage
  const { data: existing } = await supabase
    .from('bk_daily_usage')
    .select('id, seconds_used')
    .eq('user_id', userId)
    .eq('usage_date', today)
    .single();

  const newTotal = Math.min((existing?.seconds_used || 0) + clampedSeconds, 60);

  if (existing) {
    await supabase
      .from('bk_daily_usage')
      .update({ seconds_used: newTotal, updated_at: new Date().toISOString() })
      .eq('id', existing.id);
  } else {
    await supabase
      .from('bk_daily_usage')
      .insert({ user_id: userId, usage_date: today, seconds_used: newTotal });
  }

  return { success: true, remaining: 60 - newTotal };
}

// ============================================================
// 4. Rate Limiting (in-memory, per-user)
// ============================================================

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetIn: number;
}

/**
 * Simple in-memory rate limiter.
 * @param key - Unique key (e.g., IP or userId)
 * @param maxRequests - Max requests in window
 * @param windowMs - Time window in milliseconds
 */
export function checkRateLimit(
  key: string,
  maxRequests: number = 30,
  windowMs: number = 60000
): RateLimitResult {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1, resetIn: windowMs };
  }

  if (entry.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetIn: Math.ceil((entry.resetAt - now) / 1000),
    };
  }

  entry.count++;
  return { allowed: true, remaining: maxRequests - entry.count, resetIn: Math.ceil((entry.resetAt - now) / 1000) };
}

// ============================================================
// 5. Anti-Tamper Request Signing
// ============================================================

/**
 * Generate a HMAC signature for server-side request verification.
 * Prevents tampering with subscription data from client.
 */
export async function generateRequestSignature(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = encoder.encode(process.env.REQUEST_SIGNING_KEY || 'beediyo-kall-dev-key-change-in-production');
  const message = encoder.encode(data);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, message);
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Verify a request signature.
 */
export async function verifyRequestSignature(data: string, signature: string): Promise<boolean> {
  const expected = await generateRequestSignature(data);
  return expected === signature;
}

// ============================================================
// 6. IP-based abuse detection
// ============================================================

const suspiciousIPs = new Map<string, { attempts: number; blockedUntil: number }>();

export function checkSuspiciousActivity(ip: string): { blocked: boolean; reason?: string } {
  const entry = suspiciousIPs.get(ip);

  if (entry && Date.now() < entry.blockedUntil) {
    return { blocked: true, reason: 'Temporarily blocked due to suspicious activity' };
  }

  if (entry && entry.attempts > 100) {
    suspiciousIPs.set(ip, { attempts: entry.attempts, blockedUntil: Date.now() + 3600000 }); // 1 hour block
    audit.suspiciousActivity(ip, 'Excessive requests (>100 in window)');
    return { blocked: true, reason: 'Blocked for 1 hour due to excessive requests' };
  }

  return { blocked: false };
}

export function recordRequest(ip: string) {
  const entry = suspiciousIPs.get(ip);
  if (entry) {
    entry.attempts++;
  } else {
    suspiciousIPs.set(ip, { attempts: 1, blockedUntil: 0 });
  }
}
