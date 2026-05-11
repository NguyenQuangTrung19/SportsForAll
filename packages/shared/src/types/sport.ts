export const SPORTS = ['football', 'basketball', 'badminton', 'volleyball', 'tennis'] as const;

export type SportSlug = (typeof SPORTS)[number];

export interface SportTheme {
  slug: SportSlug;
  nameVi: string;
  emoji: string;
  primary: string;
  primaryDark: string;
}

export const POSITIONS_BY_SPORT: Record<SportSlug, readonly string[]> = {
  football: ['Thủ môn', 'Hậu vệ', 'Tiền vệ', 'Tiền đạo'],
  basketball: ['Point Guard', 'Shooting Guard', 'Small Forward', 'Power Forward', 'Center'],
  badminton: ['Đơn', 'Đôi', 'Đôi nam nữ'],
  volleyball: ['Chuyền 2', 'Đối chuyền', 'Chủ công', 'Phụ công', 'Libero'],
  tennis: ['Đơn', 'Đôi'],
} as const;

export const SPORT_THEMES: Record<SportSlug, SportTheme> = {
  football: {
    slug: 'football',
    nameVi: 'Bóng đá',
    emoji: '⚽',
    primary: '#00C853',
    primaryDark: '#009624',
  },
  basketball: {
    slug: 'basketball',
    nameVi: 'Bóng rổ',
    emoji: '🏀',
    primary: '#FF6D00',
    primaryDark: '#C43C00',
  },
  badminton: {
    slug: 'badminton',
    nameVi: 'Cầu lông',
    emoji: '🏸',
    primary: '#1976D2',
    primaryDark: '#004BA0',
  },
  volleyball: {
    slug: 'volleyball',
    nameVi: 'Bóng chuyền',
    emoji: '🏐',
    primary: '#F9A825',
    primaryDark: '#C17900',
  },
  tennis: {
    slug: 'tennis',
    nameVi: 'Tennis',
    emoji: '🎾',
    primary: '#7CB342',
    primaryDark: '#4B830D',
  },
};
