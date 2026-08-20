import type { LandingImagesResponse, SportSlug } from '@sfa/shared';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { SPORT_IMAGES, type SportImage } from '@/lib/sport-images';

export const LANDING_IMAGES_KEY = ['landing', 'images'] as const;

const FALLBACK_SLUG = 'football';

/**
 * Ảnh cho trang giới thiệu: lấy bản admin đã thay, môn nào chưa thay thì dùng
 * ảnh mặc định đóng kèm bundle.
 *
 * Ảnh mặc định luôn là giá trị khởi tạo, nên trang vẫn hiện đủ ảnh ngay cả khi
 * API chậm hoặc chết — trang giới thiệu không được phép trắng vì một lời gọi mạng.
 */
export function useLandingImages(): (slug: SportSlug) => SportImage {
  const { data } = useQuery({
    queryKey: LANDING_IMAGES_KEY,
    queryFn: async () => {
      const { data } = await api.get<LandingImagesResponse>('/landing/images');
      return data;
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const merged: Record<string, SportImage> = { ...SPORT_IMAGES };
  for (const item of data?.items ?? []) {
    merged[item.sport] = {
      src: item.largeUrl,
      srcSet: `${item.smallUrl} 960w, ${item.largeUrl} 1600w`,
      tile: item.tileUrl,
    };
  }

  // Môn admin mới thêm chưa có ảnh nào — mượn tạm ảnh của môn đầu tiên để bố cục
  // không vỡ. Admin thấy chỗ đó lặp ảnh là biết cần tải ảnh riêng lên.
  const fallback = merged[FALLBACK_SLUG];
  return (slug) => merged[slug] ?? fallback!;
}
