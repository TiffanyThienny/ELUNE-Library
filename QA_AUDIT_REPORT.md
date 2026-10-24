# Elunè QA Audit Report

Session 1 · Branch `main` @ `2d17dbd` (with uncommitted user work in 9 files, preserved) · No secret values appear in this report.

Status labels: **PASS** executed and matched · **FAIL** executed and did not match · **BLOCKED** could not execute · **UNVERIFIED** code reading only.

## 1. Architecture (verified by reading code)

| Layer | Implementation | Key files |
|---|---|---|
| Root | Delegating `package.json` (`dev`/`build`/`preview` → `frontend/`, `test:backend` → `backend/`). Root `src/`, `index.html`, `vite.config.ts`, `dist/` are a **legacy prototype** nothing builds or deploys. | `package.json`, `vercel.json` |
| Frontend | Vite 6 + React 19, react-router 7, Tailwind 4, pdfjs-dist 3.11 (in-browser rendering). API base `VITE_API_URL` (fallback `http://localhost:5000`). Mock fallback active only when `VITE_API_URL` is unset and `VITE_DISABLE_MOCK` ≠ `true`. JWT in localStorage `elune_token`. | `frontend/src/services/api.ts`, `components/PdfVisualReader.tsx`, `utils/pdfParser.ts` |
| Backend | Express 4 + TS. Helmet, CORS allowlist (all origins only when `process.env.NODE_ENV === 'development'`), 300 req/15 min on `/api`, 30 req/min on `/api/ai`. | `backend/src/app.ts`, `server.ts` |
| DB | PostgreSQL via Prisma 6, 16 models, one migration (`20261004140558_init`). Local target confirmed `localhost:5433/elune` (host/port/db only). | `backend/prisma/schema.prisma` |
| Auth | JWT bearer (`authenticateJwt`, `optionalAuth`, `authorizeRole`), roles USER/ADMIN, 7d expiry, bcrypt. | `middleware/auth.middleware.ts` |
| Access rules | PUBLIC+APPROVED open to all; everything else owner or ADMIN only. User PUBLIC upload → PENDING. | `utils/permission.util.ts` |
| Storage | multer disk storage in `UPLOAD_DIR`, names `book-<ts>-<rand><ext>`; `LocalStorageService` active, R2 stub. | `middleware/upload.middleware.ts`, `services/storage.service.ts` |
| Documents | `%PDF` magic-byte check, pdfjs-dist legacy text extraction, pdf-parse fallback, scanned-PDF detection; client-extracted chapters accepted as fallback. | `services/document.service.ts` |
| AI | Gemini (`gemini-1.5-flash`) via `GEMINI_API_KEY`, deterministic fallback when unset/placeholder; keyword retrieval. Local key is a placeholder → fallback path only. | `services/ai.service.ts`, `retrieval.service.ts` |
| TTS | Backend provider is a placeholder (501 unless `TTS_API_KEY`); frontend uses Web Speech API. `TTS_API_KEY` not set locally. | `services/tts.service.ts` |
| Deploy | `vercel.json` builds `frontend/` only (prod `https://elune-gis.vercel.app`). No backend hosting config found. No CI. | `vercel.json` |

## 2. Testing capabilities

| Capability | Status | Notes |
|---|---|---|
| Backend `tsc` build | PASS | |
| Frontend `tsc && vite build` | PASS | Warnings only: pdfjs `eval`, chunk > 500 kB |
| `npx oxlint` | PASS | 0 errors, 85 warnings (session 3; was 86) |
| `npx prisma validate` | PASS | |
| Isolated HTTP suite `backend/tests/isolated-security-tests.ts` (new) | PASS 102/102 (session 4, sequential run on final code; 92/92 in session 3; 53/53 in session 1) | Real `createApp()` with the real document service and real PDF parsing. `DATABASE_URL` is unreachable, Prisma is stubbed and `UPLOAD_DIR` is a temp dir. No paid AI calls. Cannot touch the DB. |
| Frontend unit tests `frontend/tests/unit-tests.ts` (new) | PASS 25/25 | Pure logic only (cache policy, timeout, reconciliation, AI shapes). Run with backend's existing `tsx`, no new dependency. |
| DB integration suite `backend/tests/run-tests.ts` | BLOCKED | Target is local, but it is the **same `elune` DB used for app data**, not an isolated test DB. It upserts `admin@elune.read` (forces role ADMIN, creates it with a known password if absent) and writes fixture rows. Needs approval or a separate test DB. |
| Browser / E2E (PDF render, audio, Web Speech) | BLOCKED | No Playwright or browser tool in the project. Manual steps in `TEST_PLAN.md`. |
| Gemini / TTS live calls | BLOCKED | No real key configured (by design); fallback paths only. |

## 3. Findings

| ID | Sev | Area | Finding | Evidence | Status |
|---|---|---|---|---|---|
| F-01 | Critical | Storage / access | `app.use('/uploads', express.static(...))` served every uploaded document, so PRIVATE, PENDING and REJECTED PDFs were downloadable by anyone with the URL (the URL is returned in API payloads), bypassing `GET /api/books/:id/file`. | Pre-fix isolated run: guest `GET /uploads/book-private.pdf` (and pending/rejected/public) → **200** with PDF bytes. | **Fixed**, PASS (4 + 5 bypass variants → no PDF; protected endpoint matrix 13/13) |
| F-02 | High | Config | `JWT_SECRET` silently fell back to a hardcoded value whenever unset, including production; the same value is published in the README docs, so tokens (including ADMIN) could be forged on any deployment missing the variable. The local `.env` `JWT_SECRET` also equals a publicly documented value (fine for local dev only). `DATABASE_URL` had a hardcoded credential fallback that Prisma never reads (dead code). | Code `env.ts:11`; key-presence check (values not printed). | **Fixed**, PASS (5 unit cases + real process refuses to boot with `NODE_ENV=production`) |
| F-02b | — | Config | Suspected "unset `NODE_ENV` opens CORS / leaks stacks" is **not confirmed**: `app.ts` and `error.middleware.ts` read `process.env.NODE_ENV` directly, not the `ENV` default. | Isolated control test: unknown origin not echoed with `NODE_ENV=test`. | Refuted (PASS) |
| F-03 | Medium | Upload | (a) Book `file` field accepted images incl. SVG; (b) cover accepted SVG; (c) filter rejections returned **500**; (d) rejected uploads (bad type, spoofed PDF, parse failure) left orphan files in `uploads/`. | Pre-fix: `.exe` → 500; SVG / spoofed `.pdf` → files left on disk. | **Fixed**, PASS (4 cases) |
| F-04 | Low | Auth / API | Frontend calls `POST /api/auth/logout`; a `logout` controller existed but was never routed → 404 (swallowed by the UI). | Pre-fix: 404. | **Fixed**, PASS |
| F-05 | Low | API | `highlight.routes.ts` and `progress.routes.ts` are unmounted. Highlights are implemented on top of the `Note` model (no Highlight model needed). Only the legacy root `src/` calls `/api/highlights` and `/api/books/history`; `frontend/` does not. | Route listing; `highlight.controller.ts` uses `prisma.note`. | Open — product decision (mount or delete). UNVERIFIED impact |
| F-06 | Low | Storage | `DELETE /api/books/:id` removed the row but left the PDF and cover on disk. `backend/uploads/` currently holds 19 PDFs, likely leftovers from earlier test runs. | Pre-fix isolated run: file remained. | **Fixed**, PASS. Existing leftovers **not** deleted (needs approval) |
| F-07 | High | AI / audio access | AI endpoints (`summarize/book`, `summarize/chapter`, `ask`, `flashcards` GET/POST, `quiz` GET/POST, `mindmap`) and `GET /api/audio/:bookId/:chapterId` had **no book access check**. Guests could read cached summaries/flashcards/quizzes and paragraph snippets of private/pending/rejected books, and trigger AI generation (paid Gemini calls once a key is set). Audio also accepted a chapter from a different book. | Pre-fix: guest → 200 (or 500 after processing) on all 8 endpoints; other user `ask` → 500 after processing. | **Fixed**, PASS (11 cases) |
| F-08 | Medium | Bookmarks / notes | Create bookmark/note didn't verify the paragraph belongs to the chapter/book or that the user can access the book. List endpoints return `contentBlock.text`, so a user holding a private paragraph ID could read it back. | Code inspection (pre-fix not executed); post-fix tests. | **Fixed**, PASS (5 cases) |
| F-09 | Medium | Upload | The 15 s fixed client upload timeout is too short for the transfer alone: 50 MB at 1.6 Mbit/s takes about 250 s. It was also too short for nothing else, because measured server parse time is under 1 s even for 45 MB / 400 pages. When the client timed out, it gave no way to learn whether the server had finished, so a retry could create a duplicate book. | Measured parse times: 50 pages 0.86 s, 400 pages 0.63 s, 45 MB 0.25 s (session 2 probe). | **Fixed**, PASS: size-aware timeout (unit 5), idempotent `clientUploadId` + `upload-status` (isolated 8), reconciliation logic (unit 4). Browser flow UNVERIFIED |
| F-10 | Medium | Reader | (a) `PdfVisualReader` fell back to `getLatestLocalPdfFile()` and could render **another book's** PDF. (b) The cache was keyed by book only, so it was shared between accounts on one device. (c) A cached copy rendered even after access was revoked. (d) The cache was never cleared on logout. (e) Switching books mid-load could show the previous book. | Code (`PdfVisualReader.tsx`, `localBookStorage.ts`). | **Fixed**: logic PASS (unit 8). IndexedDB/browser behaviour UNVERIFIED |
| F-11 | Medium | API consistency | Confirmed: `SummaryPanel` read `data.summary.content` and `AIChat` read `data.chat.answer`, but the real backend returns `{quickOverview…}`, `{summary, keyPoints}` and `{question, answer}`. In real-backend mode, summaries and answers rendered **nothing**; only the demo mock shape worked. | Shape comparison of controllers vs consumers. | **Fixed**, PASS (unit 5, both shapes) |
| F-12 | Medium | Storage / access | (a) Covers of private, pending and rejected books were public to anyone with the URL. (b) Frontend `<img src={coverUrl}>` resolved `/uploads/...` against the **frontend** origin, so uploaded covers could not load when the API is on another origin. (c) Any image left in `uploads/`, even unreferenced, was served. | Code + isolated tests. | **Fixed**, PASS (isolated 10: HMAC-signed 6 h URLs for non-public covers; unreferenced → 404) |
| F-13 | Low | Docs / secrets | `README.md` and `backend/README.md` publish a DB password and JWT secret values, and disagree on test counts (19 / 21). The runner prints "All 17", but it actually has 28 `runTest` calls. `backend/.env.example` also contains a DB password. | File reads (values not reproduced). | Open (doc edits need approval) |
| F-14 | Medium | AI | `gemini-1.5-flash` is retired: the Google AI forum reports a 404, and it does not appear in the [current deprecations table](https://ai.google.dev/gemini-api/docs/deprecations), which lists `gemini-2.5-flash` with no shutdown date. Any configured key would have failed and silently used the fallback. | Web check, session 3. | **Fixed**: `GEMINI_MODEL` env, default `gemini-2.5-flash`. Live call BLOCKED (no key) |
| F-15 | Info | Repo | Root `src/` prototype diverges from `frontend/` (different token key, dead endpoints). | Code reading. | Legacy, not fixed |
| F-16 | Low | Auth | No login-specific rate limit; password minimum is 6 chars; no email-format validation. | `auth.controller.ts`. | UNVERIFIED (design) |

### Session 3: PDF core flow (new findings)

| ID | Sev | Area | Finding | Evidence | Status |
|---|---|---|---|---|---|
| F-17 | High | AI fallback | Without a working Gemini key, every non-AI fallback returned **hardcoded Marcus Aurelius / Stoic content for any book**: book summary, chapter summary, Q&A, flashcards and quiz. Uploaded books were "summarized" with text from another book. | `ai.service.ts` fallbacks (pre-fix). | **Fixed**: extractive fallbacks use only the book's own text. PASS (isolated 3, which also assert no placeholder text) |
| F-18 | Medium | Reader | `ReaderContext` swallowed API errors (including 401/403/404) and fell back to localStorage book lists in real-backend mode, so it could render demo or stale data in place of an authorization failure. | Code. | **Fixed**: the fallback runs only in demo mode, and 401/403/404 are never bypassed. Browser UNVERIFIED |
| F-19 | Medium | Upload | Cover files were checked by extension only. A client-supplied `coverUrl` (any string, including `/uploads/<another user's cover>`) was stored as-is, which could hijack another cover and make a later delete unlink it. | Code + isolated test. | **Fixed**: magic-byte check (PNG/JPEG/GIF/WEBP); only `https:` client URLs are kept. PASS (isolated 4) |
| F-20 | Medium | Storage | Book deletion unlinked files without checking other references. | Isolated test. | **Fixed**: reference count before unlink. PASS |
| F-21 | Medium | Reader | The file endpoint lacked range-friendly CORS. `Range` was not an allowed header and `Content-Range`/`Accept-Ranges` were not exposed, so a cross-origin pdf.js could not stream incrementally. Private PDFs were also sent without `Cache-Control: private, no-store`. | Isolated test. | **Fixed**, PASS (206 + CORS preflight test) |
| F-22 | Low | Extraction | A PDF without text was always labelled "scanned". Blank PDFs and outlined-vector PDFs were indistinguishable from scans. | Code. | **Fixed**: classification by operator list (IMAGES / VECTOR_ONLY / BLANK). PASS (isolated 2). `isScanned` semantics are kept for the legacy suite |
| F-23 | Low | Upload | The upload page reported success **even without a book id** (the `else` branch). Storage names used `Math.random`. The size-limit messages were hardcoded to 50 MB. | Code. | **Fixed** (success requires a persisted id; crypto names; configured limit). Server parts PASS, UI UNVERIFIED |
| F-24 | Medium | Extraction | `parseEpub` reads the EPUB (a ZIP archive) as UTF-8 text, so EPUB uploads store **binary garbage** as paragraphs. No zip library is installed. | Code (`document.service.ts parseEpub`). | **Mitigated (session 4)**: EPUB is rejected in the multer filter with 415 `UNSUPPORTED_FORMAT` before anything is written. `parseEpub` now throws. PASS (isolated 4). Real EPUB support still needs a dependency (approval) |
| F-27 | Medium | Upload | (a) A DB failure returned a 500 whose `error` field carried the raw internal message (Prisma text, paths). (b) A failure in the **library link** step after the book was created returned 500, so the client reported failure for a book that existed, and could retry into a duplicate. (c) Any error after persistence was reported as "upload failed". (d) `storage.deleteFile` was not idempotent (exists/unlink race) and joined an unchecked key. (e) Filter errors in the error handler exposed stacks in development and dropped the error code. | Isolated tests with failure injection. | **Fixed (session 4)**, PASS (isolated 6) |
| F-25 | Info | OCR | No OCR exists. Scanned PDFs are stored and viewable but have no text, so AI and audio are disabled for them. The message says so honestly. | Code: no OCR library installed. | Open: options in `TEST_PLAN.md` |
| F-26 | Info | TTS | The backend TTS is a placeholder (501 without `TTS_API_KEY`). Narration relies on the browser Web Speech API reading content-block text, so scanned books have no audio. | Code. | Audio generation BLOCKED/UNVERIFIED |

**Idempotency limitation (F-09):** upload attempt state is **in memory**. It is lost on a server restart: a retry after a restart re-uploads, and the status reads `unknown`, so the UI tells the user to check their library first. It is **not shared across instances**. This is not durable or exactly-once. Making it durable needs a `clientUploadId` column with a unique `(uploadedBy, clientUploadId)` constraint, which is a schema migration that needs approval.

## 4. Risks (ranked)

1. **Already-shared private file URLs.** Any `/uploads/*.pdf` link that leaked before this fix stops working once the patched backend is deployed. There is no hosted backend config, so I don't know whether one is live.
2. **Unknown backend deployment.** If any backend is deployed, it needs a fresh random `JWT_SECRET` (≥ 32 chars), and it will now refuse to start without one.
3. **Integration suite and seed share the dev DB.** Running the suite mutates real local data.
4. **Behaviour change for covers.** SVG and non-image bytes are rejected (the picker now offers JPG/PNG/WEBP/GIF only). Client `coverUrl` values that are not `https:` are dropped. Private covers use signed URLs that expire after 6 h, so a tab left open longer may show a broken cover until refresh.
5. **No E2E coverage.** Rendering, IndexedDB caching, audio and the upload UI are unverified in a browser.
6. **Per-request DB lookup for `/uploads` images.** There is no index on `Book.coverUrl` and `/uploads` is outside the `/api` rate limiter. That's fine at the current scale. An index would need a migration.
7. **In-memory idempotency** (see above).

## 5. Limitations

- I did not execute the database-dependent suite. Fixes to the real Prisma query paths are verified only through stubs, so the `select`/`include` shapes were checked by `tsc` but never run against Postgres.
- I didn't verify any frontend behaviour in a browser. The `PdfVisualReader` switch to `/api/books/:id/file` builds, but I haven't rendered it.
- This list is not exhaustive. The application has not been shown to be bug-free.
