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
import { useState } from 'react';
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

  const team = teamQuery.data;
  if (team && team.viewerRole !== 'captain' && team.viewerRole !== 'co_captain') {
    return <Navigate to={`/teams/${teamId}`} replace />;
  }

  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="border-b border-ink/10">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-6 py-4">
          <Link
            to={`/teams/${teamId}`}
            className="font-display text-2xl font-black uppercase leading-none tracking-tight"
          >
            SportsForAll<span className="text-primary">.</span>
          </Link>
          <Link
            to={`/teams/${teamId}`}
            className="text-sm font-semibold text-ink-soft hover:text-ink"
          >
            ← Về đội
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10 md:py-14">
        <div className="mb-8">
          <p className="text-xs font-bold uppercase tracking-wide text-ink-soft">
            {team ? `Tìm đối thủ · ${team.name}` : 'Tìm đối thủ'}
          </p>
          <h1 className="mt-2 font-display text-4xl font-black uppercase leading-[0.9] tracking-tight md:text-5xl">
            Mở lời mời
            <br />
            thách đấu.
          </h1>
          <div className="mt-3 h-[3px] w-32 origin-left bg-ink animate-draw-line" aria-hidden />
          {team && (
            <p className="mt-4 text-sm text-ink-soft">
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
          className="space-y-5 border border-ink/15 bg-white p-6 shadow-[6px_6px_0_rgba(15,17,21,0.08)] md:p-10"
          noValidate
        >
          <Field label="Mô tả" error={errors.description?.message}>
            <textarea
              {...register('description')}
              rows={4}
              maxLength={1000}
              placeholder="Đội tìm trận giao hữu cấp B, đá tối thứ 7..."
              className="input resize-none"
            />
          </Field>

          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Thời gian mong muốn" error={errors.preferredTime?.message}>
              <input
                type="datetime-local"
                {...register('preferredTime', {
                  setValueAs: (v: string) => (v ? new Date(v).toISOString() : undefined),
                })}
                className="input"
              />
            </Field>

            <Field label="Sân (tuỳ chọn)" error={errors.venueName?.message}>
              <input
                type="text"
                {...register('venueName')}
                placeholder="VD: Sân Bách Khoa"
                className="input"
                maxLength={120}
              />
            </Field>

            <Field label="Khu vực" error={errors.region?.message}>
              <input
                type="text"
                {...register('region')}
                placeholder={team?.region ?? 'Hà Nội...'}
                className="input"
                maxLength={100}
              />
            </Field>

            <div>
              <p className="mb-2 text-sm font-semibold">Trình độ đối thủ (tuỳ chọn)</p>
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
                          className={`border px-3 py-1.5 text-xs font-semibold transition ${
                            isOn
                              ? 'border-ink bg-paper-2 text-ink'
                              : 'border-ink/15 bg-white text-ink-soft hover:border-ink hover:text-ink'
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
            <p className="border border-rust bg-rust/5 px-3 py-2 text-sm font-medium text-rust">
              {serverError}
            </p>
          )}

          <div className="flex flex-col-reverse gap-3 border-t border-ink/10 pt-6 sm:flex-row sm:items-center sm:justify-end">
            <Link
              to={`/teams/${teamId}`}
              className="text-center text-sm font-semibold text-ink-soft transition hover:text-ink"
            >
              Huỷ
            </Link>
            <button
              type="submit"
              disabled={mutation.isPending || !team}
              className="btn-primary"
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
      <span className="mb-2 block text-sm font-semibold">{label}</span>
      {children}
      {error && (
        <span className="mt-1.5 block text-sm font-medium text-rust">{error}</span>
      )}
    </label>
  );
}
