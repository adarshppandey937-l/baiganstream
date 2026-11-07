import React, { useRef, useEffect, useState, useCallback } from 'react';
import Hls from 'hls.js';
import { StreamInfo, StreamMetadata, DrmConfig } from '../types';
import { CustomControls } from './CustomControls';
import { SpeedAndQualityBar } from './SpeedAndQualityBar';
import { AudioBooster } from '../utils/audioBooster';
import {
  AlertCircle,
  RefreshCw,
  Play,
  VolumeX,
  Sparkles,
  ExternalLink,
  Layers,
  MonitorPlay,
  Film,
} from 'lucide-react';

interface VideoPlayerProps {
  streamInfo: StreamInfo;
  useProxy: boolean;
  onToggleProxy: (val: boolean) => void;
  metadata: StreamMetadata;
  onMetadataUpdate: (update: Partial<StreamMetadata>) => void;
  drmConfig: DrmConfig;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onShowDownloader: () => void;
  onSelectUrl: (newUrl: string) => void;
  activeCaptions?: { url: string; label?: string } | null;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  streamInfo,
  useProxy,
  onToggleProxy,
  metadata,
  onMetadataUpdate,
  drmConfig,
  videoRef,
  onShowDownloader,
  onSelectUrl,
  activeCaptions,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const audioBoosterRef = useRef<AudioBooster>(new AudioBooster());

  // Default to 'embed' for maximum compatibility (just like YouTube)
  const [playbackEngine, setPlaybackEngine] = useState<'embed' | 'studio' | 'native'>('embed');

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bufferedEnd, setBufferedEnd] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [audioBoost, setAudioBoost] = useState(1.0);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [currentQuality, setCurrentQuality] = useState<string>('Auto');
  const [isTheaterMode, setIsTheaterMode] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showControls, setShowControls] = useState(true);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const controlsTimeoutRef = useRef<number | null>(null);

  // Sync speed & quality messages from iframe
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data && e.data.type === 'SPEED_CHANGED' && typeof e.data.speed === 'number') {
        setPlaybackRate(e.data.speed);
      }
      if (e.data && e.data.type === 'QUALITY_CHANGED' && e.data.label) {
        setCurrentQuality(e.data.label);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Compute final effective source URL (taking proxy into account)
  const getPlayableUrl = useCallback(() => {
    if (!streamInfo.url) return '';
    if (streamInfo.sourceType === 'embed') return streamInfo.url;

    if (useProxy) {
      return `/api/proxy-stream?url=${encodeURIComponent(streamInfo.url)}`;
    }
    return streamInfo.url;
  }, [streamInfo.url, streamInfo.sourceType, useProxy]);

  // Clean up HLS on unmount or stream change
  const destroyHls = useCallback(() => {
    if (hlsRef.current) {
      try {
        hlsRef.current.stopLoad();
        hlsRef.current.detachMedia();
        hlsRef.current.destroy();
      } catch {
        // ignore
      }
      hlsRef.current = null;
    }
  }, []);

  // Initialize studio/native playback when not in embed mode
  useEffect(() => {
    if (playbackEngine === 'embed') {
      destroyHls();
      return;
    }

    const video = videoRef.current;
    if (!video || !streamInfo.url || streamInfo.sourceType === 'embed') {
      destroyHls();
      return;
    }

    setError(null);
    setIsLoading(false);
    setAutoplayBlocked(false);
    destroyHls();

    video.pause();
    video.removeAttribute('src');
    video.load();

    const targetUrl = getPlayableUrl();
    const isHls = streamInfo.type === 'hls' || targetUrl.includes('.m3u8');

    if (isHls && playbackEngine === 'studio' && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 120,
        maxBufferLength: 300, // 5 minutes ahead
        maxMaxBufferLength: 360, // 6 minutes max
        maxBufferSize: 300 * 1000 * 1000, // 300 MB
        maxBufferHole: 0.5,
        nudgeOffset: 0.2,
        nudgeMaxRetry: 10,
        fragLoadingMaxRetry: 6,
        manifestLoadingMaxRetry: 6,
        levelLoadingMaxRetry: 6,
        startFragPrefetch: true,
        testBandwidth: true,
      });

      hlsRef.current = hls;
      hls.attachMedia(video);
      hls.loadSource(targetUrl);

      hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
        setIsLoading(false);
        const levels = data.levels.map((lvl, idx) => ({
          id: idx,
          height: lvl.height,
          bitrate: lvl.bitrate,
          name: lvl.name || `${lvl.height}p`,
        }));

        onMetadataUpdate({
          levels,
          currentLevel: hls.currentLevel,
        });

        video.play().catch(() => {
          setAutoplayBlocked(true);
          setIsPlaying(false);
        });
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              if (!useProxy) {
                onToggleProxy(true);
                return;
              }
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              setError('Playback error. Switch to Embed Mode above.');
              destroyHls();
              break;
          }
        }
      });
    } else {
      // Native Player Fallback
      video.src = targetUrl;
      video.load();
      video.play().catch(() => {
        setAutoplayBlocked(true);
        setIsPlaying(false);
      });
    }

    return () => {
      destroyHls();
    };
  }, [
    streamInfo.url,
    streamInfo.type,
    streamInfo.sourceType,
    useProxy,
    playbackEngine,
    getPlayableUrl,
    destroyHls,
    onMetadataUpdate,
    onToggleProxy,
    videoRef,
  ]);

  // Handle video element events
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => {
      setIsPlaying(true);
      setAutoplayBlocked(false);
      setIsLoading(false);
      if (audioBoost > 1.0) {
        audioBoosterRef.current.attach(video);
        audioBoosterRef.current.setBoost(audioBoost);
      }
    };

    const handlePause = () => {
      setIsPlaying(false);
      setIsLoading(false);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      if (video.buffered.length > 0) {
        setBufferedEnd(video.buffered.end(video.buffered.length - 1));
      }
    };

    const handleDurationChange = () => {
      setDuration(video.duration);
      onMetadataUpdate({
        duration: video.duration,
        resolution: {
          width: video.videoWidth,
          height: video.videoHeight,
        },
      });
    };

    const handleLoadedMetadata = () => {
      setIsLoading(false);
      onMetadataUpdate({
        resolution: {
          width: video.videoWidth,
          height: video.videoHeight,
        },
      });
    };

    const handleWaiting = () => {
      // Only set loading if video is actively playing and waiting for buffer
      if (!video.paused) {
        setIsLoading(true);
      }
    };

    const handlePlaying = () => {
      setIsLoading(false);
      setIsPlaying(true);
    };

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('durationchange', handleDurationChange);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('playing', handlePlaying);

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('durationchange', handleDurationChange);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('playing', handlePlaying);
    };
  }, [audioBoost, onMetadataUpdate, videoRef]);

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      window.clearTimeout(controlsTimeoutRef.current);
    }
    if (isPlaying) {
      controlsTimeoutRef.current = window.setTimeout(() => {
        setShowControls(false);
      }, 3500);
    }
  };

  const handleTogglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  };

  const handleSeek = (newTime: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleVolumeChange = (newVol: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = newVol;
    setVolume(newVol);
    if (newVol > 0 && isMuted) {
      video.muted = false;
      setIsMuted(false);
    }
  };

  const handleToggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  const handleAudioBoostChange = (boostVal: number) => {
    setAudioBoost(boostVal);
    const video = videoRef.current;
    if (video && boostVal > 1.0) {
      audioBoosterRef.current.attach(video);
      audioBoosterRef.current.setBoost(boostVal);
    }
  };

  const handlePlaybackRateChange = (rate: number) => {
    setPlaybackRate(rate);
    const video = videoRef.current;
    if (video) {
      video.playbackRate = rate;
    }
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage({ type: 'SET_SPEED', speed: rate }, '*');
    }
  };

  const handleQualityChange = (label: string, height: number | 'auto') => {
    setCurrentQuality(label);
    const isBrightcoveStream = streamInfo.url.includes('6339453683112');
    const bBase =
      'https://d14v4v80cpjht7.cloudfront.net/file_library/videos/migration/brightcove/6339453683112';

    if (isBrightcoveStream) {
      if (height === 'auto') {
        onSelectUrl(`${bBase}/6339453683112.m3u8`);
      } else if (height >= 720) {
        onSelectUrl(`${bBase}/720p/720p.m3u8`);
      } else if (height >= 360) {
        onSelectUrl(`${bBase}/360p/360p.m3u8`);
      } else {
        onSelectUrl(`${bBase}/240p/240p.m3u8`);
      }
      return;
    }

    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        {
          type: 'SET_QUALITY_BY_HEIGHT',
          height: height,
          label: label,
        },
        '*'
      );
    }

    if (hlsRef.current) {
      if (height === 'auto') {
        hlsRef.current.currentLevel = -1;
      } else {
        const levels = hlsRef.current.levels;
        if (levels && levels.length > 0) {
          let bestIdx = 0;
          let minDiff = Infinity;
          levels.forEach((lvl, idx) => {
            const diff = Math.abs((lvl.height || 0) - (height as number));
            if (diff < minDiff) {
              minDiff = diff;
              bestIdx = idx;
            }
          });
          hlsRef.current.currentLevel = bestIdx;
        }
      }
    }
  };

  const handleSelectLevel = (levelIndex: number) => {
    if (hlsRef.current) {
      hlsRef.current.currentLevel = levelIndex;
      onMetadataUpdate({ currentLevel: levelIndex });
    }
  };

  const handleSelectAudioTrack = (trackIndex: number) => {
    if (hlsRef.current) {
      hlsRef.current.audioTrack = trackIndex;
      onMetadataUpdate({ currentAudioTrack: trackIndex });
    }
  };

  const handleSeekToLive = () => {
    if (hlsRef.current?.liveSyncPosition) {
      handleSeek(hlsRef.current.liveSyncPosition);
    }
  };

  const handleTakeSnapshot = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `snapshot_${Math.floor(video.currentTime)}s.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      alert('Snapshot unavailable in current mode. Use Downloader tab for direct captures.');
    }
  };

  const handleToggleTheater = () => setIsTheaterMode(!isTheaterMode);

  const handleToggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const handleTogglePip = async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (video.requestPictureInPicture) {
        await video.requestPictureInPicture();
      }
    } catch {
      // ignore
    }
  };

  const isBrightcove = streamInfo.url.includes('6339453683112');
  const brightcoveBase =
    'https://d14v4v80cpjht7.cloudfront.net/file_library/videos/migration/brightcove/6339453683112';

  const isLiveStream =
    duration === Infinity ||
    (hlsRef.current?.levels?.[hlsRef.current?.currentLevel || 0]?.details?.live ?? false);

  return (
    <div className="space-y-3">
      {/* Playback Mode Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1 text-xs">
        {/* Mode Selector Buttons */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800">
          <button
            onClick={() => setPlaybackEngine('embed')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors ${
              playbackEngine === 'embed'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Isolated Embed Player (100% compatible like YouTube iframe)"
          >
            <MonitorPlay className="h-3.5 w-3.5" />
            <span>Embed Player (YouTube Style)</span>
          </button>

          <button
            onClick={() => setPlaybackEngine('native')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors ${
              playbackEngine === 'native'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Browser's native video controls directly"
          >
            <Film className="h-3.5 w-3.5" />
            <span>Native Browser Controls</span>
          </button>

          <button
            onClick={() => setPlaybackEngine('studio')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors ${
              playbackEngine === 'studio'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Studio custom controls with snapshot & boost"
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Studio Custom Player</span>
          </button>
        </div>

        {/* Verification Link */}
        <a
          href={streamInfo.url}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
          title="Open raw stream link in Google / new browser window"
        >
          <span>Open in Google Tab</span>
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>

      {/* Direct Resolution Links for Brightcove stream */}
      {isBrightcove && (
        <div className="flex flex-wrap items-center gap-2 p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs">
          <span className="text-slate-400 font-medium">Resolutions:</span>
          <button
            onClick={() => onSelectUrl(`${brightcoveBase}/720p/720p.m3u8`)}
            className={`px-2.5 py-1 rounded-md font-mono transition-colors ${
              streamInfo.url.includes('720p.m3u8')
                ? 'bg-emerald-600 text-white font-bold'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            720p HD
          </button>
          <button
            onClick={() => onSelectUrl(`${brightcoveBase}/360p/360p.m3u8`)}
            className={`px-2.5 py-1 rounded-md font-mono transition-colors ${
              streamInfo.url.includes('360p.m3u8')
                ? 'bg-emerald-600 text-white font-bold'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            360p SD
          </button>
          <button
            onClick={() => onSelectUrl(`${brightcoveBase}/240p/240p.m3u8`)}
            className={`px-2.5 py-1 rounded-md font-mono transition-colors ${
              streamInfo.url.includes('240p.m3u8')
                ? 'bg-emerald-600 text-white font-bold'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            240p Low
          </button>
          <button
            onClick={() => onSelectUrl(`${brightcoveBase}/6339453683112.m3u8`)}
            className={`px-2.5 py-1 rounded-md font-mono transition-colors ${
              streamInfo.url.endsWith('6339453683112.m3u8')
                ? 'bg-indigo-600 text-white font-bold'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Master (Auto)
          </button>
        </div>
      )}

      {/* Main Video Viewport */}
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        className={`relative overflow-hidden rounded-2xl bg-black border border-slate-800 shadow-2xl transition-all duration-300 ${
          isTheaterMode
            ? 'w-full h-[75vh]'
            : 'aspect-video w-full max-w-5xl mx-auto'
        }`}
      >
        {/* 1. YouTube / Vimeo / Dailymotion Embed */}
        {streamInfo.sourceType === 'embed' ? (
          <div className="relative h-full w-full bg-slate-950 flex flex-col justify-between">
            <div className="relative flex-1 w-full h-full">
              {streamInfo.type === 'youtube' && streamInfo.youtubeId && (
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${streamInfo.youtubeId}?autoplay=1&rel=0&modestbranding=1`}
                  title="YouTube Video Player"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  className="h-full w-full border-0"
                />
              )}
              {streamInfo.type === 'vimeo' && streamInfo.vimeoId && (
                <iframe
                  src={`https://player.vimeo.com/video/${streamInfo.vimeoId}?autoplay=1`}
                  title="Vimeo Video Player"
                  allow="autoplay; fullscreen; picture-in-picture"
                  allowFullScreen
                  className="h-full w-full border-0"
                />
              )}
            </div>
            <div className="flex items-center justify-between border-t border-slate-800 bg-slate-900/95 px-4 py-2.5 text-xs text-slate-300">
              <span className="font-semibold text-white">{streamInfo.title || 'Embed Video'}</span>
              <button
                onClick={onShowDownloader}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Download & Recording Tools</span>
              </button>
            </div>
          </div>
        ) : playbackEngine === 'embed' ? (
          /* 2. Isolated Embed Player for ANY URL (YouTube iframe style) */
          <div className="relative h-full w-full bg-black">
            <iframe
              ref={iframeRef}
              key={streamInfo.url + (activeCaptions?.url || '')}
              src={`/embed.html?url=${encodeURIComponent(streamInfo.url)}${
                activeCaptions?.url
                  ? `&captions=${encodeURIComponent(activeCaptions.url)}&captionsLabel=${encodeURIComponent(activeCaptions.label || 'Subtitles')}`
                  : ''
              }`}
              title="Stream Embed Player"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="h-full w-full border-0"
            />
          </div>
        ) : playbackEngine === 'native' ? (
          /* 3. Direct Native Browser Video Element (<video controls>) */
          <div className="relative h-full w-full bg-black flex items-center justify-center">
            <video
              ref={videoRef}
              src={streamInfo.url}
              controls
              playsInline
              className="h-full w-full object-contain"
            >
              {activeCaptions?.url && (
                <track
                  kind="subtitles"
                  src={activeCaptions.url}
                  label={activeCaptions.label || 'Subtitles'}
                  default
                />
              )}
            </video>
          </div>
        ) : (
          /* 4. Studio Custom Player */
          <div className="relative h-full w-full">
            <video
              ref={videoRef}
              onClick={handleTogglePlay}
              playsInline
              className="h-full w-full object-contain cursor-pointer"
            >
              {activeCaptions?.url && (
                <track
                  kind="subtitles"
                  src={activeCaptions.url}
                  label={activeCaptions.label || 'Subtitles'}
                  default
                />
              )}
            </video>

            {/* Always visible Center Play Button when paused */}
            {!isPlaying && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTogglePlay();
                  }}
                  className="pointer-events-auto flex items-center justify-center h-20 w-20 rounded-full bg-indigo-600 text-white shadow-2xl shadow-indigo-600/50 hover:scale-110 hover:bg-indigo-500 active:scale-95 transition-all"
                  title="Click to Play"
                >
                  <Play className="h-9 w-9 fill-white ml-1" />
                </button>
              </div>
            )}

            {autoplayBlocked && !isPlaying && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 rounded-full bg-slate-900/90 border border-slate-700 px-4 py-1.5 text-xs text-slate-200 shadow-xl">
                <VolumeX className="h-4 w-4 text-amber-400" />
                <span>Tap the center Play button to start video!</span>
              </div>
            )}

            {/* Custom Controls Overlay */}
            <div
              className={`transition-opacity duration-300 ${
                showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
            >
              <CustomControls
                isPlaying={isPlaying}
                onTogglePlay={handleTogglePlay}
                currentTime={currentTime}
                duration={duration}
                bufferedEnd={bufferedEnd}
                onSeek={handleSeek}
                volume={volume}
                isMuted={isMuted}
                onVolumeChange={handleVolumeChange}
                onToggleMute={handleToggleMute}
                audioBoost={audioBoost}
                onAudioBoostChange={handleAudioBoostChange}
                playbackRate={playbackRate}
                onPlaybackRateChange={handlePlaybackRateChange}
                isLive={isLiveStream}
                onSeekToLive={handleSeekToLive}
                metadata={metadata}
                onSelectLevel={handleSelectLevel}
                onSelectAudioTrack={handleSelectAudioTrack}
                onTakeSnapshot={handleTakeSnapshot}
                isTheaterMode={isTheaterMode}
                onToggleTheater={handleToggleTheater}
                isFullscreen={isFullscreen}
                onToggleFullscreen={handleToggleFullscreen}
                onTogglePip={handleTogglePip}
              />
            </div>
          </div>
        )}
      </div>

      {/* Speed (0.5x, 1x, 1.25x, 2x) & Quality (144p to 1080p, Auto) Control Bar */}
      <SpeedAndQualityBar
        currentSpeed={playbackRate}
        onSpeedChange={handlePlaybackRateChange}
        currentQuality={currentQuality}
        onQualityChange={handleQualityChange}
      />
    </div>
  );
};
