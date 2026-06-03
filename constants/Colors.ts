/**
 * Syncnox brand color tokens — Eye-pleasing and drive-safe palette
 * Modified to avoid high contrast eye-strain (neon-on-black).
 * Uses a soft mint green and deep warm slate-gray backgrounds.
 */
export const Colors = {
  // Brand greens
  primary: '#0B291B',         // Deep forest slate green
  primaryDark: '#071C12',     // Sober dark forest
  primaryLight: '#5EC299',    // Soft mint green (soothing, highly legible)

  // Full-screen gradient stops (charcoal slate with a touch of deep green)
  gradientStart: '#0D0F0E',   // Softest dark background
  gradientMid: '#131917',     // Dark slate gray-green
  gradientEnd: '#19201E',     // Soft charcoal slate

  // Surface / card backgrounds (soothing dark gray-green tones instead of pure dark green)
  bgCard: '#19201E',
  bgInput: '#131917',
  bgInputFocused: '#1E2623',

  // Text (soft off-white to reduce glare and haloing while driving)
  textPrimary: '#E5ECE9',
  textSecondary: 'rgba(229,236,233,0.65)',
  textMuted: 'rgba(229,236,233,0.40)',
  textPlaceholder: 'rgba(229,236,233,0.25)',

  // CTA / interactive
  accentGreen: '#5EC299',
  accentGreenDark: '#4AB087',
  accentGreenDisabled: 'rgba(94,194,153,0.30)',

  // Borders
  borderSubtle: 'rgba(94,194,153,0.15)',
  borderFocus: '#5EC299',
  borderActive: '#0B291B',

  // Separators
  separator: 'rgba(255,255,255,0.06)',

  // Status
  error: '#E05D61',
  warning: '#faad14',
  success: '#5EC299',

  // Misc
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
} as const;

export type ColorKey = keyof typeof Colors;
