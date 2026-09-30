import { OAUTH_PROVIDER_LABELS, type OAuthProviderName, type ProfileResponse } from '@sfa/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FormError } from '@/components/AuthLayout';
import { api, apiMessage } from '@/lib/api';
import { useAuthProviders } from '@/lib/auth-providers';

const PROVIDERS: OAuthProviderName[] = ['google', 'facebook'];

/**
 * Chuyển cả trang sang /start bằng form POST: mã liên kết đi trong body, không nằm
 * trên URL (URL lọt vào log — xem `oauthStart` phía API).
 */
function submitLinkForm(startUrl: string, token: string) {
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = startUrl;
  const input = document.createElement('input');
  input.type = 'hidden';
  input.name = 'link';
  input.value = token;
  form.append(input);
  document.body.append(form);
  form.submit();
}

/** Liên kết / gỡ Google, Facebook cho tài khoản đang đăng nhập. */
export function LinkedAccountsCard({ profile }: { profile: ProfileResponse }) {
  const { data: enabled } = useAuthProviders();
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();
  const linked = params.get('linked') as OAuthProviderName | null;
  const linkError = params.get('linkError');

  // API chuyển về /profile?linked=... sau khi liên kết — hồ sơ trong cache đã cũ.
  useEffect(() => {
    if (linked) void queryClient.invalidateQueries({ queryKey: ['profile', 'me'] });
  }, [linked, queryClient]);

  const link = useMutation({
    mutationFn: async (provider: OAuthProviderName) =>
      (await api.post<{ token: string; startUrl: string }>(`/auth/oauth/${provider}/link`)).data,
    onSuccess: ({ token, startUrl }) => submitLinkForm(startUrl, token),
  });
  const unlink = useMutation({
    mutationFn: (provider: OAuthProviderName) => api.delete(`/auth/oauth/${provider}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['profile', 'me'] }),
  });

  // Chỉ hiện nhà cung cấp đang bật, hoặc đã liên kết từ trước (để còn gỡ được).
  const shown = PROVIDERS.filter((p) => enabled?.[p] || profile.linkedProviders.includes(p));
  if (shown.length === 0) return null;

  const clearNotice = () => {
    params.delete('linked');
    params.delete('linkError');
    setParams(params, { replace: true });
  };

  return (
    <section className="mt-6 border border-ink/12 bg-white p-6 md:p-8">
      <h2 className="font-display text-xl font-black tracking-tight">Tài khoản liên kết</h2>
      <p className="mt-1 text-sm text-ink-soft">
        Liên kết để đăng nhập bằng một chạm, không cần nhớ mật khẩu.
      </p>

      {linked && OAUTH_PROVIDER_LABELS[linked] && (
        <p className="mt-4 border border-ink/15 bg-paper-2 px-3 py-2 text-sm font-medium">
          Đã liên kết {OAUTH_PROVIDER_LABELS[linked]}.{' '}
          <button type="button" className="underline" onClick={clearNotice}>
            Đóng
          </button>
        </p>
      )}
      {linkError && (
        <div className="mt-4">
          <FormError>
            {linkError}{' '}
            <button type="button" className="underline" onClick={clearNotice}>
              Đóng
            </button>
          </FormError>
        </div>
      )}

      <ul className="mt-6 divide-y divide-ink/10 border-t border-ink/10">
        {shown.map((p) => {
          const isLinked = profile.linkedProviders.includes(p);
          return (
            <li key={p} className="flex flex-wrap items-center justify-between gap-3 py-4">
              <div>
                <p className="font-semibold">{OAUTH_PROVIDER_LABELS[p]}</p>
                <p className="text-xs text-ink-soft">
                  {isLinked ? 'Đã liên kết' : 'Chưa liên kết'}
                </p>
              </div>
              {isLinked ? (
                <button
                  type="button"
                  className="text-sm font-semibold text-ink-soft transition hover:text-rust disabled:opacity-50"
                  disabled={unlink.isPending}
                  onClick={() => {
                    if (window.confirm(`Gỡ liên kết ${OAUTH_PROVIDER_LABELS[p]}?`))
                      unlink.mutate(p);
                  }}
                >
                  Gỡ liên kết
                </button>
              ) : (
                <button
                  type="button"
                  className="btn-ghost"
                  disabled={link.isPending || !enabled?.[p]}
                  onClick={() => link.mutate(p)}
                >
                  {link.isPending && link.variables === p ? 'Đang chuyển...' : 'Liên kết'}
                </button>
              )}
            </li>
          );
        })}
      </ul>

      {link.isError && (
        <div className="mt-4">
          <FormError>{apiMessage(link.error, 'Không liên kết được, thử lại sau')}</FormError>
        </div>
      )}
      {unlink.isError && (
        <div className="mt-4">
          <FormError>{apiMessage(unlink.error, 'Không gỡ được, thử lại sau')}</FormError>
        </div>
      )}
    </section>
  );
}
