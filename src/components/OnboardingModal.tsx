'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import GlassCard from './GlassCard';
import UserAvatar from './UserAvatar';
import {
  MapPin,
  Calendar,
  User,
  ChevronRight,
  Lock,
  Shield,
  Sparkles,
  Globe,
  AlertCircle,
  Check,
} from 'lucide-react';

// =============================================================
// Extended country list — 40+ countries
// =============================================================
const COUNTRIES = [
  { code: 'IN', name: 'India', flag: '🇮🇳' },
  { code: 'US', name: 'United States', flag: '🇺🇸' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪' },
  { code: 'FR', name: 'France', flag: '🇫🇷' },
  { code: 'JP', name: 'Japan', flag: '🇯🇵' },
  { code: 'KR', name: 'South Korea', flag: '🇰🇷' },
  { code: 'BR', name: 'Brazil', flag: '🇧🇷' },
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬' },
  { code: 'KE', name: 'Kenya', flag: '🇰🇪' },
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦' },
  { code: 'PH', name: 'Philippines', flag: '🇵🇭' },
  { code: 'MX', name: 'Mexico', flag: '🇲🇽' },
  { code: 'AR', name: 'Argentina', flag: '🇦🇷' },
  { code: 'TR', name: 'Turkey', flag: '🇹🇷' },
  { code: 'ID', name: 'Indonesia', flag: '🇮🇩' },
  { code: 'EG', name: 'Egypt', flag: '🇪🇬' },
  { code: 'PK', name: 'Pakistan', flag: '🇵🇰' },
  { code: 'BD', name: 'Bangladesh', flag: '🇧🇩' },
  { code: 'TH', name: 'Thailand', flag: '🇹🇭' },
  { code: 'VN', name: 'Vietnam', flag: '🇻🇳' },
  { code: 'CO', name: 'Colombia', flag: '🇨🇴' },
  { code: 'PE', name: 'Peru', flag: '🇵🇪' },
  { code: 'CL', name: 'Chile', flag: '🇨🇱' },
  { code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦' },
  { code: 'AE', name: 'UAE', flag: '🇦🇪' },
  { code: 'PT', name: 'Portugal', flag: '🇵🇹' },
  { code: 'ES', name: 'Spain', flag: '🇪🇸' },
  { code: 'IT', name: 'Italy', flag: '🇮🇹' },
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱' },
  { code: 'PL', name: 'Poland', flag: '🇵🇱' },
  { code: 'RU', name: 'Russia', flag: '🇷🇺' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺' },
  { code: 'NZ', name: 'New Zealand', flag: '🇳🇿' },
  { code: 'TZ', name: 'Tanzania', flag: '🇹🇿' },
  { code: 'GH', name: 'Ghana', flag: '🇬🇭' },
  { code: 'ET', name: 'Ethiopia', flag: '🇪🇹' },
  { code: 'MM', name: 'Myanmar', flag: '🇲🇲' },
  { code: 'NP', name: 'Nepal', flag: '🇳🇵' },
  { code: 'LK', name: 'Sri Lanka', flag: '🇱🇰' },
  { code: 'ZZ', name: 'Other / Prefer not to say', flag: '🌍' },
];

const GENDERS = [
  { value: 'male', label: 'Male', icon: '♂️', color: 'from-blue-500/20 to-blue-600/10' },
  { value: 'female', label: 'Female', icon: '♀️', color: 'from-pink-500/20 to-pink-600/10' },
  { value: 'other', label: 'Other', icon: '⚧', color: 'from-purple-500/20 to-purple-600/10' },
];

interface OnboardingModalProps {
  onComplete: (country: string, age: number, gender: string) => Promise<boolean>;
}

export default function OnboardingModal({ onComplete }: OnboardingModalProps) {
  const [step, setStep] = useState<'welcome' | 'country' | 'age' | 'gender' | 'confirm'>('welcome');
  const [country, setCountry] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const selectedCountry = COUNTRIES.find((c) => c.code === country);

  const handleNext = () => {
    setError('');

    if (step === 'country') {
      if (!country) {
        setError('Please select your country');
        return;
      }
      setStep('age');
    } else if (step === 'age') {
      const ageNum = parseInt(age);
      if (!age || isNaN(ageNum) || ageNum < 18 || ageNum > 99) {
        setError('You must be between 18 and 99 years old');
        return;
      }
      setStep('gender');
    } else if (step === 'gender') {
      if (!gender) {
        setError('Please select your gender');
        return;
      }
      setStep('confirm');
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    try {
      const ok = await onComplete(country, parseInt(age), gender);
      if (!ok) {
        setError('Could not save your details. Please try again.');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    }
    setSubmitting(false);
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="w-full max-w-sm">
        <AnimatePresence mode="wait">
          {/* ===== STEP: Welcome Splash ===== */}
          {step === 'welcome' && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95, x: -30 }}
              transition={{ type: 'spring', stiffness: 200, damping: 22 }}
            >
              <GlassCard variant="heavy" className="p-8 space-y-6 text-center">
                {/* App icon */}
                <motion.div
                  className="relative mx-auto w-20 h-20"
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-accent-500/30 to-indigo-600/20 border border-accent-500/25 flex items-center justify-center">
                    <span className="text-3xl font-black bg-gradient-to-br from-accent-300 to-indigo-400 bg-clip-text text-transparent">
                      BK
                    </span>
                  </div>
                  <div className="absolute inset-0 blur-2xl bg-accent-500/15 rounded-full" />
                </motion.div>

                <div className="space-y-2">
                  <h1 className="text-2xl font-bold text-white">Beediyo Kall</h1>
                  <p className="text-white/40 text-sm leading-relaxed">
                    Random Video Chat with people worldwide
                  </p>
                </div>

                <p className="text-[10px] text-white/25 leading-relaxed px-2">
                  18+ only · Be kind and respectful — calls can be reported by anyone at any time
                </p>

                <p className="text-white/25 text-xs leading-relaxed">
                  We need a few details to set up your profile.
                  <br />
                  This is a <span className="text-accent-400 font-semibold">one-time only</span> setup.
                </p>

                <button
                  onClick={() => setStep('country')}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-accent-600 to-accent-700 text-white font-bold text-sm hover:from-accent-500 hover:to-accent-600 transition-all active:scale-[0.98] shadow-lg shadow-accent-900/30 flex items-center justify-center gap-2"
                >
                  Get Started <ChevronRight className="w-4 h-4" />
                </button>
              </GlassCard>
            </motion.div>
          )}

          {/* ===== STEP: Country ===== */}
          {step === 'country' && (
            <motion.div
              key="country"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ type: 'spring', stiffness: 200, damping: 22 }}
            >
              <GlassCard variant="heavy" className="p-6 space-y-5">
                {/* Header */}
                <div className="text-center space-y-2">
                  <div className="relative mx-auto w-14 h-14">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-accent-500/20 to-indigo-600/15 flex items-center justify-center border border-accent-500/20">
                      <Globe className="w-7 h-7 text-accent-400" />
                    </div>
                  </div>
                  <h2 className="text-xl font-bold text-white">Where are you from?</h2>
                  <p className="text-xs text-white/40">
                    Step 1 of 3
                  </p>
                </div>

                {/* Country search / scrollable list */}
                <div className="max-h-[280px] overflow-y-auto space-y-1 rounded-xl bg-white/[0.03] border border-white/[0.06] p-2">
                  {COUNTRIES.map((c) => (
                    <button
                      key={c.code}
                      onClick={() => { setCountry(c.code); setError(''); }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${
                        country === c.code
                          ? 'bg-accent-600/20 border border-accent-500/25'
                          : 'hover:bg-white/[0.05] border border-transparent'
                      }`}
                    >
                      <span className="text-lg">{c.flag}</span>
                      <span className={`text-sm flex-1 ${country === c.code ? 'text-white font-semibold' : 'text-white/60'}`}>
                        {c.name}
                      </span>
                      {country === c.code && (
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                          <Check className="w-4 h-4 text-accent-400" />
                        </motion.div>
                      )}
                    </button>
                  ))}
                </div>

                {/* Lock warning */}
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/[0.06] border border-amber-500/15">
                  <Lock className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                  <p className="text-[10px] text-amber-400/70 leading-relaxed">
                    Your country is locked permanently and cannot be changed later.
                  </p>
                </div>

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

                {/* Nav */}
                <div className="flex gap-3">
                  <button
                    onClick={() => setStep('welcome')}
                    className="flex-1 py-3 rounded-xl bg-white/[0.06] text-white/50 text-sm font-medium hover:bg-white/[0.1] transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleNext}
                    className="flex-1 py-3 rounded-xl bg-accent-600 text-white text-sm font-bold hover:bg-accent-500 transition-colors flex items-center justify-center gap-1.5"
                  >
                    Next <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </GlassCard>
            </motion.div>
          )}

          {/* ===== STEP: Age ===== */}
          {step === 'age' && (
            <motion.div
              key="age"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ type: 'spring', stiffness: 200, damping: 22 }}
            >
              <GlassCard variant="heavy" className="p-6 space-y-5">
                {/* Header */}
                <div className="text-center space-y-2">
                  <div className="relative mx-auto w-14 h-14">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-accent-500/20 to-indigo-600/15 flex items-center justify-center border border-accent-500/20">
                      <Calendar className="w-7 h-7 text-accent-400" />
                    </div>
                  </div>
                  <h2 className="text-xl font-bold text-white">How old are you?</h2>
                  <p className="text-xs text-white/40">
                    Step 2 of 3 · From <span className="text-white/60">{selectedCountry?.flag} {selectedCountry?.name}</span>
                  </p>
                </div>

                {/* Age input with +/- buttons */}
                <div className="flex items-center justify-center gap-4">
                  <button
                    onClick={() => {
                      const n = Math.max(18, parseInt(age || '18') - 1);
                      setAge(String(n));
                      setError('');
                    }}
                    className="w-12 h-12 rounded-xl bg-white/[0.06] border border-white/10 text-white/60 text-xl font-bold hover:bg-white/[0.1] transition-colors flex items-center justify-center"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min={18}
                    max={99}
                    value={age}
                    onChange={(e) => { setAge(e.target.value); setError(''); }}
                    placeholder="18"
                    className="w-24 bg-white/[0.04] border border-white/[0.1] rounded-xl px-4 py-3 text-white text-center text-3xl font-extrabold focus:outline-none focus:ring-2 focus:ring-accent-500 placeholder-white/15 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <button
                    onClick={() => {
                      const n = Math.min(99, parseInt(age || '18') + 1);
                      setAge(String(n));
                      setError('');
                    }}
                    className="w-12 h-12 rounded-xl bg-white/[0.06] border border-white/10 text-white/60 text-xl font-bold hover:bg-white/[0.1] transition-colors flex items-center justify-center"
                  >
                    +
                  </button>
                </div>

                {/* Lock warning */}
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/[0.06] border border-amber-500/15">
                  <Lock className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                  <p className="text-[10px] text-amber-400/70 leading-relaxed">
                    Your age is locked permanently. You must be 18+ to use Beediyo Kall.
                  </p>
                </div>

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

                {/* Nav */}
                <div className="flex gap-3">
                  <button
                    onClick={() => setStep('country')}
                    className="flex-1 py-3 rounded-xl bg-white/[0.06] text-white/50 text-sm font-medium hover:bg-white/[0.1] transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleNext}
                    className="flex-1 py-3 rounded-xl bg-accent-600 text-white text-sm font-bold hover:bg-accent-500 transition-colors flex items-center justify-center gap-1.5"
                  >
                    Next <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </GlassCard>
            </motion.div>
          )}

          {/* ===== STEP: Gender ===== */}
          {step === 'gender' && (
            <motion.div
              key="gender"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ type: 'spring', stiffness: 200, damping: 22 }}
            >
              <GlassCard variant="heavy" className="p-6 space-y-5">
                {/* Header */}
                <div className="text-center space-y-2">
                  <div className="relative mx-auto w-14 h-14">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-accent-500/20 to-indigo-600/15 flex items-center justify-center border border-accent-500/20">
                      <User className="w-7 h-7 text-accent-400" />
                    </div>
                  </div>
                  <h2 className="text-xl font-bold text-white">Your gender</h2>
                  <p className="text-xs text-white/40">
                    Step 3 of 3 · Used for matching filters
                  </p>
                </div>

                {/* Live avatar preview matching the selected gender */}
                <AnimatePresence>
                  {gender && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col items-center gap-1.5"
                    >
                      <UserAvatar gender={gender} size="xl" animate online showGenderChip />
                      <p className="text-[10px] text-white/40 font-medium">
                        This is how you'll appear to others
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Gender cards */}
                <div className="grid grid-cols-3 gap-3">
                  {GENDERS.map((g) => (
                    <motion.button
                      key={g.value}
                      onClick={() => { setGender(g.value); setError(''); }}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      className={`relative overflow-hidden py-4 rounded-xl border text-center space-y-2 transition-all ${
                        gender === g.value
                          ? 'bg-gradient-to-b ' + g.color + ' border-accent-500/30 shadow-lg shadow-accent-900/15'
                          : 'bg-white/[0.03] border-white/[0.08] hover:bg-white/[0.06]'
                      }`}
                    >
                      {gender === g.value && (
                        <div className="absolute top-2 right-2">
                          <Check className="w-3.5 h-3.5 text-accent-400" />
                        </div>
                      )}
                      <span className="text-2xl block">{g.icon}</span>
                      <span className={`text-xs font-semibold ${gender === g.value ? 'text-white' : 'text-white/50'}`}>
                        {g.label}
                      </span>
                    </motion.button>
                  ))}
                </div>

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

                {/* Nav */}
                <div className="flex gap-3">
                  <button
                    onClick={() => setStep('age')}
                    className="flex-1 py-3 rounded-xl bg-white/[0.06] text-white/50 text-sm font-medium hover:bg-white/[0.1] transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleNext}
                    className="flex-1 py-3 rounded-xl bg-accent-600 text-white text-sm font-bold hover:bg-accent-500 transition-colors flex items-center justify-center gap-1.5"
                  >
                    Review <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </GlassCard>
            </motion.div>
          )}

          {/* ===== STEP: Confirm & Lock ===== */}
          {step === 'confirm' && (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 200, damping: 22 }}
            >
              <GlassCard variant="heavy" className="p-6 space-y-5">
                {/* Header */}
                <div className="text-center space-y-2">
                  <motion.div
                    className="relative mx-auto w-14 h-14"
                    animate={{ scale: [1, 1.08, 1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-600/15 flex items-center justify-center border border-green-500/25">
                      <Shield className="w-7 h-7 text-green-400" />
                    </div>
                  </motion.div>
                  <h2 className="text-xl font-bold text-white">Confirm & Lock</h2>
                  <p className="text-xs text-white/40">
                    Review your details below
                  </p>
                </div>

                {/* Summary cards */}
                <div className="space-y-2">
                  <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                    <Globe className="w-4 h-4 text-accent-400" />
                    <div className="flex-1">
                      <p className="text-[10px] text-white/30 uppercase tracking-wider">Country</p>
                      <p className="text-sm text-white font-medium">{selectedCountry?.flag} {selectedCountry?.name}</p>
                    </div>
                    <Lock className="w-3 h-3 text-amber-400/50" />
                  </div>

                  <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                    <Calendar className="w-4 h-4 text-accent-400" />
                    <div className="flex-1">
                      <p className="text-[10px] text-white/30 uppercase tracking-wider">Age</p>
                      <p className="text-sm text-white font-medium">{age} years old</p>
                    </div>
                    <Lock className="w-3 h-3 text-amber-400/50" />
                  </div>

                  <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                    <User className="w-4 h-4 text-accent-400" />
                    <div className="flex-1">
                      <p className="text-[10px] text-white/30 uppercase tracking-wider">Gender</p>
                      <p className="text-sm text-white font-medium capitalize">{gender}</p>
                    </div>
                    <Lock className="w-3 h-3 text-amber-400/50" />
                  </div>
                </div>

                {/* Permanent lock warning */}
                <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg bg-amber-500/[0.06] border border-amber-500/15">
                  <Lock className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className="text-[10px] text-amber-400/70 leading-relaxed">
                    All three details are <span className="text-amber-400 font-semibold">permanently locked</span> to your Worldcoin account.
                    They cannot be changed after this step.
                  </p>
                </div>

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

                {/* Nav */}
                <div className="flex gap-3">
                  <button
                    onClick={() => setStep('gender')}
                    className="flex-1 py-3 rounded-xl bg-white/[0.06] text-white/50 text-sm font-medium hover:bg-white/[0.1] transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 text-white text-sm font-bold hover:from-green-500 hover:to-emerald-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 shadow-lg shadow-green-900/20"
                  >
                    {submitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Locking...
                      </>
                    ) : (
                      <>
                        <Lock className="w-3.5 h-3.5" /> Lock & Enter
                      </>
                    )}
                  </button>
                </div>
              </GlassCard>
            </motion.div>
          )}
        </AnimatePresence>

        <p className="text-center text-white/20 text-[9px] mt-3">
          Need help?{' '}
          <a
            href="mailto:airdrophubgroup@gmail.com?subject=Beediyo%20Kall%20—%20Support"
            className="text-accent-400/60 underline underline-offset-2"
          >
            airdrophubgroup@gmail.com
          </a>
        </p>
      </div>
    </motion.div>
  );
}
