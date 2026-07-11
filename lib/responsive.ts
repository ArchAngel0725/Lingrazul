// responsive.ts - Shared breakpoint for switching multi-column screens
// (offline.tsx, community.tsx) into a single stacked column on narrow
// viewports, and for shrinking things like the tab bar and flashcard text
// that would otherwise overflow/clip on a phone-width browser window.
//
// This is a plain width check, not a device/platform check - a narrow
// desktop browser window gets the same "narrow" treatment as an actual
// phone, which is the correct behavior for a responsive web layout.

import { useEffect, useState } from 'react';
import { useWindowDimensions } from 'react-native';

export const MOBILE_BREAKPOINT = 700;

export function useIsNarrow(): boolean {
  const { width } = useWindowDimensions();
  // Same hydration-mismatch fix as preferences.tsx's liveSystemScheme, same
  // root cause: react-native-web's useWindowDimensions() reads the real
  // browser width synchronously on the client (via Dimensions.get, no
  // async delay), but during the static web export's server-side prerender
  // there's no `window`, so it falls back to a hardcoded { width: 0 } (see
  // Dimensions' canUseDOM guard). That bakes `0 < 700` -> isNarrow=true
  // into every page's static HTML. Any real visitor on a desktop-width
  // browser then hydrates with isNarrow=false on their very first client
  // render - a genuine mismatch (React error #418), not just a stale one.
  // Fix: ignore the real width until after mount (mounted flips true in an
  // effect, which runs after hydration completes), so the first client
  // render matches the static HTML's isNarrow=true exactly, then swaps to
  // the real value as an ordinary post-hydration update.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  return mounted ? width < MOBILE_BREAKPOINT : true;
}
