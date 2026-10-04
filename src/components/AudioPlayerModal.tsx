import React from 'react';
import { X, Play, Pause, SkipBack, SkipForward, Volume2, Gauge, BookOpen, Headphones } from 'lucide-react';
import { useLibrary } from '../context/LibraryContext';

export const AudioPlayerModal: React.FC = () => {
  const { 
    audioState, 
    toggleAudioPlayPause, 
    setAudioSpeed, 
    playAudioTrack, 
    seekAudio,
    stopAudio,
    activeBook 
  } = useLibrary();

  if (!audioState.isModalOpen) return null;

  const cleanBookTitle = (audioState.bookTitle || '').replace(/\.(pdf|epub)$/i, '').replace(/_/g, ' ');
  const cleanTrackTitle = (audioState.trackTitle || '').replace(/\.(pdf|epub)$/i, '').replace(/_/g, ' ');

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleScrubberClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickPosition = (e.clientX - rect.left) / rect.width;
    const newTime = clickPosition * audioState.duration;
    seekAudio(newTime);
  };

  const speedOptions: (0.75 | 1 | 1.25 | 1.5 | 2)[] = [0.75, 1, 1.25, 1.5, 2];

  return (
    <div className="fixed inset-0 z-50 bg-[#1C1816]/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
      <div className="w-full max-w-md bg-[#2C2421] border border-[#4A3E3D] rounded-3xl p-6 sm:p-8 text-[#FAF0E6] shadow-2xl relative">
        {/* Close Button */}
        <button
          onClick={stopAudio}
          className="absolute top-5 right-5 p-2 rounded-full text-[#8C7B73] hover:text-[#FAF0E6] hover:bg-[#3A322D] transition-smooth cursor-pointer"
          title="Stop and Close"
        >
          <X size={20} />
        </button>

        {/* Header Tag */}
        <div className="text-center mb-4">
          <span className="text-[11px] font-semibold tracking-widest uppercase text-[#CDB891] bg-[#3A322D] px-3 py-1 rounded-full border border-[#4A3E3D]">
            Audio Experience
          </span>
        </div>

        {/* Audio Mode Options: Full Book vs Summary Audio */}
        <div className="flex items-center justify-center gap-2 mb-6 bg-[#1F1917] p-1.5 rounded-2xl border border-[#3A322D]">
          <button
            onClick={() => {
              if (activeBook) {
                playAudioTrack(activeBook, 'book', `${activeBook.title} (Full Book)`);
              }
            }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-medium transition-smooth flex items-center justify-center gap-1.5 cursor-pointer ${
              audioState.type === 'book'
                ? 'bg-[#CDB891] text-[#2C2421] font-semibold shadow-xs'
                : 'text-[#8C7B73] hover:text-[#FAF0E6]'
            }`}
          >
            <BookOpen size={14} />
            <span>Full Book</span>
          </button>

          <button
            onClick={() => {
              if (activeBook) {
                playAudioTrack(activeBook, 'summary', `${activeBook.title} (Summary Audio)`);
              }
            }}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-medium transition-smooth flex items-center justify-center gap-1.5 cursor-pointer ${
              audioState.type === 'summary'
                ? 'bg-[#CDB891] text-[#2C2421] font-semibold shadow-xs'
                : 'text-[#8C7B73] hover:text-[#FAF0E6]'
            }`}
          >
            <Headphones size={14} />
            <span>Summary Audio</span>
          </button>
        </div>

        {/* Large Album Cover Art */}
        <div className="w-44 h-44 sm:w-52 sm:h-52 mx-auto rounded-2xl shadow-2xl mb-6 flex flex-col items-center justify-center p-5 text-center border border-[#4A3E3D] relative overflow-hidden"
          style={{ background: audioState.coverBg || 'linear-gradient(135deg, #8C7355 0%, #4A3E3D 100%)' }}
        >
          <Volume2 size={36} className="text-[#FAF0E6]/80 mb-2 shrink-0" />
          <p className="font-serif font-bold text-sm sm:text-base text-[#FAF0E6] leading-tight line-clamp-3 break-words max-w-full px-2">
            {cleanBookTitle}
          </p>
          <span className="text-[10px] uppercase font-mono tracking-wider text-[#FAF0E6]/70 mt-2 bg-black/20 px-2 py-0.5 rounded-full">
            {audioState.type === 'summary' ? 'Summary Audio' : 'Full Book Audio'}
          </span>
        </div>

        {/* Track Metadata */}
        <div className="text-center mb-6 px-2">
          <h3 className="font-serif text-lg sm:text-xl font-semibold text-[#FAF0E6] mb-1 leading-snug break-words">
            {cleanTrackTitle}
          </h3>
          <p className="text-xs text-[#CDB891] flex items-center justify-center gap-1.5">
            <Headphones size={13} />
            <span>Elunè Narrator</span>
          </p>
        </div>

        {/* Interactive Scrubber Bar */}
        <div className="space-y-2 mb-6">
          <div 
            onClick={handleScrubberClick}
            className="w-full h-2.5 bg-[#3A322D] rounded-full overflow-hidden relative cursor-pointer group"
          >
            <div 
              className="h-full bg-[#CDB891] rounded-full transition-all duration-150 group-hover:bg-[#F7E7CE]"
              style={{ width: `${Math.min(100, (audioState.currentTime / (audioState.duration || 1)) * 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-[#8C7B73] font-mono">
            <span>{formatTime(audioState.currentTime)}</span>
            <span>{formatTime(audioState.duration)}</span>
          </div>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center justify-center gap-6 mb-8">
          <button 
            onClick={() => seekAudio(Math.max(0, audioState.currentTime - 10))}
            className="text-[#8C7B73] hover:text-[#FAF0E6] transition-smooth cursor-pointer"
            title="Rewind 10s"
          >
            <SkipBack size={24} />
          </button>

          <button
            onClick={toggleAudioPlayPause}
            className="w-16 h-16 rounded-full bg-[#CDB891] text-[#2C2421] flex items-center justify-center hover:bg-[#F7E7CE] transition-smooth shadow-lg cursor-pointer"
          >
            {audioState.isPlaying ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" className="ml-1" />}
          </button>

          <button 
            onClick={() => seekAudio(Math.min(audioState.duration, audioState.currentTime + 10))}
            className="text-[#8C7B73] hover:text-[#FAF0E6] transition-smooth cursor-pointer"
            title="Forward 10s"
          >
            <SkipForward size={24} />
          </button>
        </div>

        {/* Speed Controls */}
        <div className="flex items-center justify-between border-t border-[#3A322D] pt-5">
          <div className="flex items-center gap-2 text-xs text-[#8C7B73]">
            <Gauge size={15} />
            <span>Speed</span>
          </div>
          <div className="flex items-center gap-1.5">
            {speedOptions.map((s) => (
              <button
                key={s}
                onClick={() => setAudioSpeed(s)}
                className={`text-xs px-2.5 py-1 rounded-lg transition-smooth ${
                  audioState.speed === s 
                    ? 'bg-[#CDB891] text-[#2C2421] font-semibold' 
                    : 'bg-[#3A322D] text-[#8C7B73] hover:text-[#FAF0E6]'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
