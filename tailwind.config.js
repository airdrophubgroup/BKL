/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Glassmorphism palette — deep midnight blues, slate grays, purple/indigo accents
        midnight: {
          50: '#eef0f6',
          100: '#d5d9e8',
          200: '#b0b8d2',
          300: '#8a96bc',
          400: '#6574a6',
          500: '#3f5290',
          600: '#2d3c6e',
          700: '#1e2a50',
          800: '#131b36',
          900: '#0a0f1f',
          950: '#050810',
        },
        accent: {
          50: '#f0ecff',
          100: '#ddd6ff',
          200: '#bfb5ff',
          300: '#9d8eff',
          400: '#7c68ff',
          500: '#6c47ff',
          600: '#5a2ef5',
          700: '#4a1fd4',
          800: '#3c1aab',
          900: '#2e1582',
          950: '#1a0b54',
        },
        slate: {
          750: '#293548',
        },
        glass: {
          light: 'rgba(255, 255, 255, 0.08)',
          medium: 'rgba(255, 255, 255, 0.12)',
          heavy: 'rgba(255, 255, 255, 0.18)',
          border: 'rgba(255, 255, 255, 0.15)',
        },
      },
      backdropBlur: {
        xs: '2px',
        glass: '20px',
        heavy: '40px',
      },
      animation: {
        'glow': 'glow 2s ease-in-out infinite alternate',
        'float': 'float 3s ease-in-out infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-up': 'slideUp 0.5s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'fade-in': 'fadeIn 0.3s ease-out',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 20px rgba(108, 71, 255, 0.15)' },
          '100%': { boxShadow: '0 0 40px rgba(108, 71, 255, 0.3)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
