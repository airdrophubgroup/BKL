'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useWorldcoin } from '@/lib/worldcoin-context';
import { Loader2, ShieldCheck, Sparkles } from 'lucide-react';

export default function SignInGate() {
  const { signIn } = useWorldcoin();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async () => {
    setLoading(true);
    setError(null);
    const user = await signIn();
    if (!user) {
      setError('Sign-in was not completed. Please try again.');
      setLoading(false);
    }
    // On success the provider state updates → page.tsx re-renders and unmounts this gate.
  };

  return (
    <div className="h-screen flex items-center justify-center bg-gradient-to-b from-midnight-900 to-midnight-950 p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm text-center space-y-6"
      >
        {/* App logo */}
        <motion.div
          className="relative mx-auto w-20 h-20"
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        >
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-accent-500/25 to-indigo-600/15 border border-accent-500/25 flex items-center justify-center">
            <span className="text-2xl font-black bg-gradient-to-br from-accent-300 to-indigo-400 bg-clip-text text-transparent">
              BK
            </span>
          </div>
          <div className="absolute inset-0 blur-2xl bg-accent-500/15 rounded-full" />
        </motion.div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-white">Beediyo Kall</h1>
          <p className="text-white/40 text-sm">Random Video Chat on World App</p>
        </div>

        {/* Benefits */}
        <div className="rounded-2xl bg-white/[0.04] border border-white/[0.08] p-5 space-y-3 text-left">
          {[
            { icon: <Sparkles className="w-4 h-4 text-accent-400" />, text: 'Meet new people worldwide' },
            { icon: <ShieldCheck className="w-4 h-4 text-green-400" />, text: 'No phone number needed' },
            { icon: <ShieldCheck className="w-4 h-4 text-green-400" />, text: 'Only your username is shown to others' },
          ].map((b, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 + i * 0.1 }}
              className="flex items-center gap-3"
            >
              {b.icon}
              <span className="text-white/60 text-sm">{b.text}</span>
            </motion.div>
          ))}
        </div>

        {error && (
          <p className="text-red-400 text-xs">{error}</p>
        )}

        {/* CTA */}
        <button
          onClick={handleSignIn}
          disabled={loading}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-accent-600 to-indigo-600 text-white font-bold text-base shadow-xl shadow-accent-900/30 disabled:opacity-60 flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" /> Waiting for World App...
            </>
          ) : (
            <>Continue with World App</>
          )}
        </button>

        <p className="text-white/20 text-[10px]">
          You&apos;ll be asked to sign a message to verify your wallet.
        </p>

        <p className="text-white/15 text-[9px]">
          Need help?{' '}
          <a
            href="mailto:airdrophubgroup@gmail.com?subject=Beediyo%20Kall%20—%20Support"
            className="text-accent-400/70 underline underline-offset-2"
          >
            airdrophubgroup@gmail.com
          </a>
        </p>
      </motion.div>
    </div>
  );
}
