'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import GlassCard from './GlassCard';
import { useWorldcoin, isDevMode } from '@/lib/worldcoin-context';
import { TIERS, type TierNumber } from '@/lib/types';
import {
  Crown,
  Users,
  Globe,
  Check,
  Zap,
  Shield,
  ArrowRight,
  Loader2,
  CheckCircle2,
} from 'lucide-react';

const TIER_ICONS = {
  1: Zap,
  2: Users,
  3: Globe,
};

const TIER_BADGES = {
  1: 'Most Popular',
  2: 'Best Value',
  3: 'Full Access',
};

interface SubscriptionPlansProps {
  profileId: string;
  activeTier: TierNumber | 0;
  onPurchased: () => void;
}

export default function SubscriptionPlans({
  profileId,
  activeTier,
  onPurchased,
}: SubscriptionPlansProps) {
  const { user, sendPayment } = useWorldcoin();
  const [purchasingTier, setPurchasingTier] = useState<TierNumber | null>(null);
  const [purchaseStep, setPurchaseStep] = useState<'idle' | 'sending' | 'confirming' | 'done'>(
    'idle'
  );

  // Recipient address for WLD payments (your app treasury)
  const TREASURY_ADDRESS = process.env.NEXT_PUBLIC_TREASURY_ADDRESS || '0x8c5b20653abcb87f6b3a7cb469d8623e94bfb6a1';

  const handlePurchase = async (tier: TierNumber) => {
    if (!user || activeTier >= tier) return;
    setPurchasingTier(tier);
    setPurchaseStep('sending');

    try {
      // 1. Initiate WLD payment inside World App (MiniKit.pay)
      const { transactionId } = await sendPayment(
        TREASURY_ADDRESS,
        TIERS[tier].price.toString(),
        `Beediyo Kall — ${TIERS[tier].name} (${TIERS[tier].price} WLD)`
      );
      setPurchaseStep('confirming');

      // 2. Server verifies the payment against Worldcoin's API, then
      //    creates the subscription + awards BKL (never trusts client)
      const res = await fetch('/api/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tier,
          txId: transactionId,
          ...(isDevMode() && user ? { wallet: user.wallet } : {}),
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Purchase could not be verified');
      }

      const data = await res.json();
      setPurchaseStep('done');
      setTimeout(() => {
        onPurchased();
        setPurchaseStep('idle');
        setPurchasingTier(null);
      }, 2000);
    } catch (err: any) {
      console.error('Purchase failed:', err);
      setPurchaseStep('idle');
      setPurchasingTier(null);
    }
  };

  return (
    <div className="flex flex-col h-full px-4 pb-24 pt-6 space-y-5 overflow-y-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-1"
      >
        <Crown className="w-8 h-8 mx-auto text-accent-400 mb-2" />
        <h1 className="text-2xl font-bold text-white tracking-tight">Passes</h1>
        <p className="text-sm text-white/40">Unlock video chat features with WLD</p>
      </motion.div>

      {/* Tier cards */}
      <div className="space-y-4">
        {(Object.keys(TIERS) as unknown as TierNumber[]).map((tierKey, i) => {
          const tier = TIERS[tierKey];
          const Icon = TIER_ICONS[tierKey];
          const isActive = activeTier >= tierKey;
          const isPurchasing = purchasingTier === tierKey;

          return (
            <motion.div
              key={tierKey}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.1 }}
            >
              <GlassCard
                variant={isActive ? 'heavy' : 'medium'}
                className={`p-5 space-y-4 relative overflow-hidden ${
                  isActive ? 'ring-1 ring-accent-500/50' : ''
                }`}
              >
                {/* Badge */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        isActive
                          ? 'bg-accent-600/30'
                          : 'bg-white/10'
                      }`}
                    >
                      <Icon
                        className={`w-6 h-6 ${
                          isActive ? 'text-accent-400' : 'text-white/60'
                        }`}
                      />
                    </div>
                    <div>
                      <p className="text-white font-bold">{tier.name}</p>
                      <p className="text-white/40 text-xs">
                        {TIERS[tierKey].durationDays} days
                      </p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-accent-600/20 text-accent-400 text-[10px] font-bold uppercase tracking-wider">
                    {TIER_BADGES[tierKey]}
                  </span>
                </div>

                {/* Price */}
                <div className="flex items-center justify-between">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold text-white">{tier.price}</span>
                    <span className="text-white/40 text-sm">WLD</span>
                  </div>
                  {/* BKL Reward badge */}
                  <motion.div
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-accent-600/15 to-indigo-600/15 border border-accent-500/15"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.3 + i * 0.1 }}
                  >
                    <span className="text-sm font-black bg-gradient-to-br from-accent-300 to-indigo-400 bg-clip-text text-transparent">B</span>
                    <span className="text-accent-400 text-xs font-bold">+{tier.bklReward} BKL</span>
                  </motion.div>
                </div>

                {/* Features */}
                <p className="text-white/50 text-sm leading-relaxed">{tier.description}</p>

                <ul className="space-y-2">
                  {(tier.filters as readonly string[]).map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-white/60">
                      <Check className="w-4 h-4 text-accent-400 flex-shrink-0" />
                      <span className="capitalize">{f.replace(/_/g, ' ')}</span>
                    </li>
                  ))}
                  {/* BKL Token reward */}
                  <li className="flex items-center gap-2 text-sm text-white/60">
                    <Check className="w-4 h-4 text-accent-400 flex-shrink-0" />
                    <span>Earn <span className="text-accent-400 font-bold">{tier.bklReward} BKL</span> tokens (permanent)</span>
                  </li>
                </ul>

                {/* CTA */}
                <AnimatePresence mode="wait">
                  {isActive ? (
                    <motion.div
                      key="active"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center gap-2 py-3 rounded-xl bg-green-500/15 text-green-400 text-sm font-medium justify-center"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Active
                    </motion.div>
                  ) : isPurchasing ? (
                    <motion.div
                      key="purchasing"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center gap-2 py-3 rounded-xl bg-accent-600/30 text-accent-400 text-sm font-medium justify-center"
                    >
                      {purchaseStep === 'sending' && (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" /> Confirm in World App...
                        </>
                      )}
                      {purchaseStep === 'confirming' && (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" /> Verifying payment...
                        </>
                      )}
                      {purchaseStep === 'done' && (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-green-400" />{' '}
                          <span className="text-green-400">Activated!</span>
                        </>
                      )}
                    </motion.div>
                  ) : (
                    <motion.button
                      key="buy"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => handlePurchase(tierKey)}
                      className="w-full py-3 rounded-xl bg-accent-600 text-white text-sm font-bold hover:bg-accent-500 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                      Pay {tier.price} WLD <ArrowRight className="w-4 h-4" />
                    </motion.button>
                  )}
                </AnimatePresence>
              </GlassCard>
            </motion.div>
          );
        })}
      </div>

      {/* Trust signals */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="flex items-center justify-center gap-2 text-white/30 text-xs pb-4"
      >
        <Shield className="w-3 h-3" />
        <span>Payments verified on-chain via World App</span>
      </motion.div>
    </div>
  );
}
