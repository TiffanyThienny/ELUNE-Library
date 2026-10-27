/** Reading progress from the real PDF position: floor(page / total * 100), clamped 0..100. */
export function computePageProgress(currentPage: number, totalPages: number): number {
  if (!Number.isFinite(currentPage) || !Number.isFinite(totalPages) || totalPages <= 0) return 0;
  const page = Math.min(Math.max(1, Math.floor(currentPage)), totalPages);
  return Math.min(100, Math.max(0, Math.floor((page / totalPages) * 100)));
}
