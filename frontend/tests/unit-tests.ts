/**
 * Pure frontend unit tests (no browser, no IndexedDB, no network).
 * Run from backend/ (reuses its installed tsx; no new dependency):
 *   npx tsx ../frontend/tests/unit-tests.ts
 */
import { pdfCacheKey, isCacheRecordUsable, classifyAccessProbe, decideCachedPdfUse } from '../src/utils/pdfCachePolicy';
import {
  computeUploadTimeoutMs,
  uploadFingerprint,
  createClientUploadId,
  reconcileUpload,
  UPLOAD_TIMEOUT_MAX_MS,
  UPLOAD_TIMEOUT_MIN_MS
} from '../src/utils/uploadReliability';
import { summaryTextFromResponse, answerFromResponse } from '../src/utils/aiResponse';

const results: { name: string; ok: boolean; err?: string }[] = [];
function assert(c: boolean, m: string) { if (!c) throw new Error(m); }
async function t(name: string, fn: () => void | Promise<void>) {
  try { await fn(); results.push({ name, ok: true }); console.log(`  PASS ${name}`); }
  catch (e: any) { results.push({ name, ok: false, err: e.message }); console.log(`  FAIL ${name}: ${e.message}`); }
}

async function main() {
  // ---- PDF cache isolation (F-10) ----
  const rec = (userId: string, bookId: string) => ({ cacheKey: pdfCacheKey(userId, bookId), userId, bookId, data: new ArrayBuffer(4), timestamp: 1 });
  await t('cache: record usable only for its own user + book', () => {
    assert(isCacheRecordUsable(rec('u1', 'b1'), 'u1', 'b1'), 'own record must be usable');
  });
  await t('cache: another book is never used (no "latest PDF" fallback)', () => {
    assert(!isCacheRecordUsable(rec('u1', 'b1'), 'u1', 'b2'), 'other book must be rejected');
  });
  await t('cache: another user is never used', () => {
    assert(!isCacheRecordUsable(rec('u1', 'b1'), 'u2', 'b1'), 'other user must be rejected');
  });
  await t('cache: guest (no user) never reads cache', () => {
    assert(!isCacheRecordUsable(rec('u1', 'b1'), null, 'b1'), 'guest must be rejected');
  });
  await t('cache: legacy v1 record (no userId / cacheKey) is rejected', () => {
    assert(!isCacheRecordUsable({ bookId: 'b1', data: new ArrayBuffer(1) } as any, 'u1', 'b1'), 'legacy record must be rejected');
  });
  await t('cache: tampered record (key/user mismatch) is rejected', () => {
    assert(!isCacheRecordUsable({ ...rec('u1', 'b1'), userId: 'u2' }, 'u2', 'b1'), 'mismatched cacheKey must be rejected');
  });
  await t('cache: 401/403/404 from server purges the cached copy', () => {
    for (const s of [401, 403, 404]) assert(decideCachedPdfUse(classifyAccessProbe(s)) === 'purge', `status ${s} must purge`);
  });
  await t('cache: 200 allows; offline (network error) allows; 5xx treated as unreachable', () => {
    assert(decideCachedPdfUse(classifyAccessProbe(200)) === 'use', '200 must allow');
    assert(classifyAccessProbe(null) === 'unreachable' && decideCachedPdfUse('unreachable') === 'use', 'offline must allow');
    assert(classifyAccessProbe(503) === 'unreachable', '503 is not an authoritative denial');
  });

  // ---- Upload timeout (F-09) ----
  await t('timeout: empty/small file gets ~60 s (never below the minimum)', () => {
    assert(computeUploadTimeoutMs(0) === UPLOAD_TIMEOUT_MIN_MS, `0B got ${computeUploadTimeoutMs(0)}`);
    const small = computeUploadTimeoutMs(100 * 1024);
    assert(small >= UPLOAD_TIMEOUT_MIN_MS && small < 61_000, `100KB got ${small}`);
  });
  await t('timeout: grows with size (10 MB > 1 MB)', () => {
    assert(computeUploadTimeoutMs(10 * 1048576) > computeUploadTimeoutMs(1048576), 'must grow with size');
  });
  await t('timeout: 50 MB is capped below Node default requestTimeout (300 s)', () => {
    const ms = computeUploadTimeoutMs(50 * 1048576);
    assert(ms === UPLOAD_TIMEOUT_MAX_MS && ms < 300_000, `got ${ms}`);
  });
  await t('timeout: old fixed 15 s value is gone for every size', () => {
    for (const mb of [0, 1, 5, 20, 50]) assert(computeUploadTimeoutMs(mb * 1048576) >= 60_000, `${mb}MB too short`);
  });
  await t('timeout: invalid sizes are handled', () => {
    assert(computeUploadTimeoutMs(NaN) === UPLOAD_TIMEOUT_MIN_MS && computeUploadTimeoutMs(-5) === UPLOAD_TIMEOUT_MIN_MS, 'invalid sizes');
  });

  // ---- Idempotent upload identity ----
  const file = { name: 'a.pdf', size: 10, lastModified: 5 };
  await t('fingerprint: same file + metadata => same logical upload', () => {
    assert(uploadFingerprint(file, { title: 'T', visibility: 'PRIVATE' }) === uploadFingerprint(file, { title: ' T ', visibility: 'PRIVATE' }), 'must match');
  });
  await t('fingerprint: different file or visibility => new logical upload', () => {
    const base = uploadFingerprint(file, { title: 'T', visibility: 'PRIVATE' });
    assert(base !== uploadFingerprint({ ...file, size: 11 }, { title: 'T', visibility: 'PRIVATE' }), 'size');
    assert(base !== uploadFingerprint(file, { title: 'T', visibility: 'PUBLIC' }), 'visibility');
  });
  await t('clientUploadId matches the server pattern', () => {
    for (const id of [createClientUploadId(), createClientUploadId(() => '123e4567-e89b-12d3-a456-426614174000')]) {
      assert(/^[A-Za-z0-9-]{8,64}$/.test(id), `bad id ${id}`);
    }
  });

  // ---- Reconciliation after a timeout ----
  const noSleep = async () => {};
  await t('reconcile: polls while processing, returns completed book', async () => {
    const seq = [{ status: 'processing' }, { status: 'processing' }, { status: 'completed', book: { id: 'b9' } }] as any[];
    let calls = 0;
    const r = await reconcileUpload(async () => seq[calls++], { attempts: 6, intervalMs: 0, sleep: noSleep });
    assert(r.status === 'completed' && r.book.id === 'b9' && calls === 3, JSON.stringify(r));
  });
  await t('reconcile: stops at attempt limit while still processing (no resend decided)', async () => {
    let calls = 0;
    const r = await reconcileUpload(async () => { calls++; return { status: 'processing' as const }; }, { attempts: 3, intervalMs: 0, sleep: noSleep });
    assert(r.status === 'processing' && calls === 3, JSON.stringify(r));
  });
  await t('reconcile: unreachable server reported as unreachable', async () => {
    const r = await reconcileUpload(async () => { throw new Error('offline'); }, { attempts: 2, intervalMs: 0, sleep: noSleep });
    assert(r.status === 'unreachable', JSON.stringify(r));
  });
  await t('reconcile: failed and unknown end polling immediately', async () => {
    for (const s of ['failed', 'unknown'] as const) {
      let calls = 0;
      const r = await reconcileUpload(async () => { calls++; return { status: s }; }, { attempts: 5, intervalMs: 0, sleep: noSleep });
      assert(r.status === s && calls === 1, `${s}: ${JSON.stringify(r)} calls=${calls}`);
    }
  });

  // ---- AI response schema (F-11) ----
  await t('ai: real backend book summary shape renders', () => {
    const txt = summaryTextFromResponse({ quickOverview: 'Overview.', mainIdeas: ['A'], keyTakeaways: [], importantConcepts: [{ title: 'C', explanation: 'E' }] });
    assert(!!txt && txt.includes('Overview.') && txt.includes('• A') && txt.includes('C: E'), String(txt));
  });
  await t('ai: real backend chapter summary shape renders', () => {
    const txt = summaryTextFromResponse({ summary: 'Chapter text.', keyPoints: ['K1'] });
    assert(!!txt && txt.startsWith('Chapter text.') && txt.includes('• K1'), String(txt));
  });
  await t('ai: demo mock summary shape still renders', () => {
    assert(summaryTextFromResponse({ summary: { content: 'Mock' } }) === 'Mock', 'mock shape');
  });
  await t('ai: empty payload yields null (UI shows an error instead of nothing)', () => {
    assert(summaryTextFromResponse({}) === null && summaryTextFromResponse(null) === null, 'null expected');
  });
  await t('ai: answer extracted from real ({answer}) and mock ({chat}) shapes', () => {
    assert(answerFromResponse({ question: 'q', answer: 'A1' }) === 'A1', 'real');
    assert(answerFromResponse({ chat: { answer: 'A2' } }) === 'A2', 'mock');
    assert(answerFromResponse({}) === null, 'empty');
  });

  const failed = results.filter((r) => !r.ok).length;
  console.log(`\nFrontend unit results: ${results.length - failed} passed, ${failed} failed, ${results.length} total`);
  process.exit(failed ? 1 : 0);
}
main();
