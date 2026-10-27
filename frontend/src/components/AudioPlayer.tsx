import React, { useState, useEffect, useRef } from 'react';
import { useReader } from '../context/ReaderContext';
import { Play, Pause, Square, Volume2, VolumeX, Gauge, Headphones } from 'lucide-react';

/**
 * Summary narration player.
 *
 * Audio reads the AI-generated summary (shared via ReaderContext.summaryText),
 * NOT the whole PDF. It uses the browser Web Speech API — no audio file is
 * generated, and we never claim one is. Long summaries are split into sentence
 * chunks so speech engines with per-utterance limits still work. Speech stops
 * when the book changes or the component unmounts.
 */

const speechSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

function chunkSummary(text: string): string[] {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return [];
  // Split on sentence boundaries, then cap each chunk at ~220 chars.
  const sentences = clean.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g) || [clean];
  const chunks: string[] = [];
  let buf = '';
  for (const s of sentences) {
    if ((buf + s).length > 220 && buf) { chunks.push(buf.trim()); buf = ''; }
    buf += s;
  }
  if (buf.trim()) chunks.push(buf.trim());
  return chunks;
}

export const AudioPlayer: React.FC = () => {
  const { book, summaryText, playbackSpeed, setSpeed } = useReader();
  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);
  const [chunkIndex, setChunkIndex] = useState(0);
  const [chunkCount, setChunkCount] = useState(0);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const chunksRef = useRef<string[]>([]);
  const speedOptions = [0.75, 1, 1.25, 1.5, 2];

  const stopSpeech = () => {
    if (speechSupported) window.speechSynthesis.cancel();
    setSpeaking(false);
    setPaused(false);
    setChunkIndex(0);
    setChunkCount(0);
  };

  // Stop narration whenever the book or summary changes, and on unmount.
  useEffect(() => {
    stopSpeech();
    return () => { if (speechSupported) window.speechSynthesis.cancel(); };
  }, [book?.id, summaryText]);

  const speakFrom = (index: number) => {
    if (!speechSupported) return;
    const chunks = chunksRef.current;
    if (index < 0 || index >= chunks.length) { setSpeaking(false); setChunkIndex(0); return; }
    window.speechSynthesis.cancel();
    setChunkIndex(index);

    const utter = new SpeechSynthesisUtterance(chunks[index]);
    utter.rate = playbackSpeed || 1;
    utter.onend = () => {
      // Only advance if we're still meant to be speaking (not stopped/paused).
      if (index + 1 < chunks.length) {
        speakFrom(index + 1);
      } else {
        setSpeaking(false);
        setChunkIndex(0);
      }
    };
    utter.onerror = () => { setSpeaking(false); };
    window.speechSynthesis.speak(utter);
    setSpeaking(true);
    setPaused(false);
  };

  const handlePlayPause = () => {
    if (!speechSupported || !summaryText) return;
    if (speaking && !paused) {
      window.speechSynthesis.pause();
      setPaused(true);
      return;
    }
    if (speaking && paused) {
      window.speechSynthesis.resume();
      setPaused(false);
      return;
    }
    // Fresh start
    chunksRef.current = chunkSummary(summaryText);
    setChunkCount(chunksRef.current.length);
    if (chunksRef.current.length === 0) return;
    speakFrom(0);
  };

  const hasSummary = Boolean(summaryText && summaryText.trim().length > 0);
  const progress = chunkCount > 0 ? ((chunkIndex + 1) / chunkCount) * 100 : 0;

  // Speech engine not available in this browser.
  if (!speechSupported) {
    return (
      <div className="bg-white border border-[#E8DFD3] rounded-2xl p-4 shadow-sm space-y-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 text-[#8C7355] flex items-center justify-center">
            <VolumeX className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-bold text-[#2C2421]">Audio Unavailable</p>
            <p className="text-[11px] text-[#8C7355]">This browser does not support speech playback.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-[#E8DFD3] rounded-2xl p-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#FAF7F2] border border-[#E8DFD3] text-[#8C7355] flex items-center justify-center shadow-2xs">
            <Headphones className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-bold text-[#2C2421] flex items-center gap-1.5">
              <span>Summary Narration</span>
              {speaking && !paused && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />}
            </p>
            <p className="text-[11px] text-[#8C7355]">
              {hasSummary
                ? (speaking ? `Reading part ${chunkIndex + 1} of ${chunkCount || 1}` : 'Reads the AI summary aloud')
                : 'Generate a summary first to enable audio'}
            </p>
          </div>
        </div>

        {/* Speed menu */}
        <div className="relative">
          <button
            onClick={() => setShowSpeedMenu(!showSpeedMenu)}
            disabled={!hasSummary}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-[#665A4F] hover:bg-[#F2ECE1] transition-colors border border-[#E8DFD3] disabled:opacity-40"
          >
            <Gauge className="w-3 h-3" />
            <span>{playbackSpeed}x</span>
          </button>
          {showSpeedMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowSpeedMenu(false)} />
              <div className="absolute right-0 top-full mt-1.5 bg-white rounded-xl shadow-xl border border-[#E8DFD3] p-1.5 z-50 min-w-[70px] flex flex-col gap-0.5">
                {speedOptions.map((speed) => (
                  <button
                    key={speed}
                    onClick={() => {
                      setSpeed(speed);
                      setShowSpeedMenu(false);
                      if (speaking) speakFrom(chunkIndex); // apply new rate from current chunk
                    }}
                    className={`px-3 py-1.5 text-xs rounded-lg text-left font-medium transition-colors ${
                      playbackSpeed === speed ? 'bg-[#2C2421] text-white' : 'text-[#2C2421] hover:bg-[#FAF7F2]'
                    }`}
                  >
                    {speed}x
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Progress */}
      <div className="w-full bg-[#E8DFD3] h-1.5 rounded-full overflow-hidden">
        <div className="bg-[#8C7355] h-full transition-all duration-300" style={{ width: `${progress}%` }} />
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between pt-1">
        <span className="text-[10px] text-[#A69888]">
          {!hasSummary
            ? 'Open the Summary tab and generate a summary'
            : speaking
              ? (paused ? 'Paused' : 'Narrating the summary...')
              : 'Ready to read the summary aloud'}
        </span>
        <div className="flex items-center gap-2">
          {speaking && (
            <button
              onClick={stopSpeech}
              title="Stop"
              className="p-2 text-[#665A4F] hover:text-[#2C2421] hover:bg-[#F2ECE1] rounded-full transition-colors"
            >
              <Square className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={handlePlayPause}
            disabled={!hasSummary}
            className="px-4 py-2 rounded-xl bg-[#2C2421] hover:bg-[#433832] text-white text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {speaking && !paused ? (
              <><Pause className="w-3.5 h-3.5" /><span>Pause</span></>
            ) : (
              <><Play className="w-3.5 h-3.5 ml-0.5" /><Volume2 className="w-3.5 h-3.5" /><span>{paused ? 'Resume' : 'Listen'}</span></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
