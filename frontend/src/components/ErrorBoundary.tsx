import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw, Home, BookOpen } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in component tree:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/home';
  };

  private handleGoLibrary = () => {
    window.location.href = '/library';
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white border border-[#E8DFD3] rounded-3xl p-8 shadow-xs text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-[#8C7355] flex items-center justify-center mx-auto shadow-2xs">
              <AlertTriangle className="w-8 h-8 text-[#8C7355]" />
            </div>

            <div className="space-y-2">
              <h2 className="font-serif-literata text-2xl font-bold text-[#2C2421]">
                Reading Sanctuary Interrupted
              </h2>
              <p className="text-xs text-[#665A4F] leading-relaxed">
                An unexpected hiccup occurred while rendering this page. You can reload or return to your library sanctuary.
              </p>
              {this.state.error && (
                <div className="mt-3 p-3 bg-[#FAF7F2] border border-[#E8DFD3] rounded-xl text-left overflow-auto max-h-28 text-[11px] font-mono text-stone-600">
                  {this.state.error.message || String(this.state.error)}
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
              <button
                onClick={this.handleReload}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#2C2421] text-white text-xs font-semibold hover:bg-[#433832] transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Muat Ulang
              </button>
              <button
                onClick={this.handleGoLibrary}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-[#E8DFD3] bg-[#FAF7F2] text-[#2C2421] text-xs font-semibold hover:bg-[#EBDDC8] transition-colors cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5" />
                Ke Library
              </button>
              <button
                onClick={this.handleGoHome}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-[#E8DFD3] bg-[#FAF7F2] text-[#2C2421] text-xs font-semibold hover:bg-[#EBDDC8] transition-colors cursor-pointer"
              >
                <Home className="w-3.5 h-3.5" />
                Beranda
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
