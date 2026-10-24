# Elunè Test Coverage Report

Updated session 3.

**Columns**
- **Static**: tsc, oxlint, prisma validate
- **Isolated**: `backend/tests/isolated-security-tests.ts`. No DB, Prisma stubbed, real Express app and real PDF parsing. 102/102 (session 4).
- **Unit**: `frontend/tests/unit-tests.ts`, pure logic only. 25/25.
- **Integration**: `run-tests.ts` against a real DB.
- **E2E / Manual**: browser.

| Feature | Static | Isolated | Unit | Integration | E2E | Manual |
|---|---|---|---|---|---|---|
| Builds and types (backend, frontend) | PASS | — | — | — | — | — |
| Lint (0 errors, 85 warnings) | PASS | — | — | — | — | — |
| Static `/uploads` cannot serve documents | — | PASS (10) | — | BLOCKED | BLOCKED | UNVERIFIED |
| Protected file endpoint matrix | — | PASS (13 + 2) | — | BLOCKED | BLOCKED | UNVERIFIED |
| PDF stream: bytes, content-type, no-store, Range 206 | — | PASS (2) | — | BLOCKED | BLOCKED | UNVERIFIED |
| CORS for range requests | — | PASS (1) | — | — | — | — |
| Upload: valid PDF persisted (record + file) | — | PASS (stubbed DB) | — | BLOCKED | BLOCKED | UNVERIFIED |
| Upload validation (type, magic bytes, size, corrupt) and orphan cleanup | — | PASS (8) | — | BLOCKED | — | UNVERIFIED |
| Upload idempotency / status / concurrency | — | PASS (8) | — | BLOCKED | — | UNVERIFIED |
| Upload timeout and reconciliation logic | — | — | PASS (9) | — | BLOCKED | UNVERIFIED |
| Upload page UI (guard, messages, file info) | PASS (build) | — | — | — | BLOCKED | UNVERIFIED |
| Text extraction → content blocks | — | PASS (1) | — | BLOCKED | — | — |
| Scanned / blank PDF classification | — | PASS (2) | — | BLOCKED | — | UNVERIFIED |
| OCR | — | — | — | — | — | not implemented |
| EPUB rejection (no parsing) | — | PASS (4) | — | — | — | UNVERIFIED |
| Upload failure handling (DB failure cleanup, link failure, idempotent cleanup) | — | PASS (6) | — | BLOCKED (real DB errors) | — | — |
| Reader API contract (file + processing state) | — | PASS (1) | — | BLOCKED | — | — |
| PDF cache policy (user+book, purge on deny, no legacy) | — | — | PASS (8) | — | BLOCKED | UNVERIFIED |
| IndexedDB cache, logout clearing, book switching | PASS (build) | — | — | — | BLOCKED | UNVERIFIED |
| Cover access policy (signed URLs) | — | PASS (10) | — | BLOCKED | — | UNVERIFIED |
| Cover URL resolution against API origin | PASS (build) | — | — | — | BLOCKED | UNVERIFIED |
| AI access control | — | PASS (11 + 1) | — | BLOCKED | — | — |
| AI fallback content from the uploaded book (summary, chapter, Q&A) | — | PASS (3) | — | BLOCKED | — | UNVERIFIED |
| AI flashcard/quiz fallbacks | PASS (tsc) | — | — | BLOCKED | — | UNVERIFIED |
| AI response shapes in UI | — | — | PASS (5) | — | BLOCKED | UNVERIFIED |
| AI live Gemini (`gemini-2.5-flash`) | — | — | — | — | — | BLOCKED (no key) |
| TTS backend / Web Speech playback | UNVERIFIED | — | — | BLOCKED | BLOCKED | UNVERIFIED |
| Audio segment access | — | PASS (2) | — | BLOCKED | — | — |
| Bookmarks/notes anchor and access | — | PASS (5) | — | BLOCKED | — | UNVERIFIED |
| Bookmarks/notes/progress CRUD | UNVERIFIED | — | — | BLOCKED | — | UNVERIFIED |
| Auth register/login/me | UNVERIFIED | — | — | BLOCKED | — | UNVERIFIED |
| Auth logout + cache clear | — | PASS (2, server) | — | — | BLOCKED | UNVERIFIED |
| Env / JWT hardening | — | PASS (5 + process check) | — | — | — | — |

## Acceptance criteria status

| | Criterion | Status |
|---|---|---|
| A | Valid PDF → real persisted book record | **Partially verified.** HTTP, controller, parse and file-on-disk PASS with stubbed Prisma. The Postgres write is BLOCKED (no isolated test DB). |
| B | Open the book and render actual PDF pages | **Server side PASS** (exact bytes, Range). Rendering by pdf.js in a browser is UNVERIFIED. |
| C | Refresh and reopen | UNVERIFIED (browser + real DB) |
| D | Extracted text available to AI | **PASS** for summary, chapter summary and Q&A via the non-AI fallback, with stubbed DB. Live Gemini BLOCKED. |
| E | Audio when TTS is available | BLOCKED: there is no TTS provider (placeholder), and Web Speech is browser-only |
| F | AI/audio failure doesn't break reading | **By design and code**: the reader never calls AI to load. Browser UNVERIFIED. |
| G | Timeout recovery doesn't create a duplicate | **PASS** (server idempotency + reconciliation logic), within the in-memory limitation. UI flow UNVERIFIED. |
| H | Private PDF access and cache isolation | Access **PASS**. Cache-isolation logic **PASS** (unit). IndexedDB in a browser UNVERIFIED. |
| I | Reports contain actual results | Done (this file, `QA_AUDIT_REPORT.md`, `FIX_LOG.md`, `TEST_PLAN.md`) |

**Not complete:** the core feature cannot be declared complete until A–C and E–H are exercised in a browser against an isolated database.
