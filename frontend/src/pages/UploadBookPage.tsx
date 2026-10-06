import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { categoryService, bookService } from '../services/api';
import { Category } from '../types';
import { useAuth } from '../context/AuthContext';
import { parsePdfFile, parseTextFile } from '../utils/pdfParser';
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
  const { isAdmin } = useAuth();
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
    if (!bookFile) {
      setError('Please provide a book file (PDF, EPUB, or TXT).');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const effectiveVisibility = isAdmin ? 'PUBLIC' : visibility;
      const formData = new FormData();
      formData.append('title', (title.trim() || bookFile.name.replace(/\.[^/.]+$/, '')));
      formData.append('author', (author.trim() || 'Author'));
      formData.append('description', description.trim());
      formData.append('language', language);
      formData.append('visibility', effectiveVisibility);
      if (categoryId) formData.append('categoryId', categoryId);

      formData.append('file', bookFile);

      // Extract PDF/Text chapters and paragraphs client-side so results appear immediately
      if (bookFile.name.toLowerCase().endsWith('.pdf')) {
        setProcessingStatus('Starting document analysis...');
        try {
          const parsed = await parsePdfFile(bookFile, (current, total) => {
            setProcessingStatus(`Extracting text from PDF (page ${current} of ${total})...`);
          });
          if (parsed) {
            formData.append('totalPages', String(parsed.totalPages));
            if (parsed.isScanned) {
              formData.append('isScanned', 'true');
            } else if (parsed.chapters && parsed.chapters.length > 0) {
              formData.append('extractedChapters', JSON.stringify(parsed.chapters));
            }
          }
        } catch (pdfErr) {
          console.warn('Client-side PDF parse error, continuing upload', pdfErr);
        }
      } else if (bookFile.name.toLowerCase().endsWith('.txt') || bookFile.name.toLowerCase().endsWith('.md')) {
        setProcessingStatus('Extracting paragraphs from document...');
        try {
          const parsed = await parseTextFile(bookFile);
          if (parsed && parsed.chapters.length > 0) {
            formData.append('extractedChapters', JSON.stringify(parsed.chapters));
            formData.append('totalPages', String(parsed.totalPages));
          }
        } catch (txtErr) {
          console.warn('Client-side text parse error', txtErr);
        }
      }

      // Convert cover to DataURL if provided for immediate preview
      if (coverFile) {
        formData.append('cover', coverFile);
        try {
          const reader = new FileReader();
          const coverDataUrl = await new Promise<string>((resolve) => {
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(coverFile);
          });
          formData.append('coverUrl', coverDataUrl);
        } catch (coverErr) {
          console.warn('Cover preview generation skipped', coverErr);
        }
      }

      setProcessingStatus('Saving volume to library archive...');
      const res = await bookService.upload(formData);

      if (res.success && res.data?.book) {
        const uploadedBook = res.data.book;
        setSuccessMessage('Book ingested and processed successfully! Opening reader...');

        setTimeout(() => {
          navigate(`/read/${uploadedBook.id}`);
        }, 1200);
      } else {
        setSuccessMessage('Upload successful! Redirecting to Explore...');
        setTimeout(() => {
          navigate('/explore');
        }, 1200);
      }
    } catch (err: any) {
      setError(err.message || 'Book upload failed. Please try again.');
    } finally {
      setLoading(false);
      setProcessingStatus(null);
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
          Ingest your PDF or EPUB document into Elunè. The system splits the text into canonical paragraph blocks for synchronous audio & study.
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
            <span className="block text-[11px] text-[#8C7355] mb-3">PDF, EPUB, or TXT</span>
            <input
              type="file"
              required
              accept=".pdf,.epub,.txt"
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                setBookFile(file);
                if (file && !title.trim()) {
                  const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
                  setTitle(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
                }
              }}
              className="text-xs text-[#665A4F] file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#2C2421] file:text-white hover:file:bg-[#433832]"
            />
          </div>

          {/* Cover Image */}
          <div className="p-4 border-2 border-dashed border-[#E8DFD3] rounded-2xl bg-[#FAF7F2]/60 text-center hover:border-[#8C7355] transition-colors">
            <Image className="w-8 h-8 text-[#8C7355] mx-auto mb-2 opacity-80" />
            <span className="block text-xs font-semibold text-[#2C2421]">Cover Artwork</span>
            <span className="block text-[11px] text-[#8C7355] mb-3">JPEG, PNG, or WebP</span>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setCoverFile(e.target.files?.[0] || null)}
              className="text-xs text-[#665A4F] file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#2C2421] file:text-white hover:file:bg-[#433832]"
            />
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
