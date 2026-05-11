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
      setServerError(`Năm sinh phải trong khoảng ${MIN_YEAR}–${CURRENT_YEAR}`);
      return;
    }
    mutation.mutate({
      displayName: state.displayName.trim(),
      bio: state.bio.trim() || null,
      birthYear: state.birthYear === '' ? null : Number(state.birthYear),
      region: state.region.trim() || null,
      sportPreferences: state.prefs.map((p) => ({
        sport: p.sport,
        skillLevel: p.skillLevel,
        position: p.position?.trim() || null,
      })),
    });
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
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-ink-soft">
              Hồ sơ cá nhân
            </p>
            <h1 className="mt-2 font-display text-4xl font-black uppercase leading-[0.9] tracking-tight md:text-5xl">
              {profile?.displayName ?? '...'}
            </h1>
            <div className="mt-3 h-[3px] w-32 origin-left bg-ink animate-draw-line" aria-hidden />
          </div>
          {profile && !editing && (
            <button type="button" onClick={() => setEditing(true)} className="btn-ghost">
              Chỉnh sửa
            </button>
          )}
        </div>

        {profileQuery.isLoading && (
          <p className="text-sm text-ink-soft">Đang tải hồ sơ...</p>
        )}

        {profileQuery.isError && (
          <p className="border border-rust bg-rust/5 px-3 py-2 text-sm font-medium text-rust">
            Không tải được hồ sơ. Thử tải lại trang.
          </p>
        )}

        {profile && state && (
          <div className="grid gap-6 lg:grid-cols-12">
            <article className="border border-ink/12 bg-white p-6 md:p-8 lg:col-span-5">
              <div className="flex items-start gap-4">
                <div
                  className="flex size-16 shrink-0 items-center justify-center bg-ink font-display text-2xl font-black uppercase text-paper"
                  aria-hidden
                >
                  {initial}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold uppercase tracking-wide text-ink-soft">
                    {profile.email}
                  </p>
                  <p className="mt-1 text-xs text-ink-soft/70">
                    Tham gia · {new Date(profile.createdAt).toLocaleDateString('vi-VN')}
                  </p>
                </div>
              </div>

              <dl className="mt-6 grid grid-cols-2 gap-5 border-t border-ink/10 pt-5">
                <Stat label="Uy tín" value={profile.reputation.toFixed(1)} />
                <Stat label="Môn" value={String(profile.sportPreferences.length)} />
                <Stat
                  label="Năm sinh"
                  value={profile.birthYear ? String(profile.birthYear) : '—'}
                />
                <Stat label="Khu vực" value={profile.region ?? '—'} />
              </dl>

              {profile.bio && !editing && (
                <p className="mt-6 border-t border-ink/10 pt-5 text-base leading-relaxed text-ink-soft">
                  {profile.bio}
                </p>
              )}
            </article>

            <article className="border border-ink/12 bg-white p-6 md:p-8 lg:col-span-7">
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
                <p className="mt-6 border border-rust bg-rust/5 px-3 py-2 text-sm font-medium text-rust">
                  {serverError}
                </p>
              )}

              {editing && (
                <div className="mt-8 flex flex-col-reverse gap-3 border-t border-ink/10 pt-6 sm:flex-row sm:items-center sm:justify-end">
                  <button
                    type="button"
                    onClick={onCancel}
                    disabled={mutation.isPending}
                    className="text-sm font-semibold text-ink-soft transition hover:text-ink disabled:opacity-50"
                  >
                    Huỷ
                  </button>
                  <button
                    type="button"
                    onClick={onSave}
                    disabled={mutation.isPending}
                    className="btn-primary"
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
      <dt className="text-xs font-bold uppercase tracking-wide text-ink-soft">{label}</dt>
      <dd className="mt-1 poster-num text-3xl text-ink">{value}</dd>
    </div>
  );
}

function ViewMode({ profile }: { profile: ProfileResponse }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wide text-ink-soft">
        Môn thể thao & trình độ
      </p>
      <h2 className="mt-1 font-display text-2xl font-black uppercase tracking-tight">
        Hồ sơ thể thao
      </h2>

      {profile.sportPreferences.length === 0 ? (
        <p className="mt-4 text-base text-ink-soft">
          Chưa có môn nào. Bấm "Chỉnh sửa" để thêm.
        </p>
      ) : (
        <ul className="mt-5 divide-y divide-ink/10">
          {profile.sportPreferences.map((pref) => {
            const t = SPORT_THEMES[pref.sport];
            const stars = SKILL_LEVELS.indexOf(pref.skillLevel) + 1;
            return (
              <li key={pref.sport} className="flex items-center gap-4 py-4">
                <span
                  className="flex size-12 shrink-0 items-center justify-center text-xl"
                  style={{ backgroundColor: t.primary, color: '#fff' }}
                  aria-hidden
                >
                  {t.emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-lg font-black uppercase tracking-tight">
                    {t.nameVi}
                  </p>
                  <p className="mt-0.5 text-sm text-ink-soft">
                    {SKILL_LEVEL_LABELS[pref.skillLevel]}
                    {pref.position ? ` · ${pref.position}` : ''}
                  </p>
                </div>
                <span className="text-sm text-primary" aria-hidden>
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
        <p className="text-xs font-bold uppercase tracking-wide text-ink-soft">
          Thông tin cơ bản
        </p>
        <div className="mt-3 grid gap-4 md:grid-cols-2">
          <label className="block md:col-span-2">
            <span className="mb-2 block text-sm font-semibold">Tên hiển thị</span>
            <input
              type="text"
              value={state.displayName}
              onChange={(e) => setState({ ...state, displayName: e.target.value })}
              className="input"
              maxLength={50}
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold">Năm sinh</span>
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
              className="input"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold">Khu vực</span>
            <input
              type="text"
              value={state.region}
              onChange={(e) => setState({ ...state, region: e.target.value })}
              className="input"
              maxLength={100}
            />
          </label>

          <label className="block md:col-span-2">
            <span className="mb-2 block text-sm font-semibold">Giới thiệu</span>
            <textarea
              value={state.bio}
              onChange={(e) => setState({ ...state, bio: e.target.value })}
              rows={3}
              maxLength={500}
              className="input resize-none"
            />
            <span className="mt-1 block text-right text-xs text-ink-soft">
              {state.bio.length}/500
            </span>
          </label>
        </div>
      </div>

      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-ink-soft">
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
                className={`inline-flex items-center gap-2 border px-3.5 py-1.5 text-sm font-semibold transition ${
                  isOn
                    ? 'border-ink bg-ink text-paper'
                    : 'border-ink/15 bg-white text-ink hover:border-ink'
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
                <div key={pref.sport} className="border border-ink/10 bg-paper-2/40 p-4">
                  <header className="mb-3 flex items-center gap-3">
                    <span
                      className="flex size-9 items-center justify-center text-base"
                      style={{ backgroundColor: t.primary, color: '#fff' }}
                      aria-hidden
                    >
                      {t.emoji}
                    </span>
                    <h4 className="font-display text-base font-black uppercase tracking-tight">
                      {t.nameVi}
                    </h4>
                  </header>

                  <p className="text-xs font-bold uppercase tracking-wide text-ink-soft">
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
                          className={`inline-flex items-center gap-1.5 border px-2.5 py-1 text-xs font-semibold transition ${
                            isOn
                              ? 'border-ink bg-paper-2 text-ink'
                              : 'border-ink/15 bg-white text-ink-soft hover:border-ink hover:text-ink'
                          }`}
                        >
                          <span aria-hidden>{'⭐'.repeat(idx + 1)}</span>
                          <span>{SKILL_LEVEL_LABELS[lvl]}</span>
                        </button>
                      );
                    })}
                  </div>

                  <p className="mt-3 text-xs font-bold uppercase tracking-wide text-ink-soft">
                    Vị trí
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {POSITIONS_BY_SPORT[pref.sport].map((pos) => {
                      const isOn = pref.position === pos;
                      return (
                        <button
                          key={pos}
                          type="button"
                          onClick={() => setPrefPosition(pref.sport, isOn ? '' : pos)}
                          className={`border px-2.5 py-1 text-xs font-medium transition ${
                            isOn
                              ? 'border-ink bg-paper-2 text-ink'
                              : 'border-ink/15 bg-white text-ink-soft hover:border-ink hover:text-ink'
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
