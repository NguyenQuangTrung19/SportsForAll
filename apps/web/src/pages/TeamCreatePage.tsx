import {
  SKILL_LEVELS,
  SKILL_LEVEL_LABELS,
  SPORTS,
  SPORT_THEMES,
  createTeamSchema,
  type CreateTeamInput,
  type SkillLevel,
  type SportSlug,
  type TeamDetail,
} from '@sfa/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';

export function TeamCreatePage() {
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<CreateTeamInput>({
    resolver: zodResolver(createTeamSchema),
    defaultValues: { sport: 'football' },
  });

  const mutation = useMutation({
    mutationFn: async (input: CreateTeamInput) => {
      const { data } = await api.post<TeamDetail>('/teams', input);
      return data;
    },
    onSuccess: (team) => {
      navigate(`/teams/${team.id}`, { replace: true });
    },
    onError: (err) => {
      const message =
        err instanceof AxiosError
          ? (err.response?.data as { error?: { message?: string } })?.error?.message
          : null;
      setServerError(message ?? 'Không tạo được đội, thử lại sau');
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
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-6 py-4">
          <Link
            to="/teams"
            className="font-display text-2xl font-black uppercase leading-none tracking-tight text-cream md:text-3xl"
          >
            SportsForAll<span className="text-primary">.</span>
          </Link>
          <Link
            to="/teams"
            className="group inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-cream/55 transition hover:text-cream"
          >
            <span aria-hidden className="transition-transform group-hover:-translate-x-1">
              ←
            </span>
            Đội của tôi
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-3xl px-6 py-10 md:py-14">
        <div className="mb-8">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-cream/55">
            Tạo đội mới
          </p>
          <h1 className="mt-1 font-display text-3xl font-black uppercase tracking-tight text-cream md:text-4xl">
            Đặt nền móng cho đội của bạn.
          </h1>
          <p className="mt-3 max-w-xl text-sm text-cream/65">
            Bạn sẽ tự động là đội trưởng. Có thể mời thành viên hoặc đăng bài tuyển ngay sau khi tạo.
          </p>
        </div>

        <form
          onSubmit={handleSubmit((values) => {
            setServerError(null);
            mutation.mutate(values);
          })}
          className="space-y-6 rounded-3xl border border-cream/15 bg-gradient-to-br from-cream/[0.06] to-cream/[0.02] p-6 backdrop-blur-2xl md:p-10"
          noValidate
        >
          <Field label="Tên đội" error={errors.name?.message}>
            <input
              type="text"
              {...register('name')}
              placeholder="FC Đống Đa, Lakers Hà Nội..."
              className="dark-input"
              maxLength={60}
            />
          </Field>

          <div>
            <p className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.3em] text-cream/55">
              Môn thể thao
            </p>
            <Controller
              name="sport"
              control={control}
              render={({ field }) => (
                <div className="flex flex-wrap gap-2">
                  {SPORTS.map((slug) => {
                    const t = SPORT_THEMES[slug];
                    const isOn = field.value === slug;
                    return (
                      <button
                        key={slug}
                        type="button"
                        onClick={() => field.onChange(slug)}
                        className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 font-mono text-[11px] uppercase tracking-[0.18em] transition ${
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
              )}
            />
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Khu vực" error={errors.region?.message}>
              <input
                type="text"
                {...register('region')}
                placeholder="Hà Nội, TP. HCM..."
                className="dark-input"
                maxLength={100}
              />
            </Field>

            <div>
              <p className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.3em] text-cream/55">
                Trình độ đội (tuỳ chọn)
              </p>
              <Controller
                name="skillLevel"
                control={control}
                render={({ field }) => (
                  <div className="flex flex-wrap gap-2">
                    {SKILL_LEVELS.map((lvl) => {
                      const isOn = field.value === lvl;
                      return (
                        <button
                          key={lvl}
                          type="button"
                          onClick={() =>
                            field.onChange(isOn ? undefined : (lvl as SkillLevel))
                          }
                          className={`rounded-full border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] transition ${
                            isOn
                              ? 'border-transparent bg-cream/15 text-cream'
                              : 'border-cream/15 bg-cream/[0.03] text-cream/70 hover:border-cream/40 hover:text-cream'
                          }`}
                        >
                          {SKILL_LEVEL_LABELS[lvl]}
                        </button>
                      );
                    })}
                  </div>
                )}
              />
            </div>
          </div>

          <Field label="Mô tả" error={errors.description?.message}>
            <textarea
              {...register('description')}
              rows={3}
              maxLength={500}
              placeholder="Giới thiệu ngắn về đội — phong cách chơi, lịch hoạt động..."
              className="dark-input resize-none"
            />
          </Field>

          {serverError && (
            <p className="rounded-xl border border-ember/35 bg-ember/10 p-3 font-mono text-[11px] uppercase tracking-wider text-ember">
              {serverError}
            </p>
          )}

          <div className="flex flex-col gap-3 border-t border-cream/10 pt-6 sm:flex-row sm:items-center sm:justify-end">
            <Link
              to="/teams"
              className="inline-flex items-center justify-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-cream/65 transition hover:text-cream"
            >
              Huỷ
            </Link>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="rounded-full bg-primary px-6 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-night shadow-[0_18px_50px_-12px_rgb(var(--color-primary))] transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {mutation.isPending ? 'Đang tạo...' : 'Tạo đội'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block font-mono text-[10px] font-semibold uppercase tracking-[0.3em] text-cream/55">
        {label}
      </span>
      {children}
      {error && (
        <span className="mt-2 block font-mono text-[11px] uppercase tracking-wider text-ember">
          {error}
        </span>
      )}
    </label>
  );
}
