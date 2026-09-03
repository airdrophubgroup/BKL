import type { MatchCandidate, FilterPrefs } from './types';

// -------------------------------------------------------
// findRandomMatch — asks the server for a random matching user.
// Tier/filter enforcement happens server-side (see /api/match),
// so the client can never unlock higher-tier filters.
// Production: server reads the bk_session cookie.
// Dev mode: the wallet is passed so local testing works.
// -------------------------------------------------------
export async function findRandomMatch(
  excludeId: string,
  tier: 0 | 1 | 2 | 3, // 0 = no pass (random only)
  filters?: FilterPrefs,
  wallet?: string
): Promise<MatchCandidate | null> {
  try {
    const res = await fetch('/api/match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        excludeId,
        tier,
        filters: filters ?? {},
        ...(wallet ? { wallet } : {}),
      }),
    });

    if (!res.ok) {
      console.warn('[matching] match request failed', res.status);
      return null;
    }

    const data = await res.json();
    return data.match ?? null;
  } catch (e) {
    console.error('[matching] error', e);
    return null;
  }
}
