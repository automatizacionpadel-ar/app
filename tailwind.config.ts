import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Paleta SimplificIA
        brand: {
          DEFAULT: '#7AB619',
          50:  '#F2F9E6',
          100: '#E3F2CC',
          200: '#C7E599',
          300: '#AAD866',
          400: '#8ECA33',
          500: '#7AB619',
          600: '#619112',
          700: '#496D0D',
          800: '#304908',
          900: '#182403',
        },
        // Superficies (modo oscuro por defecto)
        surface: {
          base:    '#20201F',  // fondo principal
          raised:  '#2A2A29',  // cards, panels
          overlay: '#333332',  // modales, dropdowns
          border:  '#3D3D3B',  // bordes sutiles
        },
        // Texto
        content: {
          primary:   '#F0F0EE',
          secondary: '#9A9A96',
          tertiary:  '#5C5C59',
          inverse:   '#20201F',
        },
        // Estados
        success: '#7AB619',
        warning: '#F59E0B',
        error:   '#EF4444',
        info:    '#3B82F6',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        'sm':  '4px',
        'md':  '8px',
        'lg':  '12px',
        'xl':  '16px',
        '2xl': '24px',
      },
      boxShadow: {
        'sm':    '0 1px 2px rgba(0,0,0,0.3)',
        'md':    '0 4px 16px rgba(0,0,0,0.4)',
        'lg':    '0 8px 32px rgba(0,0,0,0.5)',
        'brand': '0 0 0 3px rgba(122,182,25,0.25)',
      },
      animation: {
        'fade-in':    'fadeIn 0.3s ease-out both',
        'fade-up':    'fadeUp 0.4s cubic-bezier(0.16,1,0.3,1) both',
        'slide-in':   'slideIn 0.3s cubic-bezier(0.16,1,0.3,1) both',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          from: { opacity: '0', transform: 'translateX(-12px)' },
          to:   { opacity: '1', transform: 'translateX(0)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.6' },
        },
      },
    },
  },
  plugins: [],
}

export default config
