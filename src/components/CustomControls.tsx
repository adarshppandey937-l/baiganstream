import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Camera,
  PictureInPicture,
  Tv,
  Settings,
  Zap,
} from 'lucide-react';
import { StreamMetadata } from '../types';

interface CustomControlsProps {
  isPlaying: boolean;
  onTogglePlay: () => void;
  currentTime: number;
  duration: number;
  bufferedEnd: number;
  onSeek: (time: number) => void;
  volume: number;
  isMuted: boolean;
  onVolumeChange: (vol: number) => void;
  onToggleMute: () => void;
  audioBoost: number;
  onAudioBoostChange: (boost: number) => void;
  playbackRate: number;
  onPlaybackRateChange: (rate: number) => void;
  isLive: boolean;
  onSeekToLive: () => void;
  metadata: StreamMetadata;
  onSelectLevel: (levelIndex: number) => void;
  onSelectAudioTrack: (trackIndex: number) => void;
  onTakeSnapshot: () => void;
  isTheaterMode: boolean;
  onToggleTheater: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onTogglePip: () => void;
}

export const CustomControls: React.FC<CustomControlsProps> = ({
  isPlaying,
  onTogglePlay,
  currentTime,
  duration,
  bufferedEnd,
  onSeek,
  volume,
  isMuted,
  onVolumeChange,
  onToggleMute,
  audioBoost,
  onAudioBoostChange,
  playbackRate,
  onPlaybackRateChange,
  isLive,
  onSeekToLive,
  metadata,
  onSelectLevel,
  onSelectAudioTrack,
  onTakeSnapshot,
  isTheaterMode,
  onToggleTheater,
  isFullscreen,
  onToggleFullscreen,
  onTogglePip,
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPosition, setHoverPosition] = useState<number>(0);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);

  // Close settings popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setShowSettings(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return '00:00';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins
        .toString()
        .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleProgressMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || duration <= 0) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHoverPosition(e.clientX - rect.left);
    setHoverTime(pos * duration);
  };

  const handleProgressMouseLeave = () => {
    setHoverTime(null);
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || duration <= 0) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    onSeek(pos * duration);
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferPercent = duration > 0 ? (bufferedEnd / duration) * 100 : 0;

  return (
    <div className="absolute inset-x-0 bottom-0 z-30 flex flex-col justify-end bg-gradient-to-t from-black/90 via-black/50 to-transparent p-3 sm:p-4 text-white select-none transition-opacity duration-300">
      {/* Timeline Scrub Bar */}
      {!isLive && (
        <div
          ref={progressBarRef}
          onMouseMove={handleProgressMouseMove}
          onMouseLeave={handleProgressMouseLeave}
          onClick={handleProgressClick}
          className="group/progress relative h-2.5 w-full cursor-pointer rounded-full bg-white/20 hover:h-3.5 transition-all mb-3"
        >
          {/* Buffered Progress */}
          <div
            className="absolute left-0 top-0 h-full rounded-full bg-white/30 transition-all pointer-events-none"
            style={{ width: `${Math.min(100, bufferPercent)}%` }}
          />

          {/* Current Played Progress */}
          <div
            className="absolute left-0 top-0 h-full rounded-full bg-indigo-500 shadow-sm shadow-indigo-500/50 pointer-events-none"
            style={{ width: `${Math.min(100, progressPercent)}%` }}
          >
            {/* Scrubber thumb */}
            <div className="absolute right-0 top-1/2 -translate-y-1/2 h-3.5 w-3.5 rounded-full bg-white shadow-md scale-0 group-hover/progress:scale-100 transition-transform" />
          </div>

          {/* Hover Time Tooltip */}
          {hoverTime !== null && (
            <div
              className="absolute -top-7 -translate-x-1/2 rounded bg-slate-900/95 px-2 py-0.5 text-[11px] font-mono text-white shadow-md border border-slate-700 pointer-events-none"
              style={{ left: `${hoverPosition}px` }}
            >
              {formatTime(hoverTime)}
            </div>
          )}
        </div>
      )}

      {/* Controls Row */}
      <div className="flex items-center justify-between gap-2 sm:gap-4">
        {/* Left Section: Playback & Volume */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Play / Pause */}
          <button
            onClick={onTogglePlay}
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
            title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
          >
            {isPlaying ? (
              <Pause className="h-4 w-4 fill-white" />
            ) : (
              <Play className="h-4 w-4 fill-white ml-0.5" />
            )}
          </button>

          {/* Jump Backward 10s */}
          <button
            onClick={() => onSeek(Math.max(0, currentTime - 10))}
            className="hidden sm:flex h-8 w-8 items-center justify-center rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
            title="Rewind 10 seconds (Left Arrow)"
          >
            <RotateCcw className="h-4 w-4" />
          </button>

          {/* Jump Forward 10s */}
          <button
            onClick={() => onSeek(Math.min(duration, currentTime + 10))}
            className="hidden sm:flex h-8 w-8 items-center justify-center rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
            title="Fast Forward 10 seconds (Right Arrow)"
          >
            <RotateCw className="h-4 w-4" />
          </button>

          {/* Volume Control */}
          <div className="group/volume relative flex items-center gap-2">
            <button
              onClick={onToggleMute}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
              title={isMuted ? 'Unmute (M)' : 'Mute (M)'}
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="h-4 w-4 text-red-400" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </button>

            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={isMuted ? 0 : volume}
              onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
              className="w-14 sm:w-20 h-1 rounded-lg cursor-pointer bg-white/30"
              title={`Volume: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
            />

            {/* Audio Booster 200% Indicator */}
            {audioBoost > 1.0 && (
              <span className="text-[10px] font-mono font-bold text-amber-400 flex items-center" title="Volume Boost Active">
                <Zap className="h-3 w-3 inline" />
                {Math.round(audioBoost * 100)}%
              </span>
            )}
          </div>

          {/* Time Display */}
          <div className="text-xs font-mono text-slate-300 tabular-nums">
            {isLive ? (
              <button
                onClick={onSeekToLive}
                className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-red-600/80 hover:bg-red-600 text-white font-bold transition-colors"
              >
                <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
                <span>LIVE</span>
              </button>
            ) : (
              <span>
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            )}
          </div>
        </div>

        {/* Right Section: Speed, Quality, Tools & Screen Modes */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Snapshot Button */}
          <button
            onClick={onTakeSnapshot}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
            title="Take High-Res Video Snapshot (S)"
          >
            <Camera className="h-4 w-4" />
          </button>

          {/* Settings & Quality Menu */}
          <div className="relative" ref={settingsRef}>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                showSettings
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
              title="Stream Settings & Quality"
            >
              <Settings className="h-4 w-4" />
            </button>

            {/* Settings Dropdown Popover */}
            {showSettings && (
              <div className="absolute right-0 bottom-10 z-40 w-64 rounded-xl border border-slate-700 bg-slate-900/95 p-3 text-xs shadow-2xl backdrop-blur-md">
                <div className="space-y-3">
                  {/* Playback Speed */}
                  <div>
                    <div className="font-semibold text-slate-300 mb-1.5">Playback Speed</div>
                    <div className="grid grid-cols-4 gap-1">
                      {[0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map((rate) => (
                        <button
                          key={rate}
                          onClick={() => onPlaybackRateChange(rate)}
                          className={`px-2 py-1 rounded text-center font-mono transition-colors ${
                            playbackRate === rate
                              ? 'bg-indigo-600 text-white font-bold'
                              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                          }`}
                        >
                          {rate}x
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Audio Amplifier (Web Audio API Boost) */}
                  <div className="border-t border-slate-800 pt-2.5">
                    <div className="flex items-center justify-between font-semibold text-slate-300 mb-1.5">
                      <span className="flex items-center gap-1">
                        <Zap className="h-3.5 w-3.5 text-amber-400" />
                        Audio Boost (Gain)
                      </span>
                      <span className="text-amber-400 font-mono">
                        {Math.round(audioBoost * 100)}%
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {[1.0, 1.3, 1.6, 2.0].map((boostVal) => (
                        <button
                          key={boostVal}
                          onClick={() => onAudioBoostChange(boostVal)}
                          className={`flex-1 py-1 rounded text-center font-mono transition-colors ${
                            audioBoost === boostVal
                              ? 'bg-amber-600 text-white font-bold'
                              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                          }`}
                        >
                          {boostVal === 1.0 ? 'Normal' : `${Math.round(boostVal * 100)}%`}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Quality / Resolution Levels (HLS) */}
                  {metadata.levels && metadata.levels.length > 0 && (
                    <div className="border-t border-slate-800 pt-2.5">
                      <div className="font-semibold text-slate-300 mb-1.5">
                        Stream Quality (HLS)
                      </div>
                      <div className="max-h-32 overflow-y-auto space-y-1">
                        <button
                          onClick={() => onSelectLevel(-1)}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded transition-colors ${
                            metadata.currentLevel === -1
                              ? 'bg-indigo-600 text-white font-medium'
                              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                          }`}
                        >
                          <span>Auto (Adaptive Bitrate)</span>
                          {metadata.currentLevel === -1 && <span>✓</span>}
                        </button>
                        {metadata.levels.map((lvl) => (
                          <button
                            key={lvl.id}
                            onClick={() => onSelectLevel(lvl.id)}
                            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded transition-colors ${
                              metadata.currentLevel === lvl.id
                                ? 'bg-indigo-600 text-white font-medium'
                              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                            }`}
                          >
                            <span>
                              {lvl.height ? `${lvl.height}p` : `${lvl.name}`}
                              {lvl.bitrate
                                ? ` (${(lvl.bitrate / 1000000).toFixed(1)} Mbps)`
                                : ''}
                            </span>
                            {metadata.currentLevel === lvl.id && <span>✓</span>}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Audio Tracks (Multi-Audio Streams) */}
                  {metadata.audioTracks && metadata.audioTracks.length > 1 && (
                    <div className="border-t border-slate-800 pt-2.5">
                      <div className="font-semibold text-slate-300 mb-1.5">Audio Track</div>
                      <div className="space-y-1">
                        {metadata.audioTracks.map((trk) => (
                          <button
                            key={trk.id}
                            onClick={() => onSelectAudioTrack(trk.id)}
                            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded transition-colors ${
                              metadata.currentAudioTrack === trk.id
                                ? 'bg-indigo-600 text-white font-medium'
                                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                            }`}
                          >
                            <span>{trk.name || `Track ${trk.id + 1}`}</span>
                            {metadata.currentAudioTrack === trk.id && <span>✓</span>}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Picture-in-Picture */}
          <button
            onClick={onTogglePip}
            className="hidden sm:flex h-8 w-8 items-center justify-center rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
            title="Picture-in-Picture"
          >
            <PictureInPicture className="h-4 w-4" />
          </button>

          {/* Theater Mode */}
          <button
            onClick={onToggleTheater}
            className={`hidden sm:flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
              isTheaterMode
                ? 'bg-indigo-600 text-white'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
            title="Theater Mode (T)"
          >
            <Tv className="h-4 w-4" />
          </button>

          {/* Fullscreen */}
          <button
            onClick={onToggleFullscreen}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
            title={isFullscreen ? 'Exit Fullscreen (F)' : 'Fullscreen (F)'}
          >
            {isFullscreen ? (
              <Minimize className="h-4 w-4" />
            ) : (
              <Maximize className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
