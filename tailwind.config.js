const { fontFamily } = require('tailwindcss/defaultTheme')

/**
 * Programmatically generate a Tailwind-v4-style spacing scale where every
 * integer N maps to `${N * 0.25}rem`, including .25 / .5 / .75 fractions.
 * Tailwind v3's JIT will only emit classes that appear in the content scan,
 * so the on-the-wire CSS bundle stays small.
 */
function genSpacing(maxN = 500) {
  const out = {}
  const fmt = v => {
    const n = +v.toFixed(4)
    return `${n}rem`
  }
  for (let i = 0; i <= maxN; i++) {
    out[i] = fmt(i * 0.25)
    out[`${i}.25`] = fmt(i * 0.25 + 0.0625)
    out[`${i}.5`] = fmt(i * 0.25 + 0.125)
    out[`${i}.75`] = fmt(i * 0.25 + 0.1875)
  }
  return out
}

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: ['app/**/*.{ts,tsx}', 'components/**/*.{ts,tsx}'],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px'
      }
    },
    extend: {
      screens: {
        '3xl': '1719px',
        '4xl': '1899px'
      },
      spacing: genSpacing(500),
      maxWidth: genSpacing(500),
      minWidth: genSpacing(500),
      maxHeight: genSpacing(500),
      minHeight: genSpacing(500),
      fontFamily: {
        sans: ['var(--font-sans)', ...fontFamily.sans],
        helvetica: ['var(--font-helvetica)', 'Helvetica', ...fontFamily.sans]
      },
      fontSize: {
        'big-title-1': [
          '6.25rem',
          { lineHeight: 'normal', letterSpacing: '-0.03em', fontWeight: '400' }
        ],
        'big-title-2': [
          '4.75rem',
          { lineHeight: 'normal', letterSpacing: '-0.03em', fontWeight: '400' }
        ],
        'big-title-mobile': [
          '2.5rem',
          { lineHeight: 'normal', letterSpacing: '-0.03em', fontWeight: '400' }
        ],
        'title-1': [
          '4rem',
          { lineHeight: 'normal', letterSpacing: '-0.03em', fontWeight: '400' }
        ],
        'title-2': [
          '2.75rem',
          { lineHeight: '4rem', letterSpacing: '-0.03em', fontWeight: '400' }
        ],
        'title-3': [
          '1.25rem',
          { lineHeight: 'normal', letterSpacing: '-0.01em', fontWeight: '400' }
        ],
        'title-4': [
          '1.125rem',
          { lineHeight: 'normal', letterSpacing: '-0.01em', fontWeight: '400' }
        ],
        'title-5': [
          '1rem',
          { lineHeight: 'normal', letterSpacing: '-0.01em', fontWeight: '400' }
        ],
        'title-1-mobile': [
          '2.125rem',
          { lineHeight: 'normal', letterSpacing: '-0.03em', fontWeight: '400' }
        ],
        'title-2-mobile': [
          '1rem',
          { lineHeight: 'normal', letterSpacing: '-0.01em', fontWeight: '400' }
        ],
        'title-3-mobile': [
          '0.875rem',
          { lineHeight: 'normal', letterSpacing: '-0.01em', fontWeight: '400' }
        ],
        'title-4-mobile': [
          '0.75rem',
          { lineHeight: 'normal', letterSpacing: '-0.01em', fontWeight: '400' }
        ],
        'description-1': [
          '1rem',
          { lineHeight: '1.5rem', letterSpacing: '0', fontWeight: '400' }
        ],
        'description-2': [
          '0.875rem',
          { lineHeight: '1.375rem', letterSpacing: '0', fontWeight: '400' }
        ],
        'description-3': [
          '0.75rem',
          { lineHeight: '1.25rem', letterSpacing: '0', fontWeight: '400' }
        ],
        'description-mobile': [
          '0.75rem',
          { lineHeight: '1.25rem', letterSpacing: '0', fontWeight: '400' }
        ]
      },
      backgroundImage: {
        'radial-white-1':
          'radial-gradient(67.66% 67.65% at 50.07% 32.35%, #fff 0%, rgba(255,255,255,0.5) 100%)',
        'radial-white-2':
          'radial-gradient(50% 120.52% at 50% 5.22%, #fff 48.91%, rgba(255,255,255,0.5) 100%)',
        'radial-gray':
          'radial-gradient(50% 120.52% at 50% 5.22%, rgba(255,255,255,0.3) 48.91%, rgba(255,255,255,0.15) 100%)'
      },
      boxShadow: {
        '1':
          '0.0625rem 0.0625rem 0.0625rem 0 rgba(255,255,255,0.1) inset, 0 0 6.25rem 0 rgba(255,255,255,0.15) inset',
        '2':
          '0.0625rem 0.0625rem 0.0625rem 0 rgba(255,255,255,0.1) inset, 0 0 6.25rem 0 rgba(255,255,255,0.1) inset',
        '3':
          '0.0625rem 0.0625rem 0.0625rem 0 rgba(255,255,255,0.1) inset, 0 0 0.625rem 0 rgba(255,255,255,0.1) inset'
      },
      colors: {
        /* CheckRay dark-theme design tokens (legacy cm-* aliases retained) */
        'cm-bg': '#050d15',
        'cm-surface': '#0c1825',
        'cm-card': '#0f2030',
        'cm-green': '#7ae2cf',
        'cm-green-dark': '#3baa97',
        /* Premium-template semantic tokens (ported from Neurovia @theme) */
        green: '#7ae2cf',
        line: 'rgba(255,255,255,0.1)',
        content: 'rgba(5,17,23,0.5)',
        description: 'rgba(255,255,255,0.6)',
        deep: '#051117',
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))'
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))'
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))'
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))'
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))'
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))'
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))'
        }
      },
      borderRadius: {
        lg: `var(--radius)`,
        md: `calc(var(--radius) - 2px)`,
        sm: 'calc(var(--radius) - 4px)'
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { opacity: '0.6' },
          '50%': { opacity: '1' }
        },
        'accordion-down': {
          from: { height: 0 },
          to: { height: 'var(--radix-accordion-content-height)' }
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: 0 }
        },
        'slide-from-left': {
          '0%': {
            transform: 'translateX(-100%)'
          },
          '100%': {
            transform: 'translateX(0)'
          }
        },
        'slide-to-left': {
          '0%': {
            transform: 'translateX(0)'
          },
          '100%': {
            transform: 'translateX(-100%)'
          }
        }
      },
      animation: {
        'pulse-glow': 'pulse-glow 3s ease-in-out infinite',
        'slide-from-left':
          'slide-from-left 0.3s cubic-bezier(0.82, 0.085, 0.395, 0.895)',
        'slide-to-left':
          'slide-to-left 0.25s cubic-bezier(0.82, 0.085, 0.395, 0.895)',
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out'
      }
    }
  },
  plugins: [require('tailwindcss-animate'), require('@tailwindcss/typography')]
}
