import { Link } from 'react-router-dom';
import { oauthStartUrl, useAuthProviders } from '@/lib/auth-providers';

/**
 * Khung chung cho các trang xác thực phụ (quên mật khẩu, OTP, xác thực email...).
 * Trang đăng nhập / đăng ký có bố cục poster riêng nên không dùng khung này.
 */
export function AuthLayout({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="border-b border-ink/10">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <Link to="/" className="font-display text-2xl font-black leading-none tracking-tight">
            SportsForAll<span className="text-primary-dark">.</span>
          </Link>
          <Link to="/login" className="text-sm font-semibold text-ink-soft hover:text-ink">
            Đăng nhập →
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-md px-4 py-12 md:py-20">
        <article className="border border-ink/15 bg-white p-8 shadow-[6px_6px_0_rgba(15,17,21,0.08)] md:p-10">
          <header className="border-b border-ink/10 pb-4">
            <p className="text-xs font-bold tracking-wide text-ink-soft">{eyebrow}</p>
            <h1 className="mt-1 font-display text-2xl font-black tracking-tight">{title}</h1>
          </header>
          <div className="mt-6">{children}</div>
        </article>
      </main>
    </div>
  );
}

export function FormError({ children }: { children: React.ReactNode }) {
  return (
    <p className="border border-rust bg-rust/5 px-3 py-2 text-sm font-medium text-rust">
      {children}
    </p>
  );
}

/** Google / Facebook / số điện thoại — chỉ hiện cách nào server đã bật. */
export function AltSignIn() {
  const { data: p } = useAuthProviders();
  if (!p || !(p.google || p.facebook || p.sms)) return null;
  return (
    <div className="space-y-3">
      {p.google && (
        <a href={oauthStartUrl('google')} className="btn-ghost w-full">
          Tiếp tục với Google
        </a>
      )}
      {p.facebook && (
        <a href={oauthStartUrl('facebook')} className="btn-ghost w-full">
          Tiếp tục với Facebook
        </a>
      )}
      {p.sms && (
        <Link to="/phone-login" className="btn-ghost w-full">
          Dùng số điện thoại
        </Link>
      )}
    </div>
  );
}
