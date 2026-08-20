/** Nút tải thêm cho danh sách phân trang bằng cursor (FR-004.8). */
export function LoadMore({
  hasMore,
  loading,
  onClick,
  emptyLabel = 'Đã hiển thị hết.',
}: {
  hasMore: boolean;
  loading: boolean;
  onClick: () => void;
  emptyLabel?: string;
}) {
  if (!hasMore) {
    return <p className="mt-8 text-center text-xs text-ink-soft/70">{emptyLabel}</p>;
  }
  return (
    <div className="mt-8 flex justify-center">
      <button type="button" onClick={onClick} disabled={loading} className="btn-ghost">
        {loading ? 'Đang tải...' : 'Tải thêm'}
      </button>
    </div>
  );
}
