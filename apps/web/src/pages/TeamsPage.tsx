import {
  SPORT_THEMES,
  SKILL_LEVEL_LABELS,
  TEAM_ROLE_LABELS,
  type TeamSummary,
} from '@sfa/shared';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';

export function TeamsPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['teams', 'me'],
    queryFn: async () => {
      const { data } = await api.get<{ teams: TeamSummary[] }>('/teams/me');
      return data.teams;
    },
  });

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const r = document.documentElement;
      r.style.setProperty('--mx', `${e.clientX}px`);
      r.style.setProperty('--my', `${e.clientY}px`);
    };
    window.addEventListener('pointermove', onMove);
    return () => window.removeEventListener('pointermove', onMove);
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-night text-cream">
      <div className="mouse-spotlight pointer-events-none fixed inset-0 z-0" aria-hidden />
      <div className="grid-bg pointer-events-none fixed inset-0 z-0" aria-hidden />
      <div className="pointer-events-none fixed inset-0 z-0" aria-hidden>
        <div className="absolute -left-32 top-[18%] size-[28rem] animate-pulse-slow rounded-full bg-primary/15 blur-[120px]" />
      </div>

      <header className="relative z-10 border-b border-cream/10 bg-night/40 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-4">
          <Link
            to="/dashboard"
            className="font-display text-2xl font-black uppercase leading-none tracking-tight text-cream md:text-3xl"
          >
            SportsForAll<span className="text-primary">.</span>
          </Link>
          <Link
            to="/dashboard"
            className="group inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-cream/55 transition hover:text-cream"
          >
            <span aria-hidden className="transition-transform group-hover:-translate-x-1">
              ←
            </span>
            Bảng điều khiển
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-5xl px-6 py-10 md:py-14">
        <div className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-baseline">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-cream/55">
              Đội của tôi
            </p>
            <h1 className="mt-1 font-display text-3xl font-black uppercase tracking-tight text-cream md:text-4xl">
              Các đội bạn đang tham gia
            </h1>
          </div>
          <Link
            to="/teams/new"
            className="rounded-full bg-primary px-5 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-night shadow-[0_18px_50px_-12px_rgb(var(--color-primary))] transition hover:scale-[1.02]"
          >
            + Tạo đội mới
          </Link>
        </div>

        {isLoading && (
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-cream/55">
            Đang tải danh sách đội...
          </p>
        )}

        {isError && (
          <p className="rounded-xl border border-ember/35 bg-ember/10 p-3 font-mono text-[11px] uppercase tracking-wider text-ember">
            Không tải được danh sách đội.
          </p>
        )}

        {data && data.length === 0 && (
          <article className="rounded-3xl border border-dashed border-cream/20 bg-cream/[0.02] p-10 text-center">
            <p className="font-display text-2xl font-black uppercase tracking-tight text-cream">
              Bạn chưa có đội nào.
            </p>
            <p className="mt-2 text-sm text-cream/65">
              Tạo đội đầu tiên để bắt đầu tuyển thành viên và tìm đối thủ.
            </p>
            <Link
              to="/teams/new"
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-night transition hover:scale-[1.02]"
            >
              Tạo đội ngay
              <span aria-hidden className="animate-arrow-bob">→</span>
            </Link>
          </article>
        )}

        {data && data.length > 0 && (
          <ul className="grid gap-4 md:grid-cols-2">
            {data.map((team) => {
              const t = SPORT_THEMES[team.sport];
              return (
                <li key={team.id}>
                  <Link
                    to={`/teams/${team.id}`}
                    className="group block overflow-hidden rounded-3xl border border-cream/15 bg-gradient-to-br from-cream/[0.06] to-cream/[0.02] p-6 backdrop-blur-2xl transition hover:-translate-y-1 hover:border-cream/40"
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className="flex size-14 shrink-0 items-center justify-center rounded-2xl text-3xl"
                        style={{
                          background: `${t.primary}25`,
                          border: `1px solid ${t.primary}55`,
                        }}
                        aria-hidden
                      >
                        {t.emoji}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-display text-xl font-black uppercase leading-tight tracking-tight text-cream">
                          {team.name}
                        </p>
                        <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.22em] text-cream/55">
                          {t.nameVi} · {team.region ?? 'Chưa có khu vực'}
                        </p>
                      </div>
                      <span
                        className="rounded-full bg-cream/[0.06] px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.22em] text-cream/75"
                        style={{ borderColor: `${t.primary}55` }}
                      >
                        {team.viewerRole ? TEAM_ROLE_LABELS[team.viewerRole] : 'Khách'}
                      </span>
                    </div>

                    <div className="mt-5 grid grid-cols-3 gap-3 border-t border-cream/10 pt-5">
                      <Stat n={String(team.memberCount)} label="Thành viên" />
                      <Stat
                        n={team.skillLevel ? SKILL_LEVEL_LABELS[team.skillLevel] : '—'}
                        label="Trình độ"
                      />
                      <Stat n={team.reputation.toFixed(1)} label="Uy tín" />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}

function Stat({ n, label }: { n: string; label: string }) {
  return (
    <div>
      <p className="truncate font-display text-lg font-black leading-none text-primary">{n}</p>
      <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.22em] text-cream/55">{label}</p>
    </div>
  );
}
