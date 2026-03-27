/** @type {import('tailwindcss').Config} */
export default {
  content: ['./client/src/**/*.{ts,tsx}', './client/index.html'],
  theme: {
    extend: {
      colors: {
        obsidian: '#0A0A0A',
        gold: {
          DEFAULT: '#C9A84C',
          light: '#D9B88C',
        },
      },
      fontFamily: {
        display: ['"Playfair Display SC"', 'serif'],
        body: ['"DM Sans"', 'sans-serif'],
      },
      backdropBlur: {
        glass: '16px',
      },
    },
  },
  plugins: [],
};
