import type { NotificationListResponse, NotificationView } from '@sfa/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';

export function NotificationBell() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const { data } = useQuery({
    queryKey: ['notifications', 'recent'],
    queryFn: async () => {
      const { data } = await api.get<NotificationListResponse>(
        '/notifications?limit=10',
      );
      return data;
    },
    refetchInterval: 30000,
  });

  const markReadMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await api.post('/notifications/mark-read', { ids });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllMutation = useMutation({
    mutationFn: async () => {
      await api.post('/notifications/mark-read', { all: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const unreadCount = data?.unreadCount ?? 0;
  const items = data?.items ?? [];

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        onClick={() => {
          const next = !open;
          setOpen(next);
          if (next && items.some((n) => !n.readAt)) {
            const unreadIds = items.filter((n) => !n.readAt).map((n) => n.id);
            if (unreadIds.length > 0) markReadMutation.mutate(unreadIds);
          }
        }}
        aria-label={`Thông báo (${unreadCount} chưa đọc)`}
        className="relative inline-flex size-10 items-center justify-center rounded-full border border-cream/15 bg-cream/[0.04] text-cream/75 backdrop-blur-md transition hover:border-cream/40 hover:text-cream"
      >
        <BellIcon />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-primary px-1 font-mono text-[10px] font-bold text-night shadow-[0_4px_12px_-2px_rgb(var(--color-primary))]">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-30 mt-2 w-80 origin-top-right overflow-hidden rounded-2xl border border-cream/15 bg-night/95 backdrop-blur-xl shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)]">
          <div className="flex items-baseline justify-between border-b border-cream/10 px-4 py-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-cream/55">
              Thông báo
            </p>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => markAllMutation.mutate()}
                disabled={markAllMutation.isPending}
                className="font-mono text-[10px] uppercase tracking-[0.22em] text-cream/55 transition hover:text-cream disabled:opacity-50"
              >
                Đọc tất cả
              </button>
            )}
          </div>

          <div className="max-h-[28rem] overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-6 text-center font-mono text-[10px] uppercase tracking-[0.22em] text-cream/45">
                Chưa có thông báo
              </p>
            ) : (
              <ul className="divide-y divide-cream/10">
                {items.map((n) => (
                  <NotificationItem
                    key={n.id}
                    n={n}
                    onClose={() => setOpen(false)}
                  />
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function NotificationItem({
  n,
  onClose,
}: {
  n: NotificationView;
  onClose: () => void;
}) {
  const body = (
    <div className="flex items-start gap-3 px-4 py-3 transition hover:bg-cream/[0.04]">
      <span
        className={`mt-1.5 inline-block size-2 shrink-0 rounded-full ${
          n.readAt ? 'bg-cream/25' : 'bg-primary'
        }`}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p className="font-display text-sm font-bold leading-snug tracking-tight text-cream">
          {n.title}
        </p>
        {n.message && (
          <p className="mt-1 truncate text-xs text-cream/65">{n.message}</p>
        )}
        <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.22em] text-cream/40">
          {new Date(n.createdAt).toLocaleString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
            day: '2-digit',
            month: '2-digit',
          })}
        </p>
      </div>
    </div>
  );

  if (n.link) {
    return (
      <li>
        <Link to={n.link} onClick={onClose} className="block">
          {body}
        </Link>
      </li>
    );
  }
  return <li>{body}</li>;
}

function BellIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}
