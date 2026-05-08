import type { SportSlug } from '@sfa/shared';
import { SPORT_THEMES } from '@sfa/shared';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SportState {
  current: SportSlug;
  setCurrent: (sport: SportSlug) => void;
}

export const useSportStore = create<SportState>()(
  persist(
    (set) => ({
      current: 'football',
      setCurrent: (sport) => set({ current: sport }),
    }),
    { name: 'sfa.sport' },
  ),
);

function hexToRgbTriplet(hex: string): string {
  const trimmed = hex.replace('#', '');
  const r = parseInt(trimmed.slice(0, 2), 16);
  const g = parseInt(trimmed.slice(2, 4), 16);
  const b = parseInt(trimmed.slice(4, 6), 16);
  return `${r} ${g} ${b}`;
}

export function applySportTheme(sport: SportSlug) {
  const theme = SPORT_THEMES[sport];
  const root = document.documentElement;
  root.style.setProperty('--color-primary', hexToRgbTriplet(theme.primary));
  root.style.setProperty('--color-primary-dark', hexToRgbTriplet(theme.primaryDark));
  root.dataset.sport = sport;
}
