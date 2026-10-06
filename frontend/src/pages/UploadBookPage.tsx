import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { categoryService, bookService } from '../services/api';
import { Category } from '../types';
import { useAuth } from '../context/AuthContext';
import { Toast, ToastType } from '../components/Toast';
import {
  UploadCloud,
  FileText,
  Image,
  Lock,
  Globe,
  AlertCircle,
  CheckCircle2,
  Shield,
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
      formData.append('title', title.trim());
      formData.append('author', author.trim());
      formData.append('description', description.trim());
      formData.append('language', language);
      formData.append('visibility', effectiveVisibility);
      if (categoryId) formData.append('categoryId', categoryId);

      formData.append('file', bookFile);
      if (coverFile) {
        formData.append('cover', coverFile);
      }

      const res = await bookService.upload(formData);

      if (res.success) {
        if (isAdmin) {
          setSuccessMessage('Book uploaded and instantly approved for the public Explore catalog.');
        } else if (effectiveVisibility === 'PUBLIC') {
          setSuccessMessage('Your book has been submitted for admin review.');
        } else {
          setSuccessMessage('Upload successful. Your private book is now ready in your library.');
        }

        setTimeout(() => {
          navigate(isAdmin ? '/explore' : '/library');
        }, 1800);
      }
    } catch (err: any) {
      setError(err.message || 'Book upload failed. Please try again.');
    } finally {
      setLoading(false);
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
              onChange={(e) => setBookFile(e.target.files?.[0] || null)}
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

        {/* Visibility Selection — Core Rule */}
        <div className="pt-4 border-t border-[#F2ECE1] space-y-3">
          <label className="block text-xs font-bold uppercase tracking-wider text-[#8C7355]">
            Visibility & Publication Flow
          </label>

          {isAdmin ? (
            <div className="p-4 rounded-2xl border border-emerald-300 bg-emerald-50/70 text-[#2C2421]">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 mb-1">
                <Shield className="w-4 h-4 text-emerald-700" />
                Admin Publication: Instant Approval & Public Catalog
              </div>
              <p className="text-xs text-emerald-900 leading-relaxed">
                As an <strong>Administrator</strong>, your uploaded volumes are <strong>automatically approved</strong> and published directly into the <strong>Public Explore Books</strong> catalog with full AI reading features enabled.
              </p>
            </div>
          ) : (
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
                    <Lock className="w-3.5 h-3.5 text-[#8C7355]" /> Private
                  </span>
                  <span className="block text-[11px] text-[#665A4F] mt-0.5 leading-snug">
                    Only you can read, bookmark, and consult AI. Does not require admin approval.
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
                    <Globe className="w-3.5 h-3.5 text-[#8C7355]" /> Public
                  </span>
                  <span className="block text-[11px] text-[#665A4F] mt-0.5 leading-snug">
                    Submitted for editorial admin review before gracing the public explore library.
                  </span>
                </div>
              </label>
            </div>
          )}
        </div>

        {/* Submit CTA */}
        <div className="pt-4 flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 rounded-2xl bg-[#2C2421] hover:bg-[#433832] text-white text-xs font-semibold shadow-xs transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? (
              'Ingesting and parsing paragraphs...'
            ) : (
              <>
                <UploadCloud className="w-4 h-4" />
                Upload Book
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
