'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import GlassCard from './GlassCard';
import { findRandomMatch } from '@/lib/matching';
import { useDailyUsage, FREE_DAILY_SECONDS } from '@/lib/hooks';
import type { Profile, Subscription, TierNumber, FilterPrefs, MatchCandidate } from '@/lib/types';
import SubscriptionBadge from './SubscriptionBadge';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  PhoneOff,
  ChevronRight,
  Flag,
  Settings,
  Gift,
  X,
} from 'lucide-react';

interface VideoCallRoomProps {
  profile: Profile;
  subscription: Subscription | null;
  onEnd: () => void;
}

export default function VideoCallRoom({ profile, subscription, onEnd }: VideoCallRoomProps) {
  const tier = (subscription?.tier ?? 0) as 0 | 1 | 2 | 3;
  const hasActiveSub = !!subscription;

  // Daily usage tracking (free tier: 1 min/day)
  const { remaining: dailyRemaining, logUsage, hasTimeLeft } = useDailyUsage(profile.id, hasActiveSub);
  const [callSeconds, setCallSeconds] = useState(0);
  const [showTimeWarning, setShowTimeWarning] = useState(false);

  // Video state
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);

  // Match state
  const [status, setStatus] = useState<'connecting' | 'searching' | 'matched' | 'ended'>('connecting');
  const [currentMatch, setCurrentMatch] = useState<MatchCandidate | null>(null);
  const [remoteUserTier, setRemoteUserTier] = useState<TierNumber | 0>(0);
  const [showFilters, setShowFilters] = useState(false);
  const [showReport, setShowReport] = useState(false);

  // Filter prefs (for tier >= 2)
  const [filters, setFilters] = useState<FilterPrefs>({
    gender: 'any',
    country: 'any',
    ageMin: 18,
    ageMax: 65,
  });

  // Access check on mount: needs an active pass OR free seconds left today.
  // (Server also enforces this on /api/match and /api/daily-usage.)
  useEffect(() => {
    if (!hasActiveSub && dailyRemaining <= 0) {
      setStatus('ended');
      onEnd();
    }
  }, [hasActiveSub, dailyRemaining]); // eslint-disable-line react-hooks/exhaustive-deps

  // Initialize local camera
  useEffect(() => {
    let stream: MediaStream;
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((s) => {
        stream = s;
        setLocalStream(s);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = s;
        }
        setStatus('searching');
        findNewMatch();
      })
      .catch((err) => {
        console.error('Camera access denied:', err);
        setStatus('ended');
      });

    return () => {
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Daily usage timer — auto-end call for free users after 1 min
  useEffect(() => {
    if (hasActiveSub || status !== 'matched') return;

    const timer = setInterval(() => {
      setCallSeconds((prev) => {
        const next = prev + 1;

        // Log to database every 5 seconds
        if (next % 5 === 0) {
          logUsage(5);
        }

        // Show warning at 50 seconds
        if (next === 50) {
          setShowTimeWarning(true);
        }

        // End call at 60 seconds
        if (next >= FREE_DAILY_SECONDS) {
          logUsage(FREE_DAILY_SECONDS - prev);
          handleEnd();
          return FREE_DAILY_SECONDS;
        }

        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [hasActiveSub, status, logUsage]); // eslint-disable-line react-hooks/exhaustive-deps

  // Find a random match
  const findNewMatch = useCallback(async () => {
    setStatus('searching');
    setCurrentMatch(null);
    setRemoteUserTier(0);

    // Simulate a brief search delay
    await new Promise((r) => setTimeout(r, 1500 + Math.random() * 2000));

    const match = await findRandomMatch(profile.id, tier, filters, (profile as any).wallet);
    if (match) {
      setCurrentMatch(match);

      // Fetch the matched user's highest active subscription tier for badge
      try {
        const res = await fetch(`/api/user-tier?userId=${encodeURIComponent(match.id)}`);
        if (res.ok) {
          const data = await res.json();
          setRemoteUserTier((data.tier as TierNumber) ?? 0);
        }
      } catch {
        // User may not have active subscription — no badge shown
      }

      setStatus('matched');
    } else {
      // No matches found, retry
      setTimeout(() => findNewMatch(), 2000);
    }
  }, [profile.id, tier, filters]);

  const handleNext = () => {
    findNewMatch();
  };

  const handleEnd = () => {
    localStream?.getTracks().forEach((t) => t.stop());
    setStatus('ended');
    onEnd();
  };

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach((t) => (t.enabled = !videoEnabled));
      setVideoEnabled(!videoEnabled);
    }
  };

  const toggleAudio = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach((t) => (t.enabled = !audioEnabled));
      setAudioEnabled(!audioEnabled);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 bg-midnight-950 z-50 flex flex-col"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Remote video (full screen background) */}
      <div className="absolute inset-0 bg-midnight-900">
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />
        {/* Placeholder when no remote stream */}
        {status !== 'matched' && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center space-y-3">
              {status === 'searching' ? (
                <>
                  <div className="w-16 h-16 mx-auto border-4 border-accent-500/30 border-t-accent-500 rounded-full animate-spin" />
                  <p className="text-white/60 text-sm">Finding someone...</p>
                </>
              ) : status === 'connecting' ? (
                <>
                  <Video className="w-10 h-10 mx-auto text-white/30" />
                  <p className="text-white/40 text-sm">Setting up camera...</p>
                </>
              ) : (
                <p className="text-white/40 text-sm">Call ended</p>
              )}
            </div>
          </div>
        )}

        {/* Remote username overlay — badge shows only during active call */}
        {currentMatch && status === 'matched' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute top-6 left-1/2 -translate-x-1/2 z-10"
          >
            <div className="px-4 py-2.5 rounded-2xl bg-black/50 backdrop-blur-md border border-white/10">
              <div className="flex items-center justify-center gap-2">
                <p className="text-white text-sm font-semibold">{currentMatch.username}</p>
                {remoteUserTier > 0 && (
                  <SubscriptionBadge tier={remoteUserTier} size="sm" showLabel animated />
                )}
              </div>
              <p className="text-white/50 text-[10px] text-center capitalize mt-0.5">
                {currentMatch.country !== 'ZZ' ? currentMatch.country : ''} · Age {currentMatch.age}
              </p>
            </div>
          </motion.div>
        )}
      </div>

      {/* Local video (PiP) */}
      <div className="absolute bottom-28 right-4 z-10 w-28 h-36 rounded-2xl overflow-hidden border-2 border-white/20 shadow-xl">
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover mirror"
          style={{ transform: 'scaleX(-1)' }}
        />
        {!videoEnabled && (
          <div className="absolute inset-0 bg-midnight-800 flex items-center justify-center">
            <VideoOff className="w-6 h-6 text-white/40" />
          </div>
        )}
      </div>

      {/* Filter panel (tier >= 2 only) */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="absolute bottom-44 left-4 right-4 z-20"
          >
            <GlassCard variant="heavy" className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-white font-bold text-sm">Filters</p>
                <button onClick={() => setShowFilters(false)}>
                  <X className="w-4 h-4 text-white/40" />
                </button>
              </div>

              {/* Gender filter (tier >= 2) */}
              {tier >= 2 && (
                <div className="space-y-1">
                  <label className="text-white/50 text-xs">Gender</label>
                  <div className="flex gap-2">
                    {['any', 'male', 'female'].map((g) => (
                      <button
                        key={g}
                        onClick={() => setFilters({ ...filters, gender: g as any })}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                          filters.gender === g
                            ? 'bg-accent-600 text-white'
                            : 'bg-white/10 text-white/50'
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Country filter (tier >= 3) */}
              {tier >= 3 && (
                <div className="space-y-1">
                  <label className="text-white/50 text-xs">Country</label>
                  <select
                    value={filters.country}
                    onChange={(e) => setFilters({ ...filters, country: e.target.value })}
                    className="w-full bg-white/10 border border-white/15 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:ring-1 focus:ring-accent-500"
                  >
                    <option value="any" className="bg-midnight-800">Any Country</option>
                    <option value="IN" className="bg-midnight-800">India</option>
                    <option value="US" className="bg-midnight-800">United States</option>
                    <option value="GB" className="bg-midnight-800">United Kingdom</option>
                    <option value="DE" className="bg-midnight-800">Germany</option>
                    <option value="JP" className="bg-midnight-800">Japan</option>
                  </select>
                </div>
              )}

              {/* Age filter (tier >= 3) */}
              {tier >= 3 && (
                <div className="space-y-1">
                  <label className="text-white/50 text-xs">
                    Age: {filters.ageMin} – {filters.ageMax}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="range"
                      min={18}
                      max={65}
                      value={filters.ageMin}
                      onChange={(e) =>
                        setFilters({ ...filters, ageMin: parseInt(e.target.value) })
                      }
                      className="flex-1 accent-accent-500"
                    />
                    <input
                      type="range"
                      min={18}
                      max={65}
                      value={filters.ageMax}
                      onChange={(e) =>
                        setFilters({ ...filters, ageMax: parseInt(e.target.value) })
                      }
                      className="flex-1 accent-accent-500"
                    />
                  </div>
                </div>
              )}

              <button
                onClick={() => {
                  setShowFilters(false);
                  handleNext();
                }}
                className="w-full py-2 rounded-lg bg-accent-600 text-white text-xs font-bold"
              >
                Apply & Find New Match
              </button>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Report modal */}
      <AnimatePresence>
        {showReport && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 backdrop-blur-sm p-6"
          >
            <GlassCard variant="heavy" className="w-full max-w-xs p-5 space-y-4">
              <p className="text-white font-bold text-center">Report User?</p>
              <p className="text-white/40 text-xs text-center">
                Report {currentMatch?.username} for inappropriate behavior.
              </p>
              <div className="grid grid-cols-2 gap-2">
                {['Inappropriate content', 'Spam / Fake', 'Harassment', 'Other'].map((r) => (
                  <button
                    key={r}
                    onClick={() => {
                      setShowReport(false);
                      handleNext();
                    }}
                    className="py-2 px-3 rounded-lg bg-white/10 text-white/60 text-[11px] hover:bg-red-500/20 hover:text-red-400 transition-all"
                  >
                    {r}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setShowReport(false)}
                className="w-full py-2 text-white/40 text-xs"
              >
                Cancel
              </button>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Free tier timer — only for non-premium users */}
      {!hasActiveSub && status === 'matched' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute bottom-28 left-1/2 -translate-x-1/2 z-10"
        >
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-md border border-white/10">
            <div className="relative w-2 h-2">
              <div className={`absolute inset-0 rounded-full ${callSeconds >= 50 ? 'bg-red-400 animate-pulse' : 'bg-green-400'}`} />
            </div>
            <span className="text-white/70 text-[11px] font-medium tabular-nums">
              {Math.max(0, 60 - callSeconds)}s remaining today
            </span>
          </div>
        </motion.div>
      )}

      {/* Time warning popup */}
      <AnimatePresence>
        {showTimeWarning && !hasActiveSub && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute bottom-44 left-4 right-4 z-20"
          >
            <GlassCard variant="heavy" className="p-3 text-center">
              <p className="text-amber-400 text-xs font-semibold">
                ⏰ Free time ending in 10 seconds!
              </p>
              <p className="text-white/40 text-[10px] mt-1">
                Get a pass for unlimited calls
              </p>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom control bar */}
      <div className="absolute bottom-0 left-0 right-0 z-10 p-4 pb-8">
        <div className="flex items-center justify-center gap-4">
          {/* Report */}
          <button
            onClick={() => setShowReport(true)}
            className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white/60 hover:bg-white/15 transition-all"
          >
            <Flag className="w-5 h-5" />
          </button>

          {/* Audio toggle */}
          <button
            onClick={toggleAudio}
            className={`w-12 h-12 rounded-full backdrop-blur-md flex items-center justify-center transition-all ${
              audioEnabled ? 'bg-white/10 text-white' : 'bg-red-500/30 text-red-400'
            }`}
          >
            {audioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          </button>

          {/* End call */}
          <button
            onClick={handleEnd}
            className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center text-white shadow-lg shadow-red-900/30 hover:bg-red-500 transition-all active:scale-95"
          >
            <PhoneOff className="w-6 h-6" />
          </button>

          {/* Video toggle */}
          <button
            onClick={toggleVideo}
            className={`w-12 h-12 rounded-full backdrop-blur-md flex items-center justify-center transition-all ${
              videoEnabled ? 'bg-white/10 text-white' : 'bg-red-500/30 text-red-400'
            }`}
          >
            {videoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
          </button>

          {/* Next (skip) */}
          <button
            onClick={handleNext}
            className="w-12 h-12 rounded-full bg-accent-600/80 backdrop-blur-md flex items-center justify-center text-white hover:bg-accent-500 transition-all active:scale-95"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Filter button (tier >= 2) */}
        {tier >= 2 && (
          <button
            onClick={() => setShowFilters(true)}
            className="mt-3 w-full py-2 rounded-xl bg-white/10 backdrop-blur-md text-white/60 text-xs font-medium flex items-center justify-center gap-1 hover:bg-white/15 transition-all"
          >
            <Settings className="w-3 h-3" /> Filters
          </button>
        )}
      </div>
    </motion.div>
  );
}
