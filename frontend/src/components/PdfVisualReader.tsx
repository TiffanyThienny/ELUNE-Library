import React, { useState, useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
// @ts-ignore
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.js?url';
import { getLocalPdfFile, saveLocalPdfFile, removeLocalPdfFile } from '../utils/localBookStorage';
import { API_BASE_URL } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { classifyAccessProbe, decideCachedPdfUse, AccessProbeResult } from '../utils/pdfCachePolicy';

type PdfErrorKind = 'denied' | 'missing' | 'network' | 'invalid';

const PDF_ERROR_MESSAGES: Record<PdfErrorKind, string> = {
  denied: 'You do not have permission to open this book.',
  missing: 'The stored PDF for this book could not be found on the server.',
  network: 'The PDF could not be downloaded. Check your connection and try again.',
  invalid: 'This file could not be rendered as a PDF.',
};

/** Map pdf.js / fetch failures to a user-facing category. */
function classifyPdfLoadError(err: any): PdfErrorKind {
  const status: number | undefined = err?.status;
  if (status === 401 || status === 403) return 'denied';
  if (status === 404 || err?.name === 'MissingPDFException') return 'missing';
  if (err?.name === 'InvalidPDFException' || err?.name === 'PasswordException') return 'invalid';
  return 'network';
}

/** Ask the server whether this user may still read the book (small JSON endpoint). */
async function probeBookAccess(bookId: string, token: string | null): Promise<AccessProbeResult> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/books/${encodeURIComponent(bookId)}/processing-status`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    return classifyAccessProbe(res.status);
  } catch {
    return classifyAccessProbe(null);
  }
}
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  FileText,
  Loader2,
  AlertTriangle,
  Upload,
} from 'lucide-react';

if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;
}

interface PdfVisualReaderProps {
  bookId: string;
  fileUrl?: string | null;
  totalPages?: number;
  initialPage?: number;
  /** Called whenever the viewer's page changes, with the PDF's real page count. */
  onPageChange?: (page: number, totalPages: number) => void;
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
  const [isMissingBinary, setIsMissingBinary] = useState<boolean>(false);
  const [errorKind, setErrorKind] = useState<PdfErrorKind | null>(null);
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pdfDocRef = useRef<any>(null);
  const renderTaskRef = useRef<any>(null);
  const loadSeqRef = useRef<number>(0);

  const initPdf = async (customFile?: File) => {
    const loadSeq = ++loadSeqRef.current;
    if (pdfDocRef.current) {
      pdfDocRef.current.destroy().catch(() => {});
      pdfDocRef.current = null;
    }
    setLoading(true);
    setError(null);
    setErrorKind(null);
    setIsMissingBinary(false);

    try {
      let pdfSource: any = null;
      const token = typeof window !== 'undefined' ? window.localStorage.getItem('elune_token') : null;

      if (customFile) {
        // Explicit local file chosen by the user on this device. Cached only for a
        // logged-in user, scoped to (user, book); guests read it in memory only.
        if (!customFile.name.toLowerCase().endsWith('.pdf')) {
          setErrorKind('invalid');
          setError('Please choose a PDF file.');
          setLoading(false);
          return;
        }
        await saveLocalPdfFile(bookId, customFile, userId);
        const buffer = await customFile.arrayBuffer();
        pdfSource = { data: new Uint8Array(buffer) };
      } else {
        // 1. Cached copy for exactly this (user, book). No "latest PDF" fallback.
        const localBlob = await getLocalPdfFile(bookId, userId);
        if (localBlob) {
          // The server must still allow access; an explicit 401/403/404 purges the copy.
          const probe = await probeBookAccess(bookId, token);
          if (decideCachedPdfUse(probe) === 'purge') {
            await removeLocalPdfFile(bookId, userId);
            setErrorKind('denied');
            setError('You no longer have access to this book.');
            setLoading(false);
            return;
          }
          const buffer = localBlob instanceof Blob ? await localBlob.arrayBuffer() : localBlob;
          pdfSource = { data: new Uint8Array(buffer) };
        }

        // 2. The stored file, through the permission-checked stream endpoint only.
        if (!pdfSource && fileUrl) {
          pdfSource = {
            url: `${API_BASE_URL}/api/books/${encodeURIComponent(bookId)}/file`,
            httpHeaders: token ? { Authorization: `Bearer ${token}` } : undefined,
            withCredentials: false,
          };
        }
      }

      if (!pdfSource || (!pdfSource.url && !pdfSource.data)) {
        setIsMissingBinary(true);
        setLoading(false);
        return;
      }

      const loadingTask = pdfjsLib.getDocument({
        ...pdfSource,
        useSystemFonts: true,
        isEvalSupported: false,
      });

      const doc = await loadingTask.promise;
      if (loadSeq !== loadSeqRef.current) {
        // The user switched books while this one was loading: never show it.
        doc.destroy().catch(() => {});
        return;
      }
      pdfDocRef.current = doc;
      setTotalPages(doc.numPages);
      // Clamp the current page to this document's real range. The saved reading
      // position (initialPage) may exceed a re-extracted / different page count,
      // which would make getPage throw "Invalid page request".
      setCurrentPage((p) => Math.min(Math.max(1, p), doc.numPages));
      setLoading(false);
    } catch (err: any) {
      if (loadSeq !== loadSeqRef.current) return;
      console.error('Failed to load visual PDF document:', err);
      const kind = classifyPdfLoadError(err);
      setErrorKind(kind);
      setError(PDF_ERROR_MESSAGES[kind]);
      setLoading(false);
    }
  };

  // Load PDF Document
  useEffect(() => {
    let isMounted = true;
    initPdf();

    return () => {
      isMounted = false;
      if (pdfDocRef.current) {
        pdfDocRef.current.destroy().catch(() => {});
        pdfDocRef.current = null;
      }
      loadSeqRef.current++; // invalidate any in-flight load for the previous book
    };
  }, [bookId, fileUrl, userId]);

  // Report every real page change immediately (independent of whether the page
  // render finishes or is cancelled by a quicker navigation).
  const onPageChangeRef = useRef(onPageChange);
  onPageChangeRef.current = onPageChange;
  useEffect(() => {
    if (loading || !pdfDocRef.current) return;
    onPageChangeRef.current?.(currentPage, pdfDocRef.current.numPages);
  }, [currentPage, loading]);

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

        const doc = pdfDocRef.current;
        const pageNum = Math.min(Math.max(1, currentPage), doc.numPages || 1);
        const page = await doc.getPage(pageNum);
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

  if (errorKind === 'denied' || errorKind === 'network') {
    return (
      <div
        role="alert"
        className="py-12 px-6 text-center space-y-4 bg-[#FAF7F2] rounded-3xl p-8 border border-[#E8DFD3] max-w-xl mx-auto my-6 shadow-xs"
      >
        <div className="w-14 h-14 rounded-2xl bg-amber-100/80 text-amber-900 flex items-center justify-center mx-auto border border-amber-200 shadow-2xs">
          <AlertTriangle className="w-7 h-7 text-[#8C7355]" aria-hidden="true" />
        </div>
        <h3 className="font-serif-literata text-xl font-bold text-[#2C2421]">
          {errorKind === 'denied' ? 'Access denied' : 'Could not load the PDF'}
        </h3>
        <p className="text-xs sm:text-sm text-[#665A4F] max-w-md mx-auto leading-relaxed">{error}</p>
        {errorKind === 'network' && (
          <button
            type="button"
            onClick={() => initPdf()}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#2C2421] hover:bg-[#433832] text-white text-xs font-semibold"
          >
            Try again
          </button>
        )}
      </div>
    );
  }

  if (isMissingBinary || error) {
    return (
      <div className="py-12 px-6 text-center space-y-5 bg-[#FAF7F2] rounded-3xl p-8 border border-[#E8DFD3] max-w-xl mx-auto my-6 shadow-xs">
        <div className="w-14 h-14 rounded-2xl bg-amber-100/80 text-amber-900 flex items-center justify-center mx-auto border border-amber-200 shadow-2xs">
          <FileText className="w-7 h-7 text-[#8C7355]" />
        </div>
        <div className="space-y-2">
          <h3 className="font-serif-literata text-xl font-bold text-[#2C2421]">
            Halaman PDF Siap Ditampilkan
          </h3>
          <p className="text-xs sm:text-sm text-[#665A4F] max-w-md mx-auto leading-relaxed">
            Untuk membaca dan melihat visualisasi halaman buku ini secara utuh, silakan muat file PDF dokumen dari perangkat Anda satu kali. File akan langsung disimpan di browser untuk dibaca seterusnya.
          </p>
          {error && (
            <p role="alert" className="text-xs text-red-700">
              {error}
            </p>
          )}
        </div>

        <div>
          <label className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#2C2421] hover:bg-[#433832] text-white text-xs font-semibold cursor-pointer transition-all shadow-xs hover:scale-[1.02]">
            <Upload className="w-4 h-4" />
            <span>Pilih File PDF untuk Membaca</span>
            <input
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  initPdf(file);
                }
              }}
            />
          </label>
        </div>
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
          className="rounded-xl shadow-lg border border-black/10 bg-white transition-transform"
          style={{ maxWidth: scale > 1.2 ? 'none' : '100%' }}
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
