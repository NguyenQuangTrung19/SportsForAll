import { useEffect, useRef } from 'react';

/**
 * Bám con trỏ và ghi hai biến CSS `--px` / `--py` (khoảng -1..1) lên phần tử.
 *
 * Giá trị được nội suy dần từng khung hình thay vì gán thẳng — gán thẳng thì
 * các lớp giật theo chuột, nội suy mới ra cảm giác có quán tính.
 * Tôn trọng `prefers-reduced-motion`: ai tắt hiệu ứng thì đứng yên hoàn toàn.
 */
export function usePointerParallax<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const target = { x: 0, y: 0 };
    const current = { x: 0, y: 0 };
    let frame = 0;

    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      target.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      target.y = ((e.clientY - r.top) / r.height) * 2 - 1;
    };
    const onLeave = () => {
      target.x = 0;
      target.y = 0;
    };

    const tick = () => {
      // 0.075 = độ trễ. Nhỏ hơn thì trôi chậm và mượt hơn, lớn hơn thì bám sát chuột.
      current.x += (target.x - current.x) * 0.075;
      current.y += (target.y - current.y) * 0.075;
      el.style.setProperty('--px', current.x.toFixed(4));
      el.style.setProperty('--py', current.y.toFixed(4));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerleave', onLeave);
    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
    };
  }, []);

  return ref;
}
