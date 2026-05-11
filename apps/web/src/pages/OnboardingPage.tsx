import {
  POSITIONS_BY_SPORT,
  SKILL_LEVELS,
  SKILL_LEVEL_LABELS,
  SPORTS,
  SPORT_THEMES,
  type CompleteOnboardingInput,
  type ProfileResponse,
  type SkillLevel,
  type SportSlug,
} from '@sfa/shared';
import { AxiosError } from 'axios';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { applySportTheme, useSportStore } from '@/stores/sport-store';

const CURRENT_YEAR = new Date().getFullYear();
const MIN_YEAR = 1950;
const REGIONS = [
  'Hà Nội',
  'TP. Hồ Chí Minh',
  'Đà Nẵng',
  'Hải Phòng',
  'Cần Thơ',
  'Bình Dương',
  'Đồng Nai',
  'Khác',
] as const;

interface SportDraft {
  skillLevel: SkillLevel | null;
  position: string;
}

type StepIndex = 0 | 1 | 2;

const STEPS = [
  { num: '01', title: 'Môn thể thao', sub: 'Chọn ít nhất một môn' },
  { num: '02', title: 'Trình độ & vị trí', sub: 'Cho từng môn đã chọn' },
  { num: '03', title: 'Hồ sơ', sub: 'Năm sinh, khu vực' },
] as const;

export function OnboardingPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const setSportCurrent = useSportStore((s) => s.setCurrent);

  const [step, setStep] = useState<StepIndex>(0);
  const [selectedSports, setSelectedSports] = useState<SportSlug[]>([]);
  const [sportDrafts, setSportDrafts] = useState<Record<SportSlug, SportDraft>>(
    () =>
      Object.fromEntries(SPORTS.map((s) => [s, { skillLevel: null, position: '' }])) as Record<
        SportSlug,
        SportDraft
      >,
  );
  const [birthYear, setBirthYear] = useState<number | ''>('');
  const [region, setRegion] = useState<string>('');
  const [bio, setBio] = useState('');
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const r = document.documentElement;
      r.style.setProperty('--mx', `${e.clientX}px`);
      r.style.setProperty('--my', `${e.clientY}px`);
    };
    window.addEventListener('pointermove', onMove);
    return () => window.removeEventListener('pointermove', onMove);
  }, []);

  // Theme preview: when on step 0, pulse theme of first selected sport
  useEffect(() => {
    if (selectedSports.length > 0) {
      const first = selectedSports[0];
      if (first) applySportTheme(first);
    }
  }, [selectedSports]);

  const firstName = useMemo(
    () => user?.displayName?.trim().split(/\s+/)[0] ?? 'bạn',
    [user?.displayName],
  );

  const toggleSport = (sport: SportSlug) => {
    setSelectedSports((prev) =>
      prev.includes(sport) ? prev.filter((s) => s !== sport) : [...prev, sport],
    );
  };

  const updateDraft = (sport: SportSlug, patch: Partial<SportDraft>) => {
    setSportDrafts((prev) => ({ ...prev, [sport]: { ...prev[sport]!, ...patch } }));
  };

  const canAdvanceStep0 = selectedSports.length > 0;
  const canAdvanceStep1 = selectedSports.every((s) => sportDrafts[s]?.skillLevel !== null);
  const canSubmit =
    canAdvanceStep0 &&
    canAdvanceStep1 &&
    birthYear !== '' &&
    birthYear >= MIN_YEAR &&
    birthYear <= CURRENT_YEAR &&
    region.trim().length >= 2;

  const goNext = () => {
    setServerError(null);
    if (step === 0 && canAdvanceStep0) setStep(1);
    else if (step === 1 && canAdvanceStep1) setStep(2);
  };
  const goBack = () => {
    setServerError(null);
    if (step > 0) setStep(((step - 1) as StepIndex));
  };

  const onSubmit = async () => {
    if (!canSubmit) return;
    setServerError(null);
    setSubmitting(true);
    try {
      const payload: CompleteOnboardingInput = {
        birthYear: Number(birthYear),
        region: region.trim(),
        bio: bio.trim() || undefined,
        sportPreferences: selectedSports.map((sport) => ({
          sport,
          skillLevel: sportDrafts[sport]!.skillLevel!,
          position: sportDrafts[sport]!.position.trim() || null,
        })),
      };
      const { data } = await api.post<ProfileResponse>('/profile/me/onboarding', payload);
      updateUser({ onboardedAt: data.onboardedAt });
      const first = selectedSports[0];
      if (first) {
        setSportCurrent(first);
        applySportTheme(first);
      }
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const message =
        err instanceof AxiosError
          ? (err.response?.data as { error?: { message?: string } })?.error?.message
          : null;
      setServerError(message ?? 'Không lưu được thông tin, thử lại sau');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-night text-cream">
      <div className="mouse-spotlight pointer-events-none fixed inset-0 z-0" aria-hidden />
      <div className="grid-bg pointer-events-none fixed inset-0 z-0" aria-hidden />
      <div className="pointer-events-none fixed inset-0 z-0" aria-hidden>
        <div className="absolute -left-32 top-[18%] size-[28rem] animate-pulse-slow rounded-full bg-primary/20 blur-[120px]" />
        <div className="absolute -right-20 top-[55%] size-[22rem] animate-float rounded-full bg-ember/12 blur-[100px]" />
      </div>

      <header className="relative z-10 border-b border-cream/10 bg-night/40 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-4">
          <p className="font-display text-2xl font-black uppercase leading-none tracking-tight text-cream md:text-3xl">
            SportsForAll<span className="text-primary">.</span>
          </p>
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-cream/55">
            Bước {step + 1} / {STEPS.length}
          </span>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-5xl px-6 py-10 md:py-14">
        {/* Hero strip */}
        <section className="mb-10">
          <div className="animate-fade-up stagger-1 mb-4 inline-flex items-center gap-3 rounded-full border border-cream/15 bg-cream/[0.04] px-4 py-1.5 backdrop-blur-md">
            <span className="relative inline-block size-2 rounded-full bg-primary">
              <span className="absolute inset-0 animate-ping rounded-full bg-primary opacity-70" />
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-cream/80">
              Thiết lập hồ sơ
            </span>
          </div>
          <h1 className="font-display font-black uppercase tracking-tight">
            <span className="block text-xl font-bold leading-tight tracking-[0.22em] text-cream/55 md:text-2xl">
              Chào {firstName},
            </span>
            <span
              className="mt-2 block font-sans text-[clamp(36px,5.5vw,64px)] font-black leading-[1] tracking-tight text-primary"
              style={{ letterSpacing: '-0.025em' }}
            >
              kể cộng đồng nghe bạn chơi gì.
            </span>
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-cream/65 md:text-base">
            Ba bước nhỏ — chọn môn, chọn trình độ, vài thông tin về bạn. Mất chưa tới 1 phút.
          </p>
        </section>

        {/* Stepper */}
        <ol className="mb-8 grid gap-2 md:grid-cols-3 md:gap-3">
          {STEPS.map((s, i) => {
            const state =
              i < step ? 'done' : i === step ? 'active' : 'pending';
            return (
              <li
                key={s.num}
                className={`rounded-2xl border p-4 transition ${
                  state === 'active'
                    ? 'border-primary/40 bg-primary/10'
                    : state === 'done'
                      ? 'border-cream/25 bg-cream/[0.05]'
                      : 'border-cream/10 bg-cream/[0.02]'
                }`}
              >
                <p className="font-display text-2xl font-black leading-none text-primary md:text-3xl">
                  {s.num}
                </p>
                <p className="mt-2 font-display text-base font-black uppercase tracking-tight text-cream md:text-lg">
                  {s.title}
                </p>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.22em] text-cream/55">
                  {s.sub}
                </p>
              </li>
            );
          })}
        </ol>

        {/* Step body */}
        <article className="relative overflow-hidden rounded-3xl border border-cream/15 bg-gradient-to-br from-cream/[0.06] to-cream/[0.02] p-6 backdrop-blur-2xl shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7)] md:p-10">
          {step === 0 && (
            <Step0
              selected={selectedSports}
              onToggle={toggleSport}
            />
          )}
          {step === 1 && (
            <Step1
              selected={selectedSports}
              drafts={sportDrafts}
              onUpdate={updateDraft}
            />
          )}
          {step === 2 && (
            <Step2
              birthYear={birthYear}
              setBirthYear={setBirthYear}
              region={region}
              setRegion={setRegion}
              bio={bio}
              setBio={setBio}
            />
          )}

          {serverError && (
            <p className="mt-6 rounded-xl border border-ember/35 bg-ember/10 p-3 font-mono text-[11px] uppercase tracking-wider text-ember">
              {serverError}
            </p>
          )}

          {/* Navigation */}
          <div className="mt-8 flex flex-col gap-3 border-t border-cream/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={goBack}
              disabled={step === 0}
              className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-cream/65 transition hover:text-cream disabled:cursor-not-allowed disabled:opacity-30"
            >
              <span aria-hidden>←</span>
              Quay lại
            </button>

            {step < 2 ? (
              <button
                type="button"
                onClick={goNext}
                disabled={
                  (step === 0 && !canAdvanceStep0) || (step === 1 && !canAdvanceStep1)
                }
                className="group relative flex items-center justify-center gap-3 overflow-hidden rounded-full bg-primary px-7 py-3 font-mono text-[12px] font-semibold uppercase tracking-[0.22em] text-night shadow-[0_18px_50px_-12px_rgb(var(--color-primary))] transition hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <span className="relative">Tiếp tục</span>
                <span aria-hidden className="relative inline-block animate-arrow-bob">
                  →
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onSubmit}
                disabled={!canSubmit || submitting}
                className="group relative flex items-center justify-center gap-3 overflow-hidden rounded-full bg-primary px-7 py-3 font-mono text-[12px] font-semibold uppercase tracking-[0.22em] text-night shadow-[0_18px_50px_-12px_rgb(var(--color-primary))] transition hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <span className="relative">
                  {submitting ? 'Đang lưu...' : 'Hoàn tất'}
                </span>
                {!submitting && (
                  <span aria-hidden className="relative inline-block animate-arrow-bob">
                    →
                  </span>
                )}
              </button>
            )}
          </div>
        </article>
      </main>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Step components                                                             */
/* -------------------------------------------------------------------------- */

function Step0({
  selected,
  onToggle,
}: {
  selected: SportSlug[];
  onToggle: (sport: SportSlug) => void;
}) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-cream/55">
        Bước 01
      </p>
      <h2 className="mt-1 font-display text-2xl font-black uppercase tracking-tight text-cream md:text-3xl">
        Bạn chơi môn nào?
      </h2>
      <p className="mt-2 max-w-xl text-sm text-cream/65">
        Chọn một hoặc nhiều môn. Giao diện sẽ chuyển theme theo môn đầu tiên bạn chọn.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {SPORTS.map((slug) => {
          const t = SPORT_THEMES[slug];
          const isOn = selected.includes(slug);
          return (
            <button
              key={slug}
              type="button"
              onClick={() => onToggle(slug)}
              className={`group relative flex items-center gap-4 overflow-hidden rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 ${
                isOn
                  ? 'border-transparent text-night shadow-[0_18px_45px_-12px_rgb(var(--color-primary))]'
                  : 'border-cream/15 bg-cream/[0.04] text-cream hover:border-cream/40'
              }`}
              style={
                isOn
                  ? { background: t.primary }
                  : undefined
              }
            >
              <span className="text-3xl" aria-hidden>
                {t.emoji}
              </span>
              <span className="flex-1">
                <span className="block font-display text-lg font-black uppercase leading-tight tracking-tight">
                  {t.nameVi}
                </span>
                <span className="block font-mono text-[10px] uppercase tracking-[0.22em] opacity-70">
                  {isOn ? 'Đã chọn' : 'Chạm để chọn'}
                </span>
              </span>
              {isOn && (
                <span
                  aria-hidden
                  className="ml-auto inline-flex size-7 items-center justify-center rounded-full bg-night/15 text-night"
                >
                  ✓
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Step1({
  selected,
  drafts,
  onUpdate,
}: {
  selected: SportSlug[];
  drafts: Record<SportSlug, SportDraft>;
  onUpdate: (sport: SportSlug, patch: Partial<SportDraft>) => void;
}) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-cream/55">
        Bước 02
      </p>
      <h2 className="mt-1 font-display text-2xl font-black uppercase tracking-tight text-cream md:text-3xl">
        Bạn chơi ở mức nào?
      </h2>
      <p className="mt-2 max-w-xl text-sm text-cream/65">
        Tự đánh giá để hệ thống ghép trận đấu phù hợp. Vị trí có thể để trống nếu chưa chắc.
      </p>

      <div className="mt-6 space-y-5">
        {selected.map((sport) => {
          const t = SPORT_THEMES[sport];
          const draft = drafts[sport]!;
          return (
            <section
              key={sport}
              className="rounded-2xl border border-cream/15 bg-cream/[0.04] p-5"
            >
              <header className="mb-4 flex items-center gap-3">
                <span className="text-2xl" aria-hidden>
                  {t.emoji}
                </span>
                <h3 className="font-display text-xl font-black uppercase tracking-tight text-cream">
                  {t.nameVi}
                </h3>
              </header>

              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-cream/55">
                Trình độ
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {SKILL_LEVELS.map((lvl, idx) => {
                  const isOn = draft.skillLevel === lvl;
                  return (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => onUpdate(sport, { skillLevel: lvl })}
                      className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] transition ${
                        isOn
                          ? 'border-transparent bg-primary text-night shadow-[0_10px_24px_-10px_rgb(var(--color-primary))]'
                          : 'border-cream/15 bg-cream/[0.03] text-cream hover:border-cream/40'
                      }`}
                    >
                      <span aria-hidden>{'⭐'.repeat(idx + 1)}</span>
                      <span>{SKILL_LEVEL_LABELS[lvl]}</span>
                    </button>
                  );
                })}
              </div>

              <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.3em] text-cream/55">
                Vị trí (tuỳ chọn)
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {POSITIONS_BY_SPORT[sport].map((pos) => {
                  const isOn = draft.position === pos;
                  return (
                    <button
                      key={pos}
                      type="button"
                      onClick={() =>
                        onUpdate(sport, { position: isOn ? '' : pos })
                      }
                      className={`rounded-full border px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] transition ${
                        isOn
                          ? 'border-cream/45 bg-cream/[0.12] text-cream'
                          : 'border-cream/15 bg-cream/[0.03] text-cream/75 hover:border-cream/40 hover:text-cream'
                      }`}
                    >
                      {pos}
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function Step2({
  birthYear,
  setBirthYear,
  region,
  setRegion,
  bio,
  setBio,
}: {
  birthYear: number | '';
  setBirthYear: (v: number | '') => void;
  region: string;
  setRegion: (v: string) => void;
  bio: string;
  setBio: (v: string) => void;
}) {
  const years = useMemo(() => {
    const arr: number[] = [];
    for (let y = CURRENT_YEAR; y >= MIN_YEAR; y--) arr.push(y);
    return arr;
  }, []);

  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-cream/55">
        Bước 03
      </p>
      <h2 className="mt-1 font-display text-2xl font-black uppercase tracking-tight text-cream md:text-3xl">
        Vài thông tin về bạn.
      </h2>
      <p className="mt-2 max-w-xl text-sm text-cream/65">
        Năm sinh và khu vực giúp cộng đồng ghép trận cùng tầm tuổi, cùng địa bàn.
      </p>

      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <label className="block">
          <span className="mb-2 block font-mono text-[10px] font-semibold uppercase tracking-[0.3em] text-cream/55">
            Năm sinh
          </span>
          <select
            value={birthYear}
            onChange={(e) =>
              setBirthYear(e.target.value === '' ? '' : Number(e.target.value))
            }
            className="dark-input"
          >
            <option value="">— Chọn năm —</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block font-mono text-[10px] font-semibold uppercase tracking-[0.3em] text-cream/55">
            Khu vực
          </span>
          <input
            type="text"
            list="onboarding-regions"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            placeholder="Hà Nội, TP. HCM..."
            className="dark-input"
            maxLength={100}
          />
          <datalist id="onboarding-regions">
            {REGIONS.map((r) => (
              <option key={r} value={r} />
            ))}
          </datalist>
        </label>

        <label className="block md:col-span-2">
          <span className="mb-2 block font-mono text-[10px] font-semibold uppercase tracking-[0.3em] text-cream/55">
            Giới thiệu (tuỳ chọn)
          </span>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="Đôi dòng về bạn — phong cách chơi, lịch rảnh, sân ưa thích..."
            className="dark-input resize-none"
          />
          <span className="mt-1 block text-right font-mono text-[10px] uppercase tracking-[0.22em] text-cream/40">
            {bio.length}/500
          </span>
        </label>
      </div>
    </div>
  );
}
