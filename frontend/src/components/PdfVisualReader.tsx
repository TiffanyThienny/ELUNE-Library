import React, { useState, useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
// @ts-ignore
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.js?url';
import { getLocalPdfFile } from '../utils/localBookStorage';
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  FileText,
  Loader2,
  AlertTriangle,
} from 'lucide-react';

if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;
}

interface PdfVisualReaderProps {
  bookId: string;
  fileUrl?: string | null;
  totalPages?: number;
  initialPage?: number;
  onPageChange?: (page: number) => void;
}

export const PdfVisualReader: React.FC<PdfVisualReaderProps> = ({
  bookId,
  fileUrl,
  totalPages: propTotalPages,
  initialPage = 1,
  onPageChange,
}) => {
  const [currentPage, setCurrentPage] = useState<number>(initialPage);
  const [totalPages, setTotalPages] = useState<number>(propTotalPages || 1);
  const [scale, setScale] = useState<number>(1.2);
  const [loading, setLoading] = useState<boolean>(true);
  const [rendering, setRendering] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pdfDocRef = useRef<any>(null);
  const renderTaskRef = useRef<any>(null);

  // Load PDF Document
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    async function initPdf() {
      try {
        let pdfSource: any = null;

        // 1. Try local IndexedDB file blob first
        const localBlob = await getLocalPdfFile(bookId);
        if (localBlob) {
          if (localBlob instanceof Blob) {
            const buffer = await localBlob.arrayBuffer();
            pdfSource = { data: new Uint8Array(buffer) };
          } else if (localBlob instanceof ArrayBuffer) {
            pdfSource = { data: new Uint8Array(localBlob) };
          }
        }

        // 2. Fallback to fileUrl
        if (!pdfSource && fileUrl) {
          pdfSource = { url: fileUrl };
        }

        if (!pdfSource) {
          throw new Error('PDF file binary is not accessible for direct visual rendering.');
        }

        const loadingTask = pdfjsLib.getDocument({
          ...pdfSource,
          useSystemFonts: true,
          isEvalSupported: false,
        });

        const doc = await loadingTask.promise;
        if (!isMounted) return;

        pdfDocRef.current = doc;
        setTotalPages(doc.numPages);
        setLoading(false);
      } catch (err: any) {
        if (!isMounted) return;
        console.error('Failed to load visual PDF document:', err);
        setError(err.message || 'Unable to load PDF document for visual rendering.');
        setLoading(false);
      }
    }

    initPdf();

    return () => {
      isMounted = false;
      if (pdfDocRef.current) {
        pdfDocRef.current.destroy().catch(() => {});
      }
    };
  }, [bookId, fileUrl]);

  // Render Page on Canvas
  useEffect(() => {
    if (!pdfDocRef.current || loading) return;

    let isCancelled = false;
    setRendering(true);

    async function renderPage() {
      try {
        if (renderTaskRef.current) {
          renderTaskRef.current.cancel();
        }

        const page = await pdfDocRef.current.getPage(currentPage);
        if (isCancelled) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const viewport = page.getViewport({ scale });
        const context = canvas.getContext('2d');
        if (!context) return;

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
          canvasContext: context,
          viewport,
        };

        const renderTask = page.render(renderContext);
        renderTaskRef.current = renderTask;

        await renderTask.promise;
        if (!isCancelled) {
          setRendering(false);
          if (onPageChange) {
            onPageChange(currentPage);
          }
        }
      } catch (err: any) {
        if (err.name !== 'RenderingCancelledException') {
          console.error('Error rendering page:', err);
        }
        if (!isCancelled) {
          setRendering(false);
        }
      }
    }

    renderPage();

    return () => {
      isCancelled = true;
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
      }
    };
  }, [currentPage, scale, loading]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        goToNext();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        goToPrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, totalPages]);

  const goToNext = () => {
    if (currentPage < totalPages) {
      setCurrentPage((p) => p + 1);
    }
  };

  const goToPrev = () => {
    if (currentPage > 1) {
      setCurrentPage((p) => p - 1);
    }
  };

  const handlePageInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val) && val >= 1 && val <= totalPages) {
      setCurrentPage(val);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center space-y-4 bg-white rounded-3xl p-8 border border-[#E8DFD3] max-w-2xl mx-auto shadow-xs">
        <div className="w-14 h-14 rounded-2xl bg-[#F7EFE2] text-[#8C7355] flex items-center justify-center mx-auto border border-[#E8DFD3]">
          <Loader2 className="w-7 h-7 animate-spin text-[#8C7355]" />
        </div>
        <h3 className="font-serif-literata text-xl font-bold text-[#2C2421]">
          Preparing Visual Page Viewer…
        </h3>
        <p className="text-xs text-[#665A4F] max-w-sm mx-auto">
          Rendering high-fidelity pages directly from your document archive.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-16 text-center space-y-4 bg-[#FAF7F2] rounded-3xl p-8 border border-[#E8DFD3] max-w-xl mx-auto my-6">
        <div className="w-14 h-14 rounded-2xl bg-amber-100/70 text-amber-800 flex items-center justify-center mx-auto border border-amber-200 shadow-2xs">
          <AlertTriangle className="w-7 h-7 text-[#8C7355]" />
        </div>
        <h3 className="font-serif-literata text-xl font-bold text-[#2C2421]">
          Visual Document Viewer Notice
        </h3>
        <p className="text-xs sm:text-sm text-[#665A4F] max-w-md mx-auto leading-relaxed">
          {error}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Notice Banner */}
      <div className="bg-[#FAF7F2] border border-[#E8DFD3] rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-white border border-[#E8DFD3] flex items-center justify-center text-[#8C7355] shrink-0">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-[#2C2421]">Physical Document Scan (Visual Mode)</span>
            <p className="text-[#8C7355] text-[11px]">
              This book is preserved in original visual pages. Turn pages or zoom in below to read.
            </p>
          </div>
        </div>

        {/* Zoom & View Controls */}
        <div className="flex items-center gap-1.5 self-end sm:self-auto bg-white border border-[#E8DFD3] rounded-xl p-1 shadow-2xs">
          <button
            onClick={() => setScale((s) => Math.max(0.7, s - 0.15))}
            className="p-1.5 rounded-lg text-[#665A4F] hover:text-[#2C2421] hover:bg-[#FAF7F2] transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-[11px] font-mono font-bold text-[#8C7355] px-1.5">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={() => setScale((s) => Math.min(2.5, s + 0.15))}
            className="p-1.5 rounded-lg text-[#665A4F] hover:text-[#2C2421] hover:bg-[#FAF7F2] transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <div className="h-4 w-px bg-[#E8DFD3] mx-0.5" />
          <button
            onClick={() => setScale(1.2)}
            className="p-1.5 rounded-lg text-[#665A4F] hover:text-[#2C2421] hover:bg-[#FAF7F2] transition-colors"
            title="Reset Zoom"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Canvas Viewer */}
      <div className="relative bg-[#FAF7F2] border border-[#E8DFD3] rounded-3xl p-4 sm:p-8 flex flex-col items-center justify-center min-h-[600px] overflow-auto shadow-inner">
        {rendering && (
          <div className="absolute inset-0 bg-[#FAF7F2]/60 backdrop-blur-2xs flex items-center justify-center z-10 rounded-3xl">
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-[#E8DFD3] shadow-xs text-xs font-semibold text-[#8C7355]">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Rendering page {currentPage}...</span>
            </div>
          </div>
        )}

        <canvas
          ref={canvasRef}
          className="rounded-xl shadow-lg border border-black/10 bg-white max-w-full transition-transform"
        />
      </div>

      {/* Floating Bottom Page Bar */}
      <div className="sticky bottom-6 flex items-center justify-center z-20">
        <div className="bg-white/95 backdrop-blur-md border border-[#E8DFD3] rounded-2xl px-4 py-2 shadow-lg flex items-center gap-4 text-xs">
          <button
            disabled={currentPage <= 1}
            onClick={goToPrev}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-[#E8DFD3] bg-[#FAF7F2] text-[#2C2421] font-semibold disabled:opacity-30 hover:bg-[#E8DFD3] transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Prev Page</span>
          </button>

          <div className="flex items-center gap-1.5 text-xs text-[#2C2421]">
            <span>Page</span>
            <input
              type="number"
              min={1}
              max={totalPages}
              value={currentPage}
              onChange={handlePageInput}
              className="w-14 px-2 py-1 rounded-lg border border-[#E8DFD3] bg-[#FAF7F2] text-center font-mono font-bold text-[#8C7355] focus:outline-hidden focus:border-[#8C7355]"
            />
            <span className="text-[#8C7355] font-mono">/ {totalPages}</span>
          </div>

          <button
            disabled={currentPage >= totalPages}
            onClick={goToNext}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-[#E8DFD3] bg-[#FAF7F2] text-[#2C2421] font-semibold disabled:opacity-30 hover:bg-[#E8DFD3] transition-colors"
          >
            <span className="hidden sm:inline">Next Page</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
