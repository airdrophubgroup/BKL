'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import GlassCard from './GlassCard';
import { Shield, Eye, Lock, Server, Check, ChevronRight, AlertCircle } from 'lucide-react';

interface PrivacyConsentProps {
  onAccept: () => Promise<boolean>;
}

const CONSENT_ITEMS = [
  {
    icon: Eye,
    title: 'Camera & Microphone',
    description: 'We access your camera and microphone only during video calls. Audio/video is never recorded or stored.',
  },
  {
    icon: Lock,
    title: 'Profile Data',
    description: 'Your username is fetched from Worldcoin. Country, age, and gender are stored once and locked permanently.',
  },
  {
    icon: Server,
    title: 'Usage Tracking',
    description: 'Free tier users: we track daily call duration (max 1 min/day). Premium users: no usage tracking.',
  },
  {
    icon: Shield,
    title: 'Payments',
    description: 'All WLD payments are processed through World App. We never see your wallet private keys.',
  },
];

export default function PrivacyConsent({ onAccept }: PrivacyConsentProps) {
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleAccept = async () => {
    if (!agreed) {
      setError('Please agree to the privacy policy to continue');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const ok = await onAccept();
      if (!ok) {
        setError('Could not save your consent. Please try again.');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    }
    setSubmitting(false);
  };

  return (
    <motion.div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-md p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <GlassCard variant="heavy" className="w-full max-w-sm p-6 space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="relative mx-auto w-14 h-14">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-600/15 flex items-center justify-center border border-green-500/20">
              <Shield className="w-7 h-7 text-green-400" />
            </div>
            <div className="absolute inset-0 blur-xl bg-green-400/10 rounded-full" />
          </div>
          <h2 className="text-xl font-bold text-white">Privacy & Consent</h2>
          <p className="text-xs text-white/40 leading-relaxed">
            Before you start, please review how we handle your data.
          </p>
        </div>

        {/* Consent items */}
        <div className="space-y-2.5">
          {CONSENT_ITEMS.map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + i * 0.08 }}
              className="flex items-start gap-3 px-3.5 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06]"
            >
              <div className="w-8 h-8 rounded-lg bg-white/[0.05] flex items-center justify-center flex-shrink-0 mt-0.5">
                <item.icon className="w-4 h-4 text-white/40" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-xs font-semibold">{item.title}</p>
                <p className="text-white/30 text-[10px] leading-relaxed mt-0.5">{item.description}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Data rights */}
        <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3.5 space-y-2">
          <p className="text-white/50 text-[10px] font-semibold uppercase tracking-wider">Your Rights</p>
          <ul className="space-y-1.5">
            {[
              'Your data is never sold to third parties',
              'Wallet addresses are never shown to other users',
              'Video calls are peer-to-peer — never recorded',
              'You can request data deletion anytime via support',
            ].map((right, i) => (
              <li key={i} className="flex items-start gap-2 text-white/30 text-[10px]">
                <Check className="w-3 h-3 text-green-400/60 flex-shrink-0 mt-0.5" />
                <span>{right}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Agreement checkbox */}
        <motion.button
          onClick={() => { setAgreed(!agreed); setError(''); }}
          whileTap={{ scale: 0.97 }}
          className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl border transition-all ${
            agreed
              ? 'bg-green-500/10 border-green-500/25'
              : 'bg-white/[0.03] border-white/[0.08] hover:bg-white/[0.05]'
          }`}
        >
          <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
            agreed
              ? 'bg-green-500 border-green-500'
              : 'border-white/20'
          }`}>
            {agreed && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
          </div>
          <p className="text-white/60 text-xs text-left">
            I agree to the privacy policy and consent to data processing as described above.
          </p>
        </motion.button>

        {/* Error */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 text-red-400 text-xs"
          >
            <AlertCircle className="w-3.5 h-3.5" /> {error}
          </motion.div>
        )}

        {/* Accept button */}
        <motion.button
          onClick={handleAccept}
          disabled={!agreed || submitting}
          whileHover={agreed ? { scale: 1.02 } : {}}
          whileTap={agreed ? { scale: 0.98 } : {}}
          className={`w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
            agreed
              ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg shadow-green-900/20'
              : 'bg-white/[0.06] text-white/25 border border-white/[0.08] cursor-not-allowed'
          }`}
        >
          {submitting ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <Shield className="w-4 h-4" /> Accept & Enter
            </>
          )}
        </motion.button>

        <p className="text-white/15 text-[9px] text-center leading-relaxed">
          By continuing you agree to our Terms of Service and Privacy Policy.
          <br />
          Contact: airdrophubgroup@gmail.com
        </p>
      </GlassCard>
    </motion.div>
  );
}
