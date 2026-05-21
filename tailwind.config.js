/** @type {import('tailwindcss').Config} */
module.exports = {
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
          DEFAULT: '#003220',
          dark: '#002A00',
          light: '#6EB46E',
        },
        brand: {
          green: '#6EB46E',
          'green-dark': '#4E9A4E',
          'green-muted': 'rgba(110,180,110,0.35)',
        },
        bg: {
          deep: '#001A0F',
          mid: '#003220',
          card: '#0D2E1A',
          input: '#0A2216',
          'input-focus': '#0F3520',
        },
        border: {
          subtle: 'rgba(110,180,110,0.20)',
          focus: '#6EB46E',
        },
        error: '#ff4d4f',
        warning: '#faad14',
      },
      fontFamily: {
        sans: ['Inter', 'System'],
      },
    },
  },
  plugins: [],
};
