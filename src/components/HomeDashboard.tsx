'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import GlassCard from './GlassCard';
import { useCountdown, useDailyUsage, FREE_DAILY_SECONDS } from '@/lib/hooks';
import type { Subscription, TierNumber } from '@/lib/types';
import { TIERS } from '@/lib/types';
import { Video, Zap, Crown, Sparkles, ChevronRight, Play, Pause } from 'lucide-react';
import BklTokenBalance from './BklTokenBalance';
import UserAvatar from './UserAvatar';

// =============================================================
// Types
// =============================================================
interface HomeDashboardProps {
  subscription: Subscription | null;
  username: string;
  userId: string;
  gender?: string | null;
  avatarUrl?: string | null;
  onStartCall: () => void;
  onGoToPlans: () => void;
}

// =============================================================
// Floating particles background
// =============================================================
function HeroParticles() {
  const particles = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: 1 + Math.random() * 4,
    duration: 4 + Math.random() * 6,
    delay: Math.random() * 4,
    opacity: 0.1 + Math.random() * 0.2,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            background: `radial-gradient(circle, rgba(108,71,255,${p.opacity}) 0%, transparent 70%)`,
          }}
          animate={{
            y: [-30, 30, -30],
            x: [-15, 15, -15],
            opacity: [p.opacity * 0.5, p.opacity, p.opacity * 0.5],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}

// =============================================================
// Demo simulation — animated characters with lip-sync effect
// =============================================================
function DemoSimulation() {
  const [demoStep, setDemoStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  const DEMO_STEPS = [
    { text: 'She opens Beediyo Kall...', duration: 2500 },
    { text: 'Selects India, Age 22, Female', duration: 3000 },
    { text: 'Filter: Male, Age 22-25', duration: 2500 },
    { text: 'Finding match...', duration: 2000 },
    { text: 'Connected! 💕', duration: 3000 },
    { text: 'Having a great conversation...', duration: 3000 },
  ];

  useEffect(() => {
    if (!isPlaying) return;
    const timer = setTimeout(() => {
      setDemoStep((prev) => (prev + 1) % DEMO_STEPS.length);
    }, DEMO_STEPS[demoStep].duration);
    return () => clearTimeout(timer);
  }, [demoStep, isPlaying]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, type: 'spring', stiffness: 150 }}
      className="relative mx-4 rounded-2xl overflow-hidden border border-white/[0.08]"
    >
      {/* Background gradient simulating video */}
      <div className="relative h-[280px] bg-gradient-to-br from-midnight-800 via-midnight-900 to-midnight-950">
        {/* Animated mesh gradient */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-accent-600/8 via-transparent to-indigo-600/5 animate-pulse-slow" />
          <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-accent-500/5 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-1/4 right-1/4 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl animate-float" style={{ animationDelay: '1.5s' }} />
        </div>

        {/* Demo characters */}
        <div className="absolute inset-0 flex items-center justify-center gap-6 px-6">
          {/* Girl character */}
          <motion.div
            className="relative"
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          >
            <div className="relative">
              {/* Avatar */}
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-pink-400/30 to-rose-500/20 border-2 border-pink-400/30 flex items-center justify-center shadow-lg shadow-pink-500/10">
                <span className="text-3xl">👩</span>
              </div>
              {/* Golden badge */}
              <div className="absolute -bottom-1 -right-1 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-gradient-to-r from-amber-400/90 to-orange-400/90 border border-amber-300/50 shadow-sm shadow-amber-400/20">
                <span className="text-[8px]">👑</span>
                <span className="text-[7px] font-bold text-amber-900">GOLD</span>
              </div>
              {/* Online dot */}
              <div className="absolute top-0 right-0 w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-midnight-900 shadow-sm shadow-green-500/30" />
            </div>
            {/* Name */}
            <p className="text-center text-[10px] text-white/50 mt-1.5 font-medium">Priya</p>
          </motion.div>

          {/* Connection line */}
          <motion.div
            className="flex items-center"
            animate={{ opacity: demoStep >= 3 ? [0.3, 1, 0.3] : 0.2 }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            {demoStep >= 3 ? (
              <motion.div
                className="flex items-center gap-1"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200 }}
              >
                <div className="w-8 h-0.5 bg-gradient-to-r from-pink-400 to-accent-400 rounded-full" />
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                >
                  <span className="text-sm">💕</span>
                </motion.div>
                <div className="w-8 h-0.5 bg-gradient-to-r from-accent-400 to-blue-400 rounded-full" />
              </motion.div>
            ) : (
              <div className="flex flex-col items-center gap-1">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                >
                  <Sparkles className="w-4 h-4 text-accent-400/50" />
                </motion.div>
                <div className="w-16 h-px bg-white/10" />
              </div>
            )}
          </motion.div>

          {/* Boy character */}
          <motion.div
            className="relative"
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
          >
            <div className="relative">
              {/* Avatar */}
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-400/30 to-indigo-500/20 border-2 border-blue-400/30 flex items-center justify-center shadow-lg shadow-blue-500/10">
                <span className="text-3xl">👨</span>
              </div>
              {/* Silver badge */}
              <div className="absolute -bottom-1 -right-1 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-gradient-to-r from-slate-300/90 to-gray-400/90 border border-slate-200/50 shadow-sm shadow-slate-300/20">
                <span className="text-[8px]">🥈</span>
                <span className="text-[7px] font-bold text-slate-700">SILVER</span>
              </div>
              {/* Online dot */}
              <div className="absolute top-0 right-0 w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-midnight-900 shadow-sm shadow-green-500/30" />
            </div>
            {/* Name */}
            <p className="text-center text-[10px] text-white/50 mt-1.5 font-medium">Arjun</p>
          </motion.div>
        </div>

        {/* Lip-sync indicator for girl (active during conversation) */}
        {demoStep >= 5 && (
          <motion.div
            className="absolute bottom-16 left-8"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-pink-500/15 border border-pink-500/20">
              {/* Animated sound bars */}
              {[0, 1, 2, 3].map((i) => (
                <motion.div
                  key={i}
                  className="w-0.5 bg-pink-400/60 rounded-full"
                  animate={{ height: [4, 10 + Math.random() * 6, 4] }}
                  transition={{
                    duration: 0.4 + Math.random() * 0.3,
                    repeat: Infinity,
                    delay: i * 0.1,
                  }}
                />
              ))}
              <span className="text-[8px] text-pink-400/60 ml-1">lip-sync</span>
            </div>
          </motion.div>
        )}

        {/* Lip-sync indicator for boy */}
        {demoStep >= 5 && (
          <motion.div
            className="absolute bottom-16 right-8"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-blue-500/15 border border-blue-500/20">
              {[0, 1, 2, 3].map((i) => (
                <motion.div
                  key={i}
                  className="w-0.5 bg-blue-400/60 rounded-full"
                  animate={{ height: [4, 10 + Math.random() * 6, 4] }}
                  transition={{
                    duration: 0.5 + Math.random() * 0.3,
                    repeat: Infinity,
                    delay: i * 0.15,
                  }}
                />
              ))}
              <span className="text-[8px] text-blue-400/60 ml-1">lip-sync</span>
            </div>
          </motion.div>
        )}

        {/* Demo step text */}
        <motion.div
          key={demoStep}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="absolute bottom-4 left-0 right-0 text-center"
        >
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-[11px] text-white/70 font-medium">{DEMO_STEPS[demoStep].text}</span>
          </div>
        </motion.div>

        {/* Play/Pause button */}
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="absolute top-3 right-3 w-7 h-7 rounded-full bg-black/30 backdrop-blur-md border border-white/10 flex items-center justify-center hover:bg-black/50 transition-colors"
        >
          {isPlaying ? (
            <Pause className="w-3 h-3 text-white/60" />
          ) : (
            <Play className="w-3 h-3 text-white/60 ml-0.5" />
          )}
        </button>

        {/* Demo badge */}
        <div className="absolute top-3 left-3 flex items-center gap-1 px-2 py-1 rounded-full bg-black/30 backdrop-blur-md border border-white/10">
          <span className="text-[8px]">🎬</span>
          <span className="text-[8px] text-white/50 font-medium">Demo</span>
        </div>
      </div>
    </motion.div>
  );
}

// =============================================================
// Premium Match Button
// =============================================================
function MatchButton({ onClick, hasPass, hasTimeLeft }: { onClick: () => void; hasPass: boolean; hasTimeLeft: boolean }) {
  const isFree = !hasPass;
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, type: 'spring', stiffness: 150 }}
      className="px-4"
    >
      <motion.button
        onClick={onClick}
        disabled={!hasTimeLeft}
        whileHover={hasTimeLeft ? { scale: 1.02, y: -2 } : {}}
        whileTap={hasTimeLeft ? { scale: 0.98 } : {}}
        className={`relative w-full py-4.5 rounded-2xl font-bold text-lg transition-all overflow-hidden ${
          hasPass
            ? 'bg-gradient-to-r from-accent-600 via-accent-500 to-indigo-600 text-white shadow-xl shadow-accent-900/30'
            : isFree && hasTimeLeft
            ? 'bg-gradient-to-r from-midnight-600 via-midnight-700 to-midnight-800 text-white/80 border border-white/[0.1] shadow-lg shadow-black/30'
            : 'bg-white/[0.06] text-white/30 border border-white/[0.08] cursor-not-allowed'
        }`}
      >
        {/* Animated gradient shimmer for active button */}
        {hasPass && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.08] to-transparent animate-shimmer" />
        )}

        <div className="relative flex items-center justify-center gap-2.5">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            hasPass
              ? 'bg-white/20'
              : 'bg-white/[0.06]'
          }`}>
            <Video className="w-5 h-5" />
          </div>
          <div className="text-left">
            <p className="text-sm font-bold leading-tight">
              {hasPass ? 'Find Random Match' : isFree ? 'Try Free (1 min/day)' : 'Get a Pass First'}
            </p>
            <p className="text-[10px] opacity-60 font-medium">
              {hasPass ? 'Connect with someone worldwide' : isFree ? 'Upgrade for unlimited calls' : 'Purchase a pass to start chatting'}
            </p>
          </div>
          {hasTimeLeft && (
            <motion.div
              animate={{ x: [0, 4, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <ChevronRight className="w-5 h-5 ml-auto" />
            </motion.div>
          )}
        </div>

        {/* Glow ring for active */}
        {hasPass && (
          <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/10" />
        )}
      </motion.button>
    </motion.div>
  );
}

// =============================================================
// Main HomeDashboard
// =============================================================
export default function HomeDashboard({
  subscription,
  username,
  userId,
  gender,
  avatarUrl,
  onStartCall,
  onGoToPlans,
}: HomeDashboardProps) {
  const countdown = useCountdown(subscription?.expires_at ?? null);
  const tier = subscription?.tier as TierNumber | undefined;
  const hasActiveSub = !!subscription;
  const { secondsUsed, remaining: dailyRemaining } = useDailyUsage(userId, hasActiveSub);

  return (
    <div className="flex flex-col h-full pb-24 overflow-y-auto relative">
      <HeroParticles />

      {/* ===== Hero header ===== */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative px-4 pt-6 pb-4 text-center space-y-1"
      >
        <div className="flex items-center justify-center gap-2">
          <motion.div
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Sparkles className="w-5 h-5 text-accent-400" />
          </motion.div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Beediyo Kall
          </h1>
          <motion.div
            animate={{ rotate: [0, -5, 5, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          >
            <Sparkles className="w-5 h-5 text-accent-400" />
          </motion.div>
        </div>
        <p className="text-[11px] text-white/30 tracking-widest uppercase font-medium">
          Random Video Chat
        </p>
      </motion.div>

      {/* ===== User greeting + badge ===== */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.05 }}
        className="relative px-4 pb-3 text-center"
      >
        <div className="flex justify-center">
          <UserAvatar gender={gender} src={avatarUrl} size="lg" online />
        </div>
        <p className="text-white/40 text-[10px] uppercase tracking-widest mt-2">Welcome back,</p>
        <div className="flex items-center justify-center gap-2 mt-0.5">
          <p className="text-white text-lg font-bold">{username}</p>
        </div>
      </motion.div>

      {/* ===== Active Pass Card ===== */}
      {tier && countdown ? (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative mx-4 mb-3"
        >
          <GlassCard variant="heavy" className="p-4 space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-accent-600/25 flex items-center justify-center border border-accent-500/15">
                <Crown className="w-4.5 h-4.5 text-accent-400" />
              </div>
              <div className="flex-1">
                <p className="text-white font-bold text-sm">{TIERS[tier].name}</p>
                <p className="text-white/35 text-[10px]">Active Pass</p>
              </div>
              <div className="text-right">
                <div className="flex items-baseline gap-0.5">
                  <span className="text-lg font-extrabold text-white tabular-nums">
                    {String(countdown.days).padStart(2, '0')}
                  </span>
                  <span className="text-white/30 text-[9px]">d</span>
                  <span className="text-white/20 text-[10px]">:</span>
                  <span className="text-lg font-extrabold text-white tabular-nums">
                    {String(countdown.hours).padStart(2, '0')}
                  </span>
                  <span className="text-white/30 text-[9px]">h</span>
                </div>
              </div>
            </div>

            {/* Filter capabilities */}
            <div className="flex flex-wrap gap-1">
              {(TIERS[tier].filters as readonly string[]).map((f) => (
                <span
                  key={f}
                  className="px-2 py-0.5 rounded-md bg-white/[0.05] text-[8px] text-white/40 uppercase tracking-wider font-medium"
                >
                  {f.replace(/_/g, ' ')}
                </span>
              ))}
              <span className="px-2 py-0.5 rounded-md bg-accent-500/10 text-[8px] text-accent-400 uppercase tracking-wider font-bold">
                +{TIERS[tier].bklReward} BKL
              </span>
            </div>
          </GlassCard>
        </motion.div>
      ) : (
        /* No pass CTA */
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mx-4 mb-3"
        >
          <GlassCard
            variant="medium"
            className="p-4 text-center space-y-2.5 cursor-pointer"
            hover
            onClick={onGoToPlans}
          >
            <Zap className="w-7 h-7 mx-auto text-accent-400" />
            <p className="text-white font-semibold text-sm">No Active Pass</p>
            <p className="text-white/35 text-[10px] leading-relaxed">
              Purchase a pass to start chatting with people worldwide
            </p>
            <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent-600 text-white text-xs font-bold shadow-lg shadow-accent-900/20">
              <Sparkles className="w-3.5 h-3.5" /> View Plans
            </div>
          </GlassCard>
        </motion.div>
      )}

      {/* ===== BKL Token Balance ===== */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="mx-4 mb-3"
      >
        <BklTokenBalance userId={userId} showDetailed />
      </motion.div>

      {/* ===== Demo Video / Simulation ===== */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-4"
      >
        <DemoSimulation />
      </motion.div>

      {/* ===== Free Tier Timer (no pass) ===== */}
      {!hasActiveSub && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="mx-4 mb-3"
        >
          <GlassCard variant="medium" className="p-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center">
                  <span className="text-sm">⏱️</span>
                </div>
                <div>
                  <p className="text-white/70 text-xs font-semibold">Free Time Today</p>
                  <p className="text-white/35 text-[10px]">1 min/day without a pass</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-white text-lg font-extrabold tabular-nums">{dailyRemaining}s</p>
                <p className="text-white/25 text-[9px]">remaining</p>
              </div>
            </div>
            {/* Progress bar */}
            <div className="mt-2.5 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-accent-500 to-accent-400"
                initial={{ width: 0 }}
                animate={{ width: `${((FREE_DAILY_SECONDS - dailyRemaining) / FREE_DAILY_SECONDS) * 100}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
            <p className="text-white/20 text-[9px] mt-1.5 text-center">
              Upgrade to a pass for unlimited calls →
            </p>
          </GlassCard>
        </motion.div>
      )}

      {/* ===== Match Button ===== */}
      <div className="mt-auto pb-4">
        <MatchButton onClick={onStartCall} hasPass={!!tier} hasTimeLeft={!hasActiveSub ? dailyRemaining > 0 : true} />
      </div>
    </div>
  );
}
