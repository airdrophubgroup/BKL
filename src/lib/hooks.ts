'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWorldcoin, isDevMode } from './worldcoin-context';
import type { Profile, Subscription } from './types';

// ============================================================
// FREE TIER CONSTANTS
// ============================================================
export const FREE_DAILY_SECONDS = 60; // 1 minute per day for non-premium

/**
 * Dev mode has no bk_session cookie (no World App), so API routes
 * accept ?wallet= as fallback. Production relies on the cookie only.
 */
export function authPath(path: string, wallet?: string | null): string {
  if (isDevMode() && wallet) {
    return `${path}?wallet=${encodeURIComponent(wallet)}`;
  }
  return path;
}

// -------------------------------------------------------
// useProfile — fetches/updates the signed-in user's profile
// via /api/me (server-side, session cookie → service role).
// -------------------------------------------------------
export function useProfile() {
  const { user } = useWorldcoin();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch(authPath('/api/me', user?.wallet));
      if (res.ok) {
        const data = await res.json();
        setProfile(data.profile ?? null);
      }
    } catch (e) {
      console.error('[useProfile] failed', e);
    } finally {
      setLoading(false);
    }
  }, [user?.wallet]);

  useEffect(() => {
    if (!user) return;
    load();
  }, [user, load]);

  // Keep the profile's username in sync with the latest World App session
  useEffect(() => {
    if (!profile || !user) return;
    if (profile.username !== user.username || profile.avatar_url !== user.avatarUrl) {
      (async () => {
        try {
          const res = await fetch(authPath('/api/me', user?.wallet), {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              username: user.username,
              avatarUrl: user.avatarUrl,
            }),
          });
          if (res.ok) {
            const data = await res.json();
            setProfile(data.profile ?? profile);
          }
        } catch {
          /* transient — retried next load */
        }
      })();
    }
  }, [user, profile]);

  /** One-time onboarding: locks country + age + gender permanently. */
  const completeOnboarding = useCallback(async (country: string, age: number, gender: string) => {
    const res = await fetch(authPath('/api/me', user?.wallet), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ onboarded: { country, age, gender } }),
    });
    if (res.ok) {
      const data = await res.json();
      setProfile(data.profile);
      return true;
    }
    return false;
  }, [user?.wallet]);

  const acceptPrivacy = useCallback(async () => {
    const res = await fetch(authPath('/api/me', user?.wallet), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ privacyAccepted: true }),
    });
    if (res.ok) {
      const data = await res.json();
      setProfile(data.profile);
      return true;
    }
    return false;
  }, [user?.wallet]);

  return { profile, loading, completeOnboarding, acceptPrivacy, refresh: load };
}

// -------------------------------------------------------
// useSubscription — fetches the highest active subscription
// via /api/subscription (session-based, server-verified).
// -------------------------------------------------------
export function useSubscription(_profileId: string | null = null) {
  const { user } = useWorldcoin();
  const [sub, setSub] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch(authPath('/api/subscription', user?.wallet));
      if (res.ok) {
        const data = await res.json();
        setSub(data.subscription ?? null);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [user?.wallet]);

  useEffect(() => {
    load();
  }, [load, user]);

  const refresh = load;

  return { subscription: sub, loading, refresh };
}

// -------------------------------------------------------
// useCountdown — live countdown to subscription expiry
// -------------------------------------------------------
export function useCountdown(expiresAt: string | null) {
  const [remaining, setRemaining] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null);

  useEffect(() => {
    if (!expiresAt) {
      setRemaining(null);
      return;
    }
    const tick = () => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      if (diff <= 0) {
        setRemaining(null);
        return;
      }
      setRemaining({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
        seconds: Math.floor((diff / 1000) % 60),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  return remaining;
}

// -------------------------------------------------------
// useDailyUsage — free tier 1-minute daily limit via API
// -------------------------------------------------------
export function useDailyUsage(_profileId: string | null, hasActiveSubscription: boolean) {
  const { user } = useWorldcoin();
  const [secondsUsed, setSecondsUsed] = useState(0);
  const [loading, setLoading] = useState(true);

  const remaining = hasActiveSubscription
    ? Infinity
    : Math.max(0, FREE_DAILY_SECONDS - secondsUsed);

  const hasTimeLeft = hasActiveSubscription || remaining > 0;

  const fetchUsage = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(authPath('/api/daily-usage', user?.wallet));
      if (res.ok) {
        const data = await res.json();
        if (data.premium) return;
        setSecondsUsed(data.secondsUsed ?? 0);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [user?.wallet]);

  useEffect(() => {
    fetchUsage();
  }, [fetchUsage, user]);

  // Log usage (call this every few seconds during a call)
  const logUsage = useCallback(async (additionalSeconds: number) => {
    if (hasActiveSubscription) return;
    try {
      const res = await fetch(authPath('/api/daily-usage', user?.wallet), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seconds: additionalSeconds }),
      });
      if (res.ok) {
        const data = await res.json();
        if (typeof data.remaining === 'number') {
          setSecondsUsed(Math.max(0, FREE_DAILY_SECONDS - data.remaining));
        }
      }
    } catch {
      /* ignore */
    }
  }, [hasActiveSubscription, user?.wallet]);

  const refresh = fetchUsage;

  return { secondsUsed, remaining, hasTimeLeft, loading, logUsage, refresh };
}
