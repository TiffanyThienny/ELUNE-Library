import React, { useState } from 'react';
import { Upload, CheckCircle2, Loader2, BookOpen, Sparkles, FileText, FileType } from 'lucide-react';
import { useLibrary } from '../context/LibraryContext';
import type { Book } from '../types';

export const UploadBookPage: React.FC = () => {
  const { addUploadedBook, navigateTo, appTheme } = useLibrary();
  const isDark = appTheme === 'dark';

  const [step, setStep] = useState<'choose' | 'processing' | 'ready'>('choose');
  const [createdBook, setCreatedBook] = useState<Book | null>(null);

  const handleSimulatedUpload = (fileTitle: string) => {
    setStep('processing');

    setTimeout(() => {
      const cleanTitle = fileTitle.replace(/\.(pdf|epub)$/i, '').replace(/_/g, ' ');
      const mockBook: Book = {
        id: `upload-${Date.now()}`,
        title: cleanTitle,
        author: 'Uploaded Document',
        category: 'Self Development',
        coverBg: 'linear-gradient(135deg, #8C7355 0%, #4A3E3D 100%)',
        coverTextColor: '#FAF0E6',
        readingTime: '3 hrs 15 mins',
        totalPages: 185,
        publicationYear: '2026',
        isUploaded: true,
        uploadedAt: 'Just now',
        isAudioAvailable: true,
        description: `Your uploaded book "${cleanTitle}" is now processed and ready for distraction-free reading and AI summaries.`,
        progress: { chapterIndex: 0, pageNumber: 1, percent: 0, lastRead: 'Just now' },
        chapters: [
          {
            id: 'u-ch1',
            number: 1,
            title: 'Introduction and Key Themes',
            readingTime: '15 mins',
            summary: 'An overview of the core principles presented in this uploaded edition.',
            keyPoints: ['First foundational principle', 'Practical application in daily routine'],
            content: `Welcome to your personal digital copy of ${cleanTitle}. Elunè has prepared this text with high-legibility serif typography for maximum reading comfort.\n\nEnjoy an uninterrupted reading session or explore the AI summary features.`
          }
        ],
        summary: {
          quickOverview: `A synthesized overview of your uploaded file "${cleanTitle}".`,
          mainIdeas: ['Core idea 1 from your document', 'Practical key takeaway for daily reflection'],
          keyTakeaways: ['Key takeaway synthesized by Elunè AI'],
          importantConcepts: [{ title: 'Main Subject', explanation: 'Primary focus of the document.' }]
        },
        presetQAs: [
          { question: 'What is the main topic of this uploaded book?', answer: 'This book covers personal development and cognitive focus.' }
        ]
      };

      setCreatedBook(mockBook);
      addUploadedBook(mockBook);
      setStep('ready');
      setTimeout(() => {
        navigateTo('library');
      }, 900);
    }, 2000);
  };

  /* ── shared surface token ── */
  const surface = isDark ? 'bg-[#231F1C] border-[#3D3530]' : 'bg-[#FAF0E6] border-[#E8DACD]';
  const surfaceHover = isDark ? 'hover:bg-[#2B2622]' : 'hover:bg-[#FAEBD7]';
  const textPrimary = isDark ? 'text-[#EDE0D4]' : 'text-[#2C2421]';
  const textMuted = isDark ? 'text-[#8A7A6F]' : 'text-[#8C7B73]';
  const textSecondary = isDark ? 'text-[#C4AD99]' : 'text-[#5E504A]';

  /* ── Progress step indicator ── */
  const stepDot = (active: boolean, done: boolean) =>
    `w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
      done
        ? 'bg-[#8C7355] text-white'
        : active
          ? isDark ? 'bg-[#CDB891] text-[#1A1714]' : 'bg-[#8C7355] text-white ring-4 ring-[#8C7355]/20'
          : isDark ? 'bg-[#3A3028] text-[#6A5C54]' : 'bg-[#F7E7CE] text-[#CDB891]'
    }`;

  const stepLine = (active: boolean) =>
    `flex-1 h-0.5 mx-1 rounded-full ${active ? 'bg-[#8C7355]' : isDark ? 'bg-[#3A3028]' : 'bg-[#E8DACD]'}`;

  const currentStepIdx = step === 'choose' ? 0 : step === 'processing' ? 1 : 2;

  return (
    <div className={`max-w-2xl mx-auto px-4 sm:px-8 py-10 space-y-8 animate-fade-in`}>
      {/* Page Header */}
      <div className="space-y-2 text-center sm:text-left">
        <span className="editorial-tag text-[#8C7355]">Personal Library</span>
        <h1 className={`font-serif text-3xl sm:text-4xl font-semibold ${textPrimary}`}>
          Add a Book
        </h1>
        <p className={`text-sm ${textSecondary}`}>
          Upload PDF or EPUB files to enjoy in your quiet reading sanctuary with AI summaries.
        </p>
      </div>

      {/* Step Progress Indicator */}
      <div className={`flex items-center justify-center p-4 rounded-2xl border ${surface}`}>
        <div className="flex items-center w-full max-w-xs">
          <div className="flex flex-col items-center gap-1">
            <span className={stepDot(currentStepIdx === 0, currentStepIdx > 0)}>
              {currentStepIdx > 0 ? '✓' : '1'}
            </span>
            <span className={`text-[10px] font-semibold ${currentStepIdx === 0 ? 'text-[#8C7355]' : textMuted}`}>
              Choose
            </span>
          </div>
          <div className={stepLine(currentStepIdx >= 1)} />
          <div className="flex flex-col items-center gap-1">
            <span className={stepDot(currentStepIdx === 1, currentStepIdx > 1)}>
              {currentStepIdx > 1 ? '✓' : '2'}
            </span>
            <span className={`text-[10px] font-semibold ${currentStepIdx === 1 ? 'text-[#8C7355]' : textMuted}`}>
              Processing
            </span>
          </div>
          <div className={stepLine(currentStepIdx >= 2)} />
          <div className="flex flex-col items-center gap-1">
            <span className={stepDot(currentStepIdx === 2, false)}>3</span>
            <span className={`text-[10px] font-semibold ${currentStepIdx === 2 ? 'text-[#8C7355]' : textMuted}`}>
              Ready
            </span>
          </div>
        </div>
      </div>

      {/* STEP 1: CHOOSE BOOK DROPZONE */}
      {step === 'choose' && (
        <div className="space-y-5">
          {/* Dropzone */}
          <div
            onClick={() => handleSimulatedUpload('Principles_of_Quiet_Focus.epub')}
            className={`p-10 sm:p-16 border-2 border-dashed rounded-3xl ${surfaceHover} transition-all duration-300 flex flex-col items-center text-center cursor-pointer group ${
              isDark ? 'border-[#5A4C42] bg-[#231F1C]' : 'border-[#CDB891] bg-[#FAF0E6]'
            }`}
          >
            <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-105 transition-transform shadow-sm ${
              isDark ? 'bg-[#302820] text-[#CDB891]' : 'bg-[#F7E7CE] text-[#8C7355]'
            }`}>
              <Upload size={34} />
            </div>
            <h3 className={`font-serif text-xl sm:text-2xl font-semibold mb-2 ${textPrimary}`}>
              Drop your e-book here
            </h3>
            <p className={`text-sm mb-5 ${textMuted}`}>
              or click anywhere to choose a file from your device
            </p>
            <div className="flex items-center gap-3">
              <span className={`flex items-center gap-1.5 text-xs font-semibold px-3.5 py-1.5 rounded-full border ${
                isDark ? 'bg-[#2D2822] text-[#CDB891] border-[#5A4C42]/60' : 'bg-[#F7E7CE] text-[#8C7355] border-[#CDB891]/40'
              }`}>
                <FileText size={13} />
                PDF
              </span>
              <span className={`flex items-center gap-1.5 text-xs font-semibold px-3.5 py-1.5 rounded-full border ${
                isDark ? 'bg-[#2D2822] text-[#CDB891] border-[#5A4C42]/60' : 'bg-[#F7E7CE] text-[#8C7355] border-[#CDB891]/40'
              }`}>
                <FileType size={13} />
                EPUB
              </span>
            </div>
          </div>

          {/* Sample File Button */}
          <div className="flex items-center justify-center">
            <button
              onClick={() => handleSimulatedUpload('Architecture_of_Mind.pdf')}
              className={`px-5 py-2.5 rounded-full border text-xs font-medium transition-smooth cursor-pointer flex items-center gap-2 ${
                isDark
                  ? 'bg-[#2D2823] text-[#C4AD99] border-[#3D3530] hover:bg-[#302820] hover:border-[#5A4C42]'
                  : 'bg-[#FAF0E6] text-[#5E504A] border-[#E8DACD] hover:bg-[#F7E7CE]'
              }`}
            >
              <FileText size={14} className="text-[#CDB891]" />
              Try sample: Architecture of Mind.pdf
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: PROCESSING */}
      {step === 'processing' && (
        <div className={`p-12 sm:p-16 rounded-3xl border text-center space-y-6 animate-fade-in ${surface}`}>
          <div className={`w-20 h-20 rounded-2xl mx-auto flex items-center justify-center ${
            isDark ? 'bg-[#302820] text-[#CDB891]' : 'bg-[#F7E7CE] text-[#8C7355]'
          }`}>
            <Loader2 size={38} className="animate-spin" />
          </div>

          <div className="space-y-2">
            <h3 className={`font-serif text-xl sm:text-2xl font-semibold ${textPrimary}`}>
              Preparing your book…
            </h3>
            <p className={`text-sm ${textMuted}`}>
              Elunè is setting up your distraction-free reading view
            </p>
          </div>

          {/* Animated Loading Dots */}
          <div className="flex items-center justify-center gap-2 pt-2">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="w-2 h-2 rounded-full bg-[#CDB891] animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        </div>
      )}

      {/* STEP 3: BOOK READY */}
      {step === 'ready' && createdBook && (
        <div className={`p-10 sm:p-14 rounded-3xl border text-center space-y-7 animate-fade-in ${
          isDark ? 'bg-[#231F1C] border-[#5A4C42]' : 'bg-[#FAF0E6] border-[#CDB891]'
        }`}>
          {/* Success Icon */}
          <div className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center ${
            isDark ? 'bg-[#3A2E22] text-[#CDB891]' : 'bg-[#FFE4C4] text-[#8C7355]'
          }`}>
            <CheckCircle2 size={42} />
          </div>

          <div className="space-y-2">
            <span className="editorial-tag text-[#8C7355]">Success</span>
            <h3 className={`font-serif text-2xl sm:text-3xl font-semibold ${textPrimary}`}>
              Book Ready
            </h3>
            <p className={`text-sm ${textSecondary}`}>
              "{createdBook.title}" has been added to your personal library.
            </p>
          </div>

          {/* Book Preview mini-cover */}
          <div className="flex items-center justify-center gap-4 py-2">
            <div
              className="w-14 h-20 rounded-xl shadow-md flex items-center justify-center border border-black/10"
              style={{ background: createdBook.coverBg }}
            >
              <BookOpen size={18} className="text-white/80" />
            </div>
            <div className="text-left">
              <p className={`font-serif text-base font-semibold ${textPrimary}`}>{createdBook.title}</p>
              <p className={`text-xs ${textMuted}`}>Personal Upload • 2026</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
            <button
              onClick={() => navigateTo('reader', createdBook.id)}
              className="px-7 py-3 rounded-full bg-[#2C2421] text-[#FFF8E7] hover:bg-[#4A3E3D] text-xs font-semibold transition-smooth flex items-center gap-2 shadow-xs cursor-pointer"
            >
              <BookOpen size={16} />
              <span>Start Reading</span>
            </button>

            <button
              onClick={() => navigateTo('ai-summary', createdBook.id)}
              className={`px-7 py-3 rounded-full text-xs font-semibold transition-smooth flex items-center gap-2 cursor-pointer ${
                isDark
                  ? 'bg-[#302820] text-[#CDB891] hover:bg-[#3A3028] border border-[#5A4C42]/60'
                  : 'bg-[#F7E7CE] text-[#8C7355] hover:bg-[#CDB891] hover:text-[#2C2421]'
              }`}
            >
              <Sparkles size={16} />
              <span>View AI Summary</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
