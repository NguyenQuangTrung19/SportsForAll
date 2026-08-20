import {
  SPORTS,
  SPORT_THEMES,
  POSITIONS_BY_SPORT,
  type SportCatalogItem,
  type SportListResponse,
  type SportSlug,
} from '@sfa/shared';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';

/**
 * Tiền tố khoá cache. Khoá thật còn kèm vai trò người dùng — xem `useSports`.
 * Dùng tiền tố này để vô hiệu hoá thì react-query khớp mọi biến thể.
 */
export const SPORTS_KEY = ['sports'] as const;

/** Năm môn dựng sẵn, dùng khi chưa tải được danh mục từ API. */
const FALLBACK: SportCatalogItem[] = SPORTS.map((slug, i) => ({
  slug,
  nameVi: SPORT_THEMES[slug]?.nameVi ?? slug,
  primary: SPORT_THEMES[slug]?.primary ?? '#0B2E22',
  primaryDark: SPORT_THEMES[slug]?.primaryDark ?? '#071C15',
  iconUrl: null,
  positions: [...(POSITIONS_BY_SPORT[slug] ?? [])],
  sortOrder: i + 1,
  active: true,
}));

/** Môn đã bị xoá khỏi danh mục nhưng vẫn còn trong dữ liệu cũ vẫn phải hiển thị được. */
function unknownSport(slug: SportSlug): SportCatalogItem {
  return {
    slug,
    nameVi: slug,
    primary: '#55605A',
    primaryDark: '#3A423D',
    iconUrl: null,
    positions: [],
    sortOrder: 999,
    active: false,
  };
}

export interface SportsCatalog {
  /** Các môn đang bật, đã sắp thứ tự — dùng cho giao diện người dùng thường. */
  sports: SportCatalogItem[];
  /**
   * Toàn bộ danh mục kể cả môn đã tắt. Trang quản trị phải dùng cái này, nếu
   * dùng `sports` thì tắt môn xong môn biến mất luôn và không bật lại được.
   */
  allSports: SportCatalogItem[];
  /** Tra theo slug — luôn trả về một môn, không bao giờ undefined. */
  sportOf: (slug: SportSlug) => SportCatalogItem;
  isLoading: boolean;
}

/**
 * Danh mục môn thể thao lấy lúc chạy.
 *
 * `sportOf` cố ý không bao giờ trả undefined: dữ liệu cũ có thể trỏ tới môn đã
 * bị tắt hoặc xoá, và một cái đội hiển thị lỗi thì tệ hơn nhiều so với hiển thị
 * tên slug thô.
 */
export function useSports(): SportsCatalog {
  // API chỉ trả cờ `inUse` cho admin. Nếu khoá cache không phân biệt vai trò thì
  // bản khách (không có `inUse`) tải trước ở trang giới thiệu sẽ được dùng lại
  // cho trang quản trị suốt 5 phút — làm nút "Xoá môn" lúc hiện lúc không.
  const role = useAuthStore((s) => s.user?.role ?? 'guest');

  const { data, isLoading } = useQuery({
    queryKey: [...SPORTS_KEY, role],
    queryFn: async () => {
      const { data } = await api.get<SportListResponse>('/sports');
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });

  return useMemo(() => {
    const items = data?.items.length ? data.items : FALLBACK;
    const map = new Map(items.map((s) => [s.slug, s]));
    return {
      sports: items.filter((s) => s.active),
      allSports: items,
      sportOf: (slug: SportSlug) => map.get(slug) ?? unknownSport(slug),
      isLoading,
    };
  }, [data, isLoading]);
}
