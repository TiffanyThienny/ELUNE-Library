# Elunè Fix Log

Each fix was reproduced first with a failing check, except F-08, which was found by code inspection. Each one was then verified with the isolated suite:

```
cd backend
npx tsx tests/isolated-security-tests.ts      # result after all fixes: 53 passed, 0 failed
npm run build                                  # tsc: PASS
npm --prefix ../frontend run build             # PASS (after F-01 frontend change)
```

Revert any fix with `git diff -- <files>` and then manually undo just those hunks. Several of these files also contain your earlier uncommitted work, so **do not** run `git checkout` on them.

---

## F-01 · Static `/uploads` exposed private book documents (Critical)
- **Date:** session 1
- **Root cause:** `express.static` served the whole `UPLOAD_DIR`. Book documents and covers share that directory.
- **Fix:**
  - `/uploads` now serves only raster cover formats (`.jpg .jpeg .png .webp .gif`). It's an allowlist, so Windows variants like `x.pdf.` and `x.pdf::$DATA` can't get through. Everything else returns 404.
  - Documents are served only through the permission-checked `GET /api/books/:id/file`.
  - The frontend reader now always loads that endpoint. It was already sending the bearer token.
- **Files:** `backend/src/app.ts`, `frontend/src/components/PdfVisualReader.tsx`
- **Regression tests:**
  - F-01 static ×4
  - bypass variants ×5
  - cover control ×1
  - protected-endpoint matrix ×13
- **Verification:** pre-fix 4 FAIL (200 with PDF bytes) → post-fix PASS.

## F-02 · Insecure `JWT_SECRET` fallback (High)
- **Root cause:** `env.ts` fell back to a hardcoded secret that is published in the docs, for any `NODE_ENV`.
- **Fix:**
  - Added an exported `validateEnv()`. Outside `development`/`test`, which includes an unset `NODE_ENV`, startup throws if `JWT_SECRET` is missing, publicly known, or shorter than 32 characters.
  - Removed the unused `DATABASE_URL` credential literal.
- **Files:** `backend/src/config/env.ts`
- **Regression tests:**
  - F-02 ×5 (`validateEnv`)
  - CORS control ×1
  - Manual check: `NODE_ENV=production node -e "require('./dist/config/env')"` → refused to start.
- **Verification:** PASS. Local dev is unaffected because the local `.env` sets `NODE_ENV=development`.

## F-03 · Upload validation (Medium)
- **Root cause:**
  - The book `file` field also accepted image extensions, and covers accepted SVG.
  - Filter errors had no status, so they returned 500.
  - Every early-exit path in `uploadBook` left the multer files on disk.
- **Fix:**
  - `file` now takes documents only, and covers take raster images only (SVG removed).
  - Filter errors carry `statusCode: 400`.
  - `uploadBook` discards every request file in a `finally` unless the Book row was persisted.
- **Files:** `backend/src/middleware/upload.middleware.ts`, `backend/src/controllers/book.controller.ts`
- **Regression tests:** F-03 ×4
- **Verification:** pre-fix 4 FAIL (one returned 500, three left orphan files) → PASS.

## F-04 · Missing logout route (Low)
- **Root cause:** `logout` existed in `auth.controller.ts` but was never routed.
- **Fix:** added `router.post('/logout', logout)`. It is idempotent and needs no token, because the JWT is stateless.
- **Files:** `backend/src/routes/auth.routes.ts`, `backend/src/controllers/auth.controller.ts` (comment only)
- **Regression tests:** F-04 ×2
- **Verification:** pre-fix 404 → PASS.

## F-06 · Book delete left files on disk (Low)
- **Fix:** after the row is deleted, `deleteBook` removes the stored document and the uploaded cover. It only touches multer-generated `book-*` names inside `UPLOAD_DIR`, via `path.basename`, so traversal paths and seed URLs are ignored.
- **Files:** `backend/src/controllers/book.controller.ts`
- **Regression tests:**
  - F-06 owner delete
  - forbidden-delete control
- **Verification:** pre-fix FAIL → PASS.
- **Not done:** the 19 existing PDFs in `backend/uploads/` were not touched. Deleting them needs your approval.

## F-07 · AI and audio endpoints lacked book access checks (High)
- **Fix:**
  - New `ensureBookAccess()` in `utils/bookAccess.util.ts` (404/403 using `canUserAccessBook`). It is applied to:
    - book and chapter summaries
    - ask
    - flashcards (GET and POST)
    - quiz (GET and POST)
    - mindmap
    - chapter audio
  - Chapter audio also checks that the chapter belongs to `:bookId`.
- **Files:** `backend/src/utils/bookAccess.util.ts` (new), `backend/src/controllers/ai.controller.ts`, `backend/src/controllers/audio.controller.ts`
- **Regression tests:**
  - F-07 ×11, including owner control and cross-book chapter
- **Verification:** pre-fix 10 FAIL → PASS.

## F-08 · Bookmark/note paragraph anchor IDOR (Medium)
- **Fix:** `ensureParagraphAnchorAccess()` checks that the content block belongs to the chapter, the chapter belongs to the book, and the user can access that book. It runs before bookmark and note creation.
- **Files:** `backend/src/utils/bookAccess.util.ts`, `backend/src/controllers/bookmark.controller.ts`, `backend/src/controllers/note.controller.ts`
- **Regression tests:** F-08 ×5
- **Verification:** post-fix PASS. The pre-fix behaviour was found by code inspection only and never executed.
- **Compatibility:** the existing `run-tests.ts` creates bookmarks and notes with consistent fixture IDs, so it should still pass. That is UNVERIFIED, because the suite is BLOCKED.

---

# Session 3: PDF upload core flow

Verification commands (all executed this session):
```
npm --prefix backend run build                 # tsc: PASS
npm --prefix frontend run build                # tsc + vite: PASS
npx oxlint                                     # 0 errors, 85 warnings
cd backend && npx tsx tests/isolated-security-tests.ts   # 92 passed, 0 failed (3 consecutive runs)
cd backend && npx tsx ../frontend/tests/unit-tests.ts    # 25 passed, 0 failed
```
None of these touch Postgres; `run-tests.ts` was **not** run.

## F-09 · Upload timeout and duplicate books on retry
- **Root cause:**
  - The client timeout was a fixed 15 s. The transfer alone can take minutes, while the measured server parse time is under 1 s.
  - After a timeout the client couldn't learn the server's outcome, so retrying could duplicate the book.
- **Fix:**
  - `computeUploadTimeoutMs`: 30 s + size at 200 KB/s + 30 s, clamped to 60–290 s. That stays under Node's default 300 s `requestTimeout`.
  - The client sends a `clientUploadId` and reuses it for the same file and metadata.
  - The server keeps an in-memory, per-user registry:
    - A retry while the first attempt is processing gets 409.
    - A retry after completion returns the same book with `deduplicated: true`.
    - A failed attempt can be retried.
  - New owner-scoped endpoint `GET /api/books/upload-status/:clientUploadId`.
  - On `CLIENT_TIMEOUT`, `NETWORK_ERROR` or 409, the UI polls the status (6 × 5 s). It does not resend while the outcome is uncertain, and it never uses mock data in real-backend mode.
- **Files:**
  - `backend/src/services/uploadIdempotency.service.ts` (new)
  - `backend/src/controllers/book.controller.ts`
  - `backend/src/routes/book.routes.ts`
  - `frontend/src/utils/uploadReliability.ts` (new)
  - `frontend/src/services/api.ts`
  - `frontend/src/pages/UploadBookPage.tsx`
- **Tests:** isolated F-09 ×8; unit timeout ×5, fingerprint/id ×3, reconcile ×4.
- **Limitation:** state is in-memory and per-instance. See QA report.

## F-10 · PDF cache isolation
- **Fix:**
  - IndexedDB v2 keys entries by `userId::bookId`. Unscoped v1 entries are dropped on upgrade.
  - Removed the "latest PDF" fallback.
  - Before rendering a cache hit, the reader asks `/processing-status`. A 401, 403 or 404 purges the entry and shows "Access denied". Only a network failure allows the offline copy.
  - The cache is cleared on logout and on any 401.
  - A load sequence guard discards in-flight loads of a previous book.
  - Error states are split into denied, missing, network and invalid.
  - `ReaderContext` no longer falls back to localStorage outside demo mode, and never on 401, 403 or 404.
- **Files:**
  - `frontend/src/utils/pdfCachePolicy.ts` (new)
  - `frontend/src/utils/localBookStorage.ts`
  - `frontend/src/components/PdfVisualReader.tsx`
  - `frontend/src/context/AuthContext.tsx`
  - `frontend/src/context/ReaderContext.tsx`
  - `frontend/src/services/api.ts`
  - `frontend/src/pages/UploadBookPage.tsx`
- **Tests:** unit cache ×8. Browser/IndexedDB behaviour is **UNVERIFIED**.

## F-11 · AI response schema mismatch
- **Fix:** `aiResponse.ts` normalizes both the real backend shapes and the demo mock shapes. `SummaryPanel` and `AIChat` use it and show an explicit error on empty payloads.
- **Tests:** unit ×5.

## F-12 · Cover access policy and resolution
- **Fix:**
  - Non-public covers are served only with an HMAC-SHA256 signed URL (`exp` + `sig`, 6 h, key derived from `JWT_SECRET`). The signed URL is issued only in access-checked responses: book detail, list, my-uploads, library, reader and admin.
  - Unreferenced images return 404.
  - Signed covers are sent with `Cache-Control: private`.
  - The frontend resolves `coverUrl` against the API origin via `resolveAssetUrl`, in four components.
- **Files:**
  - `backend/src/utils/coverUrl.util.ts` (new)
  - `backend/src/app.ts`
  - `backend/src/controllers/{book,admin,reader}.controller.ts`
  - `frontend/src/components/BookCard.tsx`
  - `frontend/src/pages/{BookDetailPage,PersonalLibraryPage,admin/AdminPendingReviewsPage}.tsx`
- **Tests:** isolated F-12 ×10.

## F-14 · Retired Gemini model
- **Fix:** `GEMINI_MODEL` env, default `gemini-2.5-flash`, which Google's deprecations page lists with no shutdown date.
- **Files:** `backend/src/config/env.ts`, `backend/src/services/ai.service.ts`
- **Not done:** `.env.example` is write-protected by the agent config. Add `GEMINI_MODEL=gemini-2.5-flash` there manually.
- **Test:** BLOCKED (no key).

## F-17 · Placeholder AI fallbacks
- **Fix:** the summary, chapter summary, Q&A, flashcard and quiz fallbacks are now extractive from the book's own text. Results are marked `source: 'extractive-fallback'`. The quiz is empty when there are fewer than two chapters.
- **Tests:** isolated CORE AI ×3 (summary, chapter, Q&A). Flashcards and quiz compile but were not executed.

## F-19 / F-20 / F-21 / F-22 / F-23 · Upload and storage hardening
- **F-19:** cover magic-byte check. Client `coverUrl` is accepted only as `https:`.
- **F-20:** delete skips files still referenced by another book.
- **F-21:**
  - CORS allows the `Range` header and exposes `Accept-Ranges`, `Content-Range`, `Content-Length` and `Content-Encoding`.
  - `/file` sends `Content-Type: application/pdf` and `Cache-Control: private, no-store`.
- **F-22:** text-less PDFs are classified IMAGES, VECTOR_ONLY or BLANK, each with an honest message. `isScanned` keeps its meaning of "no selectable text".
- **F-23:**
  - Success requires a persisted book id.
  - Storage names use `crypto.randomBytes`.
  - Size messages use the configured `MAX_FILE_SIZE_MB`.
  - Rejected files are unlinked before the response is flushed.
- **Files:**
  - `backend/src/controllers/book.controller.ts`
  - `backend/src/middleware/{upload,error}.middleware.ts`
  - `backend/src/services/document.service.ts`
  - `backend/src/app.ts`
- **Tests:** CORE ×13.

**Revert:** every change is in the files listed above. All new files are untracked and can simply be removed. For the modified files, undo only these hunks with `git diff -- <file>`. Do not `git checkout` them, because they also contain your earlier uncommitted work.

---

# Session 4: EPUB rejection and upload failure handling

Verification (executed sequentially on the final code, after all edits):
```
npm --prefix backend run build              # tsc: PASS (exit 0)
npm --prefix frontend run build             # tsc + vite: PASS (exit 0)
cd backend && npx tsx tests/isolated-security-tests.ts   # 102 passed, 0 failed
cd backend && npx tsx ../frontend/tests/unit-tests.ts    # 25 passed, 0 failed
npx oxlint                                  # 0 errors, 85 warnings (unchanged)
```
Note: two earlier runs in this session raced with concurrent test-file edits and were discarded. Only the sequential run above counts.

## F-24 · EPUB stored as binary "text"
- **Fix:**
  - `upload.middleware.ts` rejects `.epub` (any case) in the multer filter with 415 `UNSUPPORTED_FORMAT`. The message points users to PDF, TXT or MD. Because the filter runs before multer writes, there is no file on disk, no book, and no idempotency entry.
  - The controller has the same check as defence in depth.
  - `parseEpub` now throws instead of reading ZIP bytes as UTF-8.
  - The upload page refuses `.epub` with the same message, and EPUB was removed from `accept` and the help text.
- **Files:**
  - `backend/src/middleware/upload.middleware.ts`
  - `backend/src/controllers/book.controller.ts`
  - `backend/src/services/document.service.ts`
  - `frontend/src/pages/UploadBookPage.tsx`
- **Tests:** isolated ×4: `.epub` → 415 with no file or book, `.EPUB`, EPUB renamed to `.pdf` → 400 with no orphan, `parseEpub` throws.

## F-27 · Upload failure handling
- **Fix:**
  - **DB write fails after the file was stored.** The response is a generic 500 `UPLOAD_FAILED` with no internal message. The PDF and cover are removed (sync before the response, async as a backstop), and the idempotency attempt is marked `failed` so a retry works.
  - **Library-link (`userBook.upsert`) fails after the book exists.** The response is still 201 with `libraryLinked: false` and a message saying it will appear shortly. The file is kept. `GET /api/library` already re-links every book the user uploaded.
  - **Any other error after persistence.** The response is 201 `{ book: { id }, partial: true }` instead of a false "upload failed".
  - **Cleanup.** `storage.deleteFile` now accepts only bare names, so `../` is ignored, and treats ENOENT as success. Request cleanup uses `rm --force` semantics, so running both cleanup passes is harmless. Cleanup only ever touches files multer created for this request (fresh random names), and book deletion keeps the reference-count check from session 3.
  - **Error handler.** 4xx errors return the stable `code` (for example `UNSUPPORTED_FORMAT`, `INVALID_FILE_TYPE`) and never a stack.
  - **Frontend.** The upload page shows the server's note for `partial` or `libraryLinked: false` results.
- **Files:**
  - `backend/src/controllers/book.controller.ts`
  - `backend/src/services/storage.service.ts`
  - `backend/src/middleware/error.middleware.ts`
  - `frontend/src/pages/UploadBookPage.tsx`
- **Tests:** isolated ×6:
  - DB failure: cleanup and no leak
  - DB failure: then retry once, with no duplicate
  - link failure: 201 + file kept
  - `libraryLinked: true` on success
  - deleting a book whose file is already gone
  - traversal refused + repeated delete
- **Not verified:** a real Postgres failure mode (for example a constraint violation inside the nested create), because the DB suite is still BLOCKED.

---

# Session 5: PDF reading pipeline fixes

Verification (executed sequentially on final code):
```
npm --prefix backend run build              # PASS
npm --prefix frontend run build             # PASS
cd backend && npx tsx tests/isolated-security-tests.ts   # 102 passed, 0 failed
cd backend && npx tsx ../frontend/tests/unit-tests.ts    # 25 passed, 0 failed
```
End-to-end pipeline test (text-based PDF against real DB, cleaned up after):
```
Upload -> 201, READY, isScanned=false, 1 chapter extracted
Reader -> 200, chapter with content blocks, first block text matches PDF
AI summary -> 200, extractive fallback from the book's own text
AI Q&A -> 200, answer quotes the book's content
File download -> 200, application/pdf, exact bytes match
```

## Root causes found and fixed

### Mode switching forced PDF regardless of user choice (Issues 3, 5)
- **Root cause:** `isScannedDocument` was computed independently and OR'd into the
  render condition `{readerMode === 'pdf' || isScannedDocument ? <PdfVisualReader> : <text>}`.
  When it was true (e.g. no chapters), BOTH modes showed the PDF reader.
  A second `useEffect` auto-detected the mode and overrode the user's manual
  selection on every chapter change.
- **Fix:** The render condition now uses only `readerMode`. The auto-detection
  runs once per book (tracked with `lastBookIdRef` and `userSelectedMode`), not
  on every chapter change. Manual mode buttons set `userSelectedMode = true`.
- **Files:** `frontend/src/pages/ReaderPage.tsx`

### PDF zoom didn't enlarge the page (Issue 4)
- **Root cause:** the `<canvas>` had `max-w-full`, which constrained its CSS
  display width to the container. Zooming increased the canvas resolution but
  not the visual size.
- **Fix:** the `maxWidth` style is `none` when zoomed in (scale > 1.2) and
  `100%` otherwise. The container has `overflow-auto` for scrolling.
- **Files:** `frontend/src/components/PdfVisualReader.tsx`

### Audio/TTS never played (Issue 6)
- **Root cause:** `loadChapterAudio` set `audioUrl` to the track's virtual
  `audioUrl` field (`/audio/stream/bookId/chapterId.mp3`), which has no real
  audio file behind it. The HTML5 Audio element failed silently. Because
  `audioUrl` was truthy, the AudioPlayer showed the broken HTML5 player
  instead of the working Web Speech TTS path.
- **Fix:** `loadChapterAudio` now sets `audioUrl` to `null` and clears the
  audio element. The AudioPlayer falls through to the Web Speech TTS path,
  which reads the chapter's content blocks aloud. Audio segments are kept
  for potential future use. Switching books cancels speech and resets audio.
- **Files:** `frontend/src/context/ReaderContext.tsx`

### What was NOT a bug
The user's uploaded book was a 633-page scanned PDF with no selectable text.
For that specific book:
- Text mode correctly shows nothing (no extracted text exists).
- AI correctly returns "This book does not contain readable text."
- Audio correctly shows "Audio Unavailable" (no text to read).
- PDF mode is the only useful mode for scanned PDFs.
This is honest behaviour, not a bug. A text-based PDF was verified to work
end-to-end: upload, extraction, reader, AI summary, Q&A and file download.

---

# Session 6: Reader pipeline — progress, summary cache, cover UI

Verification (sequential, final code):
```
npm --prefix backend run build              # PASS (exit 0)
npm --prefix frontend run build             # PASS
cd backend && npx tsx tests/isolated-security-tests.ts   # 104 passed, 0 failed
cd backend && npx tsx ../frontend/tests/unit-tests.ts    # 25 passed, 0 failed
npx oxlint                                  # 0 errors, 88 warnings
```
Also verified against the real local `elune` DB with the demo account (read-only
checks + one progress/bookmark write that is idempotent and non-destructive).

## F-28 · Reading progress stuck at 0% (field-name mismatch)
- **Root cause (confirmed against real DB):** the reader frontend posts
  `{ chapterId, contentBlockId, pageNumber, progressPercentage }` to
  `POST /api/reader/:id/progress`, but `saveReadingProgress` read
  `currentChapterId / currentContentBlockId / currentPage`. Those were always
  `undefined`, so `currentPage` stayed at 1 and the chapter/block were never
  saved. (The other endpoint, `PUT /api/books/:id/progress`, already used the
  frontend names, so the two disagreed.)
- **Evidence:** posting `pageNumber: 3` then re-reading returned `currentPage: 1`
  before the fix; `currentPage: 7` after.
- **Fix:** `saveReadingProgress` now accepts both naming conventions.
- **Also:** `debouncedSaveProgress` computes a chapter+block-based percentage
  when page-based progress is 0 (common for PDFs with many pages but one
  chapter), so progress advances as the reader moves through paragraphs.
- **Files:** `backend/src/controllers/reader.controller.ts`, `frontend/src/context/ReaderContext.tsx`
- **Tests:** isolated ×2 (both endpoints), plus real-DB verification.

## F-29 · Summaries showed the upload description, not the book
- **Root cause:** `summarizeBook`/`summarizeChapter` cache results in the DB.
  Summaries generated before the session-3 extractive-fallback fix still held
  `book.description`. The frontend had no way to request a fresh one.
- **Evidence:** cached summary `quickOverview` was the "Uploaded volume ..."
  description; with `?refresh=true` it became the book's real Chapter 1 text
  (`source: extractive-fallback`).
- **Fix:** `aiService.summarizeBook/summarizeChapter` take a `refresh` flag; the
  SummaryPanel regenerate button passes `refresh=true` to bypass the stale cache.
- **Files:** `frontend/src/services/api.ts`, `frontend/src/components/SummaryPanel.tsx`

## F-30 · Cover upload box could overflow; no preview
- **Fix:** the cover upload card is `overflow-hidden`, shows a 24×32 preview
  with the file name (wrapped) once a file is chosen, and a "Remove cover"
  action. Long names use `break-all`.
- **Files:** `frontend/src/pages/UploadBookPage.tsx`

## Clarifications (not bugs, confirmed against the real DB)
- **Cover "missing":** every book in the DB has `coverUrl: null` because no cover
  was uploaded. BookCard and the detail pages already render the gradient
  fallback. Uploading a cover now shows a preview and persists.
- **"Untitled Chapter" / empty text / audio unavailable:** the books showing
  these are scanned PDFs (`isScanned: true`, 0 chapters, e.g. "Dokumen Scan
  Fotokopi", "sdvfd"). There is no extractable text, so the honest states are
  correct. A text-based book ("Sejarah Rahasia Kuno") has 1 chapter with real
  text, a working summary, Q&A, and now progress — verified end to end.

---

# Session 7: Single PDF reader + summary-narration audio (BROWSER VERIFIED)

This session is the first with **real browser verification**. A CDP harness drives
the already-installed headless Chrome against the running dev servers — no new
dependency (Node 24's native WebSocket + Chrome DevTools Protocol).

Verification:
```
npm --prefix backend run build              # PASS
npm --prefix frontend run build             # PASS
cd backend && npx tsx tests/isolated-security-tests.ts   # 104 passed, 0 failed
cd backend && npx tsx ../frontend/tests/unit-tests.ts    # 25 passed, 0 failed
npx oxlint                                  # 0 errors, 84 warnings (was 90)
node frontend/tests/browser-smoke.mjs       # 9/9 passed (headless Chrome)
node frontend/tests/browser-audio-check.mjs # summary generated + Listen speaks it
```

## Product change: one PDF reader (Text/PDF toggle removed)
- **Why:** the Teks/PDF-Asli toggle was confusing and, as the baseline browser
  run proved, text-based books defaulted to text mode and never rendered a PDF
  canvas (`canvas=none`). The toggle "removed" check only "passed" earlier
  because the whole reader hadn't rendered.
- **Change:** `ReaderPage` now renders a single `PdfVisualReader`. Removed the
  mode toggle, the text-blocks rendering path, the font-size controls (only
  relevant to text mode), and the `isScannedDocument`/`isDummyBlock` branching.
  Text extraction stays server-side for AI only.
- **Files:** `frontend/src/pages/ReaderPage.tsx`

## PDF render crash on saved page (BROWSER-CAUGHT)
- **Root cause:** the saved reading position (`initialPage`) could exceed the
  loaded PDF's page count, so `doc.getPage(currentPage)` threw
  "Invalid page request" and the canvas stayed at the empty default (300x150).
  Found only via the browser console-error capture; builds and unit tests were green.
- **Fix:** clamp `currentPage` to `[1, doc.numPages]` when the document loads,
  and clamp again inside the render effect.
- **Files:** `frontend/src/components/PdfVisualReader.tsx`
- **After fix (browser):** canvas renders 734x950 (a real page); zoom in 734 -> 826.

## Audio now reads the generated summary (not chapter text)
- **Change:** `AudioPlayer` was rewritten. It reads `ReaderContext.summaryText`
  (published by `SummaryPanel`) via the Web Speech API, chunked by sentence,
  with Listen / Pause / Resume / Stop. It is disabled until a summary exists,
  stops on book switch and unmount, and shows "Audio Unavailable" only when the
  browser has no speech engine. No audio file is generated and none is claimed.
- **Files:** `frontend/src/components/AudioPlayer.tsx`, `frontend/src/components/SummaryPanel.tsx`,
  `frontend/src/context/ReaderContext.tsx`
- **Browser-verified:** with instrumented `speechSynthesis.speak`, clicking
  Listen spoke text starting "Chapter 1: The Hidden" — exactly the on-screen
  summary. Listen is disabled on a scanned book (no summary).

## Page bookmarks for the PDF reader
- **Change:** a header "Bookmark" button toggles a bookmark on the current PDF
  page (`ReaderContext.togglePageBookmark` / `isPageBookmarked`). It reuses the
  existing bookmark API (anchored to the first content block, storing the real
  `pageNumber`). Opening a bookmark navigates with `?page=N`; the reader jumps
  to that page via `setPdfPage`. Verified against the real DB: bookmark persists
  across refresh.

## New browser test harness (no new dependency)
- `frontend/tests/browser-smoke.mjs` — 9 checks: boot, login, reader loads,
  toggle gone, canvas renders, zoom enlarges, summary is real text, audio
  control present, no console errors.
- `frontend/tests/browser-audio-check.mjs` — asserts Listen speaks the summary
  and is disabled without one.
- Both launch headless Chrome/Edge via CDP over Node's native WebSocket.

---

# Session 8: Full-book summary, summary narration, PDF progress (BROWSER VERIFIED)

Verification (sequential, final code; dev servers running and serving the updated files via Vite HMR):
```
npm --prefix backend run build                 # PASS
npm --prefix frontend run build                # PASS
cd backend && npx tsx tests/isolated-security-tests.ts   # 104 passed, 0 failed
cd backend && npx tsx ../frontend/tests/unit-tests.ts    # 27 passed, 0 failed (+2 progress)
node frontend/tests/browser-reader-check.mjs   # 16/16 (headless Chrome, real backend + local DB)
node frontend/tests/browser-smoke.mjs          # 9/9
npx oxlint                                     # 0 errors, 85 warnings
```

## F-31 · "Failed to summarize book" — root cause
- Reproduced on the 633-page book "sdvfd": `POST /api/ai/summarize/book/:id` → HTTP 500.
  Backend log: `This book does not contain readable text`.
- A read-only probe of the stored PDF: 30 of 633 pages sampled, **0 characters of text,
  all 30 pages paint raster images**. It is a scanned document with no text layer.
- No OCR engine exists: no `tesseract`/`ocrmypdf` on PATH, no `tesseract.js`, no `canvas`.
- The controller turned this expected condition into a generic 500 "Failed to summarize book".
- Separately, `GEMINI_API_KEY` is a placeholder (checked without printing it), so even
  text books get the labelled extractive fallback, not an AI summary.
- **Fix:** a typed 422 `NEEDS_OCR` (or `NO_EXTRACTABLE_TEXT`) with an honest message;
  other failures return a generic 500 with no internals.

## F-32 · Full-book summary
- Summarizes **every** chapter (was `take: 6`, 1500 chars each).
- With Gemini: bounded map-reduce (12,000-char chunks, at most 12, sampled evenly
  across the whole book), then one combined JSON summary.
- Without Gemini: an extractive summary sampling sentences across the whole book,
  tagged `source: 'extractive-fallback'` with a `fallbackReason`. It never falls back
  to the title or upload description.
- Cached summaries without a `source` tag (old placeholder logic) are ignored and regenerated.
- UI: one "Generate Book Summary" button, a regenerate icon, a source label
  ("AI-generated" vs "Extractive summary — not AI-written"), the "needs OCR" state,
  and a guard against a late response for a previous book.
- **Files:** `backend/src/services/ai.service.ts`, `backend/src/controllers/ai.controller.ts`,
  `frontend/src/components/SummaryPanel.tsx`

## F-33 · Progress stuck at 0% on the PDF
- **Root cause:** the save effect ran only `if (book && currentChapter)`. A scanned PDF
  has 0 chapters, so progress was never computed or saved, whatever page you were on.
  The percentage also updated only inside a 3.5 s debounce, and `onPageChange` fired
  only after a page render finished (fast navigation cancelled renders).
- **Fix:**
  - `progress = floor(page / totalPages × 100)`, clamped 0–100, using the page count
    reported by pdf.js (`utils/readingProgress.ts`).
  - The indicator updates immediately. Saves are debounced (1.2 s) and the pending save
    is flushed, never dropped, on book switch or unmount.
  - Tracking starts only after the saved position is restored, so the initial load never
    overwrites it with page 1. Per-book page state is reset on book switch.
  - `PdfVisualReader` reports every page change immediately with the real page count.
  - `chapterId` is optional in the progress payload.
- **Files:** `frontend/src/context/ReaderContext.tsx`, `frontend/src/components/PdfVisualReader.tsx`,
  `frontend/src/utils/readingProgress.ts` (new), `frontend/src/services/api.ts`

## Browser evidence (`browser-reader-check.mjs`)
- Scanned book: single summary button; "This PDF needs OCR" message; Listen disabled.
- Page 18/633 → 2%; Next → 19 → 3%; Prev → 18; jump to 317 → 50%; backend row shows
  `currentPage: 317, progressPercentage: 50`; after a browser reload page 317 and 50% are
  restored. The original saved position was restored at the end of the test.
- Switching to another book starts at that book's own page (1), not 317.
- Text book: summary built from the book text, labelled `extractive-fallback`; regenerate
  returns book content; Listen narrates exactly the displayed summary (479 chars).

## Known follow-ups
- Legacy `run-tests.ts` asserts 400/500 for a text-less summary; it is now 422. Not run
  (shared DB), so not updated without being able to verify it.
- OCR for scanned PDFs needs approval (options in `TEST_PLAN.md`).
- A real AI summary needs a valid `GEMINI_API_KEY` in `backend/.env` (user action).
