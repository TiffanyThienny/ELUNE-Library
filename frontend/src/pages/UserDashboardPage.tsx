import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { userService } from '../services/api';
import { UserDashboardData } from '../types';
import { BookCard } from '../components/BookCard';
import { ProgressBar } from '../components/ProgressBar';
import { LoadingState } from '../components/LoadingState';
import { EmptyState } from '../components/EmptyState';
import {
  BookOpen,
  Bookmark,
  FileText,
  Sparkles,
  HelpCircle,
  Clock,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

export const UserDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [data, setData] = useState<UserDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    userService
      .getDashboard()
      .then((res) => {
        if (res.success && res.data) {
          setData(res.data);
        }
      })
      .catch((err) => console.error('Failed to load dashboard data', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <LoadingState message="Preparing your reading sanctuary..." fullPage />;
  }

  const stats = data?.stats || {
    booksRead: 0,
    booksSaved: 0,
    summaries: 0,
    bookmarks: 0,
    notes: 0,
  };

  const statCards = [
    { label: 'Books Saved', value: stats.booksSaved, icon: BookOpen, color: 'text-stone-800' },
    { label: 'Active Progress', value: stats.booksRead, icon: TrendingUp, color: 'text-amber-800' },
    { label: 'Bookmarks', value: stats.bookmarks, icon: Bookmark, color: 'text-[#8C7355]' },
    { label: 'Reflective Notes', value: stats.notes, icon: FileText, color: 'text-emerald-800' },
    { label: 'AI Summaries', value: stats.summaries, icon: Sparkles, color: 'text-indigo-800' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
      {/* Greeting Banner */}
      <div className="bg-white border border-[#E8DFD3] rounded-3xl p-6 sm:p-10 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#8C7355] mb-2">
            <span>Welcome, scholar</span>
          </div>
          <h1 className="font-serif-literata text-3xl sm:text-4xl font-bold text-[#2C2421]">
            Greetings, {user?.name || 'Reader'}
          </h1>
          <p className="text-xs sm:text-sm text-[#665A4F] mt-1.5 max-w-lg">
            Pick up where you left off, review your paragraph annotations, or explore new literary treatises.
          </p>
        </div>

        <div className="flex gap-3">
          <Link
            to="/explore"
            className="px-5 py-2.5 rounded-2xl bg-[#2C2421] text-white text-xs font-semibold hover:bg-[#433832] transition-colors shadow-2xs flex items-center gap-2"
          >
            Explore Library
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <Link
            to="/upload"
            className="px-5 py-2.5 rounded-2xl bg-white border border-[#E8DFD3] text-[#2C2421] text-xs font-semibold hover:bg-[#FAF7F2] transition-colors shadow-2xs"
          >
            Upload Book
          </Link>
        </div>
      </div>

      {/* Learning Statistics Grid */}
      <section className="space-y-4">
        <h2 className="font-serif-literata text-xl font-bold text-[#2C2421]">
          Your Learning Statistics
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {statCards.map((card, idx) => {
            const Icon = card.icon;
            return (
              <div
                key={idx}
                className="bg-white border border-[#E8DFD3] rounded-2xl p-4 shadow-2xs flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-2">
                  <Icon className={`w-4 h-4 ${card.color}`} />
                  <span className="text-xl font-bold font-serif-literata text-[#2C2421]">
                    {card.value}
                  </span>
                </div>
                <span className="text-[11px] font-medium text-[#8C7355]">{card.label}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Continue Reading Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-serif-literata text-xl font-bold text-[#2C2421]">
            Continue Reading
          </h2>
          <span className="text-xs text-[#8C7355] font-medium">Canonical paragraph sync active</span>
        </div>

        {data?.continueReading && data.continueReading.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.continueReading.map((item) => (
              <div
                key={item.bookId}
                className="bg-white border border-[#E8DFD3] rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:border-[#8C7355] transition-all"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-serif-literata font-bold text-base text-[#2C2421] line-clamp-1">
                        {item.title}
                      </h3>
                      <p className="text-xs text-[#665A4F]">{item.author}</p>
                    </div>
                    <span className="text-[10px] font-mono text-[#8C7355] bg-[#FAF7F2] border border-[#E8DFD3] px-2 py-0.5 rounded-lg shrink-0">
                      Page {item.currentPage}
                    </span>
                  </div>

                  {item.chapterTitle && (
                    <p className="text-xs text-[#8C7355] line-clamp-1 italic">
                      Chapter: {item.chapterTitle}
                    </p>
                  )}

                  <ProgressBar progress={item.progressPercentage} label="Book Progress" />
                </div>

                <div className="mt-4 pt-3 border-t border-[#F2ECE1] flex items-center justify-between">
                  <span className="text-[10px] text-[#A69888] flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Last read {new Date(item.lastReadAt).toLocaleDateString()}
                  </span>
                  <Link
                    to={`/read/${item.bookId}`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#2C2421] hover:text-[#8C7355]"
                  >
                    Resume <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No reading in progress"
            subtitle="Explore our library and dive into any volume to begin tracking your reading journey."
            actionText="Browse Library"
            actionOnClick={() => (window.location.href = '/explore')}
          />
        )}
      </section>

      {/* My Library Preview */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-serif-literata text-xl font-bold text-[#2C2421]">
            My Saved Library
          </h2>
          <Link
            to="/library"
            className="text-xs font-semibold text-[#8C7355] hover:text-[#2C2421] flex items-center gap-1"
          >
            View All <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {data?.myLibrary && data.myLibrary.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {data.myLibrary.slice(0, 5).map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="Your library is waiting for its first book."
            subtitle="Save books you wish to read and cherish over time."
            actionText="Discover Books"
            actionOnClick={() => (window.location.href = '/explore')}
          />
        )}
      </section>
    </div>
  );
};
