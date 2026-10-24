# Elunè Test Plan

Prioritized by severity × likelihood. `[x]` = executed this session (see status). `[ ]` = pending.

## P0 — Access control & secrets
- [x] Static `/uploads` cannot return book documents (incl. Windows path variants) — PASS
- [x] `GET /api/books/:id/file` matrix guest/other/owner/admin × PRIVATE/PENDING/REJECTED/PUBLIC — PASS (13 cases)
- [x] AI + audio endpoints enforce book access — PASS
- [x] Bookmark/note anchor consistency + access — PASS
- [x] Startup refuses missing/public/short `JWT_SECRET` outside dev/test — PASS
- [ ] Reader/content/processing-status/library matrix against a real DB — BLOCKED (DB suite)
- [ ] Admin-only routes reject USER tokens (`/api/admin/*`, category writes) — UNVERIFIED (code shows router-level guard)

## P1 — Upload & document processing
- [x] Type filter: SVG/image in `file` field, SVG cover, `.exe` → 400, no orphan files — PASS
- [x] Spoofed `.pdf` without `%PDF` → 400, no orphan — PASS
- [x] Valid PDF → 201, persisted id/owner/visibility, crypto storage name, file on disk, no path leak — PASS (isolated; Prisma stubbed)
- [x] Extracted content blocks contain the PDF's text — PASS (real document service)
- [x] Image-only PDF → FAILED + `isScanned` + honest "OCR not available" message; blank PDF distinguished — PASS
- [x] Corrupt PDF (valid header) → 400, no book, no orphan — PASS
- [x] Oversized upload → 400 `LIMIT_FILE_SIZE` with the configured limit, no orphan — PASS (limit set to 2 MB in test)
- [x] Cover magic bytes enforced; real PNG accepted; non-https client `coverUrl` dropped — PASS
- [x] Idempotent retries: same id → same book, concurrent retry → 409, failure doesn't lock the id, status is owner-scoped — PASS
- [x] Size-aware timeout and reconciliation logic — PASS (frontend unit)
- [ ] Real PDF → rows actually written in Postgres (chapters/blocks/audio segments) — BLOCKED (DB suite)
- [ ] Upload page in a browser: progress text, double-click guard, timeout → reconcile messages — UNVERIFIED (manual)
- [x] EPUB rejected with 415 `UNSUPPORTED_FORMAT` + clear message; no file, no book; EPUB renamed `.pdf` → 400 — PASS (session 4)
- [x] DB failure after file storage → generic 500, files removed, no internals; retry once with no duplicate — PASS
- [x] Library-link failure after creation → 201 `libraryLinked: false`, file kept — PASS
- [x] Idempotent cleanup (missing file, repeated delete, traversal refused) — PASS
- [ ] Real EPUB support — needs a ZIP/EPUB dependency (approval)

## P2 — Auth
- [x] `POST /api/auth/logout` — PASS
- [ ] Register/login/me, duplicate email, bad password, expired token → 401 `TOKEN_EXPIRED` — BLOCKED (DB)
- [ ] Frontend clears token on 401 — UNVERIFIED (manual)

## P3 — Reader, bookmarks, notes, progress
- [x] Owner streams the exact stored bytes (`application/pdf`, `private, no-store`); Range → 206 — PASS
- [x] Other user / guest → 403 for the new private PDF; static URL → 404 — PASS
- [x] CORS preflight allows `Authorization` + `Range`; range headers exposed — PASS
- [x] Reader API returns `hasFile`/`fileStreamUrl`/processing state; guest 403 — PASS
- [x] Cache policy: user+book scoping, no legacy/other-book use, 401/403/404 purges, offline allowed — PASS (unit)
- [ ] IndexedDB cache isolation, logout clearing and book switching in a real browser — UNVERIFIED (manual)
- [ ] CRUD + ownership (other user cannot edit/delete) — BLOCKED (DB suite)
- [ ] Duplicate progress endpoints (`PUT /api/books/:id/progress` vs `POST /api/reader/:bookId/progress`) agree — UNVERIFIED

## P4 — AI, TTS, audio
- [x] Book summary, chapter summary and Q&A fallbacks use the uploaded book's own text (no placeholder) — PASS (isolated)
- [ ] Flashcard/quiz extractive fallbacks — UNVERIFIED (compiled, not executed)
- [ ] Live Gemini call with `gemini-2.5-flash` (single, low volume) — BLOCKED (needs key + approval)
- [ ] `POST /api/tts` returns 501 without `TTS_API_KEY`; browser Web Speech playback — UNVERIFIED (manual)
- [ ] OCR for scanned PDFs — not implemented (options below)

## P5 — Consistency & deployment
- [x] Every `frontend/src/services/api.ts` endpoint maps to a mounted route — PASS (after F-04)
- [x] Response-shape drift in `aiService` (F-11) — fixed in consumers, PASS (unit, real + mock shapes)
- [ ] Vercel build with `VITE_API_URL` set and `VITE_DISABLE_MOCK=true` — UNVERIFIED (no deploy)

## Unblocking the DB suite (needs approval)
Option A (recommended): create a separate local DB, e.g. `elune_test` on the same server, apply the schema to it, and run `run-tests.ts` with `DATABASE_URL` pointed at it **only for that process**. This requires approval for `prisma db push`/`migrate deploy` against `elune_test`.
Option B: run against the dev `elune` DB as-is, accepting that it upserts `admin@elune.read` (forces ADMIN role, creates it with a known password if absent) and writes/cleans `test-*` rows.

## How to run the safe suites
```
cd backend
npx tsx tests/isolated-security-tests.ts      # 92 tests, no DB, no paid AI
npx tsx ../frontend/tests/unit-tests.ts       # 25 pure frontend tests
```

## OCR options (not implemented; each needs approval)
1. **`tesseract.js` server-side.** Needs an npm dependency plus about 10–20 MB of language data per language, and a PDF→image rasteriser. pdfjs in Node needs the `canvas` package (a native build) to render pages. This is the heaviest option.
2. **System `ocrmypdf` / Tesseract CLI** invoked by the backend. No npm dependency, but it needs a host install and a job queue for large files.
3. **Hosted OCR**, for example Google Document AI or Gemini with PDF input. It needs credentials and incurs per-page cost, and it sends private documents to a third party.

The smallest viable option is 2, run as a background job that fills `ContentBlock` rows and flips `processingStatus` to READY.

## Manual browser checks (no E2E tool available)
1. Start the backend (`npm --prefix backend run dev`). Then start the frontend with `VITE_API_URL=http://localhost:5000` and `VITE_DISABLE_MOCK=true`.
2. Log in as a user and upload a small text-based PDF as PRIVATE. Open it in the reader and confirm the pages render. DevTools → Network should show `/api/books/<id>/file` returning 200.
3. Copy the `fileUrl` from the book JSON and open `http://localhost:5000/uploads/<name>.pdf` in a private window. It should return 404.
4. Open a second, different book that has no local copy. Confirm it does not show the first book's PDF (F-10).
5. Press play in the reader and confirm the Web Speech narration highlights paragraphs as it reads.
6. Refresh the reader page and log out and back in. The book must still open from the server; DevTools → Application → IndexedDB `elune_library_db/pdf_files` must be empty after logout.
7. As admin, make a user's book private (toggle visibility), then reopen it as another user who had it cached. You should see "Access denied", not the cached pages.
8. Throttle the network to "Slow 3G" in DevTools and upload a 5 MB PDF. Then go offline mid-upload, come back online and press Upload. The page must check the status first, and the library must show exactly one copy.
9. Open a private book with a cover. The cover must load (`/uploads/...png?exp=…&sig=…`), and the same URL without `?exp&sig` must return 404.
