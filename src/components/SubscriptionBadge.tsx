'use client';

import { motion } from 'framer-motion';
import { TIER_BADGES, type TierNumber } from '@/lib/types';

interface SubscriptionBadgeProps {
  tier: TierNumber;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  animated?: boolean;
  className?: string;
}

export default function SubscriptionBadge({
  tier,
  size = 'sm',
  showLabel = true,
  animated = true,
  className = '',
}: SubscriptionBadgeProps) {
  const config = TIER_BADGES[tier];

  const sizeConfig = {
    sm: {
      badge: 'h-5 px-1.5 gap-0.5',
      icon: 'text-[10px]',
      label: 'text-[8px]',
      dot: 'w-1 h-1',
    },
    md: {
      badge: 'h-6 px-2 gap-1',
      icon: 'text-xs',
      label: 'text-[9px]',
      dot: 'w-1.5 h-1.5',
    },
    lg: {
      badge: 'h-7 px-2.5 gap-1.5',
      icon: 'text-sm',
      label: 'text-[10px]',
      dot: 'w-2 h-2',
    },
  };

  const s = sizeConfig[size];

  return (
    <motion.div
      className={`relative inline-flex items-center ${s.badge} rounded-full border ${config.border} ${config.bg} backdrop-blur-md overflow-hidden select-none ${className}`}
      initial={animated ? { scale: 0, opacity: 0 } : undefined}
      animate={animated ? { scale: 1, opacity: 1 } : undefined}
      transition={animated ? { type: 'spring', stiffness: 300, damping: 18, delay: 0.1 } : undefined}
      whileHover={{ scale: 1.08 }}
      style={{ boxShadow: config.cssGlow }}
    >
      {/* Shimmer sweep */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.08] to-transparent animate-shimmer opacity-40" />

      {/* Icon */}
      <span className={`${s.icon} relative z-10 leading-none`}>{config.icon}</span>

      {/* Label */}
      {showLabel && (
        <span className={`${s.label} font-bold ${config.text} relative z-10 tracking-wide uppercase`}>
          {config.label}
        </span>
      )}

      {/* Glow dot */}
      <div className={`${s.dot} rounded-full bg-gradient-to-r ${config.gradient} opacity-70 relative z-10`} />
    </motion.div>
  );
}

// =============================================================
// Standalone badge icon (no label, just the icon with glow)
// =============================================================
export function BadgeIcon({ tier, size = 16 }: { tier: TierNumber; size?: number }) {
  const config = TIER_BADGES[tier];

  return (
    <motion.span
      className="inline-flex items-center justify-center select-none"
      style={{ fontSize: size, filter: `drop-shadow(${config.cssGlow})` }}
      animate={{ scale: [1, 1.08, 1] }}
      transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
    >
      {config.icon}
    </motion.span>
  );
}
