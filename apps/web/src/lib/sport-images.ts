import type { SportSlug } from '@sfa/shared';
import badmintonLg from '@/assets/sports/badminton-lg.webp';
import badmintonSm from '@/assets/sports/badminton-sm.webp';
import badmintonTile from '@/assets/sports/badminton-tile.webp';
import basketballLg from '@/assets/sports/basketball-lg.webp';
import basketballSm from '@/assets/sports/basketball-sm.webp';
import basketballTile from '@/assets/sports/basketball-tile.webp';
import footballLg from '@/assets/sports/football-lg.webp';
import footballSm from '@/assets/sports/football-sm.webp';
import footballTile from '@/assets/sports/football-tile.webp';
import tennisLg from '@/assets/sports/tennis-lg.webp';
import tennisSm from '@/assets/sports/tennis-sm.webp';
import tennisTile from '@/assets/sports/tennis-tile.webp';
import volleyballLg from '@/assets/sports/volleyball-lg.webp';
import volleyballSm from '@/assets/sports/volleyball-sm.webp';
import volleyballTile from '@/assets/sports/volleyball-tile.webp';

export interface SportImage {
  /** Ảnh ngang cho hero, kèm srcSet hai cỡ. */
  src: string;
  srcSet: string;
  /** Bản cắt dọc 4:5 quanh vận động viên, dùng cho thẻ môn. */
  tile: string;
}

function build(sm: string, lg: string, tile: string): SportImage {
  return { src: lg, srcSet: `${sm} 960w, ${lg} 1600w`, tile };
}

/**
 * Ảnh mặc định cho từng môn, dùng khi admin chưa thay ảnh nào.
 * Đây là bản nén sẵn; ảnh gốc không nằm trong git.
 * Đổi ảnh: thay file gốc rồi chạy lại bước nén — tên file dẫn xuất giữ nguyên
 * nên không phải sửa ở đây. Xem `src/assets/sports/README.md`.
 */
export const SPORT_IMAGES: Record<SportSlug, SportImage> = {
  football: build(footballSm, footballLg, footballTile),
  basketball: build(basketballSm, basketballLg, basketballTile),
  badminton: build(badmintonSm, badmintonLg, badmintonTile),
  volleyball: build(volleyballSm, volleyballLg, volleyballTile),
  tennis: build(tennisSm, tennisLg, tennisTile),
};
