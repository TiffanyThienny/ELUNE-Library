import React, { useState, useRef, useEffect } from 'react';
import { useReader } from '../context/ReaderContext';
import { aiService } from '../services/api';
import { summaryTextFromResponse } from '../utils/aiResponse';
import { FileText, RefreshCw, Sparkles, AlertTriangle } from 'lucide-react';
import { LoadingState } from './LoadingState';

/**
 * One full-book summary. The text is published to ReaderContext so the audio
 * player reads exactly what is shown here.
 */
export const SummaryPanel: React.FC = () => {
  const { book, summaryText, setSummaryText } = useReader();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ message: string; code?: string } | null>(null);
  const [meta, setMeta] = useState<{ source?: string; model?: string; fallbackReason?: string; cached?: boolean } | null>(null);
  const currentBookIdRef = useRef<string | null>(null);
  currentBookIdRef.current = book?.id ?? null;

  // A different book: forget the previous book's summary state.
  useEffect(() => {
    setError(null);
    setMeta(null);
  }, [book?.id]);

  const generate = async (refresh = false) => {
    if (!book || loading) return;
    const requestedBookId = book.id;
    setLoading(true);
    setError(null);
    try {
      const res = await aiService.summarizeBook(requestedBookId, refresh);
      // Ignore a late response if the user already switched books.
      if (requestedBookId !== currentBookIdRef.current) return;
      const text = res.success ? summaryTextFromResponse(res.data) : null;
      if (!text) {
        setError({ message: 'The server returned an empty summary.' });
        return;
      }
      setSummaryText(text);
      setMeta({ source: res.data?.source, model: res.data?.model, fallbackReason: res.data?.fallbackReason, cached: res.data?.cached });
    } catch (err: any) {
      setSummaryText(null);
      setMeta(null);
      setError({ message: err?.message || 'The summary could not be generated.', code: err?.code });
    } finally {
      setLoading(false);
    }
  };

  const isFallback = meta?.source === 'extractive-fallback';

  return (
    <div className="space-y-4">
      <button
        onClick={() => generate(false)}
        disabled={loading || !book}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all shadow-2xs bg-[#2C2421] text-white hover:bg-[#433832] disabled:opacity-50"
      >
        <Sparkles className="w-3.5 h-3.5" />
        {summaryText ? 'Show Book Summary' : 'Generate Book Summary'}
      </button>

      {loading && (
        <div className="p-6 bg-white border border-[#E8DFD3] rounded-2xl">
          <LoadingState message="Reading the whole book and writing a summary..." />
        </div>
      )}

      {error && !loading && (
        <div role="alert" className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
          <p className="font-bold flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            {error.code === 'NEEDS_OCR' ? 'This PDF needs OCR' : 'Summary unavailable'}
          </p>
          <p>{error.message}</p>
        </div>
      )}

      {summaryText && !loading && (
        <div className="p-4 bg-white border border-[#E8DFD3] rounded-2xl shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#F2ECE1]">
            <span className="text-xs font-bold text-[#8C7355] uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              Book Summary
            </span>
            <button
              onClick={() => generate(true)}
              className="text-stone-400 hover:text-[#2C2421] transition-colors"
              title="Regenerate summary"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {meta && (
            <p
              data-summary-source={meta.source}
              className={`text-[10px] font-semibold px-2 py-1 rounded-lg ${isFallback ? 'bg-amber-50 text-amber-900' : 'bg-emerald-50 text-emerald-800'}`}
            >
              {isFallback
                ? `Extractive summary — sentences taken directly from the book, not AI-written. ${meta.fallbackReason || ''}`
                : `AI-generated summary${meta.model ? ` (${meta.model})` : ''}.`}
              {meta.cached ? ' (saved)' : ''}
            </p>
          )}

          <div className="text-xs text-[#2C2421] leading-relaxed whitespace-pre-line font-serif-literata">
            {summaryText}
          </div>
        </div>
      )}

      {!summaryText && !loading && !error && (
        <div className="p-6 text-center bg-white border border-[#E8DFD3] rounded-2xl">
          <FileText className="w-6 h-6 text-[#8C7355] mx-auto mb-2 opacity-70" />
          <p className="text-[11px] text-[#665A4F] leading-normal">
            Generate one summary of the whole book. You can then listen to it with the audio player.
          </p>
        </div>
      )}
    </div>
  );
};
