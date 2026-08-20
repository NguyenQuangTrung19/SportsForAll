/** Cách sắp xếp dùng chung cho mọi danh sách (FR-004.7). */
export const LIST_SORTS = ['newest', 'reputation'] as const;
export type ListSort = (typeof LIST_SORTS)[number];

export const LIST_SORT_LABELS: Record<ListSort, string> = {
  newest: 'Mới nhất',
  reputation: 'Uy tín cao nhất',
};
