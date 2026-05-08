import { SPORT_THEMES, SPORTS } from '@sfa/shared';
import { cn } from '@/lib/cn';
import { useSportStore } from '@/stores/sport-store';

export function SportSwitcher() {
  const { current, setCurrent } = useSportStore();

  return (
    <div className="flex flex-wrap gap-2">
      {SPORTS.map((slug) => {
        const theme = SPORT_THEMES[slug];
        const isActive = current === slug;
        return (
          <button
            key={slug}
            type="button"
            onClick={() => setCurrent(slug)}
            className={cn(
              'flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition',
              isActive
                ? 'border-primary bg-primary text-white shadow'
                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300',
            )}
          >
            <span>{theme.emoji}</span>
            <span>{theme.nameVi}</span>
          </button>
        );
      })}
    </div>
  );
}
