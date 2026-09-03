'use client';

import { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useWorldcoin } from '@/lib/worldcoin-context';
import { useProfile, useSubscription } from '@/lib/hooks';
import OnboardingModal from '@/components/OnboardingModal';
import HomeDashboard from '@/components/HomeDashboard';
import SubscriptionPlans from '@/components/SubscriptionPlans';
import VideoCallRoom from '@/components/VideoCallRoom';
import Leaderboard from '@/components/Leaderboard';
import BottomNav from '@/components/BottomNav';
import SupportButton from '@/components/SupportButton';
import PrivacyConsent from '@/components/PrivacyConsent';
import SignInGate from '@/components/SignInGate';
import { isDevMode } from '@/lib/worldcoin-context';

type Tab = 'home' | 'plans' | 'call' | 'leaderboard';

export default function HomePage() {
  const { user, isReady } = useWorldcoin();
  const { profile, loading: profileLoading, completeOnboarding, acceptPrivacy } = useProfile();
  const { subscription, loading: subLoading, refresh: refreshSub } = useSubscription(
    profile?.id ?? null
  );
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [inCall, setInCall] = useState(false);

  // Loading screen
  if (!isReady || (profileLoading && user)) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 mx-auto border-4 border-accent-500/30 border-t-accent-500 rounded-full animate-spin" />
          <p className="text-white/40 text-sm">Loading Beediyo Kall...</p>
        </div>
      </div>
    );
  }

  // Not signed in (production, inside World App, no session yet)
  if (!user && !isDevMode()) {
    return <SignInGate />;
  }

  // In dev mode without a user, fall back to a placeholder so the page can render
  if (!profile && user) {
    return (
      <div className="h-screen flex items-center justify-center">
        <p className="text-white/40 text-sm">Setting up your account...</p>
      </div>
    );
  }

  // Safety net: profile must exist before any gated screen renders
  if (!profile) {
    return (
      <div className="h-screen flex items-center justify-center">
        <p className="text-white/40 text-sm">Loading your profile...</p>
      </div>
    );
  }

  // Onboarding gate
  if (!profile.onboarded) {
    return <OnboardingModal onComplete={completeOnboarding} />;
  }

  // Privacy consent gate
  if (!profile.privacy_accepted) {
    return <PrivacyConsent onAccept={acceptPrivacy} />;
  }

  // Video call view (full screen, no nav)
  if (inCall) {
    return (
      <AnimatePresence>
        <VideoCallRoom
          profile={profile}
          subscription={subscription}
          onEnd={() => {
            setInCall(false);
            refreshSub();
          }}
        />
      </AnimatePresence>
    );
  }

  // Main app shell
  return (
    <div className="h-screen flex flex-col safe-top">
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {activeTab === 'home' && (
            <HomeDashboard
              key="home"
              subscription={subscription}
              username={profile.username}
              userId={profile.id}
              gender={profile.gender}
              avatarUrl={profile.avatar_url}
              onStartCall={() => setInCall(true)}
              onGoToPlans={() => setActiveTab('plans')}
            />
          )}
          {activeTab === 'plans' && (
            <SubscriptionPlans
              key="plans"
              profileId={profile.id}
              activeTier={subscription?.tier ?? 0}
              onPurchased={refreshSub}
            />
          )}
          {activeTab === 'leaderboard' && (
            <Leaderboard
              key="leaderboard"
              currentUserId={profile.id}
            />
          )}
        </AnimatePresence>
      </div>

      <BottomNav active={activeTab} onNavigate={setActiveTab} />
      <SupportButton />
    </div>
  );
}
