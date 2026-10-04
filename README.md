# 📖 ELUNÈ — Digital Library, Reading Sanctuary & AI Companion

An elevated digital library and reading platform combining tranquil typography, canonical paragraph-level audio synchronization, and Google Gemini AI learning tools.

---

## 🏛️ Architecture & Core Philosophy

Elunè avoids dummy or superficial data. Every reading coordinate, paragraph bookmark, reflective note, audio segment, and AI interaction operates on a unified, canonical data hierarchy:

```
Book
 └── Chapter
      └── ContentBlock (Paragraph / Canonical Position)
           ├── Bookmark (User + ContentBlock)
           ├── Note (User + ContentBlock)
           └── AudioSegment (StartTime / EndTime ↔ ContentBlock)
```

### 1. Canonical Synchronization
- **Reader ↔ Audio:** When listening to audio narration, the player automatically identifies the active `AudioSegment` and smoothly scrolls the reader while highlighting the exact paragraph in real time.
- **Direct Seeking:** Tapping any paragraph seeks audio playback to its precise `startTime` timestamp and plays immediately.
- **Deep Bookmarks & Notes:** Bookmarks and margin notes are anchored to `contentBlockId` (individual paragraphs), rather than vague page numbers. Opening a bookmark opens the chapter, scrolls to the paragraph, sets page context, and prepares audio at that exact offset.

### 2. Private vs Public Upload Flow
- **Private:** Books uploaded as `PRIVATE` are immediately accessible only by their owner (`uploadedBy`). They never appear in public search, explore catalogs, or recommendations, and do not require admin review.
- **Public:** Books uploaded as `PUBLIC` are placed into a `PENDING` review state. Administrators evaluate submissions in the Admin Console, approving them for the public library or rejecting them with a clear `rejectionReason`.

---

## 🛠️ Technology Stack

### Frontend (`frontend/`)
- **Core:** React 19, TypeScript, Vite
- **Styling:** Vanilla Tailwind CSS with custom editorial typography and warm sanctuary color palette (`#FAF7F2`, `#2C2421`, `#8C7355`, `#EBDDC8`)
- **Routing:** React Router v7
- **Icons:** Lucide React
- **Audio:** Web Audio API & HTML5 Audio with paragraph segment scrubber and speed controls

### Backend (`backend/`)
- **Runtime:** Node.js, Express.js, TypeScript
- **Database & ORM:** PostgreSQL on **Port 5433**, Prisma ORM
- **Authentication:** JWT, bcrypt password hashing, Role-Based Access Control (`USER` & `ADMIN`)
- **AI Companion:** Google Gemini API (Grounding in book text, syntheses, Q&A, flashcards, quizzes, mind maps)
- **File Parsing & Ingestion:** PDF & EPUB parsing into chapters and canonical `ContentBlock`s
- **Security:** Helmet, CORS, Rate Limiting, Centralized Error Handling

---

## 📂 Project Structure

```
ELUNE/
├── frontend/                     # React + Vite + Tailwind CSS Application
│   ├── src/
│   │   ├── components/           # Reusable components (AudioPlayer, BookCard, AIChat, etc.)
│   │   ├── context/              # AuthContext & ReaderContext (Audio sync & debounce)
│   │   ├── pages/                # Public, Authenticated & Admin Portal Pages
│   │   ├── services/             # Domain API client services
│   │   ├── types/                # Strict TypeScript interfaces
│   │   ├── App.tsx               # Routing & protected route guards
│   │   └── main.tsx
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
│
├── backend/                      # Node.js + Express + Prisma REST API
│   ├── src/
│   │   ├── config/               # Database & environment configuration
│   │   ├── controllers/          # API route controllers
│   │   ├── middleware/           # JWT authentication, role guards, file uploads
│   │   ├── routes/               # Modular REST endpoints
│   │   ├── services/             # Gemini AI, TTS abstraction, book file parser
│   │   └── app.ts                # Express app entrypoint
│   ├── prisma/
│   │   ├── schema.prisma         # PostgreSQL schema with constraints & indexes
│   │   └── seed.ts               # Seed data for Admin, User, books, and audio segments
│   ├── tests/                    # Integration test suite (19 test cases)
│   ├── package.json
│   ├── tsconfig.json
│   └── .env
│
├── API_ENDPOINTS.md              # Full endpoint specification
└── README.md
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js** >= 18.0.0
- **PostgreSQL** running locally on **Port 5433**

### 2. Backend Setup
1. Open a terminal in `backend/`:
   ```bash
   cd backend
   npm install
   ```

2. Configure environment variables in `backend/.env`:
   ```env
   DATABASE_URL="postgresql://postgres:123456@localhost:5433/elune"
   PORT=5000
   NODE_ENV=development
   JWT_SECRET="elune_super_secure_jwt_secret_key_2026"
   FRONTEND_URL="http://localhost:5173"
   GEMINI_API_KEY="YOUR_GEMINI_API_KEY"
   ```
   > ⚠️ **Note:** PostgreSQL must connect to port **5433** (`localhost:5433/elune`).

3. Run Prisma database migrations and seed default content:
   ```bash
   npx prisma db push
   npm run seed
   ```
   *The seed script populates default administrator and demo reader accounts, 5 categories, sample public books with audio tracks and paragraph segments, pending books, and private journals.*

4. Run the backend development server:
   ```bash
   npm run dev
   ```
   API is accessible at `http://localhost:5000/api`.

5. Run integration test suite:
   ```bash
   npm test
   ```

---

### 3. Frontend Setup
1. Open a new terminal in `frontend/`:
   ```bash
   cd frontend
   npm install
   ```

2. Start the Vite development server:
   ```bash
   npm run dev
   ```
   The client will launch at `http://localhost:5173`.

3. Build production bundle:
   ```bash
   npm run build
   ```

---

## 🔑 Default Accounts (Seed)

| Role | Email | Password | Scope |
|---|---|---|---|
| **Administrator** | `admin@elune.read` | `admin123` | Full access: editorial review, users, inventory, telemetry |
| **Demo Reader** | `demo@elune.read` | `password123` | Standard user: library, bookmarks, notes, upload, AI scholar |
| **Standard User** | `user@elune.read` | `user123` | Standard reader |

---

## 🧪 Testing Coverage

The backend test suite (`backend/tests/run-tests.ts`) executes 19 integration tests verifying:
- Authentication & JWT issuance with roles
- Public library query filtering (only `PUBLIC` + `APPROVED`)
- Access isolation (Private books return `403 Forbidden` for non-owners)
- Admin editorial review workflow (Approve / Reject with reason)
- Canonical reader and debounced reading progress saving
- Paragraph bookmark creation, deduplication & deletion
- Paragraph note creation, modification & deletion
- Audio segment synchronization mapping
- Google Gemini AI book summarization and grounded Q&A
- Admin telemetry and real user dashboard statistics

---

## 📄 License
MIT © Elunè Team.
