import React from 'react';
import { Link } from 'react-router-dom';
import { Book } from '../types';
import { BookOpen, Lock, Globe, Clock, CheckCircle2, AlertCircle } from 'lucide-react';

interface BookCardProps {
  book: Book;
  showStatus?: boolean;
  progressPercentage?: number;
}

export const BookCard: React.FC<BookCardProps> = ({
  book,
  showStatus = false,
  progressPercentage,
}) => {
  // Format fallback cover
  const fallbackCover = (
    <div className="w-full h-full bg-gradient-to-br from-[#EBDDC8] to-[#D9C8B4] flex flex-col justify-end p-4 text-[#2C2421]">
      <div className="text-[10px] uppercase font-bold tracking-widest text-[#8C7355] mb-1">
        {book.category?.name || 'Literary'}
      </div>
      <h4 className="font-serif-literata font-bold text-base line-clamp-2 leading-snug">
        {book.title}
      </h4>
      <p className="text-xs text-[#665A4F] mt-1 font-medium line-clamp-1">{book.author}</p>
    </div>
  );

  return (
    <div className="group flex flex-col bg-white rounded-2xl border border-[#E8DFD3] overflow-hidden shadow-xs hover:shadow-md transition-all duration-300 hover:-translate-y-1">
      {/* Cover image container */}
      <Link to={`/book/${book.id}`} className="relative aspect-[3/4] w-full overflow-hidden bg-[#FAF7F2]">
        {book.coverUrl ? (
          <img
            src={book.coverUrl}
            alt={book.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          fallbackCover
        )}

        {/* Visibility / Status Badges */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5">
          {book.visibility === 'PRIVATE' ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wide bg-stone-900/80 text-white backdrop-blur-xs shadow-xs">
              <Lock className="w-2.5 h-2.5" />
              Private
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wide bg-amber-900/80 text-white backdrop-blur-xs shadow-xs">
              <Globe className="w-2.5 h-2.5" />
              Public
            </span>
          )}

          {showStatus && (
            <>
              {book.status === 'PENDING' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wide bg-amber-500 text-white shadow-xs">
                  <Clock className="w-2.5 h-2.5" />
                  Pending Review
                </span>
              )}
              {book.status === 'APPROVED' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wide bg-emerald-600 text-white shadow-xs">
                  <CheckCircle2 className="w-2.5 h-2.5" />
                  Approved
                </span>
              )}
              {book.status === 'REJECTED' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wide bg-red-600 text-white shadow-xs">
                  <AlertCircle className="w-2.5 h-2.5" />
                  Rejected
                </span>
              )}
            </>
          )}
        </div>

        {/* Progress bar overlay at bottom of cover if in-progress */}
        {progressPercentage !== undefined && progressPercentage > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/20">
            <div
              className="h-full bg-[#8C7355]"
              style={{ width: `${Math.min(100, progressPercentage)}%` }}
            />
          </div>
        )}
      </Link>

      {/* Book details */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between text-xs text-[#8C7355] font-medium mb-1">
            <span>{book.category?.name || 'General'}</span>
            <span>{book.totalPages} pages</span>
          </div>

          <Link to={`/book/${book.id}`}>
            <h3 className="font-serif-literata font-bold text-base text-[#2C2421] line-clamp-1 hover:text-[#8C7355] transition-colors">
              {book.title}
            </h3>
          </Link>

          <p className="text-xs text-[#665A4F] mt-0.5 line-clamp-1">by {book.author}</p>

          {book.description && (
            <p className="text-xs text-[#8A7C70] mt-2 line-clamp-2 leading-relaxed">
              {book.description}
            </p>
          )}

          {book.status === 'REJECTED' && book.rejectionReason && (
            <div className="mt-2.5 p-2 bg-red-50 border border-red-200 rounded-lg text-[11px] text-red-700">
              <span className="font-bold">Reason:</span> {book.rejectionReason}
            </div>
          )}
        </div>

        {/* Action Link */}
        <div className="mt-4 pt-3 border-t border-[#F2ECE1] flex items-center justify-between">
          {progressPercentage !== undefined && progressPercentage > 0 ? (
            <span className="text-[11px] font-medium text-[#8C7355]">
              {progressPercentage}% completed
            </span>
          ) : (
            <span className="text-[11px] text-[#A69888] font-normal">Unread</span>
          )}

          <Link
            to={`/read/${book.id}`}
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#2C2421] hover:text-[#8C7355] transition-colors"
          >
            <BookOpen className="w-3.5 h-3.5" />
            Read
          </Link>
        </div>
      </div>
    </div>
  );
};
