/**
 * Slug môn thể thao. Trước đây là union 5 giá trị vì Sport là enum Postgres;
 * giờ danh mục nằm trong bảng và admin thêm được nên phải là chuỗi tự do.
 * Danh sách thật lấy từ `GET /api/sports`.
 */
export type SportSlug = string;

/** Năm môn khởi điểm. Chỉ dùng làm dự phòng khi chưa tải được danh mục từ API. */
export const SPORTS: readonly SportSlug[] = [
  'football',
  'basketball',
  'badminton',
  'volleyball',
  'tennis',
];

export interface SportTheme {
  slug: SportSlug;
  nameVi: string;
  primary: string;
  primaryDark: string;
}

/** Dự phòng — dữ liệu thật đến từ cột Sport.positions. */
export const POSITIONS_BY_SPORT: Record<string, readonly string[]> = {
  football: ['Thủ môn', 'Hậu vệ', 'Tiền vệ', 'Tiền đạo'],
  basketball: ['Point Guard', 'Shooting Guard', 'Small Forward', 'Power Forward', 'Center'],
  badminton: ['Đơn', 'Đôi', 'Đôi nam nữ'],
  volleyball: ['Chuyền 2', 'Đối chuyền', 'Chủ công', 'Phụ công', 'Libero'],
  tennis: ['Đơn', 'Đôi'],
} as const;

/** Dự phòng — dữ liệu thật đến từ bảng Sport. */
export const SPORT_THEMES: Record<string, SportTheme> = {
  football: {
    slug: 'football',
    nameVi: 'Bóng đá',
    primary: '#00A843',
    primaryDark: '#007A30',
  },
  basketball: {
    slug: 'basketball',
    nameVi: 'Bóng rổ',
    primary: '#DE5400',
    primaryDark: '#A33D00',
  },
  badminton: {
    slug: 'badminton',
    nameVi: 'Cầu lông',
    primary: '#1559AB',
    primaryDark: '#0E3D75',
  },
  volleyball: {
    slug: 'volleyball',
    nameVi: 'Bóng chuyền',
    primary: '#B87A00',
    primaryDark: '#8A5A00',
  },
  tennis: {
    slug: 'tennis',
    nameVi: 'Tennis',
    primary: '#4F7A1F',
    primaryDark: '#385514',
  },
};

/** Một môn trong danh mục, do API trả về. */
export interface SportCatalogItem {
  slug: SportSlug;
  nameVi: string;
  primary: string;
  primaryDark: string;
  iconUrl: string | null;
  positions: string[];
  sortOrder: number;
  active: boolean;
  /** Có dữ liệu tham chiếu tới hay chưa — còn thì không xoá được. */
  inUse?: boolean;
}

export interface SportListResponse {
  items: SportCatalogItem[];
}
