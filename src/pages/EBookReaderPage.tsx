import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Settings, 
  Search, 
  Bookmark, 
  Sparkles, 
  ChevronLeft, 
  ChevronRight, 
  Sun, 
  Moon, 
  Coffee,
  X,
  Highlighter,
  Copy,
  Check,
  Volume2
} from 'lucide-react';
import { useLibrary } from '../context/LibraryContext';

export const EBookReaderPage: React.FC = () => {
  const { 
    activeBook, 
    navigateTo, 
    readerSettings, 
    updateReaderSettings, 
    updateReadingProgress,
    addHighlight,
    playAudioTrack,
    audioState,
    toggleAudioPlayPause
  } = useLibrary();

  const book = activeBook;
  const [currentChapterIndex, setCurrentChapterIndex] = useState<number>(book.progress.chapterIndex || 0);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showChaptersModal, setShowChaptersModal] = useState<boolean>(false);
  const [showAIDrawer, setShowAIDrawer] = useState<boolean>(false);
  const [isBookmarked, setIsBookmarked] = useState<boolean>(false);
  
  // Selection Context Menu state
  const [selectionMenu, setSelectionMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    text: string;
  }>({ visible: false, x: 0, y: 0, text: '' });

  const [noteModalOpen, setNoteModalOpen] = useState<boolean>(false);
  const [noteText, setNoteText] = useState<string>('');
  const selectedHighlightColor = 'yellow';
  const [copiedNotification, setCopiedNotification] = useState<boolean>(false);

  // AI Drawer state
  const [aiPrompt, setAiPrompt] = useState<string>('');
  const [aiChatMessages, setAiChatMessages] = useState<{ sender: 'user' | 'ai'; text: string }[]>([
    {
      sender: 'ai',
      text: `Hello, I am your quiet reading companion for "${book.title}". Ask me any questions about Chapter ${currentChapterIndex + 1} or key themes as you read.`
    }
  ]);

  const currentChapter = book.chapters[currentChapterIndex] || book.chapters[0];
  const isChapterAudioPlaying = audioState.isPlaying && audioState.bookId === book.id && audioState.type === 'chapter';

  // Font family mapping
  const fontClassMap = {
    'Literata': 'font-serif-literata',
    'Lora': 'font-serif-lora',
    'Merriweather': 'font-serif-merriweather',
    'Source Serif 4': 'font-serif-source'
  };

  const themeClassMap = {
    'light': 'theme-light',
    'warm': 'theme-warm',
    'dark': 'theme-dark'
  };

  // Text selection handler
  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim().length > 0) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      setSelectionMenu({
        visible: true,
        x: rect.left + rect.width / 2,
        y: rect.top - 50,
        text: selection.toString().trim()
      });
    } else {
      setSelectionMenu(prev => ({ ...prev, visible: false }));
    }
  };

  const applyHighlight = (color: 'yellow' | 'green' | 'blue' | 'rose') => {
    if (!selectionMenu.text) return;
    addHighlight({
      bookId: book.id,
      bookTitle: book.title,
      chapterId: currentChapter.id,
      chapterTitle: currentChapter.title,
      text: selectionMenu.text,
      color
    });
    setSelectionMenu(prev => ({ ...prev, visible: false }));
  };

  const handleSaveNote = () => {
    if (!selectionMenu.text) return;
    addHighlight({
      bookId: book.id,
      bookTitle: book.title,
      chapterId: currentChapter.id,
      chapterTitle: currentChapter.title,
      text: selectionMenu.text,
      color: selectedHighlightColor,
      note: noteText
    });
    setNoteText('');
    setNoteModalOpen(false);
    setSelectionMenu(prev => ({ ...prev, visible: false }));
  };

  const handleCopyText = () => {
    if (selectionMenu.text) {
      navigator.clipboard.writeText(selectionMenu.text);
      setCopiedNotification(true);
      setTimeout(() => setCopiedNotification(false), 2000);
      setSelectionMenu(prev => ({ ...prev, visible: false }));
    }
  };

  const handleAskAIAboutSelection = () => {
    const textToAsk = selectionMenu.text;
    setSelectionMenu(prev => ({ ...prev, visible: false }));
    setShowAIDrawer(true);
    setAiChatMessages(prev => [
      ...prev,
      { sender: 'user', text: `Can you explain what this passage means: "${textToAsk}"?` },
      { sender: 'ai', text: `In this passage from Chapter ${currentChapterIndex + 1}, Marcus Aurelius reflects on the stoic virtue of emotional clarity. He suggests that our distress is caused by our subjective interpretations rather than the physical events themselves.` }
    ]);
  };

  const handleSendAiQuestion = () => {
    if (!aiPrompt.trim()) return;
    const userQ = aiPrompt;
    setAiPrompt('');
    setAiChatMessages(prev => [
      ...prev,
      { sender: 'user', text: userQ },
      { sender: 'ai', text: `Regarding "${userQ}" in ${book.title}: The author emphasizes that true composure comes from accepting what is outside our control while disciplining our immediate reactions with reason.` }
    ]);
  };

  const goToPrevChapter = () => {
    if (currentChapterIndex > 0) {
      const nextIdx = currentChapterIndex - 1;
      setCurrentChapterIndex(nextIdx);
      updateReadingProgress(book.id, nextIdx, 1, Math.round(((nextIdx + 1) / book.chapters.length) * 100));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const goToNextChapter = () => {
    if (currentChapterIndex < book.chapters.length - 1) {
      const nextIdx = currentChapterIndex + 1;
      setCurrentChapterIndex(nextIdx);
      updateReadingProgress(book.id, nextIdx, 1, Math.round(((nextIdx + 1) / book.chapters.length) * 100));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className={`min-h-screen ${themeClassMap[readerSettings.theme]} transition-colors duration-300 select-text relative flex flex-col`}
      style={{ backgroundColor: 'var(--reader-bg)', color: 'var(--reader-text)' }}
    >
      {/* SUBTLE TOP READER TOOLBAR */}
      <header className="sticky top-0 z-30 px-4 sm:px-8 py-3.5 border-b border-[var(--reader-border)] bg-[var(--reader-bg)]/90 backdrop-blur-md flex items-center justify-between gap-4 transition-colors">
        {/* Left: Back & Title */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => navigateTo('book-detail', book.id)}
            className="p-2 rounded-full text-[var(--reader-text-muted)] hover:text-[var(--reader-text)] transition-smooth cursor-pointer"
            title="Back to Book Details"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="hidden sm:block min-w-0">
            <h2 className="font-serif text-sm font-semibold truncate text-[var(--reader-text)]">
              {book.title}
            </h2>
            <p className="text-[11px] text-[var(--reader-text-muted)] truncate">
              {book.author}
            </p>
          </div>
        </div>

        {/* Center: Chapter Selector Pill */}
        <button
          onClick={() => setShowChaptersModal(true)}
          className="px-3.5 py-1.5 rounded-full border border-[var(--reader-border)] text-xs font-serif italic text-[var(--reader-text)] hover:bg-[var(--reader-surface)] transition-smooth flex items-center gap-1.5 cursor-pointer max-w-[200px] sm:max-w-none truncate"
        >
          <span className="truncate">Ch {currentChapter.number}: {currentChapter.title}</span>
        </button>

        {/* Right: Actions (Audio, Search, Bookmark, Settings) */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            onClick={() => {
              if (isChapterAudioPlaying) {
                toggleAudioPlayPause();
              } else {
                const chapterText = `Chapter ${currentChapter.number}. ${currentChapter.title}. ${currentChapter.content}`;
                playAudioTrack(book, 'chapter', `Chapter ${currentChapter.number}: ${currentChapter.title}`, chapterText);
              }
            }}
            className={`px-3 py-1.5 rounded-full border text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${
              isChapterAudioPlaying
                ? 'bg-[#2C2421] text-[#FFF8E7] border-[#8C7355] shadow-sm ring-2 ring-[#CDB891]'
                : 'border-[var(--reader-border)] text-[var(--reader-text-muted)] hover:text-[var(--reader-text)] hover:bg-[var(--reader-surface)]'
            }`}
            title="Listen Chapter Narration"
          >
            <Volume2 size={16} className={isChapterAudioPlaying ? 'text-[#CDB891]' : 'text-[#8C7355]'} />
            <span className="hidden sm:inline">{isChapterAudioPlaying ? 'Pause Audio' : 'Listen Chapter'}</span>
            {isChapterAudioPlaying && <span className="w-1.5 h-1.5 rounded-full bg-[#CDB891] animate-pulse" />}
          </button>

          <button
            onClick={() => setShowAIDrawer(true)}
            className="p-2 rounded-full text-[var(--reader-text-muted)] hover:text-[var(--reader-text)] transition-smooth cursor-pointer"
            title="Search inside book with AI"
          >
            <Search size={18} />
          </button>

          <button
            onClick={() => setIsBookmarked(!isBookmarked)}
            className={`p-2 rounded-full transition-smooth cursor-pointer ${
              isBookmarked ? 'text-[#8C7355]' : 'text-[var(--reader-text-muted)] hover:text-[var(--reader-text)]'
            }`}
            title="Bookmark Page"
          >
            <Bookmark size={18} fill={isBookmarked ? 'currentColor' : 'none'} />
          </button>

          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 rounded-full text-[var(--reader-text-muted)] hover:text-[var(--reader-text)] transition-smooth cursor-pointer"
            title="Reading Preferences"
          >
            <Settings size={18} />
          </button>
        </div>
      </header>

      {/* READING PREFERENCES POPUP DRAWER */}
      {showSettings && (
        <div className="sticky top-14 z-40 max-w-sm mx-auto w-full px-4 animate-fade-in">
          <div className="bg-[#FAF0E6] border border-[#E8DACD] rounded-2xl p-5 shadow-2xl text-[#2C2421] space-y-5">
            <div className="flex items-center justify-between border-b border-[#E8DACD] pb-3">
              <span className="font-serif font-semibold text-sm">Reading Settings</span>
              <button 
                onClick={() => setShowSettings(false)}
                className="p-1 text-[#8C7B73] hover:text-[#2C2421]"
              >
                <X size={16} />
              </button>
            </div>

            {/* Reading Theme */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#8C7B73] uppercase tracking-wider">Theme</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => updateReaderSettings({ theme: 'light' })}
                  className={`py-2 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 border transition-smooth ${
                    readerSettings.theme === 'light' ? 'bg-[#FFF8E7] border-[#8C7355] text-[#2C2421] font-semibold' : 'bg-[#FAF0E6] border-[#E8DACD] text-[#5E504A]'
                  }`}
                >
                  <Sun size={14} />
                  <span>Light</span>
                </button>
                <button
                  onClick={() => updateReaderSettings({ theme: 'warm' })}
                  className={`py-2 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 border transition-smooth ${
                    readerSettings.theme === 'warm' ? 'bg-[#FAF0E6] border-[#8C7355] text-[#342823] font-semibold' : 'bg-[#FAF0E6] border-[#E8DACD] text-[#5E504A]'
                  }`}
                >
                  <Coffee size={14} />
                  <span>Warm</span>
                </button>
                <button
                  onClick={() => updateReaderSettings({ theme: 'dark' })}
                  className={`py-2 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 border transition-smooth ${
                    readerSettings.theme === 'dark' ? 'bg-[#1C1816] border-[#CDB891] text-[#E5DCD3] font-semibold' : 'bg-[#FAF0E6] border-[#E8DACD] text-[#5E504A]'
                  }`}
                >
                  <Moon size={14} />
                  <span>Night</span>
                </button>
              </div>
            </div>

            {/* Font Family */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#8C7B73] uppercase tracking-wider">Font Family</label>
              <div className="grid grid-cols-2 gap-2">
                {(['Literata', 'Lora', 'Merriweather', 'Source Serif 4'] as const).map((font) => (
                  <button
                    key={font}
                    onClick={() => updateReaderSettings({ fontFamily: font })}
                    className={`py-2 px-3 rounded-xl text-xs border transition-smooth text-left truncate ${
                      readerSettings.fontFamily === font ? 'bg-[#F7E7CE] border-[#8C7355] font-semibold' : 'bg-[#FAF0E6] border-[#E8DACD]'
                    }`}
                  >
                    {font}
                  </button>
                ))}
              </div>
            </div>

            {/* Font Size */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-[#8C7B73] font-medium">
                <span>Font Size</span>
                <span>{readerSettings.fontSize}px</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => updateReaderSettings({ fontSize: Math.max(14, readerSettings.fontSize - 1) })}
                  className="w-8 h-8 rounded-lg bg-[#FAEBD7] border border-[#E8DACD] flex items-center justify-center font-bold text-sm"
                >
                  A-
                </button>
                <input
                  type="range"
                  min="14"
                  max="26"
                  value={readerSettings.fontSize}
                  onChange={(e) => updateReaderSettings({ fontSize: Number(e.target.value) })}
                  className="flex-1 accent-[#8C7355]"
                />
                <button
                  onClick={() => updateReaderSettings({ fontSize: Math.min(26, readerSettings.fontSize + 1) })}
                  className="w-8 h-8 rounded-lg bg-[#FAEBD7] border border-[#E8DACD] flex items-center justify-center font-bold text-sm"
                >
                  A+
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MAIN QUIET READING CONTAINER (Centered 750px max-width) */}
      <main 
        onMouseUp={handleTextSelection}
        onTouchEnd={handleTextSelection}
        className="flex-1 max-w-[760px] w-full mx-auto px-6 sm:px-12 py-10 sm:py-16 space-y-8 reader-content leading-relaxed"
      >
        {/* Chapter Header */}
        <div className="text-center space-y-3 pb-8 border-b border-[var(--reader-border)]">
          <span className="text-xs font-semibold uppercase tracking-widest text-[var(--reader-text-muted)]">
            Chapter {currentChapter.number}
          </span>
          <h1 className={`text-2xl sm:text-4xl font-semibold text-[var(--reader-text)] tracking-tight ${fontClassMap[readerSettings.fontFamily]}`}>
            {currentChapter.title}
          </h1>
          <span className="text-xs text-[var(--reader-text-muted)] font-mono block">
            Reading time ~ {currentChapter.readingTime}
          </span>

          {/* Chapter Audio Narration Button */}
          <div className="pt-2">
            <button
              onClick={() => {
                if (isChapterAudioPlaying) {
                  toggleAudioPlayPause();
                } else {
                  const chapterText = `Chapter ${currentChapter.number}. ${currentChapter.title}. ${currentChapter.content}`;
                  playAudioTrack(book, 'chapter', `Chapter ${currentChapter.number}: ${currentChapter.title}`, chapterText);
                }
              }}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-semibold transition-all duration-200 cursor-pointer ${
                isChapterAudioPlaying
                  ? 'bg-[#2C2421] text-[#FFF8E7] border-[#8C7355] shadow-md ring-2 ring-[#CDB891]'
                  : 'bg-[#FAF0E6] text-[#8C7355] border-[#E8DACD] hover:bg-[#F7E7CE]'
              }`}
              title="Listen to this chapter read aloud"
            >
              <Volume2 size={16} className={isChapterAudioPlaying ? 'text-[#CDB891]' : 'text-[#8C7355]'} />
              <span>{isChapterAudioPlaying ? `Reading Chapter ${currentChapter.number} (Pause)` : `Listen Chapter ${currentChapter.number} Audio`}</span>
              {isChapterAudioPlaying && <span className="w-2 h-2 rounded-full bg-[#CDB891] animate-pulse" />}
            </button>
          </div>
        </div>

        {/* Real Reading Content */}
        <article 
          className={`space-y-6 text-justify text-[var(--reader-text)] ${fontClassMap[readerSettings.fontFamily]}`}
          style={{ 
            fontSize: `${readerSettings.fontSize}px`, 
            lineHeight: readerSettings.lineHeight 
          }}
        >
          {currentChapter.content.split('\n\n').map((paragraph, idx) => (
            <p key={idx} className="indent-6 sm:indent-8">
              {paragraph}
            </p>
          ))}
        </article>

        {/* Page Footer Metadata */}
        <div className="pt-12 text-center text-xs text-[var(--reader-text-muted)] font-serif italic">
          End of Chapter {currentChapter.number} • Elunè Digital Edition
        </div>
      </main>

      {/* SELECTION POPUP CONTEXT MENU */}
      {selectionMenu.visible && (
        <div 
          className="fixed z-50 transform -translate-x-1/2 bg-[#2C2421] text-[#FAF0E6] p-2 rounded-2xl shadow-2xl flex items-center gap-2 border border-[#4A3E3D] animate-fade-in"
          style={{ left: `${selectionMenu.x}px`, top: `${Math.max(20, selectionMenu.y)}px` }}
        >
          {/* Pastel Color Swatches */}
          <div className="flex items-center gap-1.5 px-2 border-r border-[#4A3E3D]">
            <button onClick={() => applyHighlight('yellow')} className="w-5 h-5 rounded-full bg-[#FCE8B2] hover:scale-110 transition-transform" title="Yellow Highlight" />
            <button onClick={() => applyHighlight('green')} className="w-5 h-5 rounded-full bg-[#D3EBCD] hover:scale-110 transition-transform" title="Green Highlight" />
            <button onClick={() => applyHighlight('blue')} className="w-5 h-5 rounded-full bg-[#D4E3FC] hover:scale-110 transition-transform" title="Blue Highlight" />
            <button onClick={() => applyHighlight('rose')} className="w-5 h-5 rounded-full bg-[#FAD4D8] hover:scale-110 transition-transform" title="Rose Highlight" />
          </div>

          <button
            onClick={() => setNoteModalOpen(true)}
            className="p-1.5 hover:text-[#CDB891] transition-smooth text-xs flex items-center gap-1"
          >
            <Highlighter size={14} />
            <span>Note</span>
          </button>

          <button
            onClick={handleAskAIAboutSelection}
            className="p-1.5 hover:text-[#CDB891] transition-smooth text-xs flex items-center gap-1 text-[#F7E7CE]"
          >
            <Sparkles size={14} />
            <span>Ask AI</span>
          </button>

          <button
            onClick={handleCopyText}
            className="p-1.5 hover:text-[#CDB891] transition-smooth text-xs"
            title="Copy Text"
          >
            <Copy size={14} />
          </button>
        </div>
      )}

      {/* COPIED NOTIFICATION TOAST */}
      {copiedNotification && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-[#2C2421] text-[#FAF0E6] text-xs px-4 py-2 rounded-full shadow-lg z-50 flex items-center gap-2">
          <Check size={14} className="text-[#CDB891]" />
          <span>Text copied to clipboard</span>
        </div>
      )}

      {/* NOTE EDITOR MODAL */}
      {noteModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#1C1816]/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#FFF8E7] border border-[#E8DACD] rounded-2xl p-6 text-[#2C2421] shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#E8DACD] pb-3">
              <h3 className="font-serif font-semibold text-base">Add Note</h3>
              <button onClick={() => setNoteModalOpen(false)} className="text-[#8C7B73] hover:text-[#2C2421]">
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-[#5E504A] italic bg-[#FAF0E6] p-3 rounded-xl border border-[#E8DACD] line-clamp-3">
              "{selectionMenu.text}"
            </p>

            <textarea
              rows={4}
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Write your personal thoughts or reflections on this passage..."
              className="w-full bg-[#FAF0E6] border border-[#E8DACD] rounded-xl p-3 text-xs text-[#2C2421] focus:outline-none focus:border-[#CDB891]"
            />

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setNoteModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs text-[#5E504A] hover:bg-[#FAF0E6]"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveNote}
                className="px-5 py-2 rounded-xl text-xs font-semibold text-[#FAF0E6] bg-[#8C7355] hover:bg-[#755F43]"
              >
                Save Note
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BOTTOM READER NAVIGATION & PROGRESS SCROLLER */}
      <footer className="sticky bottom-0 z-30 px-6 py-4 border-t border-[var(--reader-border)] bg-[var(--reader-bg)]/95 backdrop-blur-md flex items-center justify-between gap-4">
        <button
          onClick={goToPrevChapter}
          disabled={currentChapterIndex === 0}
          className="flex items-center gap-1 text-xs font-medium text-[var(--reader-text-muted)] hover:text-[var(--reader-text)] disabled:opacity-30 cursor-pointer"
        >
          <ChevronLeft size={18} />
          <span className="hidden sm:inline">Previous Chapter</span>
        </button>

        <div className="flex-1 max-w-xs text-center space-y-1">
          <div className="w-full h-1 bg-[var(--reader-border)] rounded-full overflow-hidden">
            <div 
              className="h-full bg-[#8C7355] rounded-full transition-all duration-300"
              style={{ width: `${((currentChapterIndex + 1) / book.chapters.length) * 100}%` }}
            />
          </div>
          <span className="text-[11px] text-[var(--reader-text-muted)] font-mono">
            Chapter {currentChapterIndex + 1} of {book.chapters.length} ({Math.round(((currentChapterIndex + 1) / book.chapters.length) * 100)}%)
          </span>
        </div>

        <button
          onClick={goToNextChapter}
          disabled={currentChapterIndex === book.chapters.length - 1}
          className="flex items-center gap-1 text-xs font-medium text-[var(--reader-text-muted)] hover:text-[var(--reader-text)] disabled:opacity-30 cursor-pointer"
        >
          <span className="hidden sm:inline">Next Chapter</span>
          <ChevronRight size={18} />
        </button>
      </footer>

      {/* FLOATING SUBTLE "ASK AI" COMPANION TRIGGER */}
      <button
        onClick={() => setShowAIDrawer(true)}
        className="fixed bottom-20 right-6 z-40 px-4 py-2.5 rounded-full bg-[#2C2421] text-[#F7E7CE] hover:bg-[#4A3E3D] shadow-xl text-xs font-medium flex items-center gap-2 border border-[#CDB891]/40 transition-smooth cursor-pointer"
      >
        <Sparkles size={15} className="text-[#CDB891]" />
        <span>Ask AI Companion</span>
      </button>

      {/* QUIET AI READING COMPANION DRAWER */}
      {showAIDrawer && (
        <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-[#FFF8E7] border-l border-[#E8DACD] shadow-2xl flex flex-col p-6 animate-fade-in text-[#2C2421]">
          <div className="flex items-center justify-between border-b border-[#E8DACD] pb-4 mb-4">
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-[#8C7355]" />
              <h3 className="font-serif font-semibold text-base">Reading Companion</h3>
            </div>
            <button 
              onClick={() => setShowAIDrawer(false)}
              className="p-1.5 rounded-full text-[#8C7B73] hover:text-[#2C2421]"
            >
              <X size={18} />
            </button>
          </div>

          <p className="text-xs text-[#5E504A] italic mb-4">
            Quiet AI assistance grounded in "{book.title}"
          </p>

          <div className="flex-1 overflow-y-auto space-y-4 pr-1 mb-4">
            {aiChatMessages.map((msg, idx) => (
              <div
                key={idx}
                className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                  msg.sender === 'user' 
                    ? 'bg-[#8C7355] text-[#FFF8E7] ml-6' 
                    : 'bg-[#FAF0E6] text-[#2C2421] border border-[#E8DACD] mr-6'
                }`}
              >
                {msg.text}
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-[#E8DACD]">
            <input
              type="text"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendAiQuestion()}
              placeholder="Ask a question about this chapter..."
              className="flex-1 bg-[#FAF0E6] border border-[#E8DACD] rounded-xl px-3.5 py-2.5 text-xs text-[#2C2421] focus:outline-none focus:border-[#CDB891]"
            />
            <button
              onClick={handleSendAiQuestion}
              className="px-4 py-2.5 bg-[#8C7355] text-[#FFF8E7] rounded-xl text-xs font-semibold hover:bg-[#755F43] transition-smooth cursor-pointer"
            >
              Ask
            </button>
          </div>
        </div>
      )}

      {/* CHAPTERS MODAL */}
      {showChaptersModal && (
        <div className="fixed inset-0 z-50 bg-[#1C1816]/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#FFF8E7] border border-[#E8DACD] rounded-2xl p-6 text-[#2C2421] shadow-2xl space-y-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-[#E8DACD] pb-3">
              <h3 className="font-serif font-semibold text-base">Select Chapter</h3>
              <button onClick={() => setShowChaptersModal(false)} className="text-[#8C7B73]">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {book.chapters.map((ch, idx) => (
                <button
                  key={ch.id}
                  onClick={() => {
                    setCurrentChapterIndex(idx);
                    setShowChaptersModal(false);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className={`w-full text-left p-3 rounded-xl text-xs transition-smooth flex items-center justify-between ${
                    idx === currentChapterIndex 
                      ? 'bg-[#F7E7CE] text-[#2C2421] font-semibold border border-[#CDB891]' 
                      : 'bg-[#FAF0E6] text-[#5E504A] hover:bg-[#FAEBD7]'
                  }`}
                >
                  <div>
                    <span className="text-[10px] text-[#8C7355] block font-mono">Chapter {ch.number}</span>
                    <span className="font-serif text-sm">{ch.title}</span>
                  </div>
                  <span className="text-[11px] text-[#8C7B73]">{ch.readingTime}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
