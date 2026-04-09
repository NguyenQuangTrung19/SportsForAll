import type { ReactNode } from 'react'

export type AppMenuItem = {
  id: string
  label: string
  path: string
  icon: ReactNode
}

export const appMenuItems: AppMenuItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/dashboard',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="3" y="3" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.8" />
        <rect x="13" y="3" width="8" height="5" rx="2" stroke="currentColor" strokeWidth="1.8" />
        <rect x="13" y="10" width="8" height="11" rx="2" stroke="currentColor" strokeWidth="1.8" />
        <rect x="3" y="13" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    ),
  },
  {
    id: 'my-team',
    label: 'My Team',
    path: '/my-team',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="8" cy="9" r="3" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="16" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.8" />
        <path d="M3.5 19c0-2.7 2.2-4.8 4.8-4.8h.4c2.7 0 4.8 2.2 4.8 4.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M13 19c0-2.1 1.7-3.8 3.8-3.8h.3c2.1 0 3.8 1.7 3.8 3.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'search',
    label: 'Tìm kiếm',
    path: '/search',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" />
        <path d="M16 16l4.5 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'venues',
    label: 'Sân chơi',
    path: '/venues',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="3" y="5" width="18" height="14" rx="3" stroke="currentColor" strokeWidth="1.8" />
        <path d="M12 5v14M3 12h18" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    ),
  },
]
