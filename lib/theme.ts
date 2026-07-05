// theme.ts - Color palettes for light/dark mode.
// Values mirror the hex constants every screen used to hardcode inline
// (#0a0a0a background, #1a1a1a surfaces, etc.) so switching to "dark" here
// looks identical to how the app always looked. "light" is a new palette.

export type ThemeMode = 'light' | 'dark' | 'system';
export type ColorScheme = 'light' | 'dark';

export interface ThemeColors {
  background: string;   // screen background
  surface: string;      // cards, panels, chips
  surfaceAlt: string;   // secondary panel background (slightly different from surface)
  border: string;       // hairline borders on cards/chips
  text: string;         // primary text
  textMuted: string;    // secondary text (subtitles, categories)
  textFaint: string;    // tertiary text (hints, disabled labels)
  accent: string;       // primary action color (buttons, active chip)
  accentText: string;   // text/icon color placed on top of `accent`
  danger: string;       // errors
}

export const darkColors: ThemeColors = {
  background: '#0a0a0a',
  surface: '#1a1a1a',
  surfaceAlt: '#111111',
  border: '#2a2a2a',
  text: '#ffffff',
  textMuted: '#888888',
  textFaint: '#555555',
  accent: '#ffffff',
  accentText: '#0a0a0a',
  danger: '#ff4444',
};

export const lightColors: ThemeColors = {
  background: '#f2f2f2',
  surface: '#ffffff',
  surfaceAlt: '#fafafa',
  border: '#dddddd',
  text: '#0a0a0a',
  textMuted: '#666666',
  textFaint: '#999999',
  accent: '#0a0a0a',
  accentText: '#ffffff',
  danger: '#cc3333',
};

export function colorsFor(scheme: ColorScheme): ThemeColors {
  return scheme === 'light' ? lightColors : darkColors;
}
