import { useMutation } from '@tanstack/react-query';
import { api, apiMessage } from '@/lib/api';
import { useAuthProviders } from '@/lib/auth-providers';
import { useAuthStore } from '@/stores/auth-store';

/** Nhắc xác thực email (FR-001.7). Không chặn dùng app — chỉ nhắc cho tới khi xong. */
export function VerifyEmailBanner() {
  const user = useAuthStore((s) => s.user);
  const { data: providers } = useAuthProviders();
  const resend = useMutation({ mutationFn: () => api.post('/auth/resend-verification') });

  if (!user?.email || user.emailVerified || !providers?.email) return null;
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border border-ink/15 bg-white px-4 py-3">
      <p className="text-sm">
        Xác thực email <strong>{user.email}</strong> — bấm link trong thư chúng tôi đã gửi.
      </p>
      {resend.isSuccess ? (
        <span className="text-sm font-semibold text-ink-soft">Đã gửi lại, kiểm tra hộp thư</span>
      ) : (
        <button
          type="button"
          onClick={() => resend.mutate()}
          disabled={resend.isPending}
          className="btn-ghost"
        >
          {resend.isPending ? 'Đang gửi...' : 'Gửi lại link'}
        </button>
      )}
      {resend.isError && (
        <p className="w-full text-sm font-medium text-rust">
          {apiMessage(resend.error, 'Không gửi được, thử lại sau')}
        </p>
      )}
    </div>
  );
}
