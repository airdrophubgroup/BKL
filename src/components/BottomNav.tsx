'use client';

import { motion } from 'framer-motion';
import { Home, Crown, Video, Trophy } from 'lucide-react';

type Tab = 'home' | 'plans' | 'call' | 'leaderboard';

interface BottomNavProps {
  active: Tab;
  onNavigate: (tab: Tab) => void;
}

const tabs: { id: Tab; label: string; icon: typeof Home }[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'plans', label: 'Passes', icon: Crown },
  { id: 'call', label: 'Call', icon: Video },
  { id: 'leaderboard', label: 'Rank', icon: Trophy },
];

export default function BottomNav({ active, onNavigate }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40">
      <div className="mx-4 mb-4 rounded-2xl bg-midnight-900/80 backdrop-blur-xl border border-white/[0.08] shadow-2xl shadow-black/40">
        <div className="flex items-center justify-around py-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = active === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onNavigate(tab.id)}
                className="relative flex flex-col items-center gap-0.5 px-6 py-2"
              >
                {isActive && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute -top-1 w-8 h-0.5 rounded-full bg-accent-500"
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                )}
                <Icon
                  className={`w-5 h-5 transition-colors ${
                    isActive ? 'text-accent-400' : 'text-white/30'
                  }`}
                />
                <span
                  className={`text-[10px] font-medium transition-colors ${
                    isActive ? 'text-accent-400' : 'text-white/30'
                  }`}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
