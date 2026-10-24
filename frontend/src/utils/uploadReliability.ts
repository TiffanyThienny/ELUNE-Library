/**
 * Pure helpers for reliable book uploads (no browser APIs; unit-tested in Node).
 */

/** Assumed worst-case sustained upload throughput: ~200 KB/s (~1.6 Mbit/s). */
export const MIN_UPLOAD_BYTES_PER_SECOND = 200 * 1024;
export const UPLOAD_TIMEOUT_BASE_MS = 30_000; // connection + request setup
export const UPLOAD_PROCESSING_ALLOWANCE_MS = 30_000; // server-side parse (measured < 1 s for 45 MB / 400 pages)
export const UPLOAD_TIMEOUT_MIN_MS = 60_000;
// Node's default http server requestTimeout is 300 s; waiting longer is pointless.
export const UPLOAD_TIMEOUT_MAX_MS = 290_000;

/** Size-aware client timeout for a multipart upload of `bytes` total size. */
export function computeUploadTimeoutMs(bytes: number): number {
  const size = Number.isFinite(bytes) && bytes > 0 ? bytes : 0;
  const transferMs = Math.ceil((size / MIN_UPLOAD_BYTES_PER_SECOND) * 1000);
  const total = UPLOAD_TIMEOUT_BASE_MS + transferMs + UPLOAD_PROCESSING_ALLOWANCE_MS;
  return Math.min(UPLOAD_TIMEOUT_MAX_MS, Math.max(UPLOAD_TIMEOUT_MIN_MS, total));
}

/** Identity of a selected file + the metadata that defines "the same upload". */
export function uploadFingerprint(
  file: { name: string; size: number; lastModified?: number },
  meta: { title: string; visibility: string }
): string {
  return [file.name, file.size, file.lastModified ?? 0, meta.title.trim(), meta.visibility].join('|');
}

/** Random id sent as `clientUploadId`; reused for retries of the same fingerprint. */
export function createClientUploadId(randomUUID?: () => string): string {
  if (randomUUID) return randomUUID();
  const hex = (n: number) => Array.from({ length: n }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  return `${hex(8)}-${hex(4)}-${hex(4)}-${hex(4)}-${hex(12)}`;
}

export type UploadStatus = 'completed' | 'processing' | 'failed' | 'unknown';

export interface ReconcileResult {
  status: UploadStatus | 'unreachable';
  book?: any;
}

/**
 * After a client-side timeout/network error, ask the server what happened to
 * the attempt instead of re-uploading. Polls while the server says
 * "processing"; stops on completed / failed / unknown.
 */
export async function reconcileUpload(
  getStatus: () => Promise<{ status: UploadStatus; book?: any }>,
  opts: { attempts: number; intervalMs: number; sleep?: (ms: number) => Promise<void> }
): Promise<ReconcileResult> {
  const sleep = opts.sleep || ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  let last: ReconcileResult = { status: 'unreachable' };
  for (let i = 0; i < opts.attempts; i++) {
    if (i > 0) await sleep(opts.intervalMs);
    try {
      const s = await getStatus();
      last = { status: s.status, book: s.book };
      if (s.status !== 'processing') return last;
    } catch {
      last = { status: 'unreachable' };
    }
  }
  return last;
}
