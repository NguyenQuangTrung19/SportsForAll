import {
  SKILL_LEVELS,
  SKILL_LEVEL_LABELS,
  SPORT_THEMES,
  createMatchRequestSchema,
  type CreateMatchRequestInput,
  type MatchRequestDetail,
  type SkillLevel,
  type TeamDetail,
} from '@sfa/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { api } from '@/lib/api';

export function MatchRequestCreatePage() {
  const { id: teamId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);

  const teamQuery = useQuery({
    enabled: Boolean(teamId),
    queryKey: ['teams', teamId],
    queryFn: async () => {
      const { data } = await api.get<TeamDetail>(`/teams/${teamId}`);
      return data;
    },
  });

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<CreateMatchRequestInput>({
    resolver: zodResolver(createMatchRequestSchema),
    defaultValues: { teamId: teamId ?? '', description: '' },
  });

  const mutation = useMutation({
    mutationFn: async (input: CreateMatchRequestInput) => {
      const { data } = await api.post<MatchRequestDetail>('/matches/requests', input);
      return data;
    },
    onSuccess: (req) => navigate(`/match-requests/${req.id}`, { replace: true }),
    onError: (err) => {
      const m =
        err instanceof AxiosError
          ? (err.response?.data as { error?: { message?: string } })?.error?.message
          : null;
      setServerError(m ?? 'Không tạo được lời mời');
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

  const team = teamQuery.data;
  if (team && team.viewerRole !== 'captain' && team.viewerRole !== 'co_captain') {
    return <Navigate to={`/teams/${teamId}`} replace />;
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-night text-cream">
      <div className="mouse-spotlight pointer-events-none fixed inset-0 z-0" aria-hidden />
      <div className="grid-bg pointer-events-none fixed inset-0 z-0" aria-hidden />

      <header className="relative z-10 border-b border-cream/10 bg-night/40 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-6 py-4">
          <Link
            to={`/teams/${teamId}`}
            className="font-display text-2xl font-black uppercase leading-none tracking-tight text-cream md:text-3xl"
          >
            SportsForAll<span className="text-primary">.</span>
          </Link>
          <Link
            to={`/teams/${teamId}`}
            className="group inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-cream/55 transition hover:text-cream"
          >
            <span aria-hidden className="transition-transform group-hover:-translate-x-1">
              ←
            </span>
            Về đội
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-3xl px-6 py-10 md:py-14">
        <div className="mb-8">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-cream/55">
            {team ? `Tìm đối thủ · ${team.name}` : 'Tìm đối thủ'}
          </p>
          <h1 className="mt-1 font-display text-3xl font-black uppercase tracking-tight text-cream md:text-4xl">
            Mở lời mời thách đấu.
          </h1>
          {team && (
            <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.22em] text-cream/55">
              Môn: {SPORT_THEMES[team.sport].emoji} {SPORT_THEMES[team.sport].nameVi}
            </p>
          )}
        </div>

        <form
          onSubmit={handleSubmit((values) => {
            setServerError(null);
            mutation.mutate({
              ...values,
              teamId: teamId!,
              region: values.region?.trim() || undefined,
              venueName: values.venueName?.trim() || undefined,
              preferredTime: values.preferredTime || undefined,
            });
          })}
          className="space-y-5 rounded-3xl border border-cream/15 bg-gradient-to-br from-cream/[0.06] to-cream/[0.02] p-6 backdrop-blur-2xl md:p-10"
          noValidate
        >
          <Field label="Mô tả" error={errors.description?.message}>
            <textarea
              {...register('description')}
              rows={4}
              maxLength={1000}
              placeholder="Đội tìm trận giao hữu cấp B, đá tối thứ 7..."
              className="dark-input resize-none"
            />
          </Field>

          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Thời gian mong muốn" error={errors.preferredTime?.message}>
              <input
                type="datetime-local"
                {...register('preferredTime', {
                  setValueAs: (v: string) => (v ? new Date(v).toISOString() : undefined),
                })}
                className="dark-input"
              />
            </Field>

            <Field label="Sân (tuỳ chọn)" error={errors.venueName?.message}>
              <input
                type="text"
                {...register('venueName')}
                placeholder="VD: Sân Bách Khoa"
                className="dark-input"
                maxLength={120}
              />
            </Field>

            <Field label="Khu vực" error={errors.region?.message}>
              <input
                type="text"
                {...register('region')}
                placeholder={team?.region ?? 'Hà Nội...'}
                className="dark-input"
                maxLength={100}
              />
            </Field>

            <div>
              <p className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.3em] text-cream/55">
                Trình độ đối thủ (tuỳ chọn)
              </p>
              <Controller
                name="skillLevelMin"
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

          {serverError && (
            <p className="rounded-xl border border-ember/35 bg-ember/10 p-3 font-mono text-[11px] uppercase tracking-wider text-ember">
              {serverError}
            </p>
          )}

          <div className="flex flex-col gap-3 border-t border-cream/10 pt-6 sm:flex-row sm:items-center sm:justify-end">
            <Link
              to={`/teams/${teamId}`}
              className="inline-flex items-center justify-center font-mono text-[11px] uppercase tracking-[0.22em] text-cream/65 transition hover:text-cream"
            >
              Huỷ
            </Link>
            <button
              type="submit"
              disabled={mutation.isPending || !team}
              className="rounded-full bg-primary px-6 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-night shadow-[0_18px_50px_-12px_rgb(var(--color-primary))] transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {mutation.isPending ? 'Đang đăng...' : 'Đăng lời mời'}
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
