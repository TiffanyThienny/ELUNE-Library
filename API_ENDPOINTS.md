# 📖 ELUNÈ API SPECIFICATION

Comprehensive REST API documentation for **Elunè — Digital Library, Reading & AI Learning Companion**.

- **Base URL:** `http://localhost:5000`
- **Prefix:** `/api`
- **Format:** `application/json` (Uploads: `multipart/form-data`)

---

## 🔒 Standard Response Format

### Success (`200 OK`, `201 Created`):
```json
{
  "success": true,
  "data": {},
  "message": "Operation completed successfully"
}
```

### Error (`400`, `401`, `403`, `404`, `429`, `500`):
```json
{
  "success": false,
  "message": "User-friendly error explanation",
  "error": "ERROR_CODE_OR_DETAILS"
}
```

---

## 📑 Complete Endpoint Reference

### 1. Authentication (`/api/auth`)

| Method | Endpoint | Auth | Role | Request Body | Description |
|---|---|---|---|---|---|
| `POST` | `/api/auth/register` | None | Anyone | `{ name, email, password }` | Register new user (default role `USER`) |
| `POST` | `/api/auth/login` | None | Anyone | `{ email, password }` | Authenticate user & issue JWT |
| `GET` | `/api/auth/me` | JWT | USER / ADMIN | None | Get authenticated user profile & role |
| `POST` | `/api/auth/logout` | None | Anyone | None | Logout user session |

---

### 2. Books & Curated Catalog (`/api/books`)

| Method | Endpoint | Auth | Role | Request Body / Query | Description |
|---|---|---|---|---|---|
| `GET` | `/api/books` | None | Anyone | `?search=&categoryId=&page=&limit=` | Browse curated catalog (Strictly `PUBLIC` + `APPROVED`) |
| `GET` | `/api/books/:bookId` | Optional | Anyone / Owner | None | Get book details. (Private books return `403 Forbidden` if not owner) |
| `POST` | `/api/books/upload` | JWT | USER / ADMIN | `multipart/form-data` | Ingest book file into chapters & canonical content blocks |
| `GET` | `/api/books/my/uploads` | JWT | USER / ADMIN | None | List all books uploaded by the authenticated user with visibility & review status |

---

### 3. Canonical Reader & Reading Progress (`/api/reader`)

| Method | Endpoint | Auth | Role | Request Body | Description |
|---|---|---|---|---|---|
| `GET` | `/api/reader/:bookId` | JWT | USER / ADMIN | None | Load book chapters, canonical `ContentBlock`s, user bookmarks, user notes, and audio segments |
| `POST` | `/api/reader/:bookId/progress` | JWT | USER / ADMIN | `{ chapterId, contentBlockId, pageNumber, progressPercentage }` | Save canonical paragraph-level reading position (debounced) |

---

### 4. Paragraph Bookmarks (`/api/books` & `/api/bookmarks`)

| Method | Endpoint | Auth | Role | Request Body | Description |
|---|---|---|---|---|---|
| `GET` | `/api/books/:bookId/bookmarks`| JWT | USER / ADMIN | None | Get bookmarks for a specific volume |
| `POST` | `/api/books/:bookId/bookmarks`| JWT | USER / ADMIN | `{ chapterId, contentBlockId, pageNumber, note? }` | Create unique paragraph-level bookmark |
| `GET` | `/api/bookmarks` | JWT | USER / ADMIN | None | Get all bookmarks across all books for current user |
| `DELETE`| `/api/bookmarks/:bookmarkId` | JWT | USER / ADMIN | None | Remove paragraph bookmark |

---

### 5. Paragraph Notes (`/api/books` & `/api/notes`)

| Method | Endpoint | Auth | Role | Request Body | Description |
|---|---|---|---|---|---|
| `GET` | `/api/books/:bookId/notes` | JWT | USER / ADMIN | None | Get notes anchored to paragraphs in a specific book |
| `POST` | `/api/books/:bookId/notes` | JWT | USER / ADMIN | `{ chapterId, contentBlockId, pageNumber, content }` | Create paragraph note |
| `GET` | `/api/notes` | JWT | USER / ADMIN | None | Get all reading annotations across the entire library |
| `PUT` | `/api/notes/:noteId` | JWT | USER / ADMIN | `{ content }` | Update note content |
| `DELETE`| `/api/notes/:noteId` | JWT | USER / ADMIN | None | Delete note |

---

### 6. Synchronized Audio (`/api/audio`)

| Method | Endpoint | Auth | Role | Request Body | Description |
|---|---|---|---|---|---|
| `GET` | `/api/audio/:bookId/:chapterId` | Optional | Anyone / Owner | None | Returns `AudioTrack` and array of `AudioSegment`s mapped to `contentBlockId` with `startTime` & `endTime` |

---

### 7. Google Gemini AI Companion (`/api/ai`)

| Method | Endpoint | Auth | Role | Request Body | Description |
|---|---|---|---|---|---|
| `POST` | `/api/ai/summarize/book/:bookId` | Optional | Anyone / Owner | None | Generate comprehensive executive book synopsis grounded in text |
| `POST` | `/api/ai/summarize/chapter/:chapterId` | Optional | Anyone / Owner | None | Synthesize chapter themes and key concepts |
| `POST` | `/api/ai/ask/:bookId` | JWT | USER / ADMIN | `{ question }` | Ask scholar questions strictly answered from verified book passages |
| `POST` | `/api/ai/flashcards/:bookId` | Optional | Anyone / Owner | None | Generate concept flashcards with Q&A |
| `POST` | `/api/ai/quiz/:bookId` | Optional | Anyone / Owner | None | Generate multiple-choice quiz with explanations |
| `POST` | `/api/ai/mindmap/:bookId` | Optional | Anyone / Owner | None | Generate structured JSON hierarchy of core concepts |

---

### 8. User Dashboard & Personal Library (`/api/user` & `/api/library`)

| Method | Endpoint | Auth | Role | Request Body | Description |
|---|---|---|---|---|---|
| `GET` | `/api/user/dashboard` | JWT | USER / ADMIN | None | Real statistics (books read, saved, notes, quizzes) and continue reading progress |
| `GET` | `/api/library` | JWT | USER / ADMIN | None | Personal saved books plus owner's private books |
| `POST` | `/api/library/:bookId` | JWT | USER / ADMIN | None | Save public book to personal collection |
| `DELETE`| `/api/library/:bookId` | JWT | USER / ADMIN | None | Remove book from personal collection |

---

### 9. Admin Console (`/api/admin`)

*Strictly protected by `authenticateJwt` and `requireAdmin` middlewares. Non-admin users receive `403 Forbidden`.*

| Method | Endpoint | Auth | Role | Request Body | Description |
|---|---|---|---|---|---|
| `GET` | `/api/admin/statistics` | JWT | ADMIN | None | Real-time database metrics (total users, books, public, private, reviews, active readers) |
| `GET` | `/api/admin/books/pending` | JWT | ADMIN | None | Editorial queue of public submissions awaiting review |
| `POST` | `/api/admin/books/:bookId/review` | JWT | ADMIN | `{ action: "APPROVE" \| "REJECT", rejectionReason? }` | Approve book for public explore or reject with reason |
| `GET` | `/api/admin/books` | JWT | ADMIN | None | Complete system inventory across all users |
| `GET` | `/api/admin/users` | JWT | ADMIN | None | System user directory with roles and timestamps |

---

### 10. Taxonomy & Categories (`/api/categories`)

| Method | Endpoint | Auth | Role | Request Body | Description |
|---|---|---|---|---|---|
| `GET` | `/api/categories` | None | Anyone | None | List categories with book counts |
| `POST` | `/api/categories` | JWT | ADMIN | `{ name, description? }` | Create new genre category |
