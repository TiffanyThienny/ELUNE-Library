# 🌙 Elunè Backend API

Backend REST API untuk **Elunè — Peaceful Reading Companion & AI Reader**.

Dibangun dengan **Node.js, TypeScript, Express.js, PostgreSQL, Prisma ORM, JWT, bcrypt, dan Google Gemini AI**.

---

## 🏗️ Tech Stack

- **Runtime & Language:** Node.js (v20+) & TypeScript
- **Framework:** Express.js
- **Database & ORM:** PostgreSQL (port 5433) & Prisma ORM
- **Authentication:** JWT (JSON Web Tokens) & bcryptjs
- **AI Intelligence:** Google Gemini API (`@google/generative-ai`)
- **Document Processing:** PDF parsing (`pdf-parse`) & text chunking/retrieval engine
- **Security:** Helmet, CORS, Express Rate Limit, Request Validation

---

## 📂 Struktur Direktori

```
ELUNE/
├── backend/
│   ├── prisma/
│   │   ├── migrations/
│   │   ├── schema.prisma      # Prisma Database Models
│   │   └── seed.ts            # Demo Seeder Data
│   ├── src/
│   │   ├── config/            # Environment & Prisma client singleton
│   │   ├── controllers/       # Auth, Books, Library, Progress, AI, TTS
│   │   ├── middleware/        # JWT Auth, Error Handler, Rate Limiting, Multer Upload
│   │   ├── routes/            # Route declarations
│   │   ├── services/          # AI Service, Retrieval, Document parser, Storage, TTS
│   │   ├── utils/             # Unified API response helpers
│   │   ├── app.ts             # Express application configuration
│   │   └── server.ts          # Server entry point & graceful shutdown
│   ├── tests/
│   │   └── run-tests.ts       # 21 Automated Endpoint & Edge Case Tests
│   ├── uploads/               # Uploaded PDF/EPUB books
│   ├── .env                   # Local environment variables
│   ├── .env.example           # Environment template
│   ├── package.json
│   ├── tsconfig.json
│   ├── API_ENDPOINTS.md       # Comprehensive API documentation
│   └── README.md
├── src/                       # Frontend source files
└── package.json               # Frontend package.json
```

---

## ⚙️ 1. Persiapan PostgreSQL & DATABASE_URL

PostgreSQL lokal Anda dikonfigurasi pada:
- **Host:** `localhost`
- **Port:** `5433` *(PENTING: Port 5433, BUKAN 5432)*
- **User:** `postgres`
- **Password:** `123456`
- **Database:** `elune`

String koneksi yang digunakan:
```env
DATABASE_URL="postgresql://postgres:123456@localhost:5433/elune"
```

Database `elune` sudah dibuat dan termigrasi secara otomatis melalui Prisma.

---

## 🔑 2. Environment Variables (`.env`)

File `.env` terletak di `backend/.env`:

```env
DATABASE_URL="postgresql://postgres:123456@localhost:5433/elune"
PORT=5000
NODE_ENV=development
JWT_SECRET=elune_super_secure_jwt_secret_key_2026_sanctuary
JWT_EXPIRES_IN=7d
FRONTEND_URL=https://elune-gis.vercel.app
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
UPLOAD_DIR=./uploads
MAX_FILE_SIZE_MB=50
```

> **Catatan Keamanan:** 
> - File `.env` sudah masuk ke `.gitignore` sehingga tidak akan ter-commit ke Git.
> - Masukkan `GEMINI_API_KEY` asli Anda pada `backend/.env` untuk mengaktifkan panggilan langsung ke Google Gemini. 
> - Jika `GEMINI_API_KEY` belum diisi, AI Service memiliki fallback cerdas sehingga backend dan frontend tetap berjalan mulus tanpa crash.

---

## 🚀 3. Instalasi & Menjalankan Backend

Masuk ke folder `backend`:
```bash
cd backend
```

### Install Dependencies
```bash
npm install
```

### Prisma Migration & Generate
```bash
# Generate Prisma Client
npm run prisma:generate

# Jalankan migrasi database
npm run prisma:migrate
```

### Seed Data Awal
Untuk mengisi akun demo (`demo@elune.read` / `password123`) serta buku awal (*Meditations*, *The Architecture of Silence*, *The Art of Clear Thinking*):
```bash
npm run prisma:seed
```

### Menjalankan Server Development
```bash
npm run dev
```
Server akan aktif di:
👉 `http://localhost:5000`  
👉 Health check: `http://localhost:5000/api/health`

---

## 🧪 4. Menjalankan Automated Tests

Backend dilengkapi dengan test suite otomatis yang menguji **21 skenario** (Auth, Books, Library, Progress, Bookmarks, Highlights, AI Summary, AI Q&A, Flashcards, Quiz, Mindmap, Error Handling, TTS):

```bash
npm test
```

Semua 21 skenario berjalan langsung terhadap database PostgreSQL lokal dan terverifikasi 100% lulus.

---

## 📦 5. Build Produksi

Untuk mengompilasi TypeScript ke JavaScript murni:
```bash
npm run build
```
File output akan dihasilkan di direktori `dist/`.

Untuk menjalankan bundle produksi:
```bash
npm start
```

---

## 🌐 6. Integrasi Frontend dengan Backend

Frontend Elunè sudah dihubungkan ke backend via variabel lingkungan `VITE_API_URL`:

1. **Development:**
   Di file `.env` root frontend (`.env`):
   ```env
   VITE_API_URL=http://localhost:5000
   ```
2. **Production:**
   Saat deploy frontend ke Vercel:
   ```env
   VITE_API_URL=https://nama-backend-anda.domain.com
   ```

Service API frontend (`src/services/api.ts`) akan otomatis mengarahkan seluruh request ke backend REST API. Jika backend sedang offline, frontend memiliki graceful fallback data sehingga tampilan UI tidak akan pernah rusak atau kosong.

---

## 📋 7. Dokumentasi API Endpoints

Silakan merujuk ke file **[API_ENDPOINTS.md](./API_ENDPOINTS.md)** untuk rincian lengkap setiap endpoint, format payload request, respon JSON, dan kode status HTTP.
