// =============================================================
// API Security Middleware
// Apply to all API routes for protection
// =============================================================

import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, checkSuspiciousActivity, recordRequest, sanitize, isValidWallet, isValidUUID } from './security';
import { audit } from './audit';

interface SecurityOptions {
  /** Rate limit: max requests per window */
  rateLimit?: number;
  /** Rate limit window in ms */
  rateLimitWindow?: number;
  /** Require valid wallet address */
  requireWallet?: boolean;
  /** Require valid user ID */
  requireUserId?: boolean;
  /** Custom validation function */
  validate?: (body: any) => string | null; // returns error message or null
}

/**
 * Wrap an API handler with security checks.
 */
export function withSecurity(
  handler: (req: NextRequest, context?: any) => Promise<NextResponse>,
  options: SecurityOptions = {}
) {
  const {
    rateLimit = 30,
    rateLimitWindow = 60000,
    requireWallet = false,
    requireUserId = false,
    validate,
  } = options;

  return async (req: NextRequest, context?: any): Promise<NextResponse> => {
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';

    // 1. Suspicious activity check
    const suspicious = checkSuspiciousActivity(ip);
    if (suspicious.blocked) {
      audit.suspiciousActivity(ip, suspicious.reason || 'Blocked');
      return NextResponse.json(
        { error: suspicious.reason },
        { status: 429 }
      );
    }

    // 2. Rate limiting
    const rateLimitKey = `api:${ip}`;
    const rateCheck = checkRateLimit(rateLimitKey, rateLimit, rateLimitWindow);
    if (!rateCheck.allowed) {
      audit.rateLimitHit(ip, req.url);
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateCheck.resetIn),
            'X-RateLimit-Remaining': '0',
          },
        }
      );
    }

    // 3. Record request for abuse detection
    recordRequest(ip);

    // 4. Parse and validate body for POST/PUT
    let body: any = undefined;
    if (req.method === 'POST' || req.method === 'PUT') {
      try {
        body = await req.json();
      } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
      }

      // Validate wallet if required
      if (requireWallet && body.wallet && !isValidWallet(body.wallet)) {
        return NextResponse.json({ error: 'Invalid wallet address' }, { status: 400 });
      }

      // Validate user ID if required
      if (requireUserId && body.userId && !isValidUUID(body.userId)) {
        return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
      }

      // Custom validation
      if (validate) {
        const error = validate(body);
        if (error) {
          return NextResponse.json({ error }, { status: 400 });
        }
      }

      // Sanitize string fields
      if (body && typeof body === 'object') {
        for (const key of Object.keys(body)) {
          if (typeof body[key] === 'string') {
            body[key] = sanitize(body[key], 500);
          }
        }
      }
    }

    // 5. Validate query params
    const url = new URL(req.url);
    if (requireWallet) {
      const wallet = url.searchParams.get('wallet');
      if (wallet && !isValidWallet(wallet)) {
        return NextResponse.json({ error: 'Invalid wallet address' }, { status: 400 });
      }
    }

    // 6. Clone request with sanitized body and add security headers to response
    const response = await handler(req, context);

    // Add security headers
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set('X-RateLimit-Remaining', String(rateCheck.remaining));

    return response;
  };
}

/**
 * Simple GET-only security wrapper for read endpoints.
 */
export function withReadSecurity(
  handler: (req: NextRequest) => Promise<NextResponse>,
  rateLimit: number = 60
) {
  return withSecurity(handler, { rateLimit });
}
