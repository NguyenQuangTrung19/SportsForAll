import {
  POSITIONS_BY_SPORT,
  SKILL_LEVELS,
  SKILL_LEVEL_LABELS,
  SPORTS,
  SPORT_THEMES,
  type ProfileResponse,
  type SkillLevel,
  type SportPreference,
  type SportSlug,
  type UpdateProfileInput,
} from '@sfa/shared';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';

const CURRENT_YEAR = new Date().getFullYear();
const MIN_YEAR = 1950;

interface EditState {
  displayName: string;
  bio: string;
  birthYear: number | '';
  region: string;
  prefs: SportPreference[];
}

function buildEditState(p: ProfileResponse): EditState {
  return {
    displayName: p.displayName,
    bio: p.bio ?? '',
    birthYear: p.birthYear ?? '',
    region: p.region ?? '',
    prefs: p.sportPreferences.map((sp) => ({ ...sp })),
  };
}

export function ProfilePage() {
  const updateAuthUser = useAuthStore((s) => s.updateUser);
  const queryClient = useQueryClient();

  const profileQuery = useQuery({
    queryKey: ['profile', 'me'],
    queryFn: async () => {
      const { data } = await api.get<ProfileResponse>('/profile/me');
      return data;
    },
  });

  const [editing, setEditing] = useState(false);
  const [state, setState] = useState<EditState | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    if (profileQuery.data && state === null) {
      setState(buildEditState(profileQuery.data));
    }
  }, [profileQuery.data, state]);

  const profile = profileQuery.data;

  const mutation = useMutation({
    mutationFn: async (payload: UpdateProfileInput) => {
      const { data } = await api.put<ProfileResponse>('/profile/me', payload);
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['profile', 'me'], data);
      setState(buildEditState(data));
      setEditing(false);
      if (data.displayName) updateAuthUser({ displayName: data.displayName });
    },
    onError: (err: unknown) => {
      const message =
        err instanceof AxiosError
          ? (err.response?.data as { error?: { message?: string } })?.error?.message
          : null;
      setServerError(message ?? 'Không lưu được, thử lại sau');
    },
  });

  const onSave = () => {
    if (!state) return;
    setServerError(null);
    if (state.displayName.trim().length < 2) {
      setServerError('Tên hiển thị tối thiểu 2 ký tự');
      return;
    }
    if (state.region.trim().length > 0 && state.region.trim().length < 2) {
      setServerError('Khu vực tối thiểu 2 ký tự');
      return;
    }
    if (
      state.birthYear !== '' &&
      (state.birthYear < MIN_YEAR || state.birthYear > CURRENT_YEAR)
    ) {
      setServerError(`Năm sinh phải nằm trong khoảng ${MIN_YEAR}–${CURRENT_YEAR}`);
      return;
    }
    const payload: UpdateProfileInput = {
      displayName: state.displayName.trim(),
      bio: state.bio.trim() || null,
      birthYear: state.birthYear === '' ? null : Number(state.birthYear),
      region: state.region.trim() || null,
      sportPreferences: state.prefs.map((p) => ({
        sport: p.sport,
        skillLevel: p.skillLevel,
        position: p.position?.trim() || null,
      })),
    };
    mutation.mutate(payload);
  };

  const onCancel = () => {
    if (profile) setState(buildEditState(profile));
    setEditing(false);
    setServerError(null);
  };

  const togglePref = (sport: SportSlug) => {
    if (!state) return;
    const exists = state.prefs.find((p) => p.sport === sport);
    setState({
      ...state,
      prefs: exists
        ? state.prefs.filter((p) => p.sport !== sport)
        : [...state.prefs, { sport, skillLevel: 'beginner' as SkillLevel, position: null }],
    });
  };

  const setPrefSkill = (sport: SportSlug, skillLevel: SkillLevel) => {
    if (!state) return;
    setState({
      ...state,
      prefs: state.prefs.map((p) => (p.sport === sport ? { ...p, skillLevel } : p)),
    });
  };

  const setPrefPosition = (sport: SportSlug, position: string) => {
    if (!state) return;
    setState({
      ...state,
      prefs: state.prefs.map((p) =>
        p.sport === sport ? { ...p, position: position || null } : p,
      ),
    });
  };

  const initial = useMemo(
    () => (profile?.displayName ?? '?').trim().charAt(0).toUpperCase(),
    [profile?.displayName],
  );

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
        <div className="mb-8 flex items-baseline justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-cream/55">
              Hồ sơ cá nhân
            </p>
            <h1 className="mt-1 font-display text-3xl font-black uppercase tracking-tight text-cream md:text-4xl">
              {profile?.displayName ?? '...'}
            </h1>
          </div>
          {profile && !editing && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="rounded-full border border-cream/20 bg-cream/[0.03] px-4 py-2 font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-cream transition hover:border-cream/55 hover:bg-cream/[0.08]"
            >
              Chỉnh sửa
            </button>
          )}
        </div>

        {profileQuery.isLoading && (
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-cream/55">
            Đang tải hồ sơ...
          </p>
        )}

        {profileQuery.isError && (
          <p className="rounded-xl border border-ember/35 bg-ember/10 p-3 font-mono text-[11px] uppercase tracking-wider text-ember">
            Không tải được hồ sơ. Thử tải lại trang.
          </p>
        )}

        {profile && state && (
          <div className="grid gap-6 lg:grid-cols-12">
            {/* LEFT card */}
            <article className="relative overflow-hidden rounded-3xl border border-cream/15 bg-gradient-to-br from-cream/[0.06] to-cream/[0.02] p-6 backdrop-blur-2xl md:p-8 lg:col-span-5">
              <div className="flex items-start gap-4">
                <div
                  className="flex size-16 shrink-0 items-center justify-center rounded-2xl border border-primary/40 bg-primary/15 font-display text-2xl font-black uppercase text-primary"
                  aria-hidden
                >
                  {initial}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-cream/55">
                    {profile.email}
                  </p>
                  <p className="mt-1 truncate font-mono text-[10px] tracking-[0.18em] text-cream/40">
                    Tham gia · {new Date(profile.createdAt).toLocaleDateString('vi-VN')}
                  </p>
                </div>
              </div>

              <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-cream/10 pt-6">
                <Stat label="Uy tín" value={profile.reputation.toFixed(1)} />
                <Stat label="Môn" value={String(profile.sportPreferences.length)} />
                <Stat
                  label="Năm sinh"
                  value={profile.birthYear ? String(profile.birthYear) : '—'}
                />
                <Stat label="Khu vực" value={profile.region ?? '—'} />
              </dl>

              {profile.bio && !editing && (
                <p className="mt-6 border-t border-cream/10 pt-6 text-sm leading-relaxed text-cream/75">
                  {profile.bio}
                </p>
              )}
            </article>

            {/* RIGHT — view or edit */}
            <article className="relative overflow-hidden rounded-3xl border border-cream/15 bg-gradient-to-br from-cream/[0.06] to-cream/[0.02] p-6 backdrop-blur-2xl md:p-8 lg:col-span-7">
              {!editing ? (
                <ViewMode profile={profile} />
              ) : (
                <EditMode
                  state={state}
                  setState={setState}
                  togglePref={togglePref}
                  setPrefSkill={setPrefSkill}
                  setPrefPosition={setPrefPosition}
                />
              )}

              {serverError && (
                <p className="mt-6 rounded-xl border border-ember/35 bg-ember/10 p-3 font-mono text-[11px] uppercase tracking-wider text-ember">
                  {serverError}
                </p>
              )}

              {editing && (
                <div className="mt-8 flex flex-col gap-3 border-t border-cream/10 pt-6 sm:flex-row sm:items-center sm:justify-end">
                  <button
                    type="button"
                    onClick={onCancel}
                    disabled={mutation.isPending}
                    className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-cream/65 transition hover:text-cream disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Huỷ
                  </button>
                  <button
                    type="button"
                    onClick={onSave}
                    disabled={mutation.isPending}
                    className="rounded-full bg-primary px-6 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-night shadow-[0_18px_50px_-12px_rgb(var(--color-primary))] transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {mutation.isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
                  </button>
                </div>
              )}
            </article>
          </div>
        )}
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-mono text-[10px] uppercase tracking-[0.22em] text-cream/55">
        {label}
      </dt>
      <dd className="mt-1 font-display text-xl font-black text-primary">{value}</dd>
    </div>
  );
}

function ViewMode({ profile }: { profile: ProfileResponse }) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-cream/55">
        Môn thể thao & trình độ
      </p>
      <h2 className="mt-1 font-display text-2xl font-black uppercase tracking-tight text-cream">
        Hồ sơ thể thao
      </h2>

      {profile.sportPreferences.length === 0 ? (
        <p className="mt-4 text-sm text-cream/65">
          Chưa có môn nào. Bấm "Chỉnh sửa" để thêm.
        </p>
      ) : (
        <ul className="mt-5 space-y-3">
          {profile.sportPreferences.map((pref) => {
            const t = SPORT_THEMES[pref.sport];
            const stars = SKILL_LEVELS.indexOf(pref.skillLevel) + 1;
            return (
              <li
                key={pref.sport}
                className="flex items-center gap-4 rounded-xl border border-cream/10 bg-cream/[0.03] p-4"
              >
                <span className="text-2xl" aria-hidden>
                  {t.emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-base font-black uppercase tracking-tight text-cream">
                    {t.nameVi}
                  </p>
                  <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.22em] text-cream/55">
                    {SKILL_LEVEL_LABELS[pref.skillLevel]}
                    {pref.position ? ` · ${pref.position}` : ''}
                  </p>
                </div>
                <span className="font-mono text-xs tracking-wide text-primary" aria-hidden>
                  {'⭐'.repeat(stars)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function EditMode({
  state,
  setState,
  togglePref,
  setPrefSkill,
  setPrefPosition,
}: {
  state: EditState;
  setState: (s: EditState) => void;
  togglePref: (sport: SportSlug) => void;
  setPrefSkill: (sport: SportSlug, lvl: SkillLevel) => void;
  setPrefPosition: (sport: SportSlug, pos: string) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-cream/55">
          Thông tin cơ bản
        </p>
        <div className="mt-3 grid gap-4 md:grid-cols-2">
          <label className="block md:col-span-2">
            <span className="mb-2 block font-mono text-[10px] font-semibold uppercase tracking-[0.3em] text-cream/55">
              Tên hiển thị
            </span>
            <input
              type="text"
              value={state.displayName}
              onChange={(e) => setState({ ...state, displayName: e.target.value })}
              className="dark-input"
              maxLength={50}
            />
          </label>

          <label className="block">
            <span className="mb-2 block font-mono text-[10px] font-semibold uppercase tracking-[0.3em] text-cream/55">
              Năm sinh
            </span>
            <input
              type="number"
              value={state.birthYear === '' ? '' : state.birthYear}
              min={MIN_YEAR}
              max={CURRENT_YEAR}
              onChange={(e) =>
                setState({
                  ...state,
                  birthYear: e.target.value === '' ? '' : Number(e.target.value),
                })
              }
              className="dark-input"
            />
          </label>

          <label className="block">
            <span className="mb-2 block font-mono text-[10px] font-semibold uppercase tracking-[0.3em] text-cream/55">
              Khu vực
            </span>
            <input
              type="text"
              value={state.region}
              onChange={(e) => setState({ ...state, region: e.target.value })}
              className="dark-input"
              maxLength={100}
            />
          </label>

          <label className="block md:col-span-2">
            <span className="mb-2 block font-mono text-[10px] font-semibold uppercase tracking-[0.3em] text-cream/55">
              Giới thiệu
            </span>
            <textarea
              value={state.bio}
              onChange={(e) => setState({ ...state, bio: e.target.value })}
              rows={3}
              maxLength={500}
              className="dark-input resize-none"
            />
            <span className="mt-1 block text-right font-mono text-[10px] uppercase tracking-[0.22em] text-cream/40">
              {state.bio.length}/500
            </span>
          </label>
        </div>
      </div>

      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-cream/55">
          Môn thể thao
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {SPORTS.map((slug) => {
            const t = SPORT_THEMES[slug];
            const isOn = state.prefs.some((p) => p.sport === slug);
            return (
              <button
                key={slug}
                type="button"
                onClick={() => togglePref(slug)}
                className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] transition ${
                  isOn
                    ? 'border-transparent bg-primary text-night shadow-[0_10px_24px_-10px_rgb(var(--color-primary))]'
                    : 'border-cream/15 bg-cream/[0.03] text-cream hover:border-cream/40'
                }`}
              >
                <span aria-hidden>{t.emoji}</span>
                <span>{t.nameVi}</span>
              </button>
            );
          })}
        </div>

        {state.prefs.length > 0 && (
          <div className="mt-5 space-y-4">
            {state.prefs.map((pref) => {
              const t = SPORT_THEMES[pref.sport];
              return (
                <div
                  key={pref.sport}
                  className="rounded-xl border border-cream/10 bg-cream/[0.03] p-4"
                >
                  <header className="mb-3 flex items-center gap-2">
                    <span className="text-xl" aria-hidden>
                      {t.emoji}
                    </span>
                    <h4 className="font-display text-base font-black uppercase tracking-tight text-cream">
                      {t.nameVi}
                    </h4>
                  </header>

                  <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cream/55">
                    Trình độ
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {SKILL_LEVELS.map((lvl, idx) => {
                      const isOn = pref.skillLevel === lvl;
                      return (
                        <button
                          key={lvl}
                          type="button"
                          onClick={() => setPrefSkill(pref.sport, lvl)}
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em] transition ${
                            isOn
                              ? 'border-transparent bg-cream/15 text-cream'
                              : 'border-cream/10 bg-night/20 text-cream/65 hover:border-cream/30 hover:text-cream'
                          }`}
                        >
                          <span aria-hidden>{'⭐'.repeat(idx + 1)}</span>
                          <span>{SKILL_LEVEL_LABELS[lvl]}</span>
                        </button>
                      );
                    })}
                  </div>

                  <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.22em] text-cream/55">
                    Vị trí
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {POSITIONS_BY_SPORT[pref.sport].map((pos) => {
                      const isOn = pref.position === pos;
                      return (
                        <button
                          key={pos}
                          type="button"
                          onClick={() =>
                            setPrefPosition(pref.sport, isOn ? '' : pos)
                          }
                          className={`rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em] transition ${
                            isOn
                              ? 'border-cream/40 bg-cream/10 text-cream'
                              : 'border-cream/10 bg-night/20 text-cream/65 hover:border-cream/30 hover:text-cream'
                          }`}
                        >
                          {pos}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
