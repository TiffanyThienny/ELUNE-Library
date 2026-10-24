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
