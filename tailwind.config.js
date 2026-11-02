/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
    './hooks/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Syncnox brand — from theme.config.ts + logo SVG
        primary: {
          DEFAULT: '#30D158',
          dark: '#1C1C1E',
          light: '#30D158',
        },
        brand: {
          green: '#30D158',
          'green-dark': '#24B13B',
          'green-muted': 'rgba(48,209,88,0.30)',
        },
        bg: {
          deep: '#000000',
          mid: '#1C1C1E',
          card: '#1C1C1E',
          input: '#1C1C1E',
          'input-focus': '#2C2C2E',
        },
        border: {
          subtle: 'rgba(255,255,255,0.08)',
          focus: '#30D158',
        },
        text: {
          primary: '#FFFFFF',
          secondary: '#8E8E93',
          muted: 'rgba(255,255,255,0.40)',
        },
        error: '#FF453A',
        warning: '#faad14',
      },
      fontFamily: {
        sans: ['Inter', 'System'],
      },
    },
  },
  plugins: [],
};
