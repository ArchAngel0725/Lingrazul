// responsive.ts - Shared breakpoint for switching multi-column screens
// (offline.tsx, community.tsx) into a single stacked column on narrow
// viewports, and for shrinking things like the tab bar and flashcard text
// that would otherwise overflow/clip on a phone-width browser window.
//
// This is a plain width check, not a device/platform check - a narrow
// desktop browser window gets the same "narrow" treatment as an actual
// phone, which is the correct behavior for a responsive web layout.

import { useWindowDimensions } from 'react-native';

export const MOBILE_BREAKPOINT = 700;

export function useIsNarrow(): boolean {
  const { width } = useWindowDimensions();
  return width < MOBILE_BREAKPOINT;
}
