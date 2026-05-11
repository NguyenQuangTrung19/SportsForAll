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
    primary: '#00A843',
    primaryDark: '#007A30',
  },
  basketball: {
    slug: 'basketball',
    nameVi: 'Bóng rổ',
    emoji: '🏀',
    primary: '#DE5400',
    primaryDark: '#A33D00',
  },
  badminton: {
    slug: 'badminton',
    nameVi: 'Cầu lông',
    emoji: '🏸',
    primary: '#1559AB',
    primaryDark: '#0E3D75',
  },
  volleyball: {
    slug: 'volleyball',
    nameVi: 'Bóng chuyền',
    emoji: '🏐',
    primary: '#B87A00',
    primaryDark: '#8A5A00',
  },
  tennis: {
    slug: 'tennis',
    nameVi: 'Tennis',
    emoji: '🎾',
    primary: '#4F7A1F',
    primaryDark: '#385514',
  },
};
