import React, { useState, useEffect } from 'react';
import { useReader } from '../context/ReaderContext';
import { aiService } from '../services/api';
import { FileText, BookOpen, Layers, RefreshCw } from 'lucide-react';
import { LoadingState } from './LoadingState';

export const SummaryPanel: React.FC = () => {
  const { book, currentChapter } = useReader();
  const [summary, setSummary] = useState<string | null>(null);
  const [summaryType, setSummaryType] = useState<'CHAPTER' | 'BOOK'>('CHAPTER');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (currentChapter && !summary) {
      generateChapterSummary();
    }
  }, [currentChapter?.id]);

  const generateChapterSummary = async () => {
    if (!currentChapter) return;
    setLoading(true);
    setError(null);
    setSummaryType('CHAPTER');
    try {
      const res = await aiService.summarizeChapter(currentChapter.id);
      if (res.success && res.data?.summary) {
        setSummary(res.data.summary.content);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to generate chapter summary');
    } finally {
      setLoading(false);
    }
  };

  const generateBookSummary = async () => {
    if (!book) return;
    setLoading(true);
    setError(null);
    setSummaryType('BOOK');
    try {
      const res = await aiService.summarizeBook(book.id);
      if (res.success && res.data?.summary) {
        setSummary(res.data.summary.content);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to generate book summary');
    } finally {
      setLoading(false);
    }
  };

  const isScannedOrEmpty = Boolean(
    book?.isScanned ||
    book?.processingStatus === 'FAILED' ||
    !currentChapter?.contentBlocks ||
    currentChapter.contentBlocks.length === 0
  );

  if (isScannedOrEmpty) {
    return (
      <div className="p-6 bg-[#FAF7F2] border border-[#E8DFD3] rounded-2xl text-center space-y-2">
        <FileText className="w-6 h-6 text-[#8C7355] mx-auto opacity-70" />
        <p className="text-xs font-bold text-[#2C2421]">AI Summary Unavailable</p>
        <p className="text-[11px] text-[#665A4F] leading-relaxed">
          This book does not contain readable digital text, so AI summarization is unavailable.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={generateChapterSummary}
          disabled={loading || !currentChapter}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all shadow-2xs ${
            summaryType === 'CHAPTER' && summary
              ? 'bg-[#2C2421] text-white'
              : 'bg-[#FAF7F2] border border-[#E8DFD3] text-[#2C2421] hover:bg-[#EBDDC8]'
          }`}
        >
          <Layers className="w-3.5 h-3.5 text-[#8C7355]" />
          Chapter Summary
        </button>

        <button
          onClick={generateBookSummary}
          disabled={loading || !book}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all shadow-2xs ${
            summaryType === 'BOOK' && summary
              ? 'bg-[#2C2421] text-white'
              : 'bg-[#FAF7F2] border border-[#E8DFD3] text-[#2C2421] hover:bg-[#EBDDC8]'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5 text-[#8C7355]" />
          Full Book Summary
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="p-6 bg-white border border-[#E8DFD3] rounded-2xl">
          <LoadingState message="Distilling chapter synthesis..." />
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
          {error}
        </div>
      )}

      {/* Summary Content */}
      {summary && !loading && (
        <div className="p-4 bg-white border border-[#E8DFD3] rounded-2xl shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#F2ECE1]">
            <span className="text-xs font-bold text-[#8C7355] uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              {summaryType === 'CHAPTER' ? 'Chapter Synthesis' : 'Comprehensive Synopsis'}
            </span>
            <button
              onClick={summaryType === 'CHAPTER' ? generateChapterSummary : generateBookSummary}
              className="text-stone-400 hover:text-[#2C2421] transition-colors"
              title="Regenerate"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="text-xs text-[#2C2421] leading-relaxed whitespace-pre-line font-serif-literata">
            {summary}
          </div>
        </div>
      )}

      {!summary && !loading && (
        <div className="p-6 text-center bg-white border border-[#E8DFD3] rounded-2xl">
          <FileText className="w-6 h-6 text-[#8C7355] mx-auto mb-2 opacity-70" />
          <h4 className="text-xs font-bold text-[#2C2421] mb-1">Text Synthesis</h4>
          <p className="text-[11px] text-[#665A4F] leading-normal">
            Choose whether to synthesize the active chapter or the overarching themes of the entire book.
          </p>
        </div>
      )}
    </div>
  );
};
