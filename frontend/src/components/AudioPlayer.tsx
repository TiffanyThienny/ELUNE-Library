import React, { useState } from 'react';
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
    activeAudioSegment,
  } = useReader();

  const [isMuted, setIsMuted] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);

  if (!audioUrl) {
    return (
      <div className="bg-[#FAF7F2] border border-[#E8DFD3] rounded-2xl p-4 flex items-center justify-between text-xs text-[#8C7355]">
        <div className="flex items-center gap-2">
          <Headphones className="w-4 h-4 opacity-60" />
          <span>Audio narration not generated for this chapter yet.</span>
        </div>
      </div>
    );
  }

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    seekAudio(val);
  };

  const speedOptions = [0.75, 1, 1.25, 1.5, 2];

  return (
    <div className="bg-white border border-[#E8DFD3] rounded-2xl p-4 shadow-sm">
      {/* Chapter & Segment Info */}
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
                ? `Syncing to active paragraph (${Math.round(activeAudioSegment.startTime)}s - ${Math.round(activeAudioSegment.endTime)}s)`
                : 'Synchronized with reading position'}
            </p>
          </div>
        </div>

        {/* Speed menu */}
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

      {/* Progress scrubber */}
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

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="text-[11px] text-[#A69888]">
          <span>Tip: Click any paragraph to seek audio</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Previous paragraph */}
          <button
            onClick={prevParagraph}
            title="Previous paragraph"
            className="p-2 text-[#665A4F] hover:text-[#2C2421] hover:bg-[#F2ECE1] rounded-full transition-colors"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          {/* Play / Pause */}
          <button
            onClick={isPlaying ? pauseAudio : playAudio}
            className="w-10 h-10 rounded-full bg-[#2C2421] hover:bg-[#433832] text-white flex items-center justify-center shadow-sm transition-transform active:scale-95"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
          </button>

          {/* Next paragraph */}
          <button
            onClick={nextParagraph}
            title="Next paragraph"
            className="p-2 text-[#665A4F] hover:text-[#2C2421] hover:bg-[#F2ECE1] rounded-full transition-colors"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
