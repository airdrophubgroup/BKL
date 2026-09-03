'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWorldcoin, isDevMode } from '@/lib/worldcoin-context';
import { Coins, TrendingUp, Sparkles } from 'lucide-react';

interface BklTokenBalanceProps {
  userId: string;
  showDetailed?: boolean;
}

export default function BklTokenBalance({ userId, showDetailed = false }: BklTokenBalanceProps) {
  const { user } = useWorldcoin();
  const [balance, setBalance] = useState(0);
  const [recentEarned, setRecentEarned] = useState(0);
  const [showRewardPopup, setShowRewardPopup] = useState(false);

  const fetchBalance = useCallback(async () => {
    try {
      // Production: session cookie. Dev mode: ?wallet= fallback.
      const suffix =
        isDevMode() && user?.wallet ? `?wallet=${encodeURIComponent(user.wallet)}` : '';
      const res = await fetch(`/api/bkl-balance${suffix}`);
      if (res.ok) {
        const data = await res.json();
        setBalance(data.balance ?? 0);
      }
    } catch {
      /* ignore */
    }
  }, [user?.wallet]);

  useEffect(() => {
    if (!userId) return;
    fetchBalance();
  }, [userId, fetchBalance]);

  // Call this externally when a new token is earned
  const showReward = (amount: number) => {
    setBalance((prev) => prev + amount);
    setRecentEarned(amount);
    setShowRewardPopup(true);
    setTimeout(() => setShowRewardPopup(false), 3000);
  };

  return (
    <div className="relative">
      {/* Main Balance Card */}
      <motion.div
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a1040] via-[#15102a] to-[#0d0a1f] border border-white/[0.08] p-4"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ scale: 1.01 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      >
        {/* Ambient glow */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-accent-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-indigo-500/8 rounded-full blur-2xl" />

        <div className="relative flex items-center gap-3">
          {/* Token icon */}
          <motion.div
            className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent-500/20 to-indigo-600/20 border border-accent-500/20 flex items-center justify-center"
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          >
            <span className="text-xl font-black bg-gradient-to-br from-accent-300 to-indigo-400 bg-clip-text text-transparent">
              B
            </span>
          </motion.div>

          <div className="flex-1">
            <p className="text-white/40 text-[10px] uppercase tracking-widest font-medium">
              BKL Reward Points
            </p>
            <div className="flex items-baseline gap-1.5">
              <motion.span
                key={balance}
                initial={{ y: -10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="text-2xl font-extrabold text-white"
              >
                {balance.toLocaleString()}
              </motion.span>
              <span className="text-xs text-white/30 font-medium">BKL</span>
            </div>
          </div>

          {/* Trending indicator */}
          {balance > 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/15"
            >
              <TrendingUp className="w-3 h-3 text-green-400" />
              <span className="text-[10px] text-green-400 font-semibold">Earned</span>
            </motion.div>
          )}
        </div>

        {/* Detailed view */}
        {showDetailed && balance > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            className="mt-3 pt-3 border-t border-white/[0.06]"
          >
            <p className="text-white/30 text-[10px] uppercase tracking-wider mb-2">
              Yours forever — never expire
            </p>
            <div className="flex items-center gap-1.5 text-[11px] text-white/50">
              <Coins className="w-3.5 h-3.5 text-accent-400" />
              <span>
                Earned with your passes — never expire
              </span>
            </div>
            <p className="mt-1.5 text-white/20 text-[9px]">
              In-app reward points only · no cash value
            </p>
          </motion.div>
        )}
      </motion.div>

      {/* Reward popup (coins flying in) */}
      <AnimatePresence>
        {showRewardPopup && (
          <motion.div
            className="absolute -top-2 right-4 z-50"
            initial={{ y: 0, opacity: 0, scale: 0.5 }}
            animate={{ y: -50, opacity: 1, scale: 1 }}
            exit={{ y: -80, opacity: 0, scale: 0.8 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          >
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-accent-600 to-indigo-600 shadow-lg shadow-accent-900/40">
              <Sparkles className="w-3.5 h-3.5 text-white" />
              <span className="text-white text-xs font-bold">+{recentEarned} BKL</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Export for parent components to trigger reward animation
export type BklTokenBalanceRef = {
  showReward: (amount: number) => void;
  fetchBalance: () => Promise<void>;
};
