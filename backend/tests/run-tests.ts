import http from 'http';
import { createApp } from '../src/app';
import { prisma } from '../src/config/prisma';

let server: http.Server;
let baseUrl: string;

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  status?: number;
}

const results: TestResult[] = [];

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
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

async function main() {
  console.log('\n========================================');
  console.log('🧪 Starting Elunè Backend Automated Tests');
  console.log('========================================\n');

  const app = createApp();
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const addr = server.address() as any;
      baseUrl = `http://localhost:${addr.port}`;
      resolve();
    });
  });

  const testEmail = `test_${Date.now()}@elune.read`;
  const testPassword = 'secure_password_123';
  let authToken = '';
  let seededBookId = 'meditations-aurelius';
  let createdBookmarkId = '';

  // 1. Health check
  await runTest('GET /api/health should return ok status', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    const json = await res.json();
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(json.status === 'ok', 'Status should be ok');
  });

  // 2. Auth - Register
  await runTest('POST /api/auth/register should create user and return JWT', async () => {
    const res = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Clara Vance',
        email: testEmail,
        password: testPassword
      })
    });
    const json = await res.json();
    assert(res.status === 201, `Expected 201, got ${res.status}`);
    assert(json.success === true, 'Success should be true');
    assert(Boolean(json.data.token), 'Token should be present');
    assert(json.data.user.email === testEmail, 'Email should match');
    authToken = json.data.token;
  });

  // 3. Auth - Login
  await runTest('POST /api/auth/login should authenticate user', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword
      })
    });
    const json = await res.json();
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(json.success === true, 'Login should succeed');
    assert(Boolean(json.data.token), 'Token should be present');
  });

  // 4. Auth - Me
  await runTest('GET /api/auth/me should return current user', async () => {
    const res = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    const json = await res.json();
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(json.data.user.email === testEmail, 'User profile email should match');
  });

  // 5. Auth - Invalid JWT Test
  await runTest('GET /api/auth/me with invalid JWT should return 401', async () => {
    const res = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer invalid.jwt.token` }
    });
    assert(res.status === 401, `Expected 401 for invalid JWT, got ${res.status}`);
  });

  // 6. Books - List
  await runTest('GET /api/books should list books with pagination & search', async () => {
    const res = await fetch(`${baseUrl}/api/books?page=1&limit=5`);
    const json = await res.json();
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(json.success === true, 'Success should be true');
    assert(Array.isArray(json.data.books), 'Books should be an array');
    assert(json.data.books.length > 0, 'Should return at least 1 book');
    seededBookId = json.data.books[0].id;
  });

  // 7. Books - Search
  await runTest('GET /api/books?search=meditations should filter books', async () => {
    const res = await fetch(`${baseUrl}/api/books?search=meditations`);
    const json = await res.json();
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(json.data.books.length > 0, 'Should find matching books');
    assert(json.data.books[0].title.toLowerCase().includes('meditations'), 'Title should match search');
  });

  // 8. Book Detail
  await runTest('GET /api/books/:id should return book details with chapters', async () => {
    const res = await fetch(`${baseUrl}/api/books/${seededBookId}`);
    const json = await res.json();
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(json.data.id === seededBookId, 'Book ID should match');
    assert(Array.isArray(json.data.chapters), 'Chapters should be present');
  });

  // 9. Book Not Found
  await runTest('GET /api/books/non-existent-id should return 404', async () => {
    const res = await fetch(`${baseUrl}/api/books/non-existent-id-9999`);
    assert(res.status === 404, `Expected 404, got ${res.status}`);
  });

  // 10. Personal Library - Add
  await runTest('POST /api/library/:bookId should add book to user library', async () => {
    const res = await fetch(`${baseUrl}/api/library/${seededBookId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` }
    });
    const json = await res.json();
    assert(res.status === 201, `Expected 201, got ${res.status}`);
    assert(json.success === true, 'Should succeed');
  });

  // 11. Personal Library - Get
  await runTest('GET /api/library should return user library items', async () => {
    const res = await fetch(`${baseUrl}/api/library`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    const json = await res.json();
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(json.data.books.some((b: any) => b.id === seededBookId), 'Seeded book should be in library');
  });

  // 12. Reading Progress - Update & Get
  await runTest('PUT & GET /api/books/:bookId/progress should track reading', async () => {
    const putRes = await fetch(`${baseUrl}/api/books/${seededBookId}/progress`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`
      },
      body: JSON.stringify({
        currentPage: 42,
        currentChapter: 1,
        progressPercentage: 35
      })
    });
    assert(putRes.status === 200, `PUT Progress expected 200, got ${putRes.status}`);

    const getRes = await fetch(`${baseUrl}/api/books/${seededBookId}/progress`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    const json = await getRes.json();
    assert(getRes.status === 200, `GET Progress expected 200, got ${getRes.status}`);
    assert(json.data.currentPage === 42, 'Current page should be 42');
    assert(json.data.currentChapter === 1, 'Current chapter should be 1');
  });

  // 13. Bookmark - Create, Get, Delete
  await runTest('POST & GET & DELETE /api/books/:bookId/bookmarks should manage bookmarks', async () => {
    const createRes = await fetch(`${baseUrl}/api/books/${seededBookId}/bookmarks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`
      },
      body: JSON.stringify({
        page: 12,
        note: 'Important reflection on tranquility'
      })
    });
    const createJson = await createRes.json();
    assert(createRes.status === 201, `Expected 201, got ${createRes.status}`);
    createdBookmarkId = createJson.data.id;

    const getRes = await fetch(`${baseUrl}/api/books/${seededBookId}/bookmarks`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    const getJson = await getRes.json();
    assert(getJson.data.bookmarks.length > 0, 'Bookmarks should exist');

    const delRes = await fetch(`${baseUrl}/api/bookmarks/${createdBookmarkId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${authToken}` }
    });
    assert(delRes.status === 200, `Expected 200 on delete, got ${delRes.status}`);
  });

  // 14. Highlights - Create, Get, Delete
  await runTest('POST & GET & DELETE /api/highlights should manage quote highlights', async () => {
    const postRes = await fetch(`${baseUrl}/api/highlights`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`
      },
      body: JSON.stringify({
        bookId: seededBookId,
        text: 'Silence is not the absence of sound, but the presence of awareness.',
        color: 'yellow',
        note: 'Mindful reading quote'
      })
    });
    const postJson = await postRes.json();
    assert(postRes.status === 201, `Expected 201, got ${postRes.status}`);
    const hlId = postJson.data.id;

    const getRes = await fetch(`${baseUrl}/api/highlights`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    const getJson = await getRes.json();
    assert(getJson.data.highlights.some((h: any) => h.id === hlId), 'Highlight should exist in list');

    const delRes = await fetch(`${baseUrl}/api/highlights/${hlId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${authToken}` }
    });
    assert(delRes.status === 200, `Expected 200 on delete highlight, got ${delRes.status}`);
  });

  // 15. AI Summary (Book)
  await runTest('POST /api/ai/summarize/book/:bookId should return structured summary', async () => {
    const res = await fetch(`${baseUrl}/api/ai/summarize/book/${seededBookId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` }
    });
    const json = await res.json();
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(Boolean(json.data.quickOverview), 'quickOverview should be present');
    assert(Array.isArray(json.data.mainIdeas), 'mainIdeas should be an array');
    assert(Array.isArray(json.data.keyTakeaways), 'keyTakeaways should be an array');
  });

  // 16. AI Book Q&A
  await runTest('POST /api/ai/ask/:bookId should answer question using book content', async () => {
    const res = await fetch(`${baseUrl}/api/ai/ask/${seededBookId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`
      },
      body: JSON.stringify({
        question: 'What is the main advice for inner tranquility in this book?'
      })
    });
    const json = await res.json();
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(Boolean(json.data.answer), 'Answer should be returned');
    assert(json.data.answer.length > 20, 'Answer should have substantial length');
  });

  // 17. AI Flashcards
  await runTest('POST /api/ai/flashcards/:bookId should return flashcards array', async () => {
    const res = await fetch(`${baseUrl}/api/ai/flashcards/${seededBookId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` }
    });
    const json = await res.json();
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(Array.isArray(json.data.flashcards), 'flashcards should be an array');
    assert(json.data.flashcards.length > 0, 'Should have at least 1 flashcard');
    assert(Boolean(json.data.flashcards[0].question), 'Question should be present');
    assert(Boolean(json.data.flashcards[0].answer), 'Answer should be present');
  });

  // 18. AI Quiz
  await runTest('POST /api/ai/quiz/:bookId should return multiple choice quiz', async () => {
    const res = await fetch(`${baseUrl}/api/ai/quiz/${seededBookId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` }
    });
    const json = await res.json();
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(Array.isArray(json.data.quiz), 'quiz should be an array');
    assert(json.data.quiz.length > 0, 'Should have quiz items');
    assert(Boolean(json.data.quiz[0].correctAnswer), 'correctAnswer should be present');
  });

  // 19. AI Mind Map
  await runTest('POST /api/ai/mindmap/:bookId should return JSON mindmap tree', async () => {
    const res = await fetch(`${baseUrl}/api/ai/mindmap/${seededBookId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` }
    });
    const json = await res.json();
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(Boolean(json.data.title), 'Mindmap title should be present');
    assert(Array.isArray(json.data.children), 'Mindmap children should be an array');
  });

  // 20. Empty question error
  await runTest('POST /api/ai/ask/:bookId with empty question should return 400', async () => {
    const res = await fetch(`${baseUrl}/api/ai/ask/${seededBookId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`
      },
      body: JSON.stringify({ question: '   ' })
    });
    assert(res.status === 400, `Expected 400, got ${res.status}`);
  });

  // 21. TTS unconfigured error message
  await runTest('POST /api/tts should handle unconfigured provider gracefully', async () => {
    const res = await fetch(`${baseUrl}/api/tts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`
      },
      body: JSON.stringify({ text: 'Hello from Elune' })
    });
    const json = await res.json();
    assert(res.status === 501, `Expected 501, got ${res.status}`);
    assert(json.error === 'TTS_PROVIDER_UNAVAILABLE', 'Expected error code TTS_PROVIDER_UNAVAILABLE');
  });

  // Clean up
  server.close();
  await prisma.$disconnect();

  const failedCount = results.filter((r) => !r.passed).length;
  console.log('\n----------------------------------------');
  console.log(`Passed: ${results.length - failedCount}/${results.length}`);
  if (failedCount > 0) {
    console.error(`❌ ${failedCount} tests failed.`);
    process.exit(1);
  } else {
    console.log('🎉 All test cases passed successfully!');
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Fatal test error:', err);
  if (server) server.close();
  process.exit(1);
});
