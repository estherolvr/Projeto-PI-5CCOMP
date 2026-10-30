import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Verde institucional FECAP/ASA — floresta profundo
        brand: {
          50:  '#eefaf3',
          100: '#d5f3e3',
          200: '#aee6cb',
          300: '#79d2aa',
          400: '#41b785',
          500: '#1e9e6a',
          600: '#007A4D',  // Verde FECAP principal
          700: '#006640',
          800: '#005234',
          900: '#003d26',
          950: '#002618',
        },
        // Teal ASA — verde água (círculo do banner ASA)
        teal: {
          50:  '#edfaf7',
          100: '#d0f3ec',
          200: '#a5e7db',
          300: '#6dd4c4',
          400: '#32baaa',
          500: '#00A878',  // Teal ASA principal
          600: '#008f65',
          700: '#007553',
          800: '#005c41',
          900: '#004431',
          950: '#002b1e',
        },
        // Roxo ASA — elemento gráfico logo
        asa: {
          purple: {
            50:  '#f4f0fb',
            100: '#e8e0f7',
            200: '#d1c1ef',
            300: '#b399e4',
            400: '#9370d8',
            500: '#7B3FBE',  // Roxo ASA
            600: '#6730a4',
            700: '#54278a',
            800: '#42206e',
            900: '#311856',
          },
          yellow: {
            50:  '#fffbeb',
            100: '#fef3c7',
            200: '#fde68a',
            300: '#fcd34d',
            400: '#fbbf24',
            500: '#F5C000',  // Amarelo/ouro ASA
            600: '#d4a700',
            700: '#b38d00',
            800: '#926f00',
            900: '#715400',
          },
        },
        // Surface tokens para dark mode — charcoal profissional (inspirado no banner ASA)
        surface: {
          DEFAULT: '#ffffff',
          secondary: '#f8f9fa',
          tertiary: '#f1f3f5',
          border: '#e5e9ec',
          'border-strong': '#cdd3d9',
          dark: {
            DEFAULT: '#111419',   // Charcoal muito escuro (fundo do banner ASA)
            secondary: '#1a1f26',
            tertiary: '#222930',
            border: '#2d3540',
            'border-strong': '#3d4755',
          }
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
      },
      boxShadow: {
        'card':    '0 1px 3px 0 rgb(0 0 0 / 0.04), 0 1px 2px -1px rgb(0 0 0 / 0.04)',
        'card-md': '0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.04)',
        'card-lg': '0 10px 15px -3px rgb(0 0 0 / 0.07), 0 4px 6px -4px rgb(0 0 0 / 0.04)',
        'glow-brand': '0 0 24px rgb(0 122 77 / 0.20)',
        'glow-teal':  '0 0 24px rgb(0 168 120 / 0.20)',
      },
      animation: {
        'fade-in':        'fadeIn 0.2s ease-out',
        'slide-in-right': 'slideInRight 0.25s ease-out',
        'slide-in-up':    'slideInUp 0.25s ease-out',
        'pulse-slow':     'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer':        'shimmer 2s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideInRight: {
          '0%':   { transform: 'translateX(16px)', opacity: '0' },
          '100%': { transform: 'translateX(0)',    opacity: '1' },
        },
        slideInUp: {
          '0%':   { transform: 'translateY(12px)', opacity: '0' },
          '100%': { transform: 'translateY(0)',    opacity: '1' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0'  },
        },
      },
      borderRadius: {
        'xl':  '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
    },
  },
  plugins: [],
}

export default config
