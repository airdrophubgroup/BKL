'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { t } from '@/lib/i18n';
import { Trophy, Crown, Sparkles, ChevronUp, User as UserIcon, Flame, Star, Zap } from 'lucide-react';

// =============================================================
// Types
// =============================================================
interface LeaderboardEntry {
  rank: number;
  username: string;
  avatar_url: string | null;
  country: string;
  balance: number;
  isMe?: boolean;
}

interface LeaderboardProps {
  currentUserId: string;
}

// =============================================================
// Rank configs — premium gradients, glows, and animations
// =============================================================
const RANK_CONFIG: Record<number, {
  medal: string;
  gradient: string;
  border: string;
  glow: string;
  glowColor: string;
  text: string;
  bg: string;
  ring: string;
  barGradient: string;
}> = {
  1: {
    medal: '👑',
    gradient: 'from-amber-400 via-yellow-400 to-orange-400',
    border: 'border-amber-400/50',
    glow: '0 0 40px rgba(251,191,36,0.35)',
    glowColor: 'rgba(251,191,36,0.2)',
    text: 'text-amber-400',
    bg: 'bg-gradient-to-br from-amber-500/25 via-yellow-500/10 to-orange-500/20',
    ring: 'ring-amber-400/30',
    barGradient: 'from-amber-400 via-yellow-400 to-orange-400',
  },
  2: {
    medal: '🥈',
    gradient: 'from-slate-200 via-gray-200 to-slate-300',
    border: 'border-slate-300/40',
    glow: '0 0 30px rgba(148,163,184,0.25)',
    glowColor: 'rgba(148,163,184,0.15)',
    text: 'text-slate-300',
    bg: 'bg-gradient-to-br from-slate-400/20 via-gray-500/10 to-slate-500/15',
    ring: 'ring-slate-300/25',
    barGradient: 'from-slate-300 via-gray-200 to-slate-400',
  },
  3: {
    medal: '🥉',
    gradient: 'from-orange-300 via-amber-400 to-orange-500',
    border: 'border-orange-400/35',
    glow: '0 0 30px rgba(251,146,60,0.25)',
    glowColor: 'rgba(251,146,60,0.15)',
    text: 'text-orange-400',
    bg: 'bg-gradient-to-br from-orange-500/20 via-amber-600/10 to-orange-600/15',
    ring: 'ring-orange-400/25',
    barGradient: 'from-orange-300 via-amber-400 to-orange-500',
  },
};

// =============================================================
// Floating particles background
// =============================================================
function FloatingParticles() {
  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: 1 + Math.random() * 3,
    duration: 3 + Math.random() * 4,
    delay: Math.random() * 3,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-white/[0.04]"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
          }}
          animate={{
            y: [-20, 20, -20],
            x: [-10, 10, -10],
            opacity: [0.2, 0.5, 0.2],
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
// Main Leaderboard Component
// =============================================================
export default function Leaderboard({ currentUserId }: LeaderboardProps) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [userRank, setUserRank] = useState<{ rank: number; balance: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Parallax scroll effect for header
  const { scrollY } = useScroll({ container: scrollRef });
  const headerOpacity = useTransform(scrollY, [0, 100], [1, 0.7]);
  const headerScale = useTransform(scrollY, [0, 100], [1, 0.95]);

  const fetchLeaderboard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/leaderboard?limit=50');
      if (!res.ok) {
        setEntries([]);
        setLoading(false);
        return;
      }
      const data = await res.json();

      // Mark the signed-in user's row as "you"
      const ranked = (data.leaderboard || []).map(
        (e: LeaderboardEntry, i: number) => ({
          ...e,
          rank: e.rank ?? i + 1,
          isMe: e.username === data.userRank?.username,
        })
      );
      setEntries(ranked);

      const me = data.userRank;
      setUserRank(me ? { rank: me.rank, balance: me.balance } : null);
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeaderboard();
  }, [currentUserId, fetchLeaderboard]);

  // ============================================================
  // Loading State
  // ============================================================
  if (loading) {
    return (
      <div className="flex flex-col h-full pb-24 pt-6 items-center justify-center">
        <div className="relative">
          <div className="w-12 h-12 border-4 border-accent-500/15 border-t-accent-500 rounded-full animate-spin" />
          <div className="absolute inset-0 blur-xl bg-accent-500/20 rounded-full animate-pulse" />
        </div>
        <p className="text-white/25 text-xs mt-4 tracking-wider uppercase">{t('leader.loading')}</p>
      </div>
    );
  }

  // ============================================================
  // Empty State
  // ============================================================
  if (entries.length === 0) {
    return (
      <div className="flex flex-col h-full pb-24 pt-6 items-center justify-center px-6">
        <FloatingParticles />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative text-center space-y-5"
        >
          <div className="relative inline-block">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-500/10 to-orange-500/10 flex items-center justify-center border border-amber-500/15">
              <Trophy className="w-10 h-10 text-amber-400/40" />
            </div>
            <div className="absolute inset-0 blur-2xl bg-amber-400/10 rounded-full" />
          </div>
          <div className="space-y-2">
            <p className="text-white/50 text-sm font-medium">{t('leader.empty')}</p>
            <p className="text-white/25 text-xs leading-relaxed max-w-[240px] mx-auto">
              {t('leader.empty_desc')}
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  // ============================================================
  // Main View
  // ============================================================
  return (
    <div
      ref={scrollRef}
      className="flex flex-col h-full pb-24 pt-6 overflow-y-auto relative"
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      <FloatingParticles />

      {/* ===== Header with parallax ===== */}
      <motion.div
        style={{ opacity: headerOpacity, scale: headerScale }}
        className="text-center space-y-1 px-4 mb-5 relative z-10"
      >
        {/* Trophy glow */}
        <motion.div
          className="relative inline-block"
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        >
          <div className="w-14 h-14 mx-auto rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/15 flex items-center justify-center border border-amber-400/20">
            <Trophy className="w-7 h-7 text-amber-400" />
          </div>
          <div className="absolute inset-0 blur-2xl bg-amber-400/15 rounded-full" />
        </motion.div>

        <h1 className="text-[22px] font-bold text-white tracking-tight">
          {t('leader.title')}
        </h1>
        <p className="text-[11px] text-white/35 tracking-wide uppercase">
          {t('leader.subtitle')}
        </p>
      </motion.div>

      {/* ===== Your Rank Card (if ranked) ===== */}
      {userRank && (
        <motion.div
          initial={{ opacity: 0, y: 15, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.08, type: 'spring', stiffness: 200, damping: 22 }}
          className="mx-4 mb-5 relative overflow-hidden rounded-2xl border border-accent-500/20"
        >
          {/* Shimmer sweep */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.04] to-transparent animate-shimmer" />

          {/* Corner glows */}
          <div className="absolute -top-12 -right-12 w-36 h-36 bg-accent-500/12 rounded-full blur-3xl" />
          <div className="absolute -bottom-10 -left-10 w-28 h-28 bg-indigo-500/8 rounded-full blur-2xl" />

          <div className="relative p-4 flex items-center gap-4">
            {/* Rank circle */}
            <div className="relative flex-shrink-0">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-accent-900/30">
                <span className="text-base font-black text-white">#{userRank.rank}</span>
              </div>
              {/* Status dot */}
              <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-green-500 border-2 border-midnight-900 flex items-center justify-center shadow-sm shadow-green-500/30">
                <ChevronUp className="w-2.5 h-2.5 text-white" strokeWidth={3} />
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-white/40 text-[9px] uppercase tracking-[0.15em] font-medium">
                {t('leader.your_position')}
              </p>
              <p className="text-white font-bold text-lg leading-tight mt-0.5">
                {t('leader.your_rank', { rank: userRank.rank })}
              </p>
            </div>

            {/* Balance */}
            <div className="text-right flex-shrink-0">
              <p className="text-white/30 text-[9px] uppercase tracking-[0.15em]">
                {t('leader.balance')}
              </p>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-2xl font-extrabold text-white leading-none">
                  {userRank.balance.toLocaleString()}
                </span>
                <span className="text-accent-400 text-[10px] font-bold">BKL</span>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* ===== Podium (Top 3) — cinematic reveal ===== */}
      {entries.length >= 3 && (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12, type: 'spring', stiffness: 120, damping: 20 }}
          className="mx-4 mb-6"
        >
          {/* Ambient glow behind entire podium */}
          <div className="absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-amber-500/[0.04] via-orange-500/[0.02] to-transparent pointer-events-none" />

          <div className="relative grid grid-cols-3 gap-2 items-end">
            {/* 2nd */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 140 }}
              className="relative z-10"
            >
              <PodiumCard entry={entries[1]} />
            </motion.div>

            {/* 1st — elevated center */}
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.15, type: 'spring', stiffness: 120, damping: 15 }}
              className="relative z-20 -mt-4"
            >
              {/* Floating crown */}
              <motion.div
                className="absolute -top-5 left-1/2 -translate-x-1/2 z-30"
                animate={{ y: [0, -5, 0], rotate: [0, 3, -3, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              >
                <div className="relative">
                  <Crown className="w-8 h-8 text-amber-400 drop-shadow-[0_0_12px_rgba(251,191,36,0.5)]" />
                  <div className="absolute inset-0 blur-lg bg-amber-400/30 rounded-full" />
                </div>
              </motion.div>
              <PodiumCard entry={entries[0]} isFirst />
            </motion.div>

            {/* 3rd */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, type: 'spring', stiffness: 140 }}
              className="relative z-10"
            >
              <PodiumCard entry={entries[2]} />
            </motion.div>
          </div>

          {/* Podium platform bar */}
          <div className="flex gap-2 mt-0.5">
            <div className="flex-1 h-1 rounded-full bg-gradient-to-r from-slate-300/30 to-gray-400/30" />
            <div className="flex-1 h-1.5 rounded-full bg-gradient-to-r from-amber-400/50 via-yellow-400/50 to-orange-400/50 shadow-sm shadow-amber-400/20" />
            <div className="flex-1 h-1 rounded-full bg-gradient-to-r from-orange-400/30 to-amber-500/30" />
          </div>
        </motion.div>
      )}

      {/* ===== Section Divider ===== */}
      {entries.length > 3 && (
        <div className="mx-5 mb-3 flex items-center gap-3">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/[0.07] to-transparent" />
          <div className="flex items-center gap-1.5">
            <Star className="w-2.5 h-2.5 text-white/15" />
            <span className="text-white/[0.18] text-[9px] uppercase tracking-[0.2em] font-medium">
              {t('leader.more')}
            </span>
            <Star className="w-2.5 h-2.5 text-white/15" />
          </div>
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/[0.07] to-transparent" />
        </div>
      )}

      {/* ===== Rankings List ===== */}
      <div className="px-4 space-y-1.5 relative z-10">
        {entries.slice(3).map((entry, i) => (
          <motion.div
            key={entry.username + entry.rank}
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{
              delay: 0.25 + i * 0.035,
              type: 'spring',
              stiffness: 180,
              damping: 22,
            }}
          >
            <LeaderboardRow entry={entry} index={i} />
          </motion.div>
        ))}
      </div>

      {/* Bottom padding */}
      <div className="h-4" />
    </div>
  );
}

// =============================================================
// PodiumCard — cinematic 3D-like card for Top 3
// =============================================================
function PodiumCard({ entry, isFirst = false }: { entry: LeaderboardEntry; isFirst?: boolean }) {
  const config = RANK_CONFIG[entry.rank] || RANK_CONFIG[3];
  const heightClass = isFirst ? 'h-[150px]' : entry.rank === 2 ? 'h-[120px]' : 'h-[110px]';

  return (
    <motion.div
      className={`relative overflow-hidden rounded-2xl border ${config.border} ${heightClass} ${config.bg} backdrop-blur-xl`}
      whileHover={{ scale: 1.04, y: -4 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      style={{ boxShadow: config.glow }}
    >
      {/* Shimmer sweep */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.05] to-transparent animate-shimmer" />

      {/* Top highlight line */}
      <div className={`absolute top-0 left-0 right-0 h-px bg-gradient-to-r ${config.gradient} opacity-40`} />

      <div className="relative h-full flex flex-col items-center justify-center p-2.5 space-y-1.5">
        {/* Medal */}
        <motion.span
          className={`${isFirst ? 'text-2xl' : 'text-xl'} drop-shadow-lg select-none`}
          animate={isFirst
            ? { scale: [1, 1.15, 1], rotate: [0, 5, -5, 0] }
            : { scale: [1, 1.05, 1] }
          }
          transition={{ duration: isFirst ? 2.5 : 3, repeat: Infinity, ease: 'easeInOut' }}
        >
          {config.medal}
        </motion.span>

        {/* Avatar ring */}
        <div className="relative">
          <div
            className={`${isFirst ? 'w-14 h-14' : 'w-11 h-11'} rounded-full flex items-center justify-center ring-2 ${config.ring} ${
              isFirst
                ? 'bg-gradient-to-br from-amber-400/30 to-orange-500/20'
                : 'bg-white/10'
            }`}
          >
            {entry.avatar_url ? (
              <img
                src={entry.avatar_url}
                alt=""
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <span className={`${isFirst ? 'text-lg' : 'text-base'} font-bold ${config.text}`}>
                {entry.username.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          {/* Verified dot for 1st */}
          {isFirst && (
            <motion.div
              className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center border-2 border-midnight-900"
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Sparkles className="w-2.5 h-2.5 text-white" />
            </motion.div>
          )}
        </div>

        {/* Username */}
        <p className={`text-white font-semibold text-center truncate w-full px-1 leading-tight ${
          isFirst ? 'text-[13px]' : 'text-[11px]'
        }`}>
          {entry.username}
        </p>

        {/* Balance */}
        <div className="flex items-baseline gap-0.5">
          <span className={`font-extrabold ${isFirst ? 'text-xl' : 'text-base'} ${config.text} leading-none`}>
            {entry.balance.toLocaleString()}
          </span>
          <span className="text-white/25 text-[8px] font-semibold uppercase tracking-wider">BKL</span>
        </div>
      </div>

      {/* Bottom glow bar */}
      <div className={`absolute bottom-0 left-0 right-0 h-[3px] bg-gradient-to-r ${config.barGradient} opacity-50`} />
    </motion.div>
  );
}

// =============================================================
// LeaderboardRow — premium row with stagger, hover, and "me" highlight
// =============================================================
function LeaderboardRow({ entry, index }: { entry: LeaderboardEntry; index: number }) {
  // Determine tier icon for top 10
  const tierIcon = entry.rank <= 10 ? <Zap className="w-3 h-3 text-amber-400/60" /> : null;

  return (
    <motion.div
      className={`relative flex items-center gap-3 px-3.5 py-3 rounded-xl border transition-all duration-200 ${
        entry.isMe
          ? 'bg-accent-600/[0.08] border-accent-500/20 shadow-lg shadow-accent-900/10'
          : 'bg-white/[0.025] border-white/[0.05] hover:bg-white/[0.055] hover:border-white/[0.08]'
      }`}
      whileHover={{ x: 3, scale: 1.005 }}
      whileTap={{ scale: 0.99 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
    >
      {/* Left accent bar for "me" */}
      {entry.isMe && (
        <div className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-gradient-to-b from-accent-400 to-indigo-500" />
      )}

      {/* Rank number */}
      <div className="w-7 text-center flex-shrink-0">
        <span className={`text-xs font-bold tabular-nums ${
          entry.isMe ? 'text-accent-400' : 'text-white/25'
        }`}>
          {entry.rank}
        </span>
      </div>

      {/* Avatar */}
      <div
        className={`relative w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${
          entry.isMe
            ? 'bg-accent-600/25 ring-1 ring-accent-500/25'
            : 'bg-white/[0.06] ring-1 ring-white/[0.06]'
        }`}
      >
        {entry.avatar_url ? (
          <img src={entry.avatar_url} alt="" className="w-full h-full rounded-xl object-cover" />
        ) : (
          <UserIcon className={`w-3.5 h-3.5 ${entry.isMe ? 'text-accent-400' : 'text-white/25'}`} />
        )}
      </div>

      {/* Username + country */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className={`text-[13px] font-semibold truncate ${
            entry.isMe ? 'text-white' : 'text-white/75'
          }`}>
            {entry.username}
          </p>
          {tierIcon}
          {entry.isMe && (
            <span className="text-accent-400 text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-accent-500/10 flex-shrink-0">
              {t('leader.you')}
            </span>
          )}
        </div>
        {entry.country && entry.country !== 'ZZ' && (
          <p className="text-white/20 text-[9px] uppercase tracking-[0.12em] mt-0.5 font-medium">
            {entry.country}
          </p>
        )}
      </div>

      {/* Balance */}
      <div className="text-right flex-shrink-0 pl-2">
        <span className={`text-sm font-bold tabular-nums ${
          entry.isMe ? 'text-accent-400' : 'text-white/60'
        }`}>
          {entry.balance.toLocaleString()}
        </span>
        <span className="text-white/15 text-[9px] ml-0.5 font-medium">BKL</span>
      </div>
    </motion.div>
  );
}
