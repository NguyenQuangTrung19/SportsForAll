import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'rgb(var(--color-primary) / <alpha-value>)',
          dark: 'rgb(var(--color-primary-dark) / <alpha-value>)',
        },
        paper: '#F4EFE3',
        ink: '#0A0A0A',
        rust: '#C43C1A',
        night: '#08080C',
        midnight: '#0F0F18',
        cream: '#F4EFE3',
        ember: '#FF6B3D',
      },
      fontFamily: {
        sans: ['"Be Vietnam Pro"', 'system-ui', 'sans-serif'],
        display: ['"Big Shoulders Display"', '"Bebas Neue"', 'Impact', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-22px)' },
        },
        'float-rev': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(18px)' },
        },
        'pulse-slow': {
          '0%, 100%': { opacity: '0.4', transform: 'scale(1)' },
          '50%': { opacity: '0.8', transform: 'scale(1.05)' },
        },
        spin1: { '100%': { transform: 'rotate(360deg)' } },
        shine: {
          '0%': { transform: 'translateX(-120%) skewX(-20deg)' },
          '100%': { transform: 'translateX(220%) skewX(-20deg)' },
        },
        'letter-up': {
          '0%': { opacity: '0', transform: 'translateY(80%) rotate(-4deg)' },
          '100%': { opacity: '1', transform: 'translateY(0) rotate(0deg)' },
        },
        'arrow-bob': {
          '0%, 100%': { transform: 'translateX(0)' },
          '50%': { transform: 'translateX(6px)' },
        },
        breathe: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.05)' },
        },
        drift: {
          '0%, 100%': { transform: 'translate(0, 0)', opacity: '0.25' },
          '25%': { transform: 'translate(18px, -14px)', opacity: '0.6' },
          '50%': { transform: 'translate(8px, -32px)', opacity: '0.85' },
          '75%': { transform: 'translate(-14px, -16px)', opacity: '0.5' },
        },
        'chip-in': {
          '0%': { opacity: '0', transform: 'translateY(8px) scale(0.9)' },
          '60%': { opacity: '1', transform: 'translateY(-2px) scale(1.04)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
      },
      animation: {
        marquee: 'marquee 38s linear infinite',
        'fade-up': 'fade-up 0.7s cubic-bezier(0.2, 0.8, 0.2, 1) backwards',
        float: 'float 9s ease-in-out infinite',
        'float-rev': 'float-rev 11s ease-in-out infinite',
        'pulse-slow': 'pulse-slow 6s ease-in-out infinite',
        'spin-slow': 'spin1 30s linear infinite',
        'spin-medium': 'spin1 8s linear infinite',
        shine: 'shine 2.4s ease-in-out infinite',
        'letter-up': 'letter-up 0.7s cubic-bezier(0.2, 0.8, 0.2, 1) backwards',
        'arrow-bob': 'arrow-bob 1.6s ease-in-out infinite',
        breathe: 'breathe 4.5s ease-in-out infinite',
        drift: 'drift 14s ease-in-out infinite',
        'chip-in': 'chip-in 0.45s cubic-bezier(0.2, 0.8, 0.2, 1)',
      },
    },
  },
  plugins: [],
} satisfies Config;
