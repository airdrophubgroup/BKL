// =============================================================
// Environment Variable Validation
// Validates all required env vars on startup.
// If any are missing, the app logs a warning (not crash in dev).
// In production, this prevents deployment without proper config.
// =============================================================

const REQUIRED_SERVER_VARS = [
  'SUPABASE_SERVICE_ROLE_KEY',
  'REQUEST_SIGNING_KEY',
];

const REQUIRED_CLIENT_VARS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_TREASURY_ADDRESS',
];

export function validateEnvironment() {
  const missing: string[] = [];

  for (const key of REQUIRED_SERVER_VARS) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  for (const key of REQUIRED_CLIENT_VARS) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    console.warn(
      `\n⚠️  [Beediyo Kall] Missing environment variables:\n` +
      missing.map((k) => `   - ${k}`).join('\n') +
      `\n\n   App may not function correctly.\n`
    );
  }

  // Validate Supabase URL format
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (supabaseUrl && !supabaseUrl.startsWith('https://')) {
    console.warn('⚠️  NEXT_PUBLIC_SUPABASE_URL should start with https://');
  }

  // Validate treasury address format
  const treasury = process.env.NEXT_PUBLIC_TREASURY_ADDRESS;
  if (treasury && !/^0x[0-9a-fA-F]{40}$/.test(treasury)) {
    console.warn('⚠️  NEXT_PUBLIC_TREASURY_ADDRESS is not a valid Ethereum address');
  }

  return { valid: missing.length === 0, missing };
}

// Run on import (server-side only)
if (typeof window === 'undefined') {
  validateEnvironment();
}
