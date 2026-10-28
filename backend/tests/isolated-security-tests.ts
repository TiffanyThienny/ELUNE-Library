/**
 * Isolated security / regression tests for Elunè (no database required).
 *
 * Safety:
 *  - DATABASE_URL is forced to an unreachable address BEFORE any app module is
 *    imported (dotenv never overrides already-set variables), and every Prisma
 *    delegate the tests reach is stubbed in-process. No query can reach the
 *    real database.
 *  - UPLOAD_DIR points to a fresh temp directory that is deleted at the end.
 *  - JWT_SECRET is a random per-run value; tokens are signed locally.
 *
 * Run: npx tsx tests/isolated-security-tests.ts   (cwd: backend/)
 */
import os from 'os';
import fs from 'fs';
import path from 'path';
import http from 'http';
import crypto from 'crypto';

const TMP_UPLOAD_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'elune-isolated-'));
process.env.DATABASE_URL = 'postgresql://isolated:isolated@127.0.0.1:1/isolated_no_db';
process.env.UPLOAD_DIR = TMP_UPLOAD_DIR;
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = crypto.randomBytes(32).toString('hex');
process.env.GEMINI_API_KEY = ''; // AI runs in its non-AI fallback: no paid Gemini calls
process.env.MAX_FILE_SIZE_MB = '2'; // small limit so the oversized-upload test stays fast

interface TestResult { name: string; passed: boolean; error?: string }
const results: TestResult[] = [];

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

async function runTest(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    results.push({ name, passed: true });
    console.log(`  ✓ ${name}`);
  } catch (err: any) {
    results.push({ name, passed: false, error: err.message });
    console.error(`  ✗ ${name}: ${err.message}`);
  }
}

// ---------- Fixtures ----------
const USERS: Record<string, any> = {
  'u-owner': { id: 'u-owner', name: 'Owner', email: 'owner@test.local', role: 'USER' },
  'u-other': { id: 'u-other', name: 'Other', email: 'other@test.local', role: 'USER' },
  'u-admin': { id: 'u-admin', name: 'Admin', email: 'admin@test.local', role: 'ADMIN' }
};

const PDF_BYTES = Buffer.from('%PDF-1.4\n% isolated test fixture\n%%EOF\n');

const BOOKS: Record<string, any> = {
  'b-private': { id: 'b-private', title: 'Private', author: 'A', visibility: 'PRIVATE', status: 'APPROVED', uploadedBy: 'u-owner', fileUrl: '/uploads/book-private.pdf', coverUrl: '/uploads/book-private-cover.png' },
  'b-pending': { id: 'b-pending', title: 'Pending', author: 'A', visibility: 'PUBLIC', status: 'PENDING', uploadedBy: 'u-owner', fileUrl: '/uploads/book-pending.pdf', coverUrl: null },
  'b-rejected': { id: 'b-rejected', title: 'Rejected', author: 'A', visibility: 'PUBLIC', status: 'REJECTED', uploadedBy: 'u-owner', fileUrl: '/uploads/book-rejected.pdf', coverUrl: null },
  'b-public': { id: 'b-public', title: 'Public', author: 'A', visibility: 'PUBLIC', status: 'APPROVED', uploadedBy: 'u-owner', fileUrl: '/uploads/book-public.pdf', coverUrl: '/uploads/book-public-cover.png' },
  'b-shared-1': { id: 'b-shared-1', title: 'Shared A', author: 'A', visibility: 'PRIVATE', status: 'APPROVED', uploadedBy: 'u-owner', fileUrl: '/uploads/book-shared.pdf', coverUrl: null },
  'b-shared-2': { id: 'b-shared-2', title: 'Shared B', author: 'A', visibility: 'PRIVATE', status: 'APPROVED', uploadedBy: 'u-owner', fileUrl: '/uploads/book-shared.pdf', coverUrl: null },
  'b-delete': { id: 'b-delete', title: 'ToDelete', author: 'A', visibility: 'PRIVATE', status: 'APPROVED', uploadedBy: 'u-owner', fileUrl: '/uploads/book-delete-me.pdf', coverUrl: '/uploads/book-delete-me-cover.png' }
};

const CHAPTERS: Record<string, any> = {
  'ch-private': { id: 'ch-private', bookId: 'b-private', chapterNumber: 1, title: 'Secret chapter' }
};

const SECRET_TEXT = 'PRIVATE-CONTENT-MARKER the owner wrote this privately.';

function writeFixtureFiles() {
  for (const b of Object.values(BOOKS)) {
    fs.writeFileSync(path.join(TMP_UPLOAD_DIR, path.basename(b.fileUrl)), PDF_BYTES);
    if (b.coverUrl) fs.writeFileSync(path.join(TMP_UPLOAD_DIR, path.basename(b.coverUrl)), Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  }
}

const deletedBookIds: string[] = [];
let createdBookCount = 0;
let createDelayMs = 0;
let lastCreateData: any = null;
let failNextBookCreate = false;
let failNextUserBookUpsert = false;

/** Minimal valid single-page PDF with selectable text (parsed by the real document service). */
function buildTextPdf(text: string): Buffer {
  return buildPdf(`BT /F1 12 Tf 50 720 Td (${text}) Tj ET`);
}

/** Single-page PDF painting a 1x1 raster image and no text (simulates a scanned page). */
function buildImageOnlyPdf(): Buffer {
  return buildPdf('q 200 0 0 200 100 400 cm /Im1 Do Q', true);
}

/** Single-page PDF with an empty content stream (blank page). */
function buildBlankPdf(): Buffer {
  return buildPdf('');
}

function buildPdf(stream: string, withImage = false): Buffer {
  const resources = withImage ? '<< /XObject << /Im1 6 0 R >> >>' : '<< /Font << /F1 4 0 R >> >>';
  const objs = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources ${resources} /Contents 5 0 R >>\nendobj\n`,
    '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
    `5 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}\nendstream\nendobj\n`
  ];
  if (withImage) {
    objs.push('6 0 obj\n<< /Type /XObject /Subtype /Image /Width 1 /Height 1 /ColorSpace /DeviceGray /BitsPerComponent 8 /Length 1 >>\nstream\n\x80\nendstream\nendobj\n');
  }
  let body = '%PDF-1.4\n';
  const offsets: number[] = [];
  for (const o of objs) { offsets.push(Buffer.byteLength(body, 'latin1')); body += o; }
  const xref = Buffer.byteLength(body, 'latin1');
  body += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('');
  body += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(body, 'latin1');
}

function installPrismaStubs(prisma: any) {
  const fail = (what: string) => async () => { throw new Error(`Unexpected DB call in isolated test: ${what}`); };
  const pick = (obj: any, select?: any) => {
    if (!obj || !select) return obj;
    const out: any = {};
    for (const k of Object.keys(select)) if (select[k]) out[k] = obj[k];
    return out;
  };

  prisma.user.findUnique = async ({ where, select }: any) => pick(USERS[where.id] || null, select);

  prisma.book.findUnique = async ({ where, select }: any) => {
    const b = BOOKS[where.id];
    if (!b || deletedBookIds.includes(b.id)) return null;
    const full = {
      ...b,
      chapters: b.__chapters || [{ id: 'ch-private', chapterNumber: 1, title: 'Secret chapter', contentBlocks: [{ text: SECRET_TEXT }] }],
      summaries: [], category: null, uploader: null, readingProgress: []
    };
    return pick(full, select);
  };
  prisma.book.findFirst = async ({ where, select }: any) => {
    const b = Object.values(BOOKS).find((x: any) => !deletedBookIds.includes(x.id) && where?.coverUrl && x.coverUrl === where.coverUrl);
    return pick(b || null, select);
  };
  prisma.book.delete = async ({ where }: any) => { deletedBookIds.push(where.id); return BOOKS[where.id]; };
  prisma.book.create = fail('book.create');

  prisma.chapter.findUnique = async ({ where }: any) => {
    for (const b of Object.values(BOOKS) as any[]) {
      const created = (b.__chapters || []).find((c: any) => c.id === where.id);
      if (created) return { ...created, book: b };
    }
    const ch = CHAPTERS[where.id];
    if (!ch) return null;
    return { ...ch, book: BOOKS[ch.bookId], contentBlocks: [{ id: 'cb-1', blockIndex: 1, pageNumber: 1, text: SECRET_TEXT }] };
  };

  // Cached AI artefacts that would leak private content if access is not checked.
  prisma.summary.findFirst = async () => ({ content: JSON.stringify({ quickOverview: SECRET_TEXT, mainIdeas: [], keyTakeaways: [], importantConcepts: [], summary: SECRET_TEXT, keyPoints: [] }) });
  prisma.summary.create = async ({ data }: any) => data;
  prisma.flashcard.findMany = async () => [{ id: 'f1', front: SECRET_TEXT, back: SECRET_TEXT }];
  prisma.flashcard.createMany = async () => ({ count: 0 });
  prisma.flashcard.deleteMany = async () => ({ count: 0 });
  prisma.quiz.findMany = async () => [{ id: 'q1', question: SECRET_TEXT, options: '[]', correctAnswer: 'x', explanation: SECRET_TEXT }];
  prisma.quiz.createMany = async () => ({ count: 0 });
  prisma.quiz.deleteMany = async () => ({ count: 0 });
  prisma.aIChat.create = async ({ data }: any) => data;
  prisma.contentBlock.findMany = async ({ where }: any = {}) => {
    const bookId = where?.chapter?.bookId;
    if (bookId && BOOKS[bookId]?.__chapters) {
      return BOOKS[bookId].__chapters.flatMap((c: any) => c.contentBlocks || []);
    }
    return [{ id: 'cb-1', text: SECRET_TEXT, pageNumber: 1, chapter: { title: 'Secret chapter', chapterNumber: 1 } }];
  };
  prisma.audioTrack.findFirst = async ({ where }: any) => ({
    id: 'at-1', bookId: where.bookId, chapterId: where.chapterId, audioUrl: '/audio/x.mp3', duration: 3,
    segments: [{ id: 's1', contentBlockId: 'cb-1', startTime: 0, endTime: 3, contentBlock: { id: 'cb-1', blockIndex: 1, pageNumber: 1, text: SECRET_TEXT } }]
  });
  prisma.audioTrack.create = fail('audioTrack.create');

  const BLOCKS: Record<string, any> = {
    'cb-private': { id: 'cb-private', chapterId: 'ch-private', chapter: { bookId: 'b-private' } },
    'cb-public': { id: 'cb-public', chapterId: 'ch-public', chapter: { bookId: 'b-public' } }
  };
  prisma.contentBlock.findUnique = async ({ where }: any) => BLOCKS[where.id] || null;

  // Persistence stubs for the successful-upload path (F-09 idempotency tests).
  prisma.book.create = async ({ data }: any) => {
    if (createDelayMs > 0) await new Promise((r) => setTimeout(r, createDelayMs));
    if (failNextBookCreate) {
      failNextBookCreate = false;
      // Simulates a DB failure whose message contains internals that must never reach the client.
      throw new Error(`Invalid prisma.book.create() invocation in ${TMP_UPLOAD_DIR}\\internal.ts: connection reset`);
    }
    const id = `b-new-${++createdBookCount}`;
    lastCreateData = data;
    // Keep the chapters/blocks the real document service extracted, as the DB would.
    const extracted = (data.chapters?.create || []).map((ch: any, i: number) => ({
      id: `${id}-ch-${i + 1}`,
      bookId: id,
      chapterNumber: ch.chapterNumber,
      title: ch.title,
      contentBlocks: (ch.contentBlocks?.create || []).map((b: any, j: number) => ({ id: `${id}-cb-${i + 1}-${j + 1}`, ...b })),
      audioTracks: []
    }));
    const { chapters: _omit, ...rest } = data;
    const book = { ...rest, id, __chapters: extracted, audioTracks: [], category: null };
    BOOKS[id] = book;
    return { ...book, chapters: [] };
  };
  prisma.chapter.findMany = async ({ where }: any) => (BOOKS[where?.bookId]?.__chapters as any[]) || [];
  prisma.book.count = async ({ where }: any) => {
    const urls = (where?.OR || []).map((c: any) => c.fileUrl ?? c.coverUrl);
    return Object.values(BOOKS).filter(
      (b: any) => !deletedBookIds.includes(b.id) && (urls.includes(b.fileUrl) || urls.includes(b.coverUrl))
    ).length;
  };
  prisma.userBook.upsert = async () => {
    if (failNextUserBookUpsert) {
      failNextUserBookUpsert = false;
      throw new Error('userBook upsert failed (simulated)');
    }
    return {};
  };
  prisma.bookmark.upsert = async ({ create }: any) => ({ id: 'bm-1', ...create });
  prisma.note.create = async ({ data }: any) => ({ id: 'n-1', ...data });
}

async function main() {
  console.log('\n======================================================');
  console.log('🧪 Elunè isolated security & regression tests (no DB)');
  console.log('======================================================\n');

  const jwt = (await import('jsonwebtoken')).default;
  const { prisma } = await import('../src/config/prisma');
  const { createApp } = await import('../src/app');
  const { validateEnv } = await import('../src/config/env');

  installPrismaStubs(prisma);
  writeFixtureFiles();

  const token = (userId: string) => jwt.sign({ userId, role: USERS[userId].role }, process.env.JWT_SECRET as string, { expiresIn: '5m' });
  const auth = (userId?: string): Record<string, string> => (userId ? { Authorization: `Bearer ${token(userId)}` } : {});

  const app = createApp();
  let server!: http.Server;
  const baseUrl: string = await new Promise((resolve) => {
    server = app.listen(0, () => resolve(`http://127.0.0.1:${(server.address() as any).port}`));
  });

  const filesInUploadDir = () => new Set(fs.readdirSync(TMP_UPLOAD_DIR));

  // ---------- F-01: static /uploads must not expose book documents ----------
  for (const id of ['b-private', 'b-pending', 'b-rejected', 'b-public']) {
    await runTest(`F-01 guest cannot fetch ${id} document via static /uploads`, async () => {
      const res = await fetch(`${baseUrl}${BOOKS[id].fileUrl}`);
      const body = Buffer.from(await res.arrayBuffer());
      assert(res.status === 404, `Expected 404, got ${res.status}`);
      assert(!body.toString('latin1').startsWith('%PDF'), 'PDF bytes must not be returned');
    });
  }

  for (const variant of ['book-private.PDF', 'book-private.pdf.', 'book-private.pdf%20', 'book-private.pdf::$DATA', 'book-private%2Epdf']) {
    await runTest(`F-01 bypass variant /uploads/${variant} does not return the PDF`, async () => {
      const res = await fetch(`${baseUrl}/uploads/${variant}`);
      const body = Buffer.from(await res.arrayBuffer());
      assert(!body.toString('latin1').startsWith('%PDF'), `PDF bytes returned (status ${res.status})`);
    });
  }

  // ---------- F-12: cover access policy ----------
  const { signCoverFilename } = await import('../src/utils/coverUrl.util');

  await runTest('F-12 public book cover is served without a signature', async () => {
    const res = await fetch(`${baseUrl}/uploads/book-public-cover.png`);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
  });

  await runTest('F-12 public cover is returned unsigned by the API', async () => {
    const res = await fetch(`${baseUrl}/api/books/b-public`);
    const json: any = await res.json();
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(json.data.coverUrl === '/uploads/book-public-cover.png', `Unexpected coverUrl ${json.data.coverUrl}`);
  });

  await runTest('F-12 private book cover without signature returns 404', async () => {
    const res = await fetch(`${baseUrl}/uploads/book-private-cover.png`);
    assert(res.status === 404, `Expected 404, got ${res.status}`);
  });

  await runTest('F-12 guest cannot obtain a signed private cover URL (book endpoint 403)', async () => {
    const res = await fetch(`${baseUrl}/api/books/b-private`);
    const text = await res.text();
    assert(res.status === 403, `Expected 403, got ${res.status}`);
    assert(!text.includes('sig='), 'Signed cover URL leaked to guest');
  });

  let ownerSignedCover = '';
  await runTest('F-12 owner receives a signed cover URL that loads (200, private cache)', async () => {
    const res = await fetch(`${baseUrl}/api/books/b-private`, { headers: auth('u-owner') });
    const json: any = await res.json();
    ownerSignedCover = json.data.coverUrl;
    assert(/^\/uploads\/book-private-cover\.png\?exp=\d+&sig=[\w-]+$/.test(ownerSignedCover), `Unexpected coverUrl ${ownerSignedCover}`);
    const img = await fetch(`${baseUrl}${ownerSignedCover}`);
    assert(img.status === 200, `Expected 200, got ${img.status}`);
    assert((img.headers.get('cache-control') || '').includes('private'), 'Expected private cache-control');
  });

  await runTest('F-12 tampered signature returns 404', async () => {
    const tampered = ownerSignedCover.replace(/sig=([\w-])/, (_m, c) => `sig=${c === 'A' ? 'B' : 'A'}`);
    const res = await fetch(`${baseUrl}${tampered}`);
    assert(res.status === 404, `Expected 404, got ${res.status}`);
  });

  await runTest('F-12 expired signature returns 404', async () => {
    const expired = signCoverFilename('book-private-cover.png', Math.floor(Date.now() / 1000) - 7 * 3600);
    const res = await fetch(`${baseUrl}${expired}`);
    assert(res.status === 404, `Expected 404, got ${res.status}`);
  });

  await runTest('F-12 a signature for one cover cannot unlock another file', async () => {
    const query = ownerSignedCover.split('?')[1];
    const res = await fetch(`${baseUrl}/uploads/book-delete-me-cover.png?${query}`);
    assert(res.status === 404, `Expected 404, got ${res.status}`);
  });

  await runTest('F-12 unreferenced image in uploads (orphan) returns 404', async () => {
    fs.writeFileSync(path.join(TMP_UPLOAD_DIR, 'book-orphan.png'), Buffer.from([0x89, 0x50, 0x4e, 0x47]));
    const res = await fetch(`${baseUrl}/uploads/book-orphan.png`);
    assert(res.status === 404, `Expected 404, got ${res.status}`);
  });

  await runTest('F-12 my-uploads returns signed URLs for private covers', async () => {
    (prisma as any).book.findMany = async () => [{ ...BOOKS['b-private'], category: null, _count: { chapters: 0 } }];
    const res = await fetch(`${baseUrl}/api/books/my-uploads`, { headers: auth('u-owner') });
    const json: any = await res.json();
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(String(json.data.books[0].coverUrl).includes('sig='), 'Expected signed cover URL');
  });

  // Protected endpoint access matrix (should already be correct; guards against regressions).
  const matrix: [string, string | undefined, number][] = [
    ['b-private', undefined, 403], ['b-private', 'u-other', 403], ['b-private', 'u-owner', 200], ['b-private', 'u-admin', 200],
    ['b-pending', undefined, 403], ['b-pending', 'u-other', 403], ['b-pending', 'u-owner', 200], ['b-pending', 'u-admin', 200],
    ['b-rejected', undefined, 403], ['b-rejected', 'u-other', 403], ['b-rejected', 'u-owner', 200],
    ['b-public', undefined, 200], ['b-public', 'u-other', 200]
  ];
  for (const [bookId, userId, expected] of matrix) {
    await runTest(`F-01 matrix: GET /api/books/${bookId}/file as ${userId || 'guest'} -> ${expected}`, async () => {
      const res = await fetch(`${baseUrl}/api/books/${bookId}/file`, { headers: auth(userId) });
      const body = Buffer.from(await res.arrayBuffer());
      assert(res.status === expected, `Expected ${expected}, got ${res.status}`);
      if (expected === 200) assert(body.toString('latin1').startsWith('%PDF'), 'Expected PDF bytes');
    });
  }

  // ---------- F-03: upload validation ----------
  const upload = async (fields: { name: string; filename: string; content: Buffer | string; type: string }[]) => {
    const fd = new FormData();
    for (const f of fields) fd.append(f.name, new Blob([f.content], { type: f.type }), f.filename);
    fd.append('title', 'Isolated upload');
    return fetch(`${baseUrl}/api/books/upload`, { method: 'POST', headers: auth('u-owner'), body: fd });
  };

  await runTest('F-03 SVG in book "file" field is rejected with 400 and not stored', async () => {
    const before = filesInUploadDir();
    const res = await upload([{ name: 'file', filename: 'evil.svg', content: '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>', type: 'image/svg+xml' }]);
    assert(res.status === 400, `Expected 400, got ${res.status}`);
    const added = [...filesInUploadDir()].filter((f) => !before.has(f));
    assert(added.length === 0, `Rejected upload left files on disk: ${added.join(', ')}`);
  });

  await runTest('F-03 SVG cover image is rejected with 400 and not stored', async () => {
    const before = filesInUploadDir();
    const res = await upload([
      { name: 'file', filename: 'book.pdf', content: PDF_BYTES, type: 'application/pdf' },
      { name: 'cover', filename: 'cover.svg', content: '<svg xmlns="http://www.w3.org/2000/svg"/>', type: 'image/svg+xml' }
    ]);
    assert(res.status === 400, `Expected 400, got ${res.status}`);
    const added = [...filesInUploadDir()].filter((f) => !before.has(f));
    assert(added.length === 0, `Rejected upload left files on disk: ${added.join(', ')}`);
  });

  await runTest('F-03 unsupported extension (.exe) returns 400, not 500', async () => {
    const res = await upload([{ name: 'file', filename: 'tool.exe', content: 'MZ', type: 'application/octet-stream' }]);
    assert(res.status === 400, `Expected 400, got ${res.status}`);
  });

  await runTest('F-03 spoofed .pdf (no %PDF header) returns 400 and leaves no orphan file', async () => {
    const before = filesInUploadDir();
    const res = await upload([{ name: 'file', filename: 'fake.pdf', content: 'this is not a pdf', type: 'application/pdf' }]);
    assert(res.status === 400, `Expected 400, got ${res.status}`);
    const added = [...filesInUploadDir()].filter((f) => !before.has(f));
    assert(added.length === 0, `Rejected upload left files on disk: ${added.join(', ')}`);
  });

  // ---------- F-09: idempotent uploads (no duplicate books on retry) ----------
  const VALID_PDF = buildTextPdf('Chapter 1: Quiet Mornings. The reader sits by the window and reads slowly for an hour.');
  const uploadWithId = (clientUploadId: string | null, content: Buffer | string = VALID_PDF, userId = 'u-owner') => {
    const fd = new FormData();
    if (clientUploadId) fd.append('clientUploadId', clientUploadId);
    fd.append('title', 'Idempotent upload');
    fd.append('file', new Blob([content], { type: 'application/pdf' }), 'idem.pdf');
    return fetch(`${baseUrl}/api/books/upload`, { method: 'POST', headers: auth(userId), body: fd });
  };
  const statusOf = async (id: string, userId = 'u-owner') => {
    const res = await fetch(`${baseUrl}/api/books/upload-status/${id}`, { headers: auth(userId) });
    return { http: res.status, json: (await res.json()) as any };
  };

  const idA = `test-${crypto.randomUUID()}`;
  let firstBookId = '';
  await runTest('F-09 first upload with clientUploadId creates exactly one book (201)', async () => {
    const before = createdBookCount;
    const res = await uploadWithId(idA);
    const json: any = await res.json();
    assert(res.status === 201, `Expected 201, got ${res.status} ${JSON.stringify(json).slice(0, 200)}`);
    firstBookId = json.data.book.id;
    assert(createdBookCount === before + 1, 'Expected exactly one book created');
  });

  await runTest('F-09 retry with the same clientUploadId returns the existing book and creates none', async () => {
    const before = createdBookCount;
    const filesBefore = filesInUploadDir();
    const res = await uploadWithId(idA);
    const json: any = await res.json();
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(json.data.deduplicated === true && json.data.book.id === firstBookId, 'Expected the original book');
    assert(createdBookCount === before, 'Retry must not create a new book');
    const added = [...filesInUploadDir()].filter((f) => !filesBefore.has(f));
    assert(added.length === 0, `Duplicate upload left files on disk: ${added.join(', ')}`);
  });

  await runTest('F-09 upload-status reports completed with the book for the owner', async () => {
    const s = await statusOf(idA);
    assert(s.http === 200 && s.json.data.status === 'completed' && s.json.data.book.id === firstBookId, JSON.stringify(s.json));
  });

  await runTest('F-09 upload-status is scoped per user (other user sees unknown)', async () => {
    const s = await statusOf(idA, 'u-other');
    assert(s.http === 200 && s.json.data.status === 'unknown', JSON.stringify(s.json));
  });

  await runTest('F-09 upload-status rejects malformed ids (400)', async () => {
    const s = await statusOf('bad');
    assert(s.http === 400, `Expected 400, got ${s.http}`);
  });

  await runTest('F-09 concurrent retry while first attempt is processing gets 409 and creates nothing', async () => {
    const idB = `test-${crypto.randomUUID()}`;
    createDelayMs = 800;
    const before = createdBookCount;
    const first = uploadWithId(idB);
    await new Promise((r) => setTimeout(r, 300));
    const filesBefore = filesInUploadDir();
    const retry = await uploadWithId(idB);
    assert(retry.status === 409, `Expected 409, got ${retry.status}`);
    const mid = await statusOf(idB);
    assert(mid.json.data.status === 'processing', `Expected processing, got ${mid.json.data.status}`);
    const firstRes = await first;
    createDelayMs = 0;
    assert(firstRes.status === 201, `First attempt expected 201, got ${firstRes.status}`);
    assert(createdBookCount === before + 1, `Expected one book, got ${createdBookCount - before}`);
    const added = [...filesInUploadDir()].filter((f) => !filesBefore.has(f));
    assert(added.length <= 1, `Rejected retry left files on disk: ${added.join(', ')}`); // only the first attempt's file may persist
  });

  await runTest('F-09 a failed attempt does not lock its id (retry with valid file succeeds)', async () => {
    const idC = `test-${crypto.randomUUID()}`;
    const bad = await uploadWithId(idC, 'not a pdf');
    assert(bad.status === 400, `Expected 400, got ${bad.status}`);
    const s = await statusOf(idC);
    assert(s.json.data.status === 'failed', `Expected failed, got ${s.json.data.status}`);
    const good = await uploadWithId(idC);
    assert(good.status === 201, `Expected 201, got ${good.status}`);
  });

  await runTest('F-09 uploads without clientUploadId keep working (backwards compatible)', async () => {
    const res = await uploadWithId(null);
    assert(res.status === 201, `Expected 201, got ${res.status}`);
  });

  // ---------- CORE: upload -> persist -> read -> extract -> AI (stubbed persistence) ----------
  const MARKER = 'Lanterns drift over the quiet harbor at dawn';
  const corePdf = buildTextPdf(`Chapter 1: Harbor Lights. ${MARKER}. The keeper counts every boat that returns.`);
  const coreUpload = async (extra: Record<string, string> = {}, content: Buffer | string = corePdf, filename = 'harbor.pdf', userId = 'u-owner') => {
    const fd = new FormData();
    fd.append('title', 'Harbor Lights');
    for (const [k, v] of Object.entries(extra)) fd.append(k, v);
    fd.append('file', new Blob([content], { type: 'application/pdf' }), filename);
    return fetch(`${baseUrl}/api/books/upload`, { method: 'POST', headers: auth(userId), body: fd });
  };

  let coreBookId = '';
  await runTest('CORE upload: valid PDF -> 201 with persisted id, READY, owner set, stored file on disk', async () => {
    const res = await coreUpload();
    const text = await res.text();
    const json: any = JSON.parse(text);
    assert(res.status === 201, `Expected 201, got ${res.status}`);
    coreBookId = json.data.book.id;
    assert(Boolean(coreBookId), 'book id missing');
    assert(json.data.book.processingStatus === 'READY' && json.data.book.isScanned === false, 'expected READY text book');
    assert(lastCreateData.uploadedBy === 'u-owner', 'owner not persisted');
    assert(/^\/uploads\/book-\d+-[0-9a-f]{24}\.pdf$/.test(lastCreateData.fileUrl), `unsafe/unexpected storage name ${lastCreateData.fileUrl}`);
    assert(fs.existsSync(path.join(TMP_UPLOAD_DIR, path.basename(lastCreateData.fileUrl))), 'stored PDF missing on disk');
    assert(lastCreateData.visibility === 'PRIVATE' && lastCreateData.status === 'APPROVED', 'default must be PRIVATE/APPROVED');
    assert(!text.includes(TMP_UPLOAD_DIR) && !/[A-Za-z]:\\\\/.test(text), 'filesystem path leaked in response');
  });

  await runTest('CORE extraction: persisted content blocks contain the PDF text', async () => {
    const blocks = (lastCreateData.chapters?.create || []).flatMap((c: any) => c.contentBlocks.create.map((b: any) => b.text));
    assert(blocks.some((t: string) => t.includes(MARKER)), `marker not in blocks: ${JSON.stringify(blocks).slice(0, 200)}`);
  });

  await runTest('CORE read: owner streams the exact stored PDF (application/pdf, private no-store)', async () => {
    const res = await fetch(`${baseUrl}/api/books/${coreBookId}/file`, { headers: auth('u-owner') });
    const body = Buffer.from(await res.arrayBuffer());
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert((res.headers.get('content-type') || '').startsWith('application/pdf'), `content-type ${res.headers.get('content-type')}`);
    assert((res.headers.get('cache-control') || '').includes('no-store'), 'expected no-store');
    assert(body.equals(corePdf), 'streamed bytes differ from uploaded PDF');
  });

  await runTest('CORE read: HTTP Range returns 206 with Content-Range (pdf.js incremental loading)', async () => {
    const res = await fetch(`${baseUrl}/api/books/${coreBookId}/file`, { headers: { ...auth('u-owner'), Range: 'bytes=0-7' } });
    const body = Buffer.from(await res.arrayBuffer());
    assert(res.status === 206, `Expected 206, got ${res.status}`);
    assert((res.headers.get('content-range') || '').startsWith('bytes 0-7/'), `content-range ${res.headers.get('content-range')}`);
    assert(body.toString('latin1') === '%PDF-1.4', 'range body mismatch');
  });

  await runTest('CORE read: other user and guest are rejected for the new private PDF (403)', async () => {
    const other = await fetch(`${baseUrl}/api/books/${coreBookId}/file`, { headers: auth('u-other') });
    const guest = await fetch(`${baseUrl}/api/books/${coreBookId}/file`);
    assert(other.status === 403 && guest.status === 403, `other=${other.status} guest=${guest.status}`);
  });

  await runTest('CORE read: stored file is not reachable through static /uploads', async () => {
    const res = await fetch(`${baseUrl}${lastCreateData.fileUrl}`);
    assert(res.status === 404, `Expected 404, got ${res.status}`);
  });

  await runTest('CORE reader: GET /api/reader/:id returns what the PDF reader needs (file + processing state)', async () => {
    (prisma as any).bookmark.findMany = async () => [];
    (prisma as any).note.findMany = async () => [];
    (prisma as any).readingProgress.findUnique = async () => null;
    const res = await fetch(`${baseUrl}/api/reader/${coreBookId}`, { headers: auth('u-owner') });
    const json: any = await res.json();
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const b = json.data.book;
    assert(b.hasFile === true && b.fileStreamUrl === `/api/books/${coreBookId}/file`, `file fields: ${JSON.stringify({ hasFile: b.hasFile, fileStreamUrl: b.fileStreamUrl })}`);
    assert(b.processingStatus === 'READY' && b.isScanned === false, 'processing state missing');
    const guest = await fetch(`${baseUrl}/api/reader/${coreBookId}`);
    assert(guest.status === 403, `guest expected 403, got ${guest.status}`);
  });

  await runTest('CORE progress: POST /api/reader/:id/progress saves frontend field names (chapterId/pageNumber)', async () => {
    let saved: any = null;
    (prisma as any).readingProgress.upsert = async ({ update }: any) => { saved = update; return { ...update, id: 'rp-1' }; };
    const ch = BOOKS[coreBookId].__chapters[0];
    const res = await fetch(`${baseUrl}/api/reader/${coreBookId}/progress`, {
      method: 'POST',
      headers: { ...auth('u-owner'), 'Content-Type': 'application/json' },
      body: JSON.stringify({ chapterId: ch.id, contentBlockId: ch.contentBlocks[0].id, pageNumber: 3, progressPercentage: 42 })
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    // The reader frontend uses chapterId/contentBlockId/pageNumber; they must map to the DB columns.
    assert(saved?.currentPage === 3, `currentPage not saved: ${JSON.stringify(saved)}`);
    assert(saved?.currentChapterId === ch.id, `currentChapterId not saved: ${JSON.stringify(saved)}`);
    assert(saved?.currentContentBlockId === ch.contentBlocks[0].id, `currentContentBlockId not saved: ${JSON.stringify(saved)}`);
    assert(saved?.progressPercentage === 42, `progressPercentage not saved: ${JSON.stringify(saved)}`);
  });

  await runTest('CORE progress: the book-progress endpoint (current* field names) still works', async () => {
    let saved: any = null;
    (prisma as any).readingProgress.upsert = async ({ update }: any) => { saved = update; return { ...update, id: 'rp-2' }; };
    const res = await fetch(`${baseUrl}/api/books/${coreBookId}/progress`, {
      method: 'PUT',
      headers: { ...auth('u-owner'), 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentChapterId: 'c1', currentPage: 5, progressPercentage: 50 })
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(saved?.currentPage === 5 && saved?.progressPercentage === 50, `not saved: ${JSON.stringify(saved)}`);
  });

  await runTest('CORE AI: book summary (non-AI fallback) is built from THIS book\'s text', async () => {
    const res = await fetch(`${baseUrl}/api/ai/summarize/book/${coreBookId}?refresh=true`, { method: 'POST', headers: auth('u-owner') });
    const json: any = await res.json();
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(JSON.stringify(json.data).includes('Lanterns drift'), `summary not from book text: ${JSON.stringify(json.data).slice(0, 200)}`);
    assert(!JSON.stringify(json.data).includes('Stoic') && !JSON.stringify(json.data).includes('Inner Sanctuary'), 'placeholder content leaked into summary');
  });

  await runTest('CORE AI: chapter summary is built from the uploaded chapter text', async () => {
    const chapterId = BOOKS[coreBookId].__chapters[0].id;
    const res = await fetch(`${baseUrl}/api/ai/summarize/chapter/${chapterId}?refresh=true`, { method: 'POST', headers: auth('u-owner') });
    const json: any = await res.json();
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(String(json.data.summary).includes('Lanterns drift'), `chapter summary: ${JSON.stringify(json.data).slice(0, 200)}`);
  });

  await runTest('CORE AI: Q&A (non-AI fallback) quotes the uploaded book, other user denied', async () => {
    const ask = (userId: string) =>
      fetch(`${baseUrl}/api/ai/ask/${coreBookId}`, {
        method: 'POST',
        headers: { ...auth(userId), 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: 'What drifts over the harbor?' })
      });
    const own = await ask('u-owner');
    const ownJson: any = await own.json();
    assert(own.status === 200 && String(ownJson.data.answer).includes('harbor'), `answer: ${JSON.stringify(ownJson.data).slice(0, 200)}`);
    const other = await ask('u-other');
    assert(other.status === 403, `other user expected 403, got ${other.status}`);
  });

  await runTest('CORE extraction: image-only PDF -> saved as scanned (FAILED, isScanned) with honest OCR message', async () => {
    const res = await coreUpload({}, buildImageOnlyPdf(), 'scan.pdf');
    const json: any = await res.json();
    assert(res.status === 201, `Expected 201, got ${res.status}`);
    assert(json.data.book.isScanned === true && json.data.book.processingStatus === 'FAILED', 'expected scanned/FAILED');
    assert(/scanned pages/i.test(json.data.book.processingError) && /OCR is not available/i.test(json.data.book.processingError), json.data.book.processingError);
    assert((lastCreateData.chapters ?? undefined) === undefined, 'no fake chapters may be created');
  });

  await runTest('CORE extraction: blank PDF is distinguished from a scanned one', async () => {
    const res = await coreUpload({}, buildBlankPdf(), 'blank.pdf');
    const json: any = await res.json();
    assert(res.status === 201, `Expected 201, got ${res.status}`);
    assert(/blank/i.test(json.data.book.processingError), json.data.book.processingError);
  });

  await runTest('CORE extraction: corrupt PDF (valid header, garbage body) -> 400, no book, no orphan file', async () => {
    const before = createdBookCount;
    const filesBefore = filesInUploadDir();
    const res = await coreUpload({}, '%PDF-1.4\n\x00\x01garbage-without-objects', 'corrupt.pdf');
    assert(res.status === 400, `Expected 400, got ${res.status}`);
    assert(createdBookCount === before, 'corrupt PDF must not create a book');
    const added = [...filesInUploadDir()].filter((f) => !filesBefore.has(f));
    assert(added.length === 0, `orphan files: ${added.join(', ')}`);
  });

  await runTest('CORE upload: oversized file -> 400 LIMIT_FILE_SIZE, no orphan file', async () => {
    const filesBefore = filesInUploadDir();
    const big = Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.alloc(3 * 1024 * 1024, 0x41)]);
    const res = await coreUpload({}, big, 'big.pdf');
    const json: any = await res.json();
    assert(res.status === 400 && json.error === 'LIMIT_FILE_SIZE', `got ${res.status} ${json.error}`);
    assert(String(json.message).includes('2MB'), `message should state configured limit: ${json.message}`);
    const added = [...filesInUploadDir()].filter((f) => !filesBefore.has(f));
    assert(added.length === 0, `orphan files: ${added.join(', ')}`);
  });

  await runTest('CORE upload: cover with image extension but non-image bytes -> 400, no files kept', async () => {
    const filesBefore = filesInUploadDir();
    const fd = new FormData();
    fd.append('title', 'Bad cover');
    fd.append('file', new Blob([corePdf], { type: 'application/pdf' }), 'ok.pdf');
    fd.append('cover', new Blob(['<html><script>alert(1)</script></html>'], { type: 'image/png' }), 'cover.png');
    const res = await fetch(`${baseUrl}/api/books/upload`, { method: 'POST', headers: auth('u-owner'), body: fd });
    const json: any = await res.json();
    assert(res.status === 400 && json.error === 'INVALID_COVER', `got ${res.status} ${json.error}`);
    const added = [...filesInUploadDir()].filter((f) => !filesBefore.has(f));
    assert(added.length === 0, `orphan files: ${added.join(', ')}`);
  });

  await runTest('CORE upload: real PNG cover is accepted and stored', async () => {
    const png = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c6360000002000154a24f5d0000000049454e44ae426082', 'hex');
    const fd = new FormData();
    fd.append('title', 'Good cover');
    fd.append('file', new Blob([corePdf], { type: 'application/pdf' }), 'ok.pdf');
    fd.append('cover', new Blob([png], { type: 'image/png' }), 'cover.png');
    const res = await fetch(`${baseUrl}/api/books/upload`, { method: 'POST', headers: auth('u-owner'), body: fd });
    assert(res.status === 201, `Expected 201, got ${res.status}`);
    assert(/^\/uploads\/book-.*\.png$/.test(lastCreateData.coverUrl), `coverUrl ${lastCreateData.coverUrl}`);
  });

  await runTest('CORE upload: client-supplied local coverUrl is ignored (cannot hijack another cover)', async () => {
    const res = await coreUpload({ coverUrl: '/uploads/book-private-cover.png' });
    assert(res.status === 201, `Expected 201, got ${res.status}`);
    assert(lastCreateData.coverUrl === null, `coverUrl should be dropped, got ${lastCreateData.coverUrl}`);
  });

  await runTest('CORE upload: client-supplied https coverUrl is kept', async () => {
    const res = await coreUpload({ coverUrl: 'https://images.example.org/c.jpg' });
    assert(res.status === 201, `Expected 201, got ${res.status}`);
    assert(lastCreateData.coverUrl === 'https://images.example.org/c.jpg', `got ${lastCreateData.coverUrl}`);
  });

  // ---------- Step 1: EPUB is rejected, never parsed ----------
  await runTest('EPUB upload -> 415 UNSUPPORTED_FORMAT with a clear message; no file, no book', async () => {
    const before = createdBookCount;
    const filesBefore = filesInUploadDir();
    const zipBytes = Buffer.concat([Buffer.from('PK\x03\x04', 'latin1'), Buffer.from('mimetypeapplication/epub+zip'), Buffer.alloc(64, 0)]);
    const fd = new FormData();
    fd.append('title', 'An EPUB');
    fd.append('file', new Blob([zipBytes], { type: 'application/epub+zip' }), 'novel.epub');
    const res = await fetch(`${baseUrl}/api/books/upload`, { method: 'POST', headers: auth('u-owner'), body: fd });
    const json: any = await res.json();
    assert(res.status === 415, `Expected 415, got ${res.status}`);
    assert(json.error === 'UNSUPPORTED_FORMAT', `code ${json.error}`);
    assert(/EPUB files are not supported/.test(json.message) && /PDF/.test(json.message), `message: ${json.message}`);
    assert(!/at \w+ \(|\.ts:\d+/.test(JSON.stringify(json)), 'stack trace leaked');
    assert(createdBookCount === before, 'EPUB must not create a book');
    const added = [...filesInUploadDir()].filter((f) => !filesBefore.has(f));
    assert(added.length === 0, `EPUB left files: ${added.join(', ')}`);
  });

  await runTest('EPUB with an uppercase extension is rejected too', async () => {
    const fd = new FormData();
    fd.append('file', new Blob([Buffer.from('PK\x03\x04', 'latin1')], { type: 'application/octet-stream' }), 'NOVEL.EPUB');
    const res = await fetch(`${baseUrl}/api/books/upload`, { method: 'POST', headers: auth('u-owner'), body: fd });
    assert(res.status === 415, `Expected 415, got ${res.status}`);
  });

  await runTest('EPUB renamed to .pdf is rejected by the PDF signature check (400), no orphan', async () => {
    const filesBefore = filesInUploadDir();
    const res = await coreUpload({}, Buffer.from('PK\x03\x04mimetypeapplication/epub+zip', 'latin1'), 'novel.pdf');
    assert(res.status === 400, `Expected 400, got ${res.status}`);
    const added = [...filesInUploadDir()].filter((f) => !filesBefore.has(f));
    assert(added.length === 0, `orphan files: ${added.join(', ')}`);
  });

  await runTest('Document service refuses to parse EPUB as text', async () => {
    const { documentService } = await import('../src/services/document.service');
    let threw = false;
    try {
      await documentService.parseEpub('ignored', 'x.epub');
    } catch (e: any) {
      threw = e.code === 'UNSUPPORTED_FORMAT';
    }
    assert(threw, 'parseEpub must throw UNSUPPORTED_FORMAT');
  });

  // ---------- Step 2: failure handling around persistence ----------
  await runTest('DB write fails after the file was stored -> 500 generic, PDF + cover removed, no internals leaked', async () => {
    const png = Buffer.from('89504e470d0a1a0a0000000d4948445200000001000000010806000000', 'hex');
    const filesBefore = filesInUploadDir();
    const before = createdBookCount;
    failNextBookCreate = true;
    const fd = new FormData();
    fd.append('title', 'DB failure');
    fd.append('file', new Blob([corePdf], { type: 'application/pdf' }), 'dbfail.pdf');
    fd.append('cover', new Blob([png], { type: 'image/png' }), 'cover.png');
    const res = await fetch(`${baseUrl}/api/books/upload`, { method: 'POST', headers: auth('u-owner'), body: fd });
    const text = await res.text();
    const json: any = JSON.parse(text);
    assert(res.status === 500 && json.error === 'UPLOAD_FAILED', `got ${res.status} ${json.error}`);
    assert(!text.includes('prisma') && !text.includes(TMP_UPLOAD_DIR) && !text.includes('internal.ts'), `internals leaked: ${text}`);
    assert(createdBookCount === before, 'no book should exist');
    const added = [...filesInUploadDir()].filter((f) => !filesBefore.has(f));
    assert(added.length === 0, `stored files not cleaned up: ${added.join(', ')}`);
  });

  await runTest('DB write failure marks the attempt failed; a retry with the same id succeeds once', async () => {
    const id = `test-${crypto.randomUUID()}`;
    failNextBookCreate = true;
    const first = await uploadWithId(id);
    assert(first.status === 500, `first expected 500, got ${first.status}`);
    const s = await statusOf(id);
    assert(s.json.data.status === 'failed', `status ${s.json.data.status}`);
    const before = createdBookCount;
    const retry = await uploadWithId(id);
    assert(retry.status === 201 && createdBookCount === before + 1, `retry ${retry.status}, created ${createdBookCount - before}`);
    const again = await uploadWithId(id);
    const againJson: any = await again.json();
    assert(again.status === 200 && againJson.data.deduplicated === true && createdBookCount === before + 1, 'second retry must not duplicate');
  });

  await runTest('Library link fails after the book was created -> still 201 with libraryLinked=false; file kept', async () => {
    failNextUserBookUpsert = true;
    const res = await coreUpload();
    const json: any = await res.json();
    assert(res.status === 201, `Expected 201, got ${res.status}`);
    assert(json.data.libraryLinked === false && Boolean(json.data.book.id), JSON.stringify(json.data).slice(0, 200));
    assert(/appear in your library/.test(json.message), `message: ${json.message}`);
    assert(fs.existsSync(path.join(TMP_UPLOAD_DIR, path.basename(lastCreateData.fileUrl))), 'stored PDF must be kept');
  });

  await runTest('Successful upload reports libraryLinked=true', async () => {
    const res = await coreUpload();
    const json: any = await res.json();
    assert(res.status === 201 && json.data.libraryLinked === true, JSON.stringify(json.data).slice(0, 120));
  });

  await runTest('Cleanup is idempotent: deleting a book whose file is already gone succeeds', async () => {
    BOOKS['b-gone'] = { id: 'b-gone', title: 'Gone', author: 'A', visibility: 'PRIVATE', status: 'APPROVED', uploadedBy: 'u-owner', fileUrl: '/uploads/book-already-gone.pdf', coverUrl: '/uploads/book-already-gone.png' };
    const res = await fetch(`${baseUrl}/api/books/b-gone`, { method: 'DELETE', headers: auth('u-owner') });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
  });

  await runTest('Storage delete refuses traversal and tolerates repeats', async () => {
    const { storageService } = await import('../src/services/storage.service');
    const outside = path.join(path.dirname(TMP_UPLOAD_DIR), `elune-outside-${crypto.randomUUID()}.txt`);
    fs.writeFileSync(outside, 'keep me');
    try {
      await storageService.deleteFile(`../${path.basename(outside)}`);
      assert(fs.existsSync(outside), 'traversal deleted a file outside UPLOAD_DIR');
      fs.writeFileSync(path.join(TMP_UPLOAD_DIR, 'book-twice.pdf'), PDF_BYTES);
      await storageService.deleteFile('book-twice.pdf');
      await storageService.deleteFile('book-twice.pdf'); // second call must not throw
      assert(!fs.existsSync(path.join(TMP_UPLOAD_DIR, 'book-twice.pdf')), 'file should be gone');
    } finally {
      fs.rmSync(outside, { force: true });
    }
  });

  await runTest('CORE storage: deleting one book keeps a file still referenced by another', async () => {
    const shared = path.join(TMP_UPLOAD_DIR, 'book-shared.pdf');
    assert(fs.existsSync(shared), 'fixture missing');
    const first = await fetch(`${baseUrl}/api/books/b-shared-1`, { method: 'DELETE', headers: auth('u-owner') });
    assert(first.status === 200, `delete 1 got ${first.status}`);
    assert(fs.existsSync(shared), 'shared file deleted while still referenced');
    const second = await fetch(`${baseUrl}/api/books/b-shared-2`, { method: 'DELETE', headers: auth('u-owner') });
    assert(second.status === 200, `delete 2 got ${second.status}`);
    assert(!fs.existsSync(shared), 'file should be removed once unreferenced');
  });

  await runTest('CORE safe errors: unknown book file -> 404 JSON without paths', async () => {
    const res = await fetch(`${baseUrl}/api/books/does-not-exist/file`, { headers: auth('u-owner') });
    const text = await res.text();
    assert(res.status === 404 && !text.includes(TMP_UPLOAD_DIR), `got ${res.status} ${text.slice(0, 120)}`);
  });

  await runTest('CORE safe errors: record exists but stored file is missing -> 404 without paths', async () => {
    BOOKS['b-nofile'] = { id: 'b-nofile', title: 'No file', author: 'A', visibility: 'PRIVATE', status: 'APPROVED', uploadedBy: 'u-owner', fileUrl: '/uploads/book-missing.pdf', coverUrl: null };
    const res = await fetch(`${baseUrl}/api/books/b-nofile/file`, { headers: auth('u-owner') });
    const text = await res.text();
    assert(res.status === 404 && !text.includes(TMP_UPLOAD_DIR), `got ${res.status} ${text.slice(0, 120)}`);
  });

  await runTest('CORE CORS: preflight allows Authorization + Range; range headers are exposed', async () => {
    const pre = await fetch(`${baseUrl}/api/books/${coreBookId}/file`, {
      method: 'OPTIONS',
      headers: { Origin: 'http://localhost:5173', 'Access-Control-Request-Method': 'GET', 'Access-Control-Request-Headers': 'authorization,range' }
    });
    const allow = (pre.headers.get('access-control-allow-headers') || '').toLowerCase();
    assert(pre.status === 204 && allow.includes('range') && allow.includes('authorization'), `status ${pre.status} allow=${allow}`);
    const get = await fetch(`${baseUrl}/api/books/${coreBookId}/file`, { headers: { ...auth('u-owner'), Origin: 'http://localhost:5173' } });
    const exposed = (get.headers.get('access-control-expose-headers') || '').toLowerCase();
    assert(exposed.includes('content-range') && exposed.includes('accept-ranges'), `exposed=${exposed}`);
  });

  // ---------- F-04: logout route ----------
  await runTest('F-04 POST /api/auth/logout exists and returns 200', async () => {
    const res = await fetch(`${baseUrl}/api/auth/logout`, { method: 'POST', headers: auth('u-owner') });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
  });

  await runTest('F-04 POST /api/auth/logout without a token still returns 200 (idempotent)', async () => {
    const res = await fetch(`${baseUrl}/api/auth/logout`, { method: 'POST' });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
  });

  // ---------- F-06: delete removes files from disk ----------
  await runTest('F-06 non-owner cannot delete a book (control)', async () => {
    const res = await fetch(`${baseUrl}/api/books/b-delete`, { method: 'DELETE', headers: auth('u-other') });
    assert(res.status === 403, `Expected 403, got ${res.status}`);
    assert(fs.existsSync(path.join(TMP_UPLOAD_DIR, 'book-delete-me.pdf')), 'File must remain after forbidden delete');
  });

  await runTest('F-06 owner delete removes the book file and cover from disk', async () => {
    const res = await fetch(`${baseUrl}/api/books/b-delete`, { method: 'DELETE', headers: auth('u-owner') });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(!fs.existsSync(path.join(TMP_UPLOAD_DIR, 'book-delete-me.pdf')), 'Book file should be deleted');
    assert(!fs.existsSync(path.join(TMP_UPLOAD_DIR, 'book-delete-me-cover.png')), 'Cover file should be deleted');
  });

  // ---------- F-07: AI / audio endpoints must enforce book access ----------
  const leakChecks: [string, string, string, any?][] = [
    ['POST', '/api/ai/summarize/book/b-private', 'book summary'],
    ['POST', '/api/ai/summarize/chapter/ch-private', 'chapter summary'],
    ['POST', '/api/ai/flashcards/b-private', 'flashcard generation'],
    ['GET', '/api/ai/flashcards/b-private', 'cached flashcards'],
    ['POST', '/api/ai/quiz/b-private', 'quiz generation'],
    ['GET', '/api/ai/quiz/b-private', 'cached quiz'],
    ['POST', '/api/ai/mindmap/b-private', 'mind map'],
    ['GET', '/api/audio/b-private/ch-private', 'audio segments']
  ];
  for (const [method, url, label] of leakChecks) {
    await runTest(`F-07 guest cannot read private ${label} (${method} ${url})`, async () => {
      const res = await fetch(`${baseUrl}${url}`, { method });
      const text = await res.text();
      assert(res.status === 403, `Expected 403, got ${res.status}`);
      assert(!text.includes('PRIVATE-CONTENT-MARKER'), 'Private content leaked in response');
    });
  }

  await runTest('F-07 other user cannot ask questions about a private book', async () => {
    const res = await fetch(`${baseUrl}/api/ai/ask/b-private`, {
      method: 'POST',
      headers: { ...auth('u-other'), 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: 'What did the owner write?' })
    });
    const text = await res.text();
    assert(res.status === 403, `Expected 403, got ${res.status}`);
    assert(!text.includes('PRIVATE-CONTENT-MARKER'), 'Private content leaked in response');
  });

  await runTest('F-07 owner can still read their private book summary (control)', async () => {
    const res = await fetch(`${baseUrl}/api/ai/summarize/book/b-private`, { method: 'POST', headers: auth('u-owner') });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
  });

  await runTest('F-07 audio for a chapter that belongs to a different book returns 404', async () => {
    const res = await fetch(`${baseUrl}/api/audio/b-public/ch-private`);
    const text = await res.text();
    assert(res.status === 404, `Expected 404, got ${res.status}`);
    assert(!text.includes('PRIVATE-CONTENT-MARKER'), 'Private content leaked in response');
  });

  // ---------- F-08: bookmark / note anchors must be consistent and accessible ----------
  const postJson = (url: string, userId: string, body: any) =>
    fetch(`${baseUrl}${url}`, { method: 'POST', headers: { ...auth(userId), 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

  await runTest('F-08 other user cannot bookmark a paragraph of a private book', async () => {
    const res = await postJson('/api/books/b-private/bookmarks', 'u-other', { chapterId: 'ch-private', contentBlockId: 'cb-private' });
    assert(res.status === 403, `Expected 403, got ${res.status}`);
  });

  await runTest('F-08 private paragraph cannot be anchored under a public bookId', async () => {
    const res = await postJson('/api/books/b-public/bookmarks', 'u-other', { chapterId: 'ch-private', contentBlockId: 'cb-private' });
    assert(res.status === 404, `Expected 404, got ${res.status}`);
  });

  await runTest('F-08 other user cannot attach a note to a private paragraph', async () => {
    const res = await postJson('/api/books/b-private/notes', 'u-other', { chapterId: 'ch-private', contentBlockId: 'cb-private', content: 'x' });
    assert(res.status === 403, `Expected 403, got ${res.status}`);
  });

  await runTest('F-08 owner can bookmark and annotate their own private paragraph (control)', async () => {
    const bm = await postJson('/api/books/b-private/bookmarks', 'u-owner', { chapterId: 'ch-private', contentBlockId: 'cb-private' });
    assert(bm.status === 201, `Bookmark expected 201, got ${bm.status}`);
    const note = await postJson('/api/books/b-private/notes', 'u-owner', { chapterId: 'ch-private', contentBlockId: 'cb-private', content: 'mine' });
    assert(note.status === 201, `Note expected 201, got ${note.status}`);
  });

  await runTest('F-08 any user can bookmark a public paragraph (control)', async () => {
    const res = await postJson('/api/books/b-public/bookmarks', 'u-other', { chapterId: 'ch-public', contentBlockId: 'cb-public' });
    assert(res.status === 201, `Expected 201, got ${res.status}`);
  });

  // ---------- F-02: unsafe env defaults ----------
  await runTest('F-02 production without JWT_SECRET is rejected', async () => {
    const errors = validateEnv({ NODE_ENV: 'production' } as any);
    assert(errors.some((e) => e.includes('JWT_SECRET')), `Expected JWT_SECRET error, got ${JSON.stringify(errors)}`);
  });

  await runTest('F-02 unset NODE_ENV without JWT_SECRET is rejected', async () => {
    const errors = validateEnv({} as any);
    assert(errors.some((e) => e.includes('JWT_SECRET')), `Expected JWT_SECRET error, got ${JSON.stringify(errors)}`);
  });

  await runTest('F-02 production with a publicly documented JWT_SECRET is rejected', async () => {
    const errors = validateEnv({ NODE_ENV: 'production', JWT_SECRET: 'elune_super_secure_jwt_secret_key_2026_sanctuary' } as any);
    assert(errors.some((e) => e.includes('JWT_SECRET')), `Expected JWT_SECRET error, got ${JSON.stringify(errors)}`);
  });

  await runTest('F-02 production with a strong JWT_SECRET is accepted', async () => {
    const errors = validateEnv({ NODE_ENV: 'production', JWT_SECRET: crypto.randomBytes(32).toString('hex') } as any);
    assert(errors.length === 0, `Expected no errors, got ${JSON.stringify(errors)}`);
  });

  await runTest('F-02 development without JWT_SECRET is allowed (local dev unaffected)', async () => {
    const errors = validateEnv({ NODE_ENV: 'development' } as any);
    assert(errors.length === 0, `Expected no errors, got ${JSON.stringify(errors)}`);
  });

  await runTest('F-02 control: CORS rejects unknown origins when NODE_ENV is not development', async () => {
    const res = await fetch(`${baseUrl}/api/health`, { headers: { Origin: 'https://evil.example' } });
    assert(res.headers.get('access-control-allow-origin') !== 'https://evil.example', 'Unknown origin must not be echoed');
  });

  // ---------- Teardown ----------
  await new Promise<void>((resolve) => server.close(() => resolve()));
  fs.rmSync(TMP_UPLOAD_DIR, { recursive: true, force: true });

  const passed = results.filter((r) => r.passed).length;
  const failed = results.length - passed;
  console.log('\n------------------------------------------------------');
  console.log(`Isolated results: ${passed} passed, ${failed} failed, ${results.length} total`);
  console.log('------------------------------------------------------\n');
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Isolated test runner crashed:', err);
  fs.rmSync(TMP_UPLOAD_DIR, { recursive: true, force: true });
  process.exit(1);
});
