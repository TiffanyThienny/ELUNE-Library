import http from 'http';
import { createApp } from '../src/app';
import { prisma } from '../src/config/prisma';

let server: http.Server;
let baseUrl: string;

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
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
  console.log('\n======================================================');
  console.log('🧪 Starting Elunè v2.0 Comprehensive Integration Tests');
  console.log('======================================================\n');

  const app = createApp();
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const addr = server.address() as any;
      baseUrl = `http://localhost:${addr.port}`;
      resolve();
    });
  });

  let adminToken = '';
  let userToken = '';
  let user2Token = '';
  const testBookId = 'meditations-aurelius';
  let privateBookId = 'private-journal-eleanor';
  let pendingBookId = 'deep-work-focus';
  let createdBookmarkId = '';
  let createdNoteId = '';

  // Ensure pending book exists in PENDING state
  await prisma.book.upsert({
    where: { id: pendingBookId },
    update: { status: 'PENDING', visibility: 'PUBLIC' },
    create: {
      id: pendingBookId,
      title: 'Deep Work and Peaceful Focus',
      author: 'Kaelen Mori',
      description: 'Pending review book',
      status: 'PENDING',
      visibility: 'PUBLIC'
    }
  });

  // 1. Health check
  await runTest('GET /api/health should return ok status', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    const json = await res.json();
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(json.status === 'ok', 'Status should be ok');
  });

  // 2. Auth - Admin Login
  await runTest('POST /api/auth/login as Admin should return token with ADMIN role', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@elune.read', password: 'admin123' })
    });
    const json = await res.json();
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(json.data.user.role === 'ADMIN', 'Role should be ADMIN');
    adminToken = json.data.token;
  });

  // 3. Auth - Demo User Login
  await runTest('POST /api/auth/login as User should return token with USER role', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'demo@elune.read', password: 'password123' })
    });
    const json = await res.json();
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(json.data.user.role === 'USER', 'Role should be USER');
    userToken = json.data.token;
  });

  // 4. Auth - Register Second User
  const u2Email = `reader_${Date.now()}@elune.read`;
  await runTest('POST /api/auth/register should create second user', async () => {
    const res = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Julian Reed', email: u2Email, password: 'password123' })
    });
    const json = await res.json();
    assert(res.status === 201, `Expected 201, got ${res.status}`);
    user2Token = json.data.token;
  });

  // 5. Security - Non-admin accessing Admin route should return 403
  await runTest('GET /api/admin/statistics as Standard User should return 403 Forbidden', async () => {
    const res = await fetch(`${baseUrl}/api/admin/statistics`, {
      headers: { Authorization: `Bearer ${userToken}` }
    });
    assert(res.status === 403, `Expected 403, got ${res.status}`);
  });

  // 6. Admin - Statistics
  await runTest('GET /api/admin/statistics as Admin should return platform stats', async () => {
    const res = await fetch(`${baseUrl}/api/admin/statistics`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const json = await res.json();
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(json.data.totalUsers >= 2, 'Should have at least 2 users');
    assert(json.data.totalBooks >= 1, 'Should have at least 1 book');
  });

  // 7. Books - Public Catalog (Should ONLY show PUBLIC + APPROVED)
  await runTest('GET /api/books should list only PUBLIC and APPROVED books', async () => {
    const res = await fetch(`${baseUrl}/api/books`);
    const json = await res.json();
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(json.data.books.length > 0, 'Should return public books');
    assert(
      json.data.books.every((b: any) => b.visibility === 'PUBLIC' && b.status === 'APPROVED'),
      'All books in public catalog must be PUBLIC and APPROVED'
    );
  });

  // 8. Security - Private Book Access
  await runTest('GET /api/books/:id for PRIVATE book by another user should return 403', async () => {
    const res = await fetch(`${baseUrl}/api/books/${privateBookId}`, {
      headers: { Authorization: `Bearer ${user2Token}` }
    });
    assert(res.status === 403, `Expected 403 for unauthorized private book access, got ${res.status}`);
  });

  await runTest('GET /api/books/:id for PRIVATE book by Owner should return 200', async () => {
    const res = await fetch(`${baseUrl}/api/books/${privateBookId}`, {
      headers: { Authorization: `Bearer ${userToken}` }
    });
    assert(res.status === 200, `Expected 200 for owner accessing private book, got ${res.status}`);
  });

  // 9. Admin - Review Pending Book (Approve / Reject)
  await runTest('GET /api/admin/books/pending should list pending submissions', async () => {
    const res = await fetch(`${baseUrl}/api/admin/books/pending`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const json = await res.json();
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(json.data.books.some((b: any) => b.id === pendingBookId), 'Pending book should be listed');
  });

  await runTest('POST /api/admin/books/:id/review should approve pending book', async () => {
    const res = await fetch(`${baseUrl}/api/admin/books/${pendingBookId}/review`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ action: 'APPROVED', notes: 'Excellent content for library' })
    });
    const json = await res.json();
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(json.data.book.status === 'APPROVED', 'Book should be APPROVED');
    assert(json.data.book.visibility === 'PUBLIC', 'Book should now be PUBLIC');
  });

  // Test Admin Reject with reason
  const testRejectId = 'test-rejected-volume';
  await prisma.book.upsert({
    where: { id: testRejectId },
    update: { status: 'PENDING', visibility: 'PUBLIC' },
    create: {
      id: testRejectId,
      title: 'Sample Rejected Manuscript',
      author: 'Author Demo',
      description: 'Manuscript awaiting review',
      status: 'PENDING',
      visibility: 'PUBLIC',
      uploadedBy: (await prisma.user.findUnique({ where: { email: 'demo@elune.read' } }))?.id
    }
  });

  await runTest('PUT /api/admin/books/:id/reject should record rejectionReason and set REJECTED', async () => {
    const res = await fetch(`${baseUrl}/api/admin/books/${testRejectId}/reject`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ reason: 'Formatting does not meet library guidelines.' })
    });
    const json = await res.json();
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(json.data.book.status === 'REJECTED', 'Book status must be REJECTED');
    assert(json.data.book.rejectionReason === 'Formatting does not meet library guidelines.', 'Rejection reason must match');
  });

  await runTest('GET /api/books/:id for REJECTED book by other user should return 403 Forbidden', async () => {
    const res = await fetch(`${baseUrl}/api/books/${testRejectId}`, {
      headers: { Authorization: `Bearer ${user2Token}` }
    });
    assert(res.status === 403, `Expected 403 for unauthorized user accessing rejected book, got ${res.status}`);
  });

  await runTest('GET /api/books/:id for REJECTED book by Uploader should return 200 with rejectionReason', async () => {
    const res = await fetch(`${baseUrl}/api/books/${testRejectId}`, {
      headers: { Authorization: `Bearer ${userToken}` }
    });
    const json = await res.json();
    assert(res.status === 200, `Expected 200 for owner accessing rejected book, got ${res.status}`);
    assert(Boolean(json.data.rejectionReason), 'Uploader must see rejection reason');
  });

  await runTest('PUT /api/admin/books/:id/approve should publish volume to public Explore', async () => {
    const res = await fetch(`${baseUrl}/api/admin/books/${testRejectId}/approve`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ notes: 'Revision approved' })
    });
    const json = await res.json();
    assert(res.status === 200, `Expected 200 on approval, got ${res.status}`);
    assert(json.data.book.status === 'APPROVED', 'Status must be APPROVED');
    assert(json.data.book.visibility === 'PUBLIC', 'Visibility must be PUBLIC');

    // Confirm presence in Explore catalog
    const exploreRes = await fetch(`${baseUrl}/api/books`);
    const exploreJson = await exploreRes.json();
    assert(exploreJson.data.books.some((b: any) => b.id === testRejectId), 'Newly approved book must appear in public Explore');
  });

  // 10. Reader - Full session with ContentBlocks & Audio
  await runTest('GET /api/reader/:bookId should return canonical content blocks and audio sync', async () => {
    const res = await fetch(`${baseUrl}/api/reader/${testBookId}`, {
      headers: { Authorization: `Bearer ${userToken}` }
    });
    const json = await res.json();
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(json.data.chapters.length > 0, 'Chapters should exist');
    assert(json.data.chapters[0].contentBlocks.length > 0, 'Content blocks should exist');
    assert(Boolean(json.data.chapters[0].contentBlocks[0].id), 'ContentBlock ID must be present');
  });

  // 11. Reader - Auto-Save Progress
  await runTest('POST /api/reader/:bookId/progress should save reading position', async () => {
    const res = await fetch(`${baseUrl}/api/reader/${testBookId}/progress`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`
      },
      body: JSON.stringify({
        currentChapterId: 'ch-med-1',
        currentContentBlockId: 'cb-med-1-3',
        currentPage: 1,
        progressPercentage: 25.0
      })
    });
    const json = await res.json();
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(json.data.currentContentBlockId === 'cb-med-1-3', 'Current content block should be saved');
  });

  // 12. Bookmark per Paragraph
  await runTest('POST & GET & DELETE /api/books/:bookId/bookmarks per paragraph', async () => {
    const postRes = await fetch(`${baseUrl}/api/books/${testBookId}/bookmarks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`
      },
      body: JSON.stringify({
        chapterId: 'ch-med-1',
        contentBlockId: 'cb-med-1-4',
        pageNumber: 2,
        note: 'Important thought on human kinship'
      })
    });
    const postJson = await postRes.json();
    assert(postRes.status === 201, `Expected 201, got ${postRes.status}`);
    createdBookmarkId = postJson.data.id;

    // Get all user bookmarks
    const getRes = await fetch(`${baseUrl}/api/bookmarks`, {
      headers: { Authorization: `Bearer ${userToken}` }
    });
    const getJson = await getRes.json();
    assert(getJson.data.bookmarks.some((b: any) => b.id === createdBookmarkId), 'New bookmark should be in list');

    // Delete bookmark
    const delRes = await fetch(`${baseUrl}/api/bookmarks/${createdBookmarkId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${userToken}` }
    });
    assert(delRes.status === 200, `Expected 200, got ${delRes.status}`);
  });

  // 13. Notes per Paragraph
  await runTest('POST & GET & PUT & DELETE /api/books/:bookId/notes per paragraph', async () => {
    const postRes = await fetch(`${baseUrl}/api/books/${testBookId}/notes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`
      },
      body: JSON.stringify({
        chapterId: 'ch-med-1',
        contentBlockId: 'cb-med-1-2',
        pageNumber: 1,
        content: 'Simplicity in living removes unnecessary agitation.'
      })
    });
    const postJson = await postRes.json();
    assert(postRes.status === 201, `Expected 201, got ${postRes.status}`);
    createdNoteId = postJson.data.id;

    // Update note
    const putRes = await fetch(`${baseUrl}/api/notes/${createdNoteId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`
      },
      body: JSON.stringify({ content: 'Updated note on simplicity.' })
    });
    assert(putRes.status === 200, `Expected 200 on note update, got ${putRes.status}`);

    // Get all notes
    const getRes = await fetch(`${baseUrl}/api/notes`, {
      headers: { Authorization: `Bearer ${userToken}` }
    });
    const getJson = await getRes.json();
    assert(getJson.data.notes.some((n: any) => n.id === createdNoteId), 'Note should be in user notes list');

    // Delete note
    const delRes = await fetch(`${baseUrl}/api/notes/${createdNoteId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${userToken}` }
    });
    assert(delRes.status === 200, `Expected 200, got ${delRes.status}`);
  });

  // 14. Audio + Segment Synchronization
  await runTest('GET /api/audio/:bookId/:chapterId should return synchronized segments', async () => {
    const res = await fetch(`${baseUrl}/api/audio/${testBookId}/ch-med-1`);
    const json = await res.json();
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(json.data.track.segments.length > 0, 'Audio segments should be present');
    assert(json.data.track.segments[0].startTime === 0, 'First segment should start at 0');
    assert(Boolean(json.data.track.segments[0].contentBlockId), 'Segment must link to contentBlockId');
  });

  // 15. User Dashboard
  await runTest('GET /api/user/dashboard should return real database metrics', async () => {
    const res = await fetch(`${baseUrl}/api/user/dashboard`, {
      headers: { Authorization: `Bearer ${userToken}` }
    });
    const json = await res.json();
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(typeof json.data.statistics.booksSaved === 'number', 'BooksSaved should be a number');
    assert(Array.isArray(json.data.continueReading), 'ContinueReading should be an array');
  });

  // 16. AI Summary
  await runTest('POST /api/ai/summarize/book/:bookId should return structured summary', async () => {
    const res = await fetch(`${baseUrl}/api/ai/summarize/book/${testBookId}`, {
      method: 'POST'
    });
    const json = await res.json();
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(Boolean(json.data.quickOverview), 'Summary quick overview must exist');
  });

  // 17. AI Q&A
  await runTest('POST /api/ai/ask/:bookId should answer question based on content', async () => {
    const res = await fetch(`${baseUrl}/api/ai/ask/${testBookId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`
      },
      body: JSON.stringify({ question: 'What is the morning reminder in Meditations?' })
    });
    const json = await res.json();
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(Boolean(json.data.answer), 'Answer must be returned');
  });

  // Clean up
  server.close();
  await prisma.$disconnect();

  const failedCount = results.filter((r) => !r.passed).length;
  console.log('\n------------------------------------------------------');
  console.log(`Passed: ${results.length - failedCount}/${results.length}`);
  if (failedCount > 0) {
    console.error(`❌ ${failedCount} tests failed.`);
    process.exit(1);
  } else {
    console.log('🎉 All 17 comprehensive integration test suites passed!');
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Fatal test runner error:', err);
  if (server) server.close();
  process.exit(1);
});
