// =============================================================
// Shared types for Beediyo Kall
// =============================================================

export interface Profile {
  id: string;
  worldcoin_id: string;
  wallet: string;
  username: string;
  country: string;
  age: number;
  gender: string;
  avatar_url: string | null;
  onboarded: boolean;
  privacy_accepted: boolean;
  created_at: string;
  updated_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  tier: 1 | 2 | 3;
  starts_at: string;
  expires_at: string;
  tx_hash: string | null;
  created_at: string;
}

export interface Payment {
  id: string;
  user_id: string;
  tier: 1 | 2 | 3;
  amount_wld: number;
  tx_hash: string | null;
  status: 'pending' | 'confirmed' | 'failed';
  created_at: string;
}

export interface FilterPrefs {
  gender: 'male' | 'female' | 'any';
  country: string;    // ISO alpha-2 or 'any'
  ageMin: number;
  ageMax: number;
}

export interface MatchCandidate {
  id: string;
  username: string;
  gender: string;
  country: string;
  age: number;
  avatar_url: string | null;
}

export interface SignalingMessage {
  type: 'offer' | 'answer' | 'ice-candidate' | 'match-found' | 'match-ended' | 'next';
  from: string;
  to: string;
  payload?: any;
}

// Subscription tier definitions
export const TIERS = {
  1: {
    name: 'Basic Pass',
    price: 2,
    bklReward: 2,
    durationDays: 7,
    description: 'Unlimited random video calls for 7 days. Completely global/random matching.',
    filters: ['random_matching'] as const,
    color: 'from-midnight-600 to-midnight-700',
  },
  2: {
    name: 'Gender Filter Pass',
    price: 5,
    bklReward: 5,
    durationDays: 7,
    description: 'Everything in Basic + filter matches by gender preference.',
    filters: ['random_matching', 'gender_filter'] as const,
    color: 'from-accent-600 to-accent-800',
  },
  3: {
    name: 'Advanced Pass',
    price: 10,
    bklReward: 10,
    durationDays: 7,
    description: 'Full access with country, region, and age preference filters.',
    filters: ['random_matching', 'gender_filter', 'country_filter', 'age_filter'] as const,
    color: 'from-accent-500 to-midnight-600',
  },
} as const;

export type TierNumber = keyof typeof TIERS;

// Subscription tier badge styles
export const TIER_BADGES: Record<TierNumber, {
  label: string;
  icon: string;
  gradient: string;
  border: string;
  glow: string;
  text: string;
  bg: string;
  ring: string;
  barGradient: string;
  cssGlow: string;
}> = {
  1: {
    label: 'Bronze',
    icon: '🥉',
    gradient: 'from-orange-400 via-amber-500 to-orange-600',
    border: 'border-orange-400/35',
    glow: 'shadow-[0_0_12px_rgba(251,146,60,0.25)]',
    text: 'text-orange-400',
    bg: 'bg-gradient-to-br from-orange-500/15 via-amber-600/10 to-orange-700/10',
    ring: 'ring-orange-400/25',
    barGradient: 'from-orange-300 via-amber-400 to-orange-500',
    cssGlow: '0 0 10px rgba(251,146,60,0.2)',
  },
  2: {
    label: 'Silver',
    icon: '🥈',
    gradient: 'from-slate-200 via-gray-200 to-slate-300',
    border: 'border-slate-300/40',
    glow: 'shadow-[0_0_14px_rgba(148,163,184,0.3)]',
    text: 'text-slate-300',
    bg: 'bg-gradient-to-br from-slate-400/18 via-gray-500/10 to-slate-500/12',
    ring: 'ring-slate-300/30',
    barGradient: 'from-slate-300 via-gray-200 to-slate-400',
    cssGlow: '0 0 12px rgba(148,163,184,0.25)',
  },
  3: {
    label: 'Gold',
    icon: '👑',
    gradient: 'from-amber-400 via-yellow-400 to-orange-400',
    border: 'border-amber-400/45',
    glow: 'shadow-[0_0_18px_rgba(251,191,36,0.35)]',
    text: 'text-amber-400',
    bg: 'bg-gradient-to-br from-amber-500/22 via-yellow-500/10 to-orange-500/18',
    ring: 'ring-amber-400/35',
    barGradient: 'from-amber-400 via-yellow-400 to-orange-400',
    cssGlow: '0 0 16px rgba(251,191,36,0.3)',
  },
};
