'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

// =============================================================
// World App Mini App Context — MiniKit v2 API
//
// Login flow (production, inside World App):
//   1. MiniKit.install() on mount
//   2. Silent restore: GET /api/session (signed httpOnly cookie from last SIWE)
//   3. If no session → user taps "Continue" → MiniKit.walletAuth() (SIWE)
//   4. Backend verifies the SIWE signature (/api/complete-siwe) → sets cookie
//   5. Username resolved via MiniKit.getUserByAddress(wallet)
//
// Payments: MiniKit.pay() → { transactionId, reference, from, chain }
//   → server verifies via developer.worldcoin.org API before granting access.
//
// World ID verification now lives in @worldcoin/idkit (not MiniKit).
//
// Development (NEXT_PUBLIC_ALLOW_DEV_MODE=true): mock user + fake payments.
// =============================================================

export interface WorldUser {
  /** Wallet address (EOA). Never displayed to other users. */
  wallet: string;
  /** Display username from World App — shown to other users during calls */
  username: string;
  /** Profile image URL */
  avatarUrl: string | null;
  /** Whether the session came from a verified SIWE signature */
  verified: boolean;
}

interface WorldcoinContextValue {
  user: WorldUser | null;
  isReady: boolean;
  isConnected: boolean;
  /** Loading state while checking for an existing session */
  restoring: boolean;
  /** Prompt SIWE sign-in in World App. Returns the signed-in user. */
  signIn: () => Promise<WorldUser | null>;
  /** Log out (clears the session cookie). */
  signOut: () => Promise<void>;
  /** Send a WLD payment via MiniKit.pay() — returns { transactionId, reference }. */
  sendPayment: (to: string, tokenAmount: string, description: string) => Promise<{
    transactionId: string;
    reference: string;
  }>;
}

const WorldcoinContext = createContext<WorldcoinContextValue | null>(null);

export function useWorldcoin() {
  const ctx = useContext(WorldcoinContext);
  if (!ctx) throw new Error('useWorldcoin must be used inside <WorldcoinProvider>');
  return ctx;
}

/** True when running in dev mode (outside World App, mock allowed). */
export function isDevMode(): boolean {
  return process.env.NEXT_PUBLIC_ALLOW_DEV_MODE === 'true';
}

/** Lazy-load MiniKit from window (injected by World App). */
function getMiniKit(): any {
  if (typeof window === 'undefined') return null;
  return (window as any).MiniKit ?? null;
}

export function WorldcoinProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<WorldUser | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [restoring, setRestoring] = useState(true);

  /**
   * Resolve a wallet address → World App username/profile.
   * Falls back to a shortened address ONLY if the user has no World App username.
   */
  const resolveUser = useCallback(async (wallet: string, verified: boolean): Promise<WorldUser> => {
    let username = 'World User';
    let avatarUrl: string | null = null;

    try {
      const MiniKit = getMiniKit();
      const profile = MiniKit?.getUserByAddress
        ? await MiniKit.getUserByAddress(wallet)
        : null;
      if (profile?.username) {
        username = profile.username;
      }
      if (profile?.profilePicture) {
        avatarUrl = profile.profilePicture;
      }
    } catch (e) {
      console.warn('[MiniKit] getUserByAddress failed, using fallback', e);
    }

    // Guideline: never show raw wallet to other users.
    // Fallback display name still avoids exposing the full address.
    if (username === 'World User') {
      username = wallet === '' ? 'Guest' : `User_${wallet.slice(2, 6)}`;
    }

    return { wallet, username, avatarUrl, verified };
  }, []);

  // ---- On mount: install MiniKit, then silently restore session ----
  useEffect(() => {
    const init = async () => {
      try {
        // Dev mode → mock user (never in production)
        if (isDevMode()) {
          const stored = localStorage.getItem('bk_world_user');
          if (stored) {
            setUser(JSON.parse(stored));
          } else {
            const mockUser: WorldUser = {
              wallet:
                '0x' +
                Array.from({ length: 40 }, () =>
                  Math.floor(Math.random() * 16).toString(16)
                ).join(''),
              username: 'Guest_' + Math.floor(1000 + Math.random() * 9000),
              avatarUrl: null,
              verified: false,
            };
            localStorage.setItem('bk_world_user', JSON.stringify(mockUser));
            setUser(mockUser);
          }
          setIsReady(true);
          setRestoring(false);
          return;
        }

        const MiniKit = getMiniKit();
        if (MiniKit) {
          MiniKit.install();
        }

        // Silent restore from signed session cookie (set by /api/complete-siwe)
        try {
          const res = await fetch('/api/session');
          const data = await res.json();
          if (data?.wallet) {
            const restored = await resolveUser(data.wallet, !!data.verified);
            setUser(restored);
          }
        } catch (e) {
          console.warn('[Worldcoin] session restore failed', e);
        }
      } catch (e) {
        console.error('[Worldcoin] init failed', e);
      } finally {
        setIsReady(true);
        setRestoring(false);
      }
    };
    init();
  }, [resolveUser]);

  /**
   * Sign in with wallet (SIWE) inside World App.
   * Backend verifies the signature and sets a signed httpOnly cookie.
   */
  const signIn = useCallback(async (): Promise<WorldUser | null> => {
    // Dev mode mock
    if (isDevMode()) {
      const stored = localStorage.getItem('bk_world_user');
      if (stored) {
        const parsed = JSON.parse(stored);
        setUser(parsed);
        return parsed;
      }
      return null;
    }

    const MiniKit = getMiniKit();
    if (!MiniKit?.walletAuth) {
      console.warn('[Worldcoin] MiniKit.walletAuth unavailable — are you inside World App?');
      return null;
    }

    try {
      // 1. Get a nonce from the backend
      const nonceRes = await fetch('/api/nonce');
      const { nonce } = await nonceRes.json();
      if (!nonce) throw new Error('No nonce returned');

      // 2. Ask World App to sign the SIWE message
      const result = await MiniKit.walletAuth({
        nonce,
        statement: 'Sign in to Beediyo Kall',
        expirationTime: new Date(Date.now() + 1000 * 60 * 60),
        fallback: () => {
          console.warn('[Worldcoin] walletAuth fallback — not inside World App');
        },
      });

      if (result?.executedWith === 'fallback' || !result?.data) {
        return null;
      }

      // 3. Backend verifies signature, sets session cookie
      const verifyRes = await fetch('/api/complete-siwe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payload: result.data, nonce }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok || !verifyData?.wallet) {
        console.error('[Worldcoin] SIWE verification failed', verifyData);
        return null;
      }

      // 4. Resolve username from World App address book
      const signedIn = await resolveUser(verifyData.wallet, true);
      setUser(signedIn);
      return signedIn;
    } catch (err) {
      console.error('[Worldcoin] signIn failed', err);
      return null;
    }
  }, [resolveUser]);

  /** Clear the session cookie + local state. */
  const signOut = useCallback(async () => {
    try {
      await fetch('/api/session', { method: 'DELETE' });
    } catch {
      /* ignore */
    }
    setUser(null);
  }, []);

  /**
   * Send WLD payment via MiniKit.pay().
   * Returns { transactionId, reference } — the backend verifies it.
   */
  const sendPayment = useCallback(
    async (
      to: string,
      tokenAmount: string,
      description: string
    ): Promise<{ transactionId: string; reference: string }> => {
      const MiniKit = getMiniKit();

      if (MiniKit?.pay) {
        try {
          // Reference nonce from backend (used to correlate the payment)
          const nonceRes = await fetch('/api/generate-nonce', { method: 'POST' });
          const { id } = await nonceRes.json();

          const { Tokens, tokenToDecimals } = await import('@worldcoin/minikit-js/commands');

          const result = await MiniKit.pay({
            reference: id,
            to,
            tokens: [
              {
                symbol: Tokens.WLD,
                token_amount: tokenToDecimals(parseFloat(tokenAmount), Tokens.WLD).toString(),
              },
            ],
            description,
            fallback: () => {
              console.warn('[MiniKit] pay fallback — payment not completed in World App');
            },
          });

          if (result?.executedWith === 'minikit' && result?.data?.transactionId) {
            return {
              transactionId: result.data.transactionId,
              reference: result.data.reference ?? id,
            };
          }

          throw new Error('Payment was not executed by MiniKit');
        } catch (err: any) {
          console.error('[MiniKit] pay failed:', err?.code ?? err);
          throw new Error(
            err?.code === 'user_rejected' || err?.code === 'payment_rejected'
              ? 'Payment was cancelled.'
              : err?.code === 'insufficient_balance'
                ? 'Insufficient WLD balance.'
                : 'Payment failed. Please try again.'
          );
        }
      }

      // Dev mode stub
      await new Promise((r) => setTimeout(r, 1200));
      return {
        transactionId: 'tx_' + Array.from({ length: 24 }, () =>
          Math.floor(Math.random() * 16).toString(16)
        ).join(''),
        reference: 'dev-' + Date.now().toString(36),
      };
    },
    []
  );

  return (
    <WorldcoinContext.Provider
      value={{
        user,
        isReady,
        isConnected: !!user,
        restoring,
        signIn,
        signOut,
        sendPayment,
      }}
    >
      {children}
    </WorldcoinContext.Provider>
  );
}
