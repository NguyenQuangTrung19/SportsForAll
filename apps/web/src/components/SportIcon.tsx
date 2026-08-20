import type { SportSlug } from '@sfa/shared';
import type { CSSProperties } from 'react';
import { useSports } from '@/lib/use-sports';

/**
 * Icon của một môn.
 *
 * Ưu tiên icon admin tải lên; môn nào chưa có thì dùng hình vẽ SVG dựng sẵn.
 * Tra danh mục ngay trong component để mọi nơi gọi `<SportIcon sport={...} />`
 * tự hiện icon mới, không phải sửa từng chỗ gọi.
 */
export function SportIcon({
  sport,
  className,
  style,
}: {
  sport: SportSlug;
  className?: string;
  style?: CSSProperties;
}) {
  const { sportOf } = useSports();
  const iconUrl = sportOf(sport).iconUrl;

  if (iconUrl) {
    /*
     * Tô bằng mask thay vì đặt <img>: chỉ lấy hình dạng từ kênh alpha, phần màu
     * đến từ `currentColor`. Nhờ vậy icon tải lên đổi màu theo ngữ cảnh y hệt
     * icon dựng sẵn — cùng một icon dùng được trên ô màu môn (chữ trắng), nền
     * vôi (chữ đậm) và nền xanh thông (chữ lime), không cần ba phiên bản.
     */
    const mask = `url("${encodeURI(iconUrl)}") center / contain no-repeat`;
    return (
      <span
        aria-hidden
        className={className}
        style={{
          display: 'inline-block',
          backgroundColor: 'currentColor',
          mask,
          WebkitMask: mask,
          ...style,
        }}
      />
    );
  }

  const common = {
    viewBox: '0 0 48 48',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className,
    style,
    'aria-hidden': true,
  };

  switch (sport) {
    case 'football':
      return (
        <svg {...common}>
          <circle cx="24" cy="24" r="18" />
          <path d="M24 13.5 32 19.3 28.9 28.7H19.1L16 19.3z" />
          <path d="M24 6v7.5M39.5 18.2 32 19.3M35.4 37.4 28.9 28.7M12.6 37.4l6.5-8.7M8.5 18.2l7.5 1.1" />
        </svg>
      );
    case 'basketball':
      return (
        <svg {...common}>
          <circle cx="24" cy="24" r="18" />
          <path d="M24 6v36M6 24h36" />
          <path d="M11.3 11.3c7 7 7 18.4 0 25.4M36.7 11.3c-7 7-7 18.4 0 25.4" />
        </svg>
      );
    case 'badminton':
      return (
        <svg {...common}>
          <circle cx="31" cy="17" r="6.5" />
          <path d="M31 23.5 24.5 34M26 12.5 14 26.5M36 22 22.5 34M20.5 30.5 10 41M14 26.5l-4 6.5 8 8 6.5-4" />
        </svg>
      );
    case 'volleyball':
      return (
        <svg {...common}>
          <circle cx="24" cy="24" r="18" />
          <path d="M24 6c-6 8-6 28 0 36M24 6c6 8 6 28 0 36" />
          <path d="M7 18c9 3 25 3 34 0M7 30c9-3 25-3 34 0" />
        </svg>
      );
    case 'tennis':
      return (
        <svg {...common}>
          <circle cx="24" cy="24" r="18" />
          <path d="M11.3 11.3C18 18 18 30 11.3 36.7M36.7 11.3C30 18 30 30 36.7 36.7" />
        </svg>
      );
    default:
      // Môn admin thêm sau này không có hình vẽ sẵn — dùng ký hiệu chung
      // thay vì không vẽ gì, vì trả về undefined sẽ để lại một khoảng trống.
      return (
        <svg {...common}>
          <circle cx="24" cy="24" r="18" />
          <path d="M24 6v36" />
          <path d="M13 11c5 8 5 18 0 26M35 11c-5 8-5 18 0 26" />
        </svg>
      );
  }
}
