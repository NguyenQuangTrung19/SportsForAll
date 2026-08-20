import { cn } from '@/lib/cn';

const SIZES = {
  sm: 'size-10 text-sm',
  md: 'size-11 text-base',
  lg: 'size-16 text-2xl',
} as const;

interface AvatarProps {
  name: string;
  src?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
}

/** Ảnh đại diện, tự lùi về chữ cái đầu khi chưa có ảnh. */
export function Avatar({ name, src, size = 'md', className }: AvatarProps) {
  const initial = name.trim().charAt(0).toUpperCase() || '?';

  if (src) {
    return (
      <img
        src={src}
        alt=""
        aria-hidden
        className={cn('shrink-0 object-cover', SIZES[size], className)}
      />
    );
  }

  return (
    <div
      aria-hidden
      className={cn(
        'flex shrink-0 items-center justify-center bg-ink font-display font-black uppercase text-paper',
        SIZES[size],
        className,
      )}
    >
      {initial}
    </div>
  );
}
