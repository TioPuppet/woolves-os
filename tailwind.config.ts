import type { Config } from 'tailwindcss';

/**
 * Woolves Life OS design tokens.
 * Dark premium aesthetic, mobile-first (iPhone primary target).
 * Colors are wired to CSS variables defined in globals.css so shadcn/ui
 * components can consume them and themes stay centralized.
 */
const config: Config = {
  darkMode: 'class',
  content: [
    './src/app/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        border: 'hsl(var(--border))',
        streak: 'hsl(var(--streak))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        // Day-status semantic tokens (see DAY STATUS rule).
        status: {
          ontrack: 'hsl(var(--status-ontrack))',
          atrisk: 'hsl(var(--status-atrisk))',
          broken: 'hsl(var(--status-broken))',
          recovery: 'hsl(var(--status-recovery))',
          completed: 'hsl(var(--status-completed))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 4px)',
        sm: 'calc(var(--radius) - 8px)',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      maxWidth: {
        app: '28rem', // ~448px, iPhone-first single-column shell
      },
    },
  },
  plugins: [],
};

export default config;
