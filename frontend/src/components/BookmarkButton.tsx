import React, { useState } from 'react';
import { Bookmark as BookmarkIcon } from 'lucide-react';
import { useReader } from '../context/ReaderContext';

interface BookmarkButtonProps {
  contentBlockId: string;
  pageNumber: number;
}

export const BookmarkButton: React.FC<BookmarkButtonProps> = ({
  contentBlockId,
  pageNumber,
}) => {
  const { isBookmarked, toggleBookmark } = useReader();
  const [submitting, setSubmitting] = useState(false);
  const bookmarked = isBookmarked(contentBlockId);

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (submitting) return;
    setSubmitting(true);
    try {
      await toggleBookmark(contentBlockId, pageNumber);
    } catch (err) {
      console.error('Failed to toggle bookmark', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={submitting}
      title={bookmarked ? 'Remove bookmark' : 'Bookmark this paragraph'}
      className={`p-1.5 rounded-lg transition-all duration-200 ${
        bookmarked
          ? 'bg-[#8C7355] text-white shadow-xs'
          : 'text-[#8C7355] hover:bg-[#EBDDC8] hover:text-[#2C2421]'
      }`}
    >
      <BookmarkIcon
        className={`w-3.5 h-3.5 ${bookmarked ? 'fill-white stroke-white' : ''}`}
      />
    </button>
  );
};
