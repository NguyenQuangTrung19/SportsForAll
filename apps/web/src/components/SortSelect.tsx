import { LIST_SORTS, LIST_SORT_LABELS, type ListSort } from '@sfa/shared';

/** Chọn cách sắp xếp danh sách (FR-004.7). */
export function SortSelect({
  value,
  onChange,
}: {
  value: ListSort;
  onChange: (v: ListSort) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold tracking-wide text-ink-soft">Sắp xếp</p>
      <div className="flex flex-wrap gap-1.5">
        {LIST_SORTS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onChange(s)}
            className={`inline-flex items-center border px-2.5 py-1 text-xs font-semibold transition ${
              value === s
                ? 'border-ink bg-ink text-paper'
                : 'border-ink/15 bg-white text-ink hover:border-ink'
            }`}
          >
            {LIST_SORT_LABELS[s]}
          </button>
        ))}
      </div>
    </div>
  );
}
