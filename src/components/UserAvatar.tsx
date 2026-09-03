'use client';

import { useState } from 'react';

// =============================================================
// UserAvatar — premium gender-aware avatar
// - Female users get a feminine avatar style (pink/rose)
// - Male users get a masculine avatar style (blue/indigo)
// - "other"/"any" gets a neutral violet style
// - If avatar_url exists (World App profile picture) it is used
//   instead, falling back to the gender emoji on error.
// =============================================================

export type Gender = 'male' | 'female' | 'other' | 'any';

const GENDER_STYLE: Record<Gender, {
  emoji: string;
  gradient: string;
  border: string;
  glow: string;
  chip: string;
  label: string;
}> = {
  male: {
    emoji: '👨',
    gradient: 'from-sky-400/25 via-blue-500/20 to-indigo-600/25',
    border: 'border-sky-300/30',
    glow: 'bg-sky-500/25',
    chip: 'from-sky-400/90 to-indigo-500/90',
    label: 'male',
  },
  female: {
    emoji: '👩',
    gradient: 'from-pink-400/25 via-rose-400/20 to-rose-500/25',
    border: 'border-pink-300/30',
    glow: 'bg-pink-500/25',
    chip: 'from-pink-400/90 to-rose-500/90',
    label: 'female',
  },
  other: {
    emoji: '🧑',
    gradient: 'from-violet-400/25 via-purple-500/20 to-fuchsia-500/25',
    border: 'border-violet-300/30',
    glow: 'bg-violet-500/25',
    chip: 'from-violet-400/90 to-purple-500/90',
    label: 'other',
  },
  any: {
    emoji: '🧑',
    gradient: 'from-slate-400/25 via-gray-400/15 to-slate-500/25',
    border: 'border-slate-300/25',
    glow: 'bg-slate-400/20',
    chip: 'from-slate-300/90 to-gray-400/90',
    label: 'user',
  },
};

const SIZES = {
  sm: { box: 'w-8 h-8', emoji: 'text-lg', ring: '-inset-[2px]' },
  md: { box: 'w-12 h-12', emoji: 'text-2xl', ring: '-inset-[2.5px]' },
  lg: { box: 'w-20 h-20', emoji: 'text-4xl', ring: '-inset-[3.5px]' },
  xl: { box: 'w-28 h-28', emoji: 'text-6xl', ring: '-inset-1' },
  '2xl': { box: 'w-40 h-40', emoji: 'text-8xl', ring: '-inset-1.5' },
};

interface UserAvatarProps {
  gender?: Gender | string | null;
  src?: string | null;
  size?: keyof typeof SIZES;
  animate?: boolean;
  online?: boolean;
  /** Show a tiny gender chip badge at bottom-right (sm/lg only look) */
  showGenderChip?: boolean;
  className?: string;
}

export default function UserAvatar({
  gender = 'any',
  src,
  size = 'md',
  animate = true,
  online = false,
  showGenderChip = false,
  className = '',
}: UserAvatarProps) {
  const g = (gender === 'male' || gender === 'female' || gender === 'other'
    ? gender
    : 'any') as Gender;
  const style = GENDER_STYLE[g];
  const dims = SIZES[size];
  const [imgFailed, setImgFailed] = useState(false);
  const showImage = !!src && !imgFailed;

  return (
    <div className={`relative inline-flex flex-shrink-0 ${className}`}>
      {/* Rotating gradient ring */}
      <div
        className={`absolute ${dims.ring} rounded-full avatar-ring-spin opacity-60 pointer-events-none`}
        aria-hidden
      />
      {/* Soft glow behind */}
      <div
        className={`absolute inset-0 ${style.glow} rounded-full blur-xl opacity-50 pointer-events-none`}
        aria-hidden
      />

      {/* Core circle */}
      <div
        className={`relative ${dims.box} rounded-full overflow-hidden bg-gradient-to-b ${style.gradient} border ${style.border} flex items-center justify-center avatar-float shadow-lg shadow-black/30`}
      >
        {/* Shine sweep */}
        <div className="absolute inset-0 avatar-shine pointer-events-none" aria-hidden />

        {showImage ? (
          <img
            src={src!}
            alt="avatar"
            className="w-full h-full object-cover"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <span className={`${dims.emoji} avatar-emoji-3d select-none leading-none`}>
            {style.emoji}
          </span>
        )}

        {/* Online dot */}
        {online && (
          <div className="absolute top-0.5 right-0.5 w-3 h-3 rounded-full bg-green-400 border-2 border-midnight-950">
            <div className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-60" />
          </div>
        )}
      </div>

      {/* Gender chip */}
      {showGenderChip && !showImage && (
        <div
          className={`absolute -bottom-1 -right-1.5 px-1.5 py-0.5 rounded-full bg-gradient-to-r ${style.chip} text-white text-[8px] font-bold uppercase tracking-wide shadow-md flex items-center gap-0.5`}
        >
          <span>{g === 'male' ? '♂' : g === 'female' ? '♀' : '★'}</span>
          <span className="sr-only">{style.label}</span>
        </div>
      )}
    </div>
  );
}
