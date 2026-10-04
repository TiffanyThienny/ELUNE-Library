import React from 'react';
import { Book } from '../types';
import { BookCard } from './BookCard';
import { EmptyState } from './EmptyState';

interface BookGridProps {
  books: Book[];
  showStatus?: boolean;
  emptyTitle?: string;
  emptySubtitle?: string;
  progressMap?: Record<string, number>;
}

export const BookGrid: React.FC<BookGridProps> = ({
  books,
  showStatus = false,
  emptyTitle = 'No books found',
  emptySubtitle = 'Try adjusting your search or filters to discover other titles.',
  progressMap = {},
}) => {
  if (books.length === 0) {
    return <EmptyState title={emptyTitle} subtitle={emptySubtitle} />;
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
      {books.map((book) => (
        <BookCard
          key={book.id}
          book={book}
          showStatus={showStatus}
          progressPercentage={progressMap[book.id]}
        />
      ))}
    </div>
  );
};
