import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { categoryService, bookService, IS_DEMO_MOCK_MODE } from '../services/api';
import {
  computeUploadTimeoutMs,
  createClientUploadId,
  reconcileUpload,
  uploadFingerprint,
} from '../utils/uploadReliability';
import { Category } from '../types';
import { useAuth } from '../context/AuthContext';
import { parsePdfFile, parseTextFile } from '../utils/pdfParser';
import { saveLocalPdfFile } from '../utils/localBookStorage';
import {
  UploadCloud,
  FileText,
  Image,
  Lock,
  Globe,
  AlertCircle,
  CheckCircle2,
  Shield,
  Loader2,
} from 'lucide-react';

const LANGUAGE_OPTIONS = [
  { value: 'English', label: 'English' },
  { value: 'Indonesian', label: 'Indonesian (Bahasa Indonesia)' },
  { value: 'Latin', label: 'Latin (Lingua Latina)' },
  { value: 'French', label: 'French (Français)' },
  { value: 'German', label: 'German (Deutsch)' },
  { value: 'Spanish', label: 'Spanish (Español)' },
  { value: 'Italian', label: 'Italian (Italiano)' },
  { value: 'Japanese', label: 'Japanese (日本語)' },
  { value: 'Arabic', label: 'Arabic (العربية)' },
  { value: 'Ancient Greek', label: 'Ancient Greek (Ἑλληνική)' },
  { value: 'Dutch', label: 'Dutch (Nederlands)' },
  { value: 'Russian', label: 'Russian (Русский)' },
  { value: 'Chinese', label: 'Chinese (中文)' },
];

export const UploadBookPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAdmin, user } = useAuth();
  // Synchronous guard against double-clicks before React re-renders with loading=true.
  const submittingRef = useRef(false);
  // The logical upload in flight / last attempted. Its clientUploadId is reused for
  // retries of the same file+metadata so the server never creates a second book.
  const attemptRef = useRef<{ fingerprint: string; clientUploadId: string; uncertain: boolean } | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);

  // Form State
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [language, setLanguage] = useState('English');
  const [visibility, setVisibility] = useState<'PRIVATE' | 'PUBLIC'>(isAdmin ? 'PUBLIC' : 'PRIVATE');

  const [bookFile, setBookFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    categoryService
      .getAll()
      .then((res) => {
        if (res.success && res.data?.categories) {
          setCategories(res.data.categories);
          if (res.data.categories.length > 0) {
            setCategoryId(res.data.categories[0].id);
          }
        }
      })
      .catch((e) => console.error('Failed to load categories', e));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent duplicate submissions while an upload is already in progress.
    if (loading || submittingRef.current) return;

    if (!bookFile) {
      setError('Please choose a book file (PDF, TXT, or MD).');
      return;
    }

    // Client-side validation: type, empty, and size. Mirrors the backend rules
    // so the user gets immediate feedback without a round-trip.
    const lowerName = bookFile.name.toLowerCase();
    if (lowerName.endsWith('.epub')) {
      // Same rule as the backend: EPUB parsing is not implemented.
      setError('EPUB files are not supported yet. Please upload the book as a PDF (text-based PDFs work best), TXT, or MD file.');
      return;
    }
    const allowedExt = ['.pdf', '.txt', '.md'];
    const hasAllowedExt = allowedExt.some((ext) => lowerName.endsWith(ext));
    if (!hasAllowedExt) {
      setError('Unsupported file type. Please upload a PDF, TXT, or MD file.');
      return;
    }
    if (bookFile.size === 0) {
      setError('The selected file is empty. Please choose a valid document.');
      return;
    }
    const MAX_BYTES = 50 * 1024 * 1024;
    if (bookFile.size > MAX_BYTES) {
      setError('File size exceeds the 50MB limit. Please upload a smaller document.');
      return;
    }
    if (!title.trim()) {
      setError('Please provide a book title.');
      return;
    }
    if (!author.trim()) {
      setError('Please provide an author name.');
      return;
    }

    submittingRef.current = true;
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    const effectiveVisibility = isAdmin ? 'PUBLIC' : visibility;
    const fingerprint = uploadFingerprint(bookFile, { title, visibility: effectiveVisibility });
    if (!attemptRef.current || attemptRef.current.fingerprint !== fingerprint) {
      attemptRef.current = {
        fingerprint,
        clientUploadId: createClientUploadId(
          typeof crypto !== 'undefined' && 'randomUUID' in crypto ? () => crypto.randomUUID() : undefined
        ),
        uncertain: false,
      };
    }
    const attempt = attemptRef.current;

    try {
      // A previous attempt of this same upload ended without a definite answer:
      // ask the server first instead of sending the file again.
      if (attempt.uncertain && !IS_DEMO_MOCK_MODE) {
        const settled = await reconcileAndReport(attempt.clientUploadId, bookFile);
        if (settled) return;
      }

      const formData = new FormData();
      // Sent first so the server sees it with the other fields.
      formData.append('clientUploadId', attempt.clientUploadId);
      formData.append('title', (title.trim() || bookFile.name.replace(/\.[^/.]+$/, '')));
      formData.append('author', (author.trim() || 'Author'));
      formData.append('description', description.trim());
      formData.append('language', language);
      formData.append('visibility', effectiveVisibility);
      if (categoryId) formData.append('categoryId', categoryId);

      formData.append('file', bookFile);

      // Client-side extraction is a best-effort OPTIMIZATION only. The backend
      // re-parses the file and is the source of truth, so client parsing must
      // never block or hang the upload. We cap it with a hard timeout and
      // silently continue if it is slow (large/complex PDFs) or fails.
      const withTimeout = <R,>(promise: Promise<R>, ms: number): Promise<R | null> =>
        Promise.race([
          promise,
          new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
        ]);

      if (lowerName.endsWith('.pdf')) {
        setProcessingStatus('Analyzing document (optional preview)...');
        try {
          const parsed = await withTimeout(
            parsePdfFile(bookFile, (current, total) => {
              setProcessingStatus(`Extracting text from PDF (page ${current} of ${total})...`);
            }),
            20000
          );
          if (parsed) {
            formData.append('totalPages', String(parsed.totalPages));
            if (parsed.isScanned) {
              formData.append('isScanned', 'true');
            } else if (parsed.chapters && parsed.chapters.length > 0) {
              formData.append('extractedChapters', JSON.stringify(parsed.chapters));
            }
          } else {
            console.warn('Client-side PDF parse timed out; backend will handle extraction.');
          }
        } catch (pdfErr) {
          console.warn('Client-side PDF parse error, continuing upload', pdfErr);
        }
      } else if (lowerName.endsWith('.txt') || lowerName.endsWith('.md')) {
        setProcessingStatus('Extracting paragraphs from document...');
        try {
          const parsed = await withTimeout(parseTextFile(bookFile), 10000);
          if (parsed && parsed.chapters.length > 0) {
            formData.append('extractedChapters', JSON.stringify(parsed.chapters));
            formData.append('totalPages', String(parsed.totalPages));
          }
        } catch (txtErr) {
          console.warn('Client-side text parse error', txtErr);
        }
      }

      // Send the cover as a file only. The backend stores it and returns a real
      // URL. We deliberately do NOT send a base64 data-URL copy, which bloats the
      // multipart request and can exceed field-size limits (the cause of failed
      // uploads when a cover image was attached).
      if (coverFile) {
        formData.append('cover', coverFile);
      }

      setProcessingStatus('Uploading and processing your book. Large files can take a few minutes...');
      const totalBytes = bookFile.size + (coverFile?.size || 0);
      const res = await bookService.upload(formData, { timeoutMs: computeUploadTimeoutMs(totalBytes) });

      const uploadedBook = res.data?.book || res.data;
      if (!res.success || !uploadedBook?.id) {
        // Never claim success without a persisted book id.
        throw new Error('The server did not confirm the upload. Check your library before trying again.');
      }
      // Saved, but a follow-up step (library link / response preparation) failed server-side.
      const serverNote = (res.data as any)?.partial || (res.data as any)?.libraryLinked === false ? res.message : undefined;
      await completeUpload(uploadedBook, bookFile, serverNote);
    } catch (err: any) {
      const uncertainOutcome =
        !IS_DEMO_MOCK_MODE &&
        (err?.code === 'CLIENT_TIMEOUT' || err?.code === 'NETWORK_ERROR' || err?.code === 'UPLOAD_IN_PROGRESS');
      if (uncertainOutcome) {
        // The server may still be processing (or may have finished). Do not resend.
        attempt.uncertain = true;
        await reconcileAndReport(attempt.clientUploadId, bookFile);
      } else {
        setError(err.message || 'Book upload failed. Please try again.');
      }
    } finally {
      submittingRef.current = false;
      setLoading(false);
      setProcessingStatus(null);
    }
  };

  /** Success path: only reached with a server-confirmed, persisted book id. */
  const completeUpload = async (uploadedBook: any, file: File, serverNote?: string) => {
    attemptRef.current = null;
    // Cache the raw PDF for this user + book so the reader can open it instantly.
    if (file.name.toLowerCase().endsWith('.pdf')) {
      try {
        await saveLocalPdfFile(uploadedBook.id, file, user?.id);
      } catch (storeErr) {
        console.warn('Could not cache PDF blob locally', storeErr);
      }
    }
    const note =
      uploadedBook.processingStatus === 'FAILED'
        ? ' The PDF was saved, but no text could be extracted, so AI features are unavailable for it.'
        : '';
    setSuccessMessage(
      serverNote
        ? `${serverNote} Returning to your library...`
        : `Book uploaded and saved.${note} Returning to your library...`
    );
    setTimeout(() => {
      navigate(`/library?uploaded=${encodeURIComponent(uploadedBook.id)}`);
    }, 800);
  };

  /**
   * Ask the server what happened to an upload attempt. Returns true when the
   * outcome is settled for now (success shown, or user told to wait), false when
   * the caller may (re)send the file with the same clientUploadId.
   */
  const reconcileAndReport = async (clientUploadId: string, file: File): Promise<boolean> => {
    setProcessingStatus('Checking whether the server received your upload...');
    const result = await reconcileUpload(
      async () => {
        const r = await bookService.getUploadStatus(clientUploadId);
        return { status: r.data.status, book: r.data.book };
      },
      { attempts: 6, intervalMs: 5000 }
    );
    const attempt = attemptRef.current;
    switch (result.status) {
      case 'completed':
        if (result.book?.id) {
          await completeUpload(result.book, file);
          return true;
        }
        setError('The server reports the upload finished but returned no book. Check your library.');
        return true;
      case 'processing':
        setError(
          'Your upload is still being processed by the server. Please do not upload it again. Press "Upload" in a minute to check its status; no duplicate will be created.'
        );
        return true;
      case 'failed':
        if (attempt) attempt.uncertain = false;
        setError('The server could not process this upload. Check the file and try again.');
        return true;
      case 'unknown':
        if (attempt) attempt.uncertain = false;
        setError(
          'The server has no record of this upload (the connection dropped before it arrived, or the server restarted). Check your library, then try again.'
        );
        return true;
      default:
        setError(
          'Cannot reach the server to confirm your upload. Check your connection, then press "Upload" again. It will check the status first instead of re-sending the file.'
        );
        return true;
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="border-b border-[#E8DFD3] pb-6">
        <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#8C7355] mb-1">
          <UploadCloud className="w-3.5 h-3.5" />
          Literary Ingestion
        </div>
        <h1 className="font-serif-literata text-3xl font-bold text-[#2C2421]">
          Upload a Volume
        </h1>
        <p className="text-xs sm:text-sm text-[#665A4F] mt-1">
          Ingest your PDF document into Elunè. The system splits the text into canonical paragraph blocks for synchronous audio & study.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span className="font-semibold">{successMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white border border-[#E8DFD3] rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
        {/* Title & Author */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[#2C2421] mb-1.5">
              Book Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Nicomachean Ethics"
              className="w-full px-4 py-2.5 rounded-xl border border-[#E8DFD3] bg-[#FAF7F2] text-xs text-[#2C2421] focus:outline-hidden focus:border-[#8C7355]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#2C2421] mb-1.5">
              Author *
            </label>
            <input
              type="text"
              required
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="e.g. Aristotle"
              className="w-full px-4 py-2.5 rounded-xl border border-[#E8DFD3] bg-[#FAF7F2] text-xs text-[#2C2421] focus:outline-hidden focus:border-[#8C7355]"
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-semibold text-[#2C2421] mb-1.5">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Brief overview or context for this treatise..."
            className="w-full p-3 rounded-xl border border-[#E8DFD3] bg-[#FAF7F2] text-xs text-[#2C2421] focus:outline-hidden focus:border-[#8C7355] resize-none"
          />
        </div>

        {/* Category & Language */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[#2C2421] mb-1.5">
              Category
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-[#E8DFD3] bg-[#FAF7F2] text-xs text-[#2C2421] focus:outline-hidden focus:border-[#8C7355]"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#2C2421] mb-1.5">
              Language
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-[#E8DFD3] bg-[#FAF7F2] text-xs text-[#2C2421] focus:outline-hidden focus:border-[#8C7355]"
            >
              {LANGUAGE_OPTIONS.map((lang) => (
                <option key={lang.value} value={lang.value}>
                  {lang.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* File Uploads */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          {/* Book File */}
          <div className="p-4 border-2 border-dashed border-[#E8DFD3] rounded-2xl bg-[#FAF7F2]/60 text-center hover:border-[#8C7355] transition-colors">
            <FileText className="w-8 h-8 text-[#8C7355] mx-auto mb-2 opacity-80" />
            <span className="block text-xs font-semibold text-[#2C2421]">Book File *</span>
            <span className="block text-[11px] text-[#8C7355] mb-3">PDF, TXT, or MD (EPUB not supported yet)</span>
            <input
              type="file"
              required
              aria-label="Book file"
              accept=".pdf,.txt,.md"
              disabled={loading}
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                setBookFile(file);
                setError(null);
                if (file && !title.trim()) {
                  const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
                  setTitle(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
                }
              }}
              className="text-xs text-[#665A4F] file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#2C2421] file:text-white hover:file:bg-[#433832]"
            />
            {bookFile && (
              <span className="block mt-2 text-[11px] text-[#665A4F] break-all" aria-live="polite">
                {bookFile.name} · {(bookFile.size / (1024 * 1024)).toFixed(1)} MB
                {bookFile.size > 50 * 1024 * 1024 ? ' (over the 50 MB limit)' : ''}
              </span>
            )}
          </div>

          {/* Cover Image */}
          <div className="p-4 border-2 border-dashed border-[#E8DFD3] rounded-2xl bg-[#FAF7F2]/60 text-center hover:border-[#8C7355] transition-colors overflow-hidden">
            <Image className="w-8 h-8 text-[#8C7355] mx-auto mb-2 opacity-80" />
            <span className="block text-xs font-semibold text-[#2C2421]">Cover Artwork</span>
            <span className="block text-[11px] text-[#8C7355] mb-3">JPEG, PNG, or WebP</span>
            {coverFile ? (
              <div className="space-y-2">
                <img
                  src={URL.createObjectURL(coverFile)}
                  alt="Cover preview"
                  className="w-24 h-32 object-cover rounded-xl mx-auto border border-[#E8DFD3] shadow-xs"
                />
                <span className="block text-[11px] text-[#665A4F] break-all">{coverFile.name}</span>
                <button
                  type="button"
                  onClick={() => setCoverFile(null)}
                  className="text-[11px] text-red-600 hover:text-red-700 font-semibold"
                >
                  Remove cover
                </button>
              </div>
            ) : (
              <input
                type="file"
                aria-label="Cover image"
                accept="image/jpeg,image/png,image/webp,image/gif"
                disabled={loading}
                onChange={(e) => setCoverFile(e.target.files?.[0] || null)}
                className="text-xs text-[#665A4F] file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#2C2421] file:text-white hover:file:bg-[#433832]"
              />
            )}
          </div>
        </div>

        {/* Visibility Selection — Core Rule: Only shown for regular users */}
        {!isAdmin && (
          <div className="pt-4 border-t border-[#F2ECE1] space-y-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#8C7355]">
              Who can see this book?
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Private option */}
              <label
                className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-start gap-3 ${
                  visibility === 'PRIVATE'
                    ? 'border-[#8C7355] bg-[#F4EBD9]/40 shadow-xs'
                    : 'border-[#E8DFD3] bg-[#FAF7F2] hover:bg-[#F2ECE1]'
                }`}
              >
                <input
                  type="radio"
                  name="visibility"
                  value="PRIVATE"
                  checked={visibility === 'PRIVATE'}
                  onChange={() => setVisibility('PRIVATE')}
                  className="mt-1 accent-[#8C7355]"
                />
                <div>
                  <span className="flex items-center gap-1.5 text-xs font-bold text-[#2C2421]">
                    <Lock className="w-3.5 h-3.5 text-[#8C7355]" /> Private (Personal)
                  </span>
                  <span className="block text-[11px] text-[#665A4F] mt-0.5 leading-snug">
                    Immediate personal access. Only you can read, summarize, and listen to this volume.
                  </span>
                </div>
              </label>

              {/* Public option */}
              <label
                className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-start gap-3 ${
                  visibility === 'PUBLIC'
                    ? 'border-[#8C7355] bg-[#F4EBD9]/40 shadow-xs'
                    : 'border-[#E8DFD3] bg-[#FAF7F2] hover:bg-[#F2ECE1]'
                }`}
              >
                <input
                  type="radio"
                  name="visibility"
                  value="PUBLIC"
                  checked={visibility === 'PUBLIC'}
                  onChange={() => setVisibility('PUBLIC')}
                  className="mt-1 accent-[#8C7355]"
                />
                <div>
                  <span className="flex items-center gap-1.5 text-xs font-bold text-[#2C2421]">
                    <Globe className="w-3.5 h-3.5 text-[#8C7355]" /> Public (Requires Admin Approval)
                  </span>
                  <span className="block text-[11px] text-[#665A4F] mt-0.5 leading-snug">
                    Share with all readers. Requires admin review before publishing to public Explore.
                  </span>
                </div>
              </label>
            </div>
          </div>
        )}

        {/* Submit CTA */}
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          {processingStatus && (
            <div className="flex items-center gap-2 text-xs text-[#8C7355] font-medium">
              <Loader2 className="w-4 h-4 animate-spin text-[#8C7355]" />
              <span>{processingStatus}</span>
            </div>
          )}
          <div className="ml-auto">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 rounded-2xl bg-[#2C2421] hover:bg-[#433832] text-white text-xs font-semibold shadow-xs transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing Volume...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4" />
                  <span>Upload Book</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
