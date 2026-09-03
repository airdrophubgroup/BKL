'use client';

import { motion, type HTMLMotionProps } from 'framer-motion';

interface GlassCardProps extends HTMLMotionProps<'div'> {
  variant?: 'light' | 'medium' | 'heavy';
  hover?: boolean;
}

const variants = {
  light: 'bg-white/[0.06] border border-white/[0.08]',
  medium: 'bg-white/[0.10] border border-white/[0.12]',
  heavy: 'bg-white/[0.16] border border-white/[0.18]',
};

export default function GlassCard({
  variant = 'medium',
  hover = false,
  className = '',
  children,
  ...props
}: GlassCardProps) {
  return (
    <motion.div
      className={`rounded-2xl backdrop-blur-xl ${variants[variant]} ${className}`}
      whileHover={hover ? { scale: 1.02, y: -2 } : undefined}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      {...props}
    >
      {children}
    </motion.div>
  );
}
