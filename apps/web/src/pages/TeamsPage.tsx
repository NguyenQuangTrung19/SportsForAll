import {
  SPORT_THEMES,
  SKILL_LEVEL_LABELS,
  TEAM_ROLE_LABELS,
  type TeamSummary,
} from '@sfa/shared';
import { useQuery } from '@tanstack/react-query';
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

  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="border-b border-ink/10">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-4">
          <Link
            to="/dashboard"
            className="font-display text-2xl font-black uppercase leading-none tracking-tight"
          >
            SportsForAll<span className="text-primary">.</span>
          </Link>
          <Link to="/dashboard" className="text-sm font-semibold text-ink-soft hover:text-ink">
            ← Bảng điều khiển
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10 md:py-14">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-ink-soft">
              Đội của tôi
            </p>
            <h1 className="mt-2 font-display text-4xl font-black uppercase leading-[0.9] tracking-tight md:text-5xl">
              Các đội bạn đang tham gia
            </h1>
            <div
              className="mt-3 h-[3px] w-32 origin-left bg-ink animate-draw-line"
              aria-hidden
            />
          </div>
          <Link to="/teams/new" className="btn-primary">
            + Tạo đội mới
          </Link>
        </div>

        <div className="mt-10">
          {isLoading && <p className="text-sm text-ink-soft">Đang tải...</p>}

          {isError && (
            <p className="border border-rust bg-rust/5 px-3 py-2 text-sm font-medium text-rust">
              Không tải được danh sách đội.
            </p>
          )}

          {data && data.length === 0 && (
            <article className="border border-dashed border-ink/25 bg-white p-10 text-center">
              <p className="font-display text-2xl font-black uppercase leading-tight tracking-tight">
                Bạn chưa có đội nào.
              </p>
              <p className="mt-2 text-sm text-ink-soft">
                Tạo đội đầu tiên để bắt đầu tuyển thành viên và tìm đối thủ.
              </p>
              <Link to="/teams/new" className="btn-primary mt-5">
                Tạo đội ngay <span aria-hidden>→</span>
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
                      className="group block border border-ink/12 bg-white p-6 transition hover:border-ink hover:shadow-[6px_6px_0_rgba(15,17,21,0.08)]"
                    >
                      <div className="flex items-start gap-4">
                        <span
                          className="flex size-14 shrink-0 items-center justify-center text-2xl"
                          style={{ backgroundColor: t.primary, color: '#fff' }}
                          aria-hidden
                        >
                          {t.emoji}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-display text-xl font-black uppercase leading-tight tracking-tight">
                            {team.name}
                          </p>
                          <p className="mt-0.5 text-xs text-ink-soft">
                            {t.nameVi}
                            {team.region ? ` · ${team.region}` : ''}
                          </p>
                        </div>
                        <span className="border border-ink/15 bg-paper-2/40 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-ink-soft">
                          {team.viewerRole ? TEAM_ROLE_LABELS[team.viewerRole] : 'Khách'}
                        </span>
                      </div>

                      <dl className="mt-5 grid grid-cols-3 gap-4 border-t border-ink/10 pt-4">
                        <Stat n={String(team.memberCount)} label="Thành viên" />
                        <Stat
                          n={team.skillLevel ? SKILL_LEVEL_LABELS[team.skillLevel] : '—'}
                          label="Trình độ"
                          small
                        />
                        <Stat n={team.reputation.toFixed(1)} label="Uy tín" />
                      </dl>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}

function Stat({ n, label, small = false }: { n: string; label: string; small?: boolean }) {
  return (
    <div>
      <p
        className={
          small
            ? 'truncate font-display text-sm font-black uppercase tracking-tight text-ink'
            : 'poster-num truncate text-2xl text-ink'
        }
      >
        {n}
      </p>
      <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-ink-soft">
        {label}
      </p>
    </div>
  );
}
