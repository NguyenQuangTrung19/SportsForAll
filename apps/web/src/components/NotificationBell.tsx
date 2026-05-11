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
          if (next) {
            const unreadIds = items.filter((n) => !n.readAt).map((n) => n.id);
            if (unreadIds.length > 0) markReadMutation.mutate(unreadIds);
          }
        }}
        aria-label={`Thông báo (${unreadCount} chưa đọc)`}
        className="relative inline-flex size-10 items-center justify-center border border-ink/15 bg-white text-ink transition hover:border-ink"
      >
        <BellIcon />
        {unreadCount > 0 && (
          <span className="absolute -right-1.5 -top-1.5 inline-flex h-5 min-w-[1.25rem] items-center justify-center bg-ink px-1 font-display text-xs font-black text-paper">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-30 mt-2 w-80 border border-ink/15 bg-white shadow-[6px_6px_0_rgba(15,17,21,0.08)]">
          <div className="flex items-baseline justify-between border-b border-ink/10 px-4 py-3">
            <p className="font-display text-sm font-black uppercase tracking-tight">
              Thông báo
            </p>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => markAllMutation.mutate()}
                disabled={markAllMutation.isPending}
                className="text-xs font-semibold text-ink-soft transition hover:text-ink disabled:opacity-50"
              >
                Đọc tất cả
              </button>
            )}
          </div>

          <div className="max-h-[26rem] overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-ink-soft">
                Chưa có thông báo
              </p>
            ) : (
              <ul className="divide-y divide-ink/10">
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
    <div className="flex items-start gap-3 px-4 py-3 transition hover:bg-paper-2">
      <span
        className={`mt-1.5 inline-block size-2 shrink-0 ${
          n.readAt ? 'bg-ink/15' : 'bg-primary'
        }`}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold leading-snug text-ink">{n.title}</p>
        {n.message && (
          <p className="mt-0.5 truncate text-xs text-ink-soft">{n.message}</p>
        )}
        <p className="mt-1 text-[11px] text-ink-soft/70">
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
