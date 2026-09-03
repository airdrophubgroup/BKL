'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { isWorldApp, isDevModeAllowed } from '@/lib/worldapp';
import { Globe, ExternalLink, Shield } from 'lucide-react';

interface AppGuardProps {
  children: React.ReactNode;
}

export default function AppGuard({ children }: AppGuardProps) {
  const [status, setStatus] = useState<'loading' | 'allowed' | 'blocked'>('loading');

  useEffect(() => {
    // Check if inside World App or dev mode is allowed
    if (isWorldApp() || isDevModeAllowed()) {
      setStatus('allowed');
    } else {
      setStatus('blocked');
    }
  }, []);

  // Loading state
  if (status === 'loading') {
    return (
      <div className="h-screen flex items-center justify-center bg-midnight-950">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 mx-auto border-4 border-accent-500/20 border-t-accent-500 rounded-full animate-spin" />
          <p className="text-white/30 text-xs">Verifying app environment...</p>
        </div>
      </div>
    );
  }

  // Blocked — not inside World App
  if (status === 'blocked') {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-b from-midnight-900 to-midnight-950 p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm text-center space-y-6"
        >
          {/* App icon */}
          <motion.div
            className="relative mx-auto w-20 h-20"
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          >
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-accent-500/20 to-indigo-600/15 border border-accent-500/20 flex items-center justify-center">
              <span className="text-3xl font-black bg-gradient-to-br from-accent-300 to-indigo-400 bg-clip-text text-transparent">
                BK
              </span>
            </div>
            <div className="absolute inset-0 blur-2xl bg-accent-500/10 rounded-full" />
          </motion.div>

          {/* Title */}
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-white">Beediyo Kall</h1>
            <p className="text-white/40 text-sm">Random Video Chat</p>
          </div>

          {/* Message card */}
          <div className="rounded-2xl bg-white/[0.04] border border-white/[0.08] p-5 space-y-4">
            <div className="w-12 h-12 mx-auto rounded-xl bg-amber-500/10 border border-amber-500/15 flex items-center justify-center">
              <Shield className="w-6 h-6 text-amber-400" />
            </div>
            <div className="space-y-2">
              <p className="text-white font-semibold text-sm">
                Open in World App
              </p>
              <p className="text-white/35 text-xs leading-relaxed">
                Beediyo Kall is a World App Mini App and can only be used inside the World App browser.
              </p>
            </div>
          </div>

          {/* Instructions */}
          <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4 text-left space-y-3">
            <p className="text-white/50 text-xs font-semibold uppercase tracking-wider">How to open</p>
            <div className="space-y-2.5">
              {[
                { step: '1', text: 'Open World App on your phone' },
                { step: '2', text: 'Tap the Discover / Apps tab' },
                { step: '3', text: 'Search for "Beediyo Kall"' },
                { step: '4', text: 'Tap to open the Mini App' },
              ].map((s) => (
                <div key={s.step} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-accent-600/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-[10px] font-bold text-accent-400">{s.step}</span>
                  </div>
                  <p className="text-white/50 text-xs">{s.text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Open World App button */}
          <a
            href="https://world.org"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/[0.06] border border-white/[0.1] text-white/60 text-sm font-medium hover:bg-white/[0.1] transition-colors"
          >
            <Globe className="w-4 h-4" />
            Visit world.org
            <ExternalLink className="w-3 h-3" />
          </a>

          <p className="text-white/15 text-[10px]">
            Mini Apps are built by third-party developers
          </p>
        </motion.div>
      </div>
    );
  }

  // Allowed — render the app
  return <>{children}</>;
}
