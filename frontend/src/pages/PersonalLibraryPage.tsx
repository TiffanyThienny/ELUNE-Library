import React, { useState, useEffect } from 'react';
import { Book } from '../types';
import { libraryService, bookService } from '../services/api';
import { BookCard } from '../components/BookCard';
import { LoadingState } from '../components/LoadingState';
import { EmptyState } from '../components/EmptyState';
import { BookOpen, UploadCloud, Library as LibraryIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

export const PersonalLibraryPage: React.FC = () => {
  const [libraryBooks, setLibraryBooks] = useState<Book[]>([]);
  const [uploadedBooks, setUploadedBooks] = useState<Book[]>([]);
  const [activeTab, setActiveTab] = useState<'saved' | 'uploads'>('saved');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [libRes, uploadRes] = await Promise.all([
          libraryService.getMyLibrary(),
          bookService.getMyUploads(),
        ]);

        if (libRes.success && libRes.data) {
          setLibraryBooks(libRes.data.library);
        }
        if (uploadRes.success && uploadRes.data) {
          setUploadedBooks(uploadRes.data.books);
        }
      } catch (err) {
        console.error('Failed to load library items', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E8DFD3] pb-6">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#8C7355] mb-1">
            <LibraryIcon className="w-3.5 h-3.5" />
            Curated Collection
          </div>
          <h1 className="font-serif-literata text-3xl sm:text-4xl font-bold text-[#2C2421]">
            My Library
          </h1>
          <p className="text-xs sm:text-sm text-[#665A4F] mt-1">
            Access your saved literature and manage personal book uploads.
          </p>
        </div>

        <Link
          to="/upload"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#2C2421] hover:bg-[#433832] text-white text-xs font-semibold shadow-2xs transition-colors self-start sm:self-auto"
        >
          <UploadCloud className="w-4 h-4" />
          Upload New Book
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#E8DFD3] gap-6">
        <button
          onClick={() => setActiveTab('saved')}
          className={`pb-3 text-xs sm:text-sm font-semibold transition-colors relative ${
            activeTab === 'saved'
              ? 'text-[#2C2421]'
              : 'text-[#8C7355] hover:text-[#2C2421]'
          }`}
        >
          Saved Books ({libraryBooks.length})
          {activeTab === 'saved' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#8C7355]" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('uploads')}
          className={`pb-3 text-xs sm:text-sm font-semibold transition-colors relative ${
            activeTab === 'uploads'
              ? 'text-[#2C2421]'
              : 'text-[#8C7355] hover:text-[#2C2421]'
          }`}
        >
          My Uploaded Books ({uploadedBooks.length})
          {activeTab === 'uploads' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#8C7355]" />
          )}
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <LoadingState message="Accessing your personal archives..." />
      ) : activeTab === 'saved' ? (
        libraryBooks.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
            {libraryBooks.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="Your library is waiting for its first book."
            subtitle="Browse through our curated public library and add volumes to your collection."
            actionText="Explore Library"
            actionOnClick={() => (window.location.href = '/explore')}
          />
        )
      ) : uploadedBooks.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
          {uploadedBooks.map((book) => (
            <BookCard key={book.id} book={book} showStatus />
          ))}
        </div>
      ) : (
        <EmptyState
          title="You haven't uploaded any books yet."
          subtitle="Upload your private documents or share literature with the Elunè community."
          actionText="Upload a Book"
          actionOnClick={() => (window.location.href = '/upload')}
          icon={<UploadCloud className="w-7 h-7" />}
        />
      )}
    </div>
  );
};
