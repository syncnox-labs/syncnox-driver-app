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
          DEFAULT: '#0B291B',
          dark: '#071C12',
          light: '#5EC299',
        },
        brand: {
          green: '#5EC299',
          'green-dark': '#4AB087',
          'green-muted': 'rgba(94,194,153,0.30)',
        },
        bg: {
          deep: '#0D0F0E',
          mid: '#131917',
          card: '#19201E',
          input: '#131917',
          'input-focus': '#1E2623',
        },
        border: {
          subtle: 'rgba(94,194,153,0.15)',
          focus: '#5EC299',
        },
        text: {
          primary: '#E5ECE9',
          secondary: 'rgba(229,236,233,0.65)',
          muted: 'rgba(229,236,233,0.40)',
        },
        error: '#E05D61',
        warning: '#faad14',
      },
      fontFamily: {
        sans: ['Inter', 'System'],
      },
    },
  },
  plugins: [],
};
