// =============================================================
// World App Detection
// Detects if the app is running inside the World App browser.
// World App injects the MiniKit SDK on the window object.
// =============================================================

export function isWorldApp(): boolean {
  if (typeof window === 'undefined') return false;

  const MiniKit = (window as any).MiniKit;

  // Check 1: MiniKit v2 exposes isInstalled()
  if (MiniKit?.isInstalled?.()) {
    return true;
  }

  // Check 2: MiniKit v1 exposed commands.isInstalled()
  if (MiniKit?.commands?.isInstalled?.()) {
    return true;
  }

  // Check 3: MiniKit exposes v2 command methods (pay/walletAuth) → we're inside World App
  if (MiniKit && (typeof MiniKit.pay === 'function' || typeof MiniKit.walletAuth === 'function')) {
    return true;
  }

  // Check 4: User agent contains World App identifier
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes('worldapp') || ua.includes('world-app') || ua.includes('world_app')) {
    return true;
  }

  // Check 5: Referer contains worldcoin / world.org
  const referrer = document.referrer.toLowerCase();
  if (referrer.includes('worldcoin') || referrer.includes('world.org')) {
    return true;
  }

  // Check 6: window.worldapp object exists
  if ((window as any).worldapp) {
    return true;
  }

  return false;
}

// Dev mode flag — allows running outside World App for testing
// Set NEXT_PUBLIC_ALLOW_DEV_MODE=true in .env.local to enable
export function isDevModeAllowed(): boolean {
  if (typeof window === 'undefined') return false;
  return process.env.NEXT_PUBLIC_ALLOW_DEV_MODE === 'true';
}
