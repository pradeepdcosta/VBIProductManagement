/** @type {import('tailwindcss').Config} */
export default {
  content: ['./client/index.html', './client/src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        'vf-red': '#E60000',
        'vf-red-hover': '#CC0000',
        'vf-dark': '#1A1A1A',
        'vf-mid': '#2D2D2D',
        'vf-surface': '#F4F3F0',
        'vf-border': '#E2E0DB',
        'vf-text': '#1A1A1A',
        'vf-muted': '#6B6A66',
        'vf-accent': '#0066CC',
        'vf-success': '#1A7A3C',
        'vf-warn': '#B35A00',
      },
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
        mono: ['DM Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};
