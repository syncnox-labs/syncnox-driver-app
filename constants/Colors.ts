/**
 * Syncnox brand color tokens — derived from syncnox-fe/config/theme.config.ts
 */
export const Colors = {
  // Brand greens (from logo.svg paths + theme.config.ts colorPrimary)
  primary: '#003220',
  primaryDark: '#002A00',
  primaryLight: '#6EB46E',

  // Full-screen gradient stops
  gradientStart: '#001A0F',
  gradientMid: '#003220',
  gradientEnd: '#004D2E',

  // Surface / card backgrounds
  bgCard: '#0D2E1A',
  bgInput: '#0A2216',
  bgInputFocused: '#0F3520',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255,255,255,0.60)',
  textMuted: 'rgba(255,255,255,0.35)',
  textPlaceholder: 'rgba(255,255,255,0.25)',

  // CTA / interactive
  accentGreen: '#6EB46E',
  accentGreenDark: '#4E9A4E',
  accentGreenDisabled: 'rgba(110,180,110,0.35)',

  // Borders
  borderSubtle: 'rgba(110,180,110,0.20)',
  borderFocus: '#6EB46E',
  borderActive: '#003220',

  // Separators
  separator: 'rgba(255,255,255,0.08)',

  // Status
  error: '#ff4d4f',
  warning: '#faad14',
  success: '#6EB46E',

  // Misc
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
} as const;

export type ColorKey = keyof typeof Colors;
