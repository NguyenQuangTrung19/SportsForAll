import type { ProfileResponse } from '@sfa/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { Avatar } from '@/components/Avatar';
import { api, apiMessage } from '@/lib/api';

/** Đổi / gỡ ảnh đại diện (FR-002.3). */
export function AvatarUploader({ profile }: { profile: ProfileResponse }) {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onDone = (data: ProfileResponse) => {
    queryClient.setQueryData(['profile', 'me'], data);
    setError(null);
  };

  const upload = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append('avatar', file);
      const { data } = await api.post<ProfileResponse>('/profile/me/avatar', form);
      return data;
    },
    onSuccess: onDone,
    onError: (err) => setError(apiMessage(err, 'Không tải được ảnh lên')),
  });

  const remove = useMutation({
    mutationFn: async () => {
      const { data } = await api.delete<ProfileResponse>('/profile/me/avatar');
      return data;
    },
    onSuccess: onDone,
    onError: (err) => setError(apiMessage(err, 'Không gỡ được ảnh')),
  });

  const busy = upload.isPending || remove.isPending;

  return (
    <div>
      <div className="flex items-start gap-4">
        <Avatar name={profile.displayName} src={profile.avatarUrl} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
              className="border border-ink/20 px-3 py-1.5 text-xs font-bold transition hover:border-ink disabled:opacity-50"
            >
              {upload.isPending ? 'Đang tải...' : profile.avatarUrl ? 'Đổi ảnh' : 'Tải ảnh lên'}
            </button>
            {profile.avatarUrl && (
              <button
                type="button"
                onClick={() => remove.mutate()}
                disabled={busy}
                className="text-xs font-semibold text-ink-soft transition hover:text-rust disabled:opacity-50"
              >
                Gỡ ảnh
              </button>
            )}
          </div>
          <p className="mt-2 text-[11px] text-ink-soft/70">JPG, PNG hoặc WebP · tối đa 2MB</p>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = ''; // cho phép chọn lại đúng file vừa chọn
          if (file) upload.mutate(file);
        }}
      />

      {error && (
        <p className="mt-3 border border-rust bg-rust/5 px-3 py-2 text-xs font-medium text-rust">
          {error}
        </p>
      )}
    </div>
  );
}
