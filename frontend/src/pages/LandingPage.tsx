import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { bookService } from '../services/api';
import { Book } from '../types';
import { BookCard } from '../components/BookCard';
import {
  BookOpen,
  Headphones,
  Sparkles,
  Bookmark,
  FileText,
  ShieldCheck,
  ArrowRight,
  Compass,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [featuredBooks, setFeaturedBooks] = useState<Book[]>([]);

  useEffect(() => {
    bookService
      .getExplore({ limit: 8 })
      .then((res) => {
        if (res.success && res.data?.books) {
          setFeaturedBooks(res.data.books);
        }
      })
      .catch((err) => console.error('Failed to load featured books', err));
  }, []);

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#2C2421]">
      {/* Hero Section */}
      <section className="relative px-4 pt-16 pb-20 sm:px-6 lg:px-8 max-w-6xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#E8DFD3] bg-white shadow-2xs mb-8">
          <span className="w-2 h-2 rounded-full bg-[#8C7355] animate-pulse" />
          <span className="text-xs font-semibold uppercase tracking-wider text-[#8C7355]">
            The Digital Sanctuary for Serious Readers
          </span>
        </div>

        <h1 className="font-serif-literata text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-[#2C2421] max-w-4xl mx-auto leading-tight">
          Where Thoughtful Reading Meets <span className="italic text-[#8C7355]">AI Scholarship</span>.
        </h1>

        <p className="mt-6 text-base sm:text-lg text-[#665A4F] max-w-2xl mx-auto leading-relaxed">
          ELUNÈ is an elevated digital library engineered for deep reading, audio synchronization down to the exact paragraph, and grounded AI study companions.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            to={isAuthenticated ? '/home' : '/register'}
            className="px-7 py-3.5 rounded-2xl bg-[#2C2421] hover:bg-[#433832] text-white font-semibold text-sm sm:text-base shadow-sm hover:shadow-md transition-all flex items-center gap-2"
          >
            {isAuthenticated ? 'Go to My Library' : 'Begin Your Journey'}
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/explore"
            className="px-7 py-3.5 rounded-2xl bg-white border border-[#E8DFD3] hover:bg-[#F2ECE1] text-[#2C2421] font-semibold text-sm sm:text-base shadow-2xs transition-colors flex items-center gap-2"
          >
            <Compass className="w-4 h-4 text-[#8C7355]" />
            Explore Library
          </Link>
        </div>
      </section>

      {/* Feature Pillars */}
      <section className="px-4 py-16 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-[#E8DFD3]">
        <div className="text-center mb-16">
          <h2 className="font-serif-literata text-2xl sm:text-3xl font-bold text-[#2C2421]">
            Designed for Deep Cognition & Reflection
          </h2>
          <p className="mt-2 text-sm text-[#8C7355]">
            Every feature serves understanding, retention, and auditory harmony.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Card 1 */}
          <div className="p-8 rounded-3xl bg-white border border-[#E8DFD3] shadow-xs hover:border-[#8C7355] transition-all space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[#FAF7F2] text-[#8C7355] flex items-center justify-center">
              <Headphones className="w-6 h-6" />
            </div>
            <h3 className="font-serif-literata font-bold text-lg text-[#2C2421]">
              Paragraph Audio Sync
            </h3>
            <p className="text-xs sm:text-sm text-[#665A4F] leading-relaxed">
              Listen and read simultaneously. As the narration flows, the reader highlights each active paragraph. Tap any text to seek audio instantly.
            </p>
          </div>

          {/* Card 2 */}
          <div className="p-8 rounded-3xl bg-white border border-[#E8DFD3] shadow-xs hover:border-[#8C7355] transition-all space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[#FAF7F2] text-[#8C7355] flex items-center justify-center">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="font-serif-literata font-bold text-lg text-[#2C2421]">
              Grounded AI Companion
            </h3>
            <p className="text-xs sm:text-sm text-[#665A4F] leading-relaxed">
              Synthesize chapters, test your knowledge with concept flashcards, and ask questions answered strictly from the book's verified text.
            </p>
          </div>

          {/* Card 3 */}
          <div className="p-8 rounded-3xl bg-white border border-[#E8DFD3] shadow-xs hover:border-[#8C7355] transition-all space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[#FAF7F2] text-[#8C7355] flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="font-serif-literata font-bold text-lg text-[#2C2421]">
              Private or Curated Public
            </h3>
            <p className="text-xs sm:text-sm text-[#665A4F] leading-relaxed">
              Keep your private files completely secluded for your personal study, or submit works for admin editorial review to grace the public library.
            </p>
          </div>
        </div>
      </section>

      {/* Featured Library Treatises & Books */}
      {featuredBooks.length > 0 && (
        <section className="px-4 py-16 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-[#E8DFD3] space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#8C7355] mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                Curated Volumes
              </div>
              <h2 className="font-serif-literata text-3xl font-bold text-[#2C2421]">
                Browse the Sanctuary Collection
              </h2>
              <p className="text-xs sm:text-sm text-[#665A4F] mt-1 max-w-xl">
                Classical works prepared with paragraph anchors for immersive reading and grounded AI study.
              </p>
            </div>
            <Link
              to="/explore"
              className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#2C2421] hover:text-[#8C7355] transition-colors"
            >
              View Full Explore Catalog <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-6">
            {featuredBooks.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="border-t border-[#E8DFD3] py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between text-xs text-[#8C7355]">
        <div className="flex items-center space-x-2">
          <span className="font-serif-literata font-bold text-base text-[#2C2421]">ELUNÈ</span>
          <span>© {new Date().getFullYear()} — Digital Library & Learning Experience</span>
        </div>
        <div className="flex space-x-6 mt-4 sm:mt-0">
          <Link to="/explore" className="hover:text-[#2C2421]">Explore</Link>
          <Link to="/login" className="hover:text-[#2C2421]">Sign In</Link>
          <Link to="/register" className="hover:text-[#2C2421]">Register</Link>
        </div>
      </footer>
    </div>
  );
};
