# 📖 Elunè Backend API Documentation

Dokumentasi lengkap REST API backend untuk **Elunè — Peaceful Reading Companion & AI Reader**.

- **Base URL (Development):** `http://localhost:5000`
- **Prefix:** `/api`
- **Format:** `application/json` (kecuali file upload: `multipart/form-data`)

---

## 🔒 Format Standar Response

### Format Sukses (`200`, `201`):
```json
{
  "success": true,
  "data": {},
  "message": "Deskripsi sukses"
}
```

### Format Error (`400`, `401`, `403`, `404`, `500`):
```json
{
  "success": false,
  "message": "Deskripsi pesan error",
  "error": "KODE_ATAU_RINCIAN_ERROR"
}
```

---

## 📑 Daftar Lengkap Endpoints

### 1. Health Check
- **METHOD:** `GET`
- **ENDPOINT:** `/api/health`
- **AUTH:** None
- **RESPONSE:**
  ```json
  {
    "status": "ok",
    "app": "Elunè Peaceful Reading Companion API",
    "version": "1.0.0",
    "timestamp": "2026-10-04T14:15:00.000Z"
  }
  ```

---

### 2. Authentication (`/api/auth`)

#### 2.1 Register Pengguna Baru
- **METHOD:** `POST`
- **ENDPOINT:** `/api/auth/register`
- **AUTH:** None
- **REQUEST BODY:**
  ```json
  {
    "name": "Eleanor Vance",
    "email": "eleanor@elune.read",
    "password": "secure_password_123"
  }
  ```
- **RESPONSE (201 Created):**
  ```json
  {
    "success": true,
    "data": {
      "user": {
        "id": "cuid_xyz",
        "name": "Eleanor Vance",
        "email": "eleanor@elune.read",
        "avatar": "https://...",
        "createdAt": "2026-10-04T14:15:00.000Z"
      },
      "token": "eyJhbGciOiJIUzI1Ni..."
    },
    "message": "User registered successfully"
  }
  ```
- **ERROR (400 / 409):**
  ```json
  {
    "success": false,
    "message": "A user with this email already exists",
    "error": "EMAIL_ALREADY_EXISTS"
  }
  ```

#### 2.2 Login Pengguna
- **METHOD:** `POST`
- **ENDPOINT:** `/api/auth/login`
- **AUTH:** None
- **REQUEST BODY:**
  ```json
  {
    "email": "eleanor@elune.read",
    "password": "secure_password_123"
  }
  ```
- **RESPONSE (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "user": {
        "id": "cuid_xyz",
        "name": "Eleanor Vance",
        "email": "eleanor@elune.read",
        "avatar": "https://..."
      },
      "token": "eyJhbGciOiJIUzI1Ni..."
    },
    "message": "Logged in successfully"
  }
  ```
- **ERROR (401 Unauthorized):**
  ```json
  {
    "success": false,
    "message": "Invalid email or password credentials",
    "error": "INVALID_CREDENTIALS"
  }
  ```

#### 2.3 Get Current User Profile
- **METHOD:** `GET`
- **ENDPOINT:** `/api/auth/me`
- **AUTH:** `Bearer <token>`
- **RESPONSE (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "user": {
        "id": "cuid_xyz",
        "name": "Eleanor Vance",
        "email": "eleanor@elune.read",
        "avatar": "https://...",
        "_count": {
          "userBooks": 3,
          "readingProgress": 2,
          "highlights": 5,
          "bookmarks": 1
        }
      }
    },
    "message": "User profile retrieved successfully"
  }
  ```

---

### 3. Buku (`/api/books`)

#### 3.1 List Semua Buku
- **METHOD:** `GET`
- **ENDPOINT:** `/api/books`
- **QUERY PARAMS:**
  - `page`: default `1`
  - `limit`: default `20`
  - `search`: cari berdasarkan title, author, description
  - `category`: contoh `History`, `Psychology`, `Self Development`
  - `sort`: `latest`, `title`, `author`, `oldest`
- **AUTH:** Optional
- **RESPONSE (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "books": [
        {
          "id": "meditations-aurelius",
          "title": "Meditations",
          "author": "Marcus Aurelius",
          "category": "History",
          "coverBg": "linear-gradient(135deg, #4A3E3D 0%, #2A2120 100%)",
          "readingTime": "4 hrs 15 mins",
          "totalPages": 248,
          "chapters": [ ... ],
          "summary": { ... },
          "progress": {
            "chapterIndex": 0,
            "pageNumber": 34,
            "percent": 24,
            "lastRead": "2 hours ago"
          }
        }
      ],
      "pagination": {
        "total": 3,
        "page": 1,
        "limit": 20,
        "totalPages": 1
      }
    },
    "message": "Books fetched successfully"
  }
  ```

#### 3.2 Detail Buku
- **METHOD:** `GET`
- **ENDPOINT:** `/api/books/:id`
- **AUTH:** Optional
- **RESPONSE (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "id": "meditations-aurelius",
      "title": "Meditations",
      "author": "Marcus Aurelius",
      "category": "History",
      "chapters": [
        {
          "id": "ch-1",
          "number": 1,
          "title": "Debts and Lessons from My Elders",
          "readingTime": "20 mins",
          "summary": "Marcus Aurelius reflects on...",
          "content": "..."
        }
      ]
    },
    "message": "Book details retrieved"
  }
  ```
- **ERROR (404 Not Found):**
  ```json
  {
    "success": false,
    "message": "Book not found with ID invalid-id",
    "error": "NOT_FOUND"
  }
  ```

#### 3.3 Upload File Buku (PDF / EPUB)
- **METHOD:** `POST`
- **ENDPOINT:** `/api/books/upload`
- **CONTENT-TYPE:** `multipart/form-data`
- **AUTH:** Optional / Authenticated
- **FORM-DATA FIELDS:**
  - `file`: File `.pdf` atau `.epub` (wajib, max 50MB)
  - `title`: Judul kustom (opsional, jika kosong nama file digunakan)
  - `author`: Penulis kustom (opsional)
  - `category`: Kategori kustom (opsional)
- **RESPONSE (201 Created):**
  ```json
  {
    "success": true,
    "data": {
      "id": "cuid_book_uploaded",
      "title": "Principles of Quiet Focus",
      "author": "Uploaded Author",
      "fileUrl": "/uploads/book-123456789.epub",
      "totalPages": 185,
      "chapters": [ ... ]
    },
    "message": "Book uploaded and processed successfully"
  }
  ```

---

### 4. Personal Library (`/api/library`)

#### 4.1 Get User Library
- **METHOD:** `GET`
- **ENDPOINT:** `/api/library`
- **AUTH:** `Bearer <token>`
- **RESPONSE (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "books": [
        {
          "id": "meditations-aurelius",
          "title": "Meditations",
          "isFavorite": true,
          "addedAt": "2026-10-04T14:00:00.000Z"
        }
      ]
    },
    "message": "Personal library retrieved"
  }
  ```

#### 4.2 Tambah Buku ke Library
- **METHOD:** `POST`
- **ENDPOINT:** `/api/library/:bookId`
- **AUTH:** `Bearer <token>`
- **RESPONSE (201 Created):**
  ```json
  {
    "success": true,
    "data": {
      "id": "cuid_ub",
      "userId": "usr_demo",
      "bookId": "meditations-aurelius",
      "isFavorite": false
    },
    "message": "Book added to personal library"
  }
  ```

#### 4.3 Hapus Buku dari Library
- **METHOD:** `DELETE`
- **ENDPOINT:** `/api/library/:bookId`
- **AUTH:** `Bearer <token>`
- **RESPONSE (200 OK):**
  ```json
  {
    "success": true,
    "data": { "bookId": "meditations-aurelius" },
    "message": "Book removed from personal library"
  }
  ```

#### 4.4 Toggle Favorite
- **METHOD:** `POST`
- **ENDPOINT:** `/api/library/favorite/:bookId`
- **AUTH:** `Bearer <token>`
- **RESPONSE (200 OK):**
  ```json
  {
    "success": true,
    "data": { "bookId": "meditations-aurelius", "isFavorite": true },
    "message": "Book favorite status set to true"
  }
  ```

---

### 5. Reading Progress (`/api/books`)

#### 5.1 Get Reading Progress
- **METHOD:** `GET`
- **ENDPOINT:** `/api/books/:bookId/progress`
- **AUTH:** `Bearer <token>`
- **RESPONSE (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "currentPage": 34,
      "currentChapter": 0,
      "progressPercentage": 24,
      "lastReadAt": "2026-10-04T14:05:00.000Z"
    },
    "message": "Reading progress retrieved"
  }
  ```

#### 5.2 Update Reading Progress
- **METHOD:** `PUT`
- **ENDPOINT:** `/api/books/:bookId/progress`
- **AUTH:** `Bearer <token>`
- **REQUEST BODY:**
  ```json
  {
    "currentPage": 45,
    "currentChapter": 1,
    "progressPercentage": 32.5
  }
  ```
- **RESPONSE (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "currentPage": 45,
      "currentChapter": 1,
      "progressPercentage": 32.5,
      "lastReadAt": "2026-10-04T14:10:00.000Z"
    },
    "message": "Reading progress updated successfully"
  }
  ```

#### 5.3 Get Reading History
- **METHOD:** `GET`
- **ENDPOINT:** `/api/books/history`
- **AUTH:** `Bearer <token>`
- **RESPONSE (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "history": [
        {
          "id": "prog_1",
          "bookId": "meditations-aurelius",
          "bookTitle": "Meditations",
          "author": "Marcus Aurelius",
          "coverBg": "linear-gradient(...)",
          "chapterTitle": "Debts and Lessons from My Elders",
          "percent": 24,
          "lastOpened": "10/4/2026, 9:05:00 PM",
          "timePeriod": "Today"
        }
      ]
    },
    "message": "Reading history retrieved"
  }
  ```

---

### 6. Bookmarks & Highlights

#### 6.1 Get Bookmarks
- **METHOD:** `GET`
- **ENDPOINT:** `/api/books/:bookId/bookmarks`
- **AUTH:** `Bearer <token>`

#### 6.2 Buat Bookmark
- **METHOD:** `POST`
- **ENDPOINT:** `/api/books/:bookId/bookmarks`
- **AUTH:** `Bearer <token>`
- **REQUEST BODY:**
  ```json
  {
    "page": 34,
    "chapterId": "ch-1",
    "note": "Catatan penting bab 1"
  }
  ```

#### 6.3 Hapus Bookmark
- **METHOD:** `DELETE`
- **ENDPOINT:** `/api/bookmarks/:bookmarkId`
- **AUTH:** `Bearer <token>`

#### 6.4 Get Highlights (Notes & Quotes)
- **METHOD:** `GET`
- **ENDPOINT:** `/api/highlights`
- **AUTH:** `Bearer <token>`

#### 6.5 Buat Highlight
- **METHOD:** `POST`
- **ENDPOINT:** `/api/highlights`
- **AUTH:** `Bearer <token>`
- **REQUEST BODY:**
  ```json
  {
    "bookId": "meditations-aurelius",
    "chapterId": "ch-1",
    "chapterTitle": "Debts and Lessons from My Elders",
    "text": "Silence is not the absence of sound, but the presence of awareness.",
    "color": "yellow",
    "note": "Penting untuk refleksi"
  }
  ```

#### 6.6 Hapus Highlight
- **METHOD:** `DELETE`
- **ENDPOINT:** `/api/highlights/:id`
- **AUTH:** `Bearer <token>`

---

### 7. Google Gemini AI Services (`/api/ai`)

*Catatan: Semua endpoint AI dilindungi rate limiter (maksimal 30 request/menit).*

#### 7.1 Ringkasan Buku (AI Book Summary)
- **METHOD:** `POST`
- **ENDPOINT:** `/api/ai/summarize/book/:bookId?refresh=false`
- **AUTH:** Optional
- **RESPONSE (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "quickOverview": "Meditations is a masterpiece of Stoic philosophy...",
      "mainIdeas": [
        "Our thoughts determine the quality of our life...",
        "Acceptance of what we cannot control releases anxiety..."
      ],
      "keyTakeaways": [
        "You have power over your mind — not outside events.",
        "It is not death that a man should fear..."
      ],
      "importantConcepts": [
        {
          "title": "The Inner Citadel",
          "explanation": "The mind as a fortress unaffected by external chaos..."
        }
      ]
    },
    "message": "Book summary generated/retrieved successfully"
  }
  ```

#### 7.2 Ringkasan Chapter (AI Chapter Summary)
- **METHOD:** `POST`
- **ENDPOINT:** `/api/ai/summarize/chapter/:chapterId?refresh=false`
- **AUTH:** Optional
- **RESPONSE (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "summary": "Marcus Aurelius reflects on the virtues acquired from elders...",
      "keyPoints": [
        "Gratitude is foundational.",
        "Avoid unnecessary disputes."
      ]
    },
    "message": "Chapter summary generated/retrieved successfully"
  }
  ```

#### 7.3 Tanya Jawab Isi Buku (AI Book Q&A)
- **METHOD:** `POST`
- **ENDPOINT:** `/api/ai/ask/:bookId`
- **AUTH:** `Bearer <token>`
- **REQUEST BODY:**
  ```json
  {
    "question": "Apa inti dari chapter pertama?"
  }
  ```
- **RESPONSE (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "question": "Apa inti dari chapter pertama?",
      "answer": "Berdasarkan isi buku Meditations, Chapter 1 berfokus pada rasa syukur dan pelajaran moral yang diperoleh Marcus Aurelius dari kakek, ayah, ibu, dan para gurunya..."
    },
    "message": "AI answer generated successfully"
  }
  ```

#### 7.4 Flashcard Studi (AI Flashcards)
- **METHOD:** `POST`
- **ENDPOINT:** `/api/ai/flashcards/:bookId`
- **AUTH:** Optional
- **RESPONSE (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "flashcards": [
        {
          "question": "What is the central philosophical stance presented in Meditations?",
          "answer": "Self-mastery and internal reason are within our control..."
        }
      ]
    },
    "message": "Flashcards generated successfully"
  }
  ```

#### 7.5 Kuis Pilihan Ganda (AI Quiz)
- **METHOD:** `POST`
- **ENDPOINT:** `/api/ai/quiz/:bookId`
- **AUTH:** Optional
- **RESPONSE (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "quiz": [
        {
          "question": "What is the primary benefit of maintaining an inner citadel?",
          "options": [
            "To isolate oneself completely",
            "To cultivate unwavering tranquility amidst external noise",
            "To accumulate theory",
            "To control other people"
          ],
          "correctAnswer": "To cultivate unwavering tranquility amidst external noise",
          "explanation": "The inner citadel serves as an internal sanctuary..."
        }
      ]
    },
    "message": "Quiz generated successfully"
  }
  ```

#### 7.6 Peta Konsep (AI Mind Map)
- **METHOD:** `POST`
- **ENDPOINT:** `/api/ai/mindmap/:bookId`
- **AUTH:** Optional
- **RESPONSE (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "title": "Meditations",
      "children": [
        {
          "title": "The Ruling Mind",
          "children": [
            { "title": "First Principles", "children": [] }
          ]
        }
      ]
    },
    "message": "Mind map generated successfully"
  }
  ```

---

### 8. Text-To-Speech (TTS) (`/api/tts`)

- **METHOD:** `POST`
- **ENDPOINT:** `/api/tts`
- **AUTH:** Optional
- **REQUEST BODY:**
  ```json
  {
    "text": "Silence is not the absence of sound, but the presence of awareness.",
    "voice": "en-US-Natural",
    "speed": 1.0,
    "bookId": "architecture-of-silence"
  }
  ```
- **RESPONSE JIKA PROVIDER BELUM DIKONFIGURASI (501 Not Implemented):**
  ```json
  {
    "success": false,
    "message": "TTS provider \"ExternalCloudTTS\" is not configured on this server. The frontend can use browser Web Speech API as peaceful built-in client narration.",
    "error": "TTS_PROVIDER_UNAVAILABLE"
  }
  ```
