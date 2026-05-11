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
import { useMemo, useState } from 'react';
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
  { num: '01', title: 'Môn thể thao', sub: 'Chọn ít nhất một' },
  { num: '02', title: 'Trình độ', sub: 'Cho từng môn đã chọn' },
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
      Object.fromEntries(
        SPORTS.map((s) => [s, { skillLevel: null, position: '' }]),
      ) as Record<SportSlug, SportDraft>,
  );
  const [birthYear, setBirthYear] = useState<number | ''>('');
  const [region, setRegion] = useState<string>('');
  const [bio, setBio] = useState('');
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
    if (step > 0) setStep((step - 1) as StepIndex);
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
      setServerError(message ?? 'Không lưu được, thử lại sau');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="border-b border-ink/10">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-4">
          <span className="font-display text-2xl font-black uppercase leading-none tracking-tight">
            SportsForAll<span className="text-primary">.</span>
          </span>
          <span className="text-xs font-bold uppercase tracking-wide text-ink-soft">
            Bước {step + 1} / {STEPS.length}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10 md:py-14">
        <section className="fade-up">
          <p className="text-xs font-bold uppercase tracking-wide text-ink-soft">
            Thiết lập hồ sơ
          </p>
          <h1 className="mt-3 font-display text-[clamp(40px,7vw,84px)] font-black uppercase leading-[0.88] tracking-tight">
            Chào, {firstName} —<br />
            <span className="text-primary">kể chúng tôi nghe</span>
            <br />
            bạn chơi gì.
          </h1>
          <div className="mt-6 h-[3px] origin-left bg-ink animate-draw-line" aria-hidden />
        </section>

        {/* Stepper */}
        <ol className="mt-10 grid gap-3 md:grid-cols-3">
          {STEPS.map((s, i) => {
            const state = i < step ? 'done' : i === step ? 'active' : 'pending';
            return (
              <li
                key={s.num}
                className={`border p-5 transition ${
                  state === 'active'
                    ? 'border-ink bg-white shadow-[4px_4px_0_rgba(15,17,21,0.08)]'
                    : state === 'done'
                      ? 'border-ink/30 bg-white'
                      : 'border-ink/10 bg-paper-2/30'
                }`}
              >
                <div className="flex items-baseline justify-between">
                  <span
                    className={`poster-num text-4xl ${
                      state === 'pending' ? 'text-ink-soft/50' : 'text-primary'
                    }`}
                  >
                    {s.num}
                  </span>
                  {state === 'done' && (
                    <span className="text-xs font-bold uppercase tracking-wide text-primary">
                      Xong
                    </span>
                  )}
                </div>
                <p className="mt-2 font-display text-lg font-black uppercase leading-tight tracking-tight">
                  {s.title}
                </p>
                <p className="mt-0.5 text-sm text-ink-soft">{s.sub}</p>
              </li>
            );
          })}
        </ol>

        {/* Step body */}
        <article className="mt-8 border border-ink/15 bg-white p-6 shadow-[6px_6px_0_rgba(15,17,21,0.08)] md:p-10">
          {step === 0 && <Step0 selected={selectedSports} onToggle={toggleSport} />}
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
            <p className="mt-6 border border-rust bg-rust/5 px-3 py-2 text-sm font-medium text-rust">
              {serverError}
            </p>
          )}

          <div className="mt-8 flex flex-col-reverse gap-3 border-t border-ink/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={goBack}
              disabled={step === 0}
              className="text-sm font-semibold text-ink-soft transition hover:text-ink disabled:cursor-not-allowed disabled:opacity-30"
            >
              ← Quay lại
            </button>
            {step < 2 ? (
              <button
                type="button"
                onClick={goNext}
                disabled={
                  (step === 0 && !canAdvanceStep0) || (step === 1 && !canAdvanceStep1)
                }
                className="btn-primary"
              >
                Tiếp tục <span aria-hidden className="animate-arrow-bob">→</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onSubmit}
                disabled={!canSubmit || submitting}
                className="btn-primary"
              >
                {submitting ? 'Đang lưu...' : 'Hoàn tất'}
                {!submitting && <span aria-hidden className="animate-arrow-bob">→</span>}
              </button>
            )}
          </div>
        </article>
      </main>
    </div>
  );
}

function Step0({
  selected,
  onToggle,
}: {
  selected: SportSlug[];
  onToggle: (sport: SportSlug) => void;
}) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wide text-ink-soft">Bước 01</p>
      <h2 className="mt-1 font-display text-3xl font-black uppercase leading-tight tracking-tight">
        Bạn chơi môn nào?
      </h2>
      <p className="mt-2 max-w-xl text-base text-ink-soft">
        Chọn một hoặc nhiều môn — giao diện sẽ chuyển theme theo môn đầu tiên bạn chọn.
      </p>

      <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {SPORTS.map((slug) => {
          const t = SPORT_THEMES[slug];
          const isOn = selected.includes(slug);
          return (
            <li key={slug}>
              <button
                type="button"
                onClick={() => onToggle(slug)}
                className={`flex w-full items-center gap-4 border p-4 text-left transition ${
                  isOn
                    ? 'border-ink bg-paper-2/50 shadow-[4px_4px_0_rgba(15,17,21,0.12)]'
                    : 'border-ink/15 bg-white hover:border-ink'
                }`}
              >
                <span
                  className="flex size-14 shrink-0 items-center justify-center text-3xl"
                  style={{ backgroundColor: t.primary, color: '#fff' }}
                  aria-hidden
                >
                  <span style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.25))' }}>
                    {t.emoji}
                  </span>
                </span>
                <span className="flex-1">
                  <span className="block font-display text-lg font-black uppercase leading-tight tracking-tight">
                    {t.nameVi}
                  </span>
                  <span className="block text-xs text-ink-soft">
                    {isOn ? 'Đã chọn' : 'Chạm để chọn'}
                  </span>
                </span>
                {isOn && (
                  <span
                    aria-hidden
                    className="poster-num text-2xl text-primary"
                  >
                    ✓
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
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
      <p className="text-xs font-bold uppercase tracking-wide text-ink-soft">Bước 02</p>
      <h2 className="mt-1 font-display text-3xl font-black uppercase leading-tight tracking-tight">
        Bạn chơi ở mức nào?
      </h2>
      <p className="mt-2 max-w-xl text-base text-ink-soft">
        Tự đánh giá thật để cộng đồng ghép trận phù hợp. Vị trí có thể để trống.
      </p>

      <div className="mt-6 space-y-5">
        {selected.map((sport) => {
          const t = SPORT_THEMES[sport];
          const draft = drafts[sport]!;
          return (
            <section key={sport} className="border border-ink/12 bg-paper-2/30 p-5">
              <header className="mb-4 flex items-center gap-3">
                <span
                  className="flex size-10 items-center justify-center text-xl"
                  style={{ backgroundColor: t.primary, color: '#fff' }}
                  aria-hidden
                >
                  {t.emoji}
                </span>
                <h3 className="font-display text-xl font-black uppercase tracking-tight">
                  {t.nameVi}
                </h3>
              </header>

              <p className="text-xs font-bold uppercase tracking-wide text-ink-soft">
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
                      className={`inline-flex items-center gap-1.5 border px-3 py-1.5 text-sm font-semibold transition ${
                        isOn
                          ? 'border-ink bg-ink text-paper'
                          : 'border-ink/15 bg-white text-ink hover:border-ink'
                      }`}
                    >
                      <span aria-hidden className="text-xs">
                        {'⭐'.repeat(idx + 1)}
                      </span>
                      <span>{SKILL_LEVEL_LABELS[lvl]}</span>
                    </button>
                  );
                })}
              </div>

              <p className="mt-5 text-xs font-bold uppercase tracking-wide text-ink-soft">
                Vị trí (tuỳ chọn)
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {POSITIONS_BY_SPORT[sport].map((pos) => {
                  const isOn = draft.position === pos;
                  return (
                    <button
                      key={pos}
                      type="button"
                      onClick={() => onUpdate(sport, { position: isOn ? '' : pos })}
                      className={`border px-3 py-1.5 text-sm font-medium transition ${
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
      <p className="text-xs font-bold uppercase tracking-wide text-ink-soft">Bước 03</p>
      <h2 className="mt-1 font-display text-3xl font-black uppercase leading-tight tracking-tight">
        Vài thông tin về bạn.
      </h2>
      <p className="mt-2 max-w-xl text-base text-ink-soft">
        Năm sinh và khu vực giúp cộng đồng ghép trận cùng tầm tuổi, cùng địa bàn.
      </p>

      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-sm font-semibold">Năm sinh</span>
          <select
            value={birthYear}
            onChange={(e) =>
              setBirthYear(e.target.value === '' ? '' : Number(e.target.value))
            }
            className="input"
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
          <span className="mb-2 block text-sm font-semibold">Khu vực</span>
          <input
            type="text"
            list="onboarding-regions"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            placeholder="Hà Nội, TP. HCM..."
            className="input"
            maxLength={100}
          />
          <datalist id="onboarding-regions">
            {REGIONS.map((r) => (
              <option key={r} value={r} />
            ))}
          </datalist>
        </label>

        <label className="block md:col-span-2">
          <span className="mb-2 block text-sm font-semibold">Giới thiệu (tuỳ chọn)</span>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="Đôi dòng về bạn — phong cách chơi, lịch rảnh, sân ưa thích..."
            className="input resize-none"
          />
          <span className="mt-1 block text-right text-xs text-ink-soft">
            {bio.length}/500
          </span>
        </label>
      </div>
    </div>
  );
}
