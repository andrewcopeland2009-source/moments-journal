/** @type {import('tailwindcss').Config} */
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        bg: token('bg'),
        surface: token('surface'),
        sunken: token('sunken'),
        ink: token('ink'),
        soft: token('soft'),
        faint: token('faint'),
        line: token('line'),
        accent: token('accent'),
      },
      fontFamily: {
        serif: ['var(--font-serif)', 'Georgia', 'serif'],
        sans: ['"Inter Variable"', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
      },
      letterSpacing: {
        label: '0.22em',
      },
      boxShadow: {
        page: '0 1px 1px rgb(var(--shadow) / 0.04), 0 8px 24px -8px rgb(var(--shadow) / 0.14), 0 30px 60px -30px rgb(var(--shadow) / 0.22)',
        card: '0 1px 1px rgb(var(--shadow) / 0.04), 0 10px 30px -14px rgb(var(--shadow) / 0.22)',
        float: '0 10px 40px -10px rgb(var(--shadow) / 0.35), 0 2px 6px rgb(var(--shadow) / 0.06)',
      },
      borderRadius: {
        page: '28px',
      },
    },
  },
  plugins: [],
};
