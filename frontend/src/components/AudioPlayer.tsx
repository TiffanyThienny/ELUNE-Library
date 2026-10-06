import React, { useState, useEffect } from 'react';
import { useReader } from '../context/ReaderContext';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Gauge,
  Headphones,
  Sparkles,
} from 'lucide-react';

export const AudioPlayer: React.FC = () => {
  const {
    audioUrl,
    audioDuration,
    audioCurrentTime,
    isPlaying,
    playbackSpeed,
    playAudio,
    pauseAudio,
    seekAudio,
    setSpeed,
    nextParagraph,
    prevParagraph,
    currentChapter,
    currentContentBlockId,
    jumpToParagraph,
    activeAudioSegment,
  } = useReader();

  const [isMuted, setIsMuted] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);

  // Web Speech API state for real-time AI Voice Narration
  const [ttsSpeaking, setTtsSpeaking] = useState(false);
  const [currentBlockIndex, setCurrentBlockIndex] = useState(0);

  const blocks = currentChapter?.contentBlocks || [];

  // Cleanup speech synthesis on unmount or chapter change
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [currentChapter?.id]);

  const speakBlock = (index: number) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (index < 0 || index >= blocks.length) {
      setTtsSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel();
    setCurrentBlockIndex(index);
    const target = blocks[index];
    jumpToParagraph(target.id, false);

    const utterance = new SpeechSynthesisUtterance(target.text);
    utterance.rate = playbackSpeed || 1;
    utterance.onend = () => {
      if (index + 1 < blocks.length) {
        speakBlock(index + 1);
      } else {
        setTtsSpeaking(false);
      }
    };
    utterance.onerror = () => {
      setTtsSpeaking(false);
    };

    window.speechSynthesis.speak(utterance);
    setTtsSpeaking(true);
  };

  const handleToggleTts = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (ttsSpeaking) {
      window.speechSynthesis.cancel();
      setTtsSpeaking(false);
    } else {
      const activeIdx = blocks.findIndex((b) => b.id === currentContentBlockId);
      speakBlock(activeIdx !== -1 ? activeIdx : 0);
    }
  };

  const handleNextTts = () => {
    if (currentBlockIndex + 1 < blocks.length) {
      speakBlock(currentBlockIndex + 1);
    }
  };

  const handlePrevTts = () => {
    if (currentBlockIndex - 1 >= 0) {
      speakBlock(currentBlockIndex - 1);
    }
  };

  const speedOptions = [0.75, 1, 1.25, 1.5, 2];

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // If there's an uploaded MP3 track, render the standard player
  if (audioUrl) {
    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      seekAudio(val);
    };

    return (
      <div className="bg-white border border-[#E8DFD3] rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#EBDDC8] text-[#2C2421] flex items-center justify-center">
              <Headphones className="w-3.5 h-3.5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#2C2421] truncate max-w-[200px]">
                {currentChapter?.title || 'Chapter Audio'}
              </p>
              <p className="text-[11px] text-[#8C7355]">
                {activeAudioSegment
                  ? `Syncing (${Math.round(activeAudioSegment.startTime)}s - ${Math.round(activeAudioSegment.endTime)}s)`
                  : 'Synchronized with reading position'}
              </p>
            </div>
          </div>

          <div className="relative">
            <button
              onClick={() => setShowSpeedMenu(!showSpeedMenu)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold text-[#665A4F] hover:bg-[#F2ECE1] transition-colors border border-[#E8DFD3]"
            >
              <Gauge className="w-3 h-3" />
              <span>{playbackSpeed}x</span>
            </button>

            {showSpeedMenu && (
              <div className="absolute right-0 bottom-full mb-1 bg-white rounded-xl shadow-lg border border-[#E8DFD3] p-1 z-20 flex flex-col gap-0.5">
                {speedOptions.map((speed) => (
                  <button
                    key={speed}
                    onClick={() => {
                      setSpeed(speed);
                      setShowSpeedMenu(false);
                    }}
                    className={`px-3 py-1 text-xs rounded-lg text-left font-medium transition-colors ${
                      playbackSpeed === speed
                        ? 'bg-[#2C2421] text-white'
                        : 'text-[#2C2421] hover:bg-[#FAF7F2]'
                    }`}
                  >
                    {speed}x
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 mb-3">
          <span className="text-[11px] font-mono text-[#8C7355] w-10 text-right">
            {formatTime(audioCurrentTime)}
          </span>
          <input
            type="range"
            min={0}
            max={audioDuration || 100}
            step={0.1}
            value={audioCurrentTime}
            onChange={handleSeek}
            className="flex-1 h-1.5 bg-[#E8DFD3] rounded-lg appearance-none cursor-pointer accent-[#8C7355]"
          />
          <span className="text-[11px] font-mono text-[#8C7355] w-10">
            {formatTime(audioDuration)}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-[11px] text-[#A69888]">Tap any paragraph to seek</span>
          <div className="flex items-center gap-2">
            <button
              onClick={prevParagraph}
              className="p-2 text-[#665A4F] hover:text-[#2C2421] hover:bg-[#F2ECE1] rounded-full transition-colors"
            >
              <SkipBack className="w-4 h-4" />
            </button>
            <button
              onClick={isPlaying ? pauseAudio : playAudio}
              className="w-10 h-10 rounded-full bg-[#2C2421] hover:bg-[#433832] text-white flex items-center justify-center shadow-sm transition-transform active:scale-95"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </button>
            <button
              onClick={nextParagraph}
              className="p-2 text-[#665A4F] hover:text-[#2C2421] hover:bg-[#F2ECE1] rounded-full transition-colors"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Real-time AI Audio Narration (Text-To-Speech)
  return (
    <div className="bg-white border border-[#E8DFD3] rounded-2xl p-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#2C2421] text-[#FAF7F2] flex items-center justify-center shadow-2xs">
            <Sparkles className="w-4 h-4 text-[#EBDDC8]" />
          </div>
          <div>
            <p className="text-xs font-bold text-[#2C2421] flex items-center gap-1.5">
              <span>AI Audio Narration</span>
              {ttsSpeaking && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              )}
            </p>
            <p className="text-[11px] text-[#8C7355]">
              {blocks.length > 0
                ? `Paragraph ${currentBlockIndex + 1} of ${blocks.length} • Auto-Sync`
                : 'Ready to read aloud'}
            </p>
          </div>
        </div>

        {/* Speed menu */}
        <div className="relative">
          <button
            onClick={() => setShowSpeedMenu(!showSpeedMenu)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-[#665A4F] hover:bg-[#F2ECE1] transition-colors border border-[#E8DFD3]"
          >
            <Gauge className="w-3 h-3" />
            <span>{playbackSpeed}x</span>
          </button>

          {showSpeedMenu && (
            <div className="absolute right-0 bottom-full mb-1 bg-white rounded-xl shadow-lg border border-[#E8DFD3] p-1 z-20 flex flex-col gap-0.5">
              {speedOptions.map((speed) => (
                <button
                  key={speed}
                  onClick={() => {
                    setSpeed(speed);
                    setShowSpeedMenu(false);
                    if (ttsSpeaking) {
                      speakBlock(currentBlockIndex);
                    }
                  }}
                  className={`px-3 py-1 text-xs rounded-lg text-left font-medium transition-colors ${
                    playbackSpeed === speed
                      ? 'bg-[#2C2421] text-white'
                      : 'text-[#2C2421] hover:bg-[#FAF7F2]'
                  }`}
                >
                  {speed}x
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-[#E8DFD3] h-1.5 rounded-full overflow-hidden">
        <div
          className="bg-[#8C7355] h-full transition-all duration-300"
          style={{
            width: `${blocks.length > 0 ? ((currentBlockIndex + 1) / blocks.length) * 100 : 0}%`,
          }}
        />
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between pt-1">
        <span className="text-[10px] text-[#A69888]">
          {ttsSpeaking ? 'Speaking paragraph aloud...' : 'Tap play to listen to this chapter'}
        </span>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevTts}
            disabled={currentBlockIndex <= 0}
            title="Previous paragraph"
            className="p-2 text-[#665A4F] hover:text-[#2C2421] hover:bg-[#F2ECE1] rounded-full transition-colors disabled:opacity-30"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          <button
            onClick={handleToggleTts}
            className="px-4 py-2 rounded-xl bg-[#2C2421] hover:bg-[#433832] text-white text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5 active:scale-95"
          >
            {ttsSpeaking ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 ml-0.5" />
                <span>Listen Aloud</span>
              </>
            )}
          </button>

          <button
            onClick={handleNextTts}
            disabled={currentBlockIndex >= blocks.length - 1}
            title="Next paragraph"
            className="p-2 text-[#665A4F] hover:text-[#2C2421] hover:bg-[#F2ECE1] rounded-full transition-colors disabled:opacity-30"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
