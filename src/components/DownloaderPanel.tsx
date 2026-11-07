import React, { useState, useRef, useEffect } from 'react';
import {
  Download,
  Video,
  Disc,
  Music,
  Terminal,
  Check,
  Copy,
  AlertTriangle,
  FileVideo,
  Pause,
  StopCircle,
  ExternalLink,
} from 'lucide-react';
import { StreamInfo, DownloadState } from '../types';
import { HlsDownloader } from '../utils/hlsDownloader';
import { getFilenameFromUrl } from '../utils/streamDetector';

interface DownloaderPanelProps {
  streamInfo: StreamInfo;
  useProxy: boolean;
  videoRef: React.RefObject<HTMLVideoElement | null>;
}

export const DownloaderPanel: React.FC<DownloaderPanelProps> = ({
  streamInfo,
  useProxy,
  videoRef,
}) => {
  const [downloadState, setDownloadState] = useState<DownloadState>({
    status: 'idle',
    progress: 0,
    downloadedBytes: 0,
    currentSegment: 0,
    totalSegments: 0,
    speed: '0 KB/s',
  });

  const hlsDownloaderRef = useRef<HlsDownloader | null>(null);

  // Recorder states
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordedBlobUrl, setRecordedBlobUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<number | null>(null);

  // Command copy states
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  // Cancel HLS download on unmount
  useEffect(() => {
    return () => {
      if (hlsDownloaderRef.current) {
        hlsDownloaderRef.current.cancel();
      }
      if (recordTimerRef.current) {
        clearInterval(recordTimerRef.current);
      }
    };
  }, []);

  const filename = getFilenameFromUrl(
    streamInfo.url,
    streamInfo.type === 'hls' ? 'stream_video.ts' : 'video.mp4'
  );

  // 1. Direct Server-Side Stream Download (Bypasses CORS)
  const handleDirectDownload = () => {
    const downloadUrl = `/api/download?url=${encodeURIComponent(
      streamInfo.url
    )}&filename=${encodeURIComponent(filename)}`;
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // 2. In-Browser HLS Multi-Segment Downloader
  const handleStartHlsDownload = async () => {
    if (!hlsDownloaderRef.current) {
      hlsDownloaderRef.current = new HlsDownloader();
    }

    const blob = await hlsDownloaderRef.current.startDownload(
      streamInfo.url,
      filename.replace('.m3u8', ''),
      useProxy,
      (state) => {
        setDownloadState(state);
      }
    );

    if (blob) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename.endsWith('.ts') ? filename : `${filename}.ts`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const handleCancelHlsDownload = () => {
    if (hlsDownloaderRef.current) {
      hlsDownloaderRef.current.cancel();
    }
  };

  // 3. Live Stream / Canvas Video Recorder
  const handleStartRecording = () => {
    const video = videoRef.current;
    if (!video) {
      alert('Play the video first to start recording!');
      return;
    }

    try {
      let stream: MediaStream | null = null;
      if ((video as any).captureStream) {
        stream = (video as any).captureStream();
      } else if ((video as any).mozCaptureStream) {
        stream = (video as any).mozCaptureStream();
      }

      if (!stream) {
        alert(
          'Media captureStream is not supported by your browser for this element. Try recording on Chrome or Firefox.'
        );
        return;
      }

      recordedChunksRef.current = [];
      const mimeTypes = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm',
        'video/mp4',
      ];
      let selectedMime = 'video/webm';
      for (const m of mimeTypes) {
        if (MediaRecorder.isTypeSupported(m)) {
          selectedMime = m;
          break;
        }
      }

      const recorder = new MediaRecorder(stream, { mimeType: selectedMime });
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, {
          type: selectedMime,
        });
        const url = URL.createObjectURL(blob);
        setRecordedBlobUrl(url);
      };

      recorder.start(1000); // 1-second chunks
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingSeconds(0);

      recordTimerRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      alert(`Recording failed: ${err.message || 'Stream security restriction'}`);
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordTimerRef.current) {
        clearInterval(recordTimerRef.current);
      }
    }
  };

  const handleDownloadRecording = () => {
    if (!recordedBlobUrl) return;
    const a = document.createElement('a');
    a.href = recordedBlobUrl;
    a.download = `recorded_stream_${Date.now()}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleCopyCmd = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(id);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  const formatSec = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const isHls = streamInfo.type === 'hls' || streamInfo.url.includes('.m3u8');
  const isEmbed = streamInfo.sourceType === 'embed';

  // Commands for CLI tools
  const ffmpegCmd = `ffmpeg -i "${streamInfo.url}" -c copy -bsf:a aac_adtstoasc "output.mp4"`;
  const ytdlpCmd = `yt-dlp "${streamInfo.url}" -f "bestvideo+bestaudio/best"`;
  const streamlinkCmd = `streamlink "${streamInfo.url}" best -o "stream.ts"`;

  return (
    <div className="w-full space-y-6">
      {/* Title & Scope */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Download className="h-5 w-5 text-emerald-400" />
            Universal Stream Downloader & Recorder
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Multiple high-speed options to download, extract, record, and save any video format.
          </p>
        </div>

        <div className="text-xs text-slate-500 font-mono">
          <span>Target: </span>
          <span className="text-slate-300 truncate max-w-xs inline-block align-bottom font-medium">
            {filename}
          </span>
        </div>
      </div>

      {/* Downloader Methods Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Method 1: HLS Segment Downloader or Direct Video Downloader */}
        <div className="flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-900/60 p-5 hover:border-slate-700 transition-colors">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-950/80 text-emerald-400 border border-emerald-800/60">
                <FileVideo className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">
                  {isHls ? 'HLS Segment Merger' : 'Direct Video Download'}
                </h4>
                <span className="text-[11px] text-slate-400">
                  {isHls ? 'M3U8 Multi-Segment Pipeline' : 'Server-side Stream Pipe'}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              {isHls
                ? 'Downloads all TS video chunks in parallel batches, stitches them in memory, and produces a complete .ts/.mp4 video file.'
                : 'Directly streams the source video to your downloads folder while bypassing CORS restrictions.'}
            </p>

            {/* HLS Progress Bar if active */}
            {isHls && downloadState.status !== 'idle' && (
              <div className="space-y-2 rounded-lg bg-slate-950 p-3 border border-slate-800">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-emerald-400">
                    {downloadState.status === 'downloading'
                      ? `Downloading (${downloadState.progress}%)`
                      : downloadState.status === 'merging'
                      ? 'Merging Segments...'
                      : downloadState.status === 'completed'
                      ? 'Download Complete!'
                      : 'Error'}
                  </span>
                  <span className="font-mono text-slate-400">
                    {downloadState.currentSegment}/{downloadState.totalSegments} Segs
                  </span>
                </div>

                <div className="relative h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-200"
                    style={{ width: `${downloadState.progress}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                  <span>
                    {(downloadState.downloadedBytes / (1024 * 1024)).toFixed(1)} MB
                  </span>
                  <span>{downloadState.speed}</span>
                </div>

                {downloadState.error && (
                  <p className="text-[11px] text-red-400">{downloadState.error}</p>
                )}
              </div>
            )}
          </div>

          <div className="pt-4">
            {isHls ? (
              downloadState.status === 'downloading' ? (
                <button
                  onClick={handleCancelHlsDownload}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-red-600/80 hover:bg-red-600 text-white text-xs font-semibold transition-colors"
                >
                  <Pause className="h-3.5 w-3.5" />
                  <span>Cancel Download</span>
                </button>
              ) : (
                <button
                  onClick={handleStartHlsDownload}
                  disabled={!streamInfo.url}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md shadow-emerald-600/20 transition-all"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download Full HLS Video</span>
                </button>
              )
            ) : (
              <button
                onClick={handleDirectDownload}
                disabled={!streamInfo.url || isEmbed}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md shadow-emerald-600/20 transition-all"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Download MP4 Video</span>
              </button>
            )}
          </div>
        </div>

        {/* Method 2: Live Stream Video Recorder */}
        <div className="flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-900/60 p-5 hover:border-slate-700 transition-colors">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-950/80 text-red-400 border border-red-800/60">
                <Disc className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">Stream Screen Recorder</h4>
                <span className="text-[11px] text-slate-400">
                  MediaStream & Canvas Capture
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Captures any video and audio currently playing inside the player in real-time. Works
              flawlessly for live streams, protected content, and custom canvas feeds.
            </p>

            {/* Recording Active Status */}
            {isRecording && (
              <div className="flex items-center justify-between rounded-lg bg-red-950/60 border border-red-800/80 p-3">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-500 animate-ping" />
                  <span className="text-xs font-bold text-red-400 font-mono">
                    REC: {formatSec(recordingSeconds)}
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 font-mono">WebM 1080p</span>
              </div>
            )}

            {recordedBlobUrl && !isRecording && (
              <div className="rounded-lg bg-emerald-950/50 border border-emerald-800/60 p-2.5 text-xs text-emerald-300 flex items-center justify-between">
                <span>Capture ready to save!</span>
                <button
                  onClick={handleDownloadRecording}
                  className="font-bold underline hover:text-white"
                >
                  Save File
                </button>
              </div>
            )}
          </div>

          <div className="pt-4 space-y-2">
            {isRecording ? (
              <button
                onClick={handleStopRecording}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow-md shadow-red-600/30 transition-all"
              >
                <StopCircle className="h-4 w-4" />
                <span>Stop & Save Recording</span>
              </button>
            ) : (
              <button
                onClick={handleStartRecording}
                disabled={isEmbed}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white text-xs font-semibold border border-slate-700 transition-all"
              >
                <Video className="h-3.5 w-3.5 text-red-400" />
                <span>Start Stream Recording</span>
              </button>
            )}
          </div>
        </div>

        {/* Method 3: CLI / Power Tool Generator */}
        <div className="flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-900/60 p-5 hover:border-slate-700 transition-colors">
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-950/80 text-indigo-400 border border-indigo-800/60">
                <Terminal className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">CLI Downloader Generator</h4>
                <span className="text-[11px] text-slate-400">yt-dlp · FFmpeg · Streamlink</span>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Generate ready-to-run terminal commands tailored specifically to this URL to download
              with maximum bandwidth or decode protected DRM streams.
            </p>

            {/* Quick Command Snippets */}
            <div className="space-y-2 text-xs">
              <div className="rounded-lg bg-slate-950 p-2 border border-slate-800">
                <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                  <span className="font-semibold text-slate-300">yt-dlp (YouTube & 1000+ sites)</span>
                  <button
                    onClick={() => handleCopyCmd(ytdlpCmd, 'ytdlp')}
                    className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                  >
                    {copiedCmd === 'ytdlp' ? (
                      <Check className="h-3 w-3 text-emerald-400" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                    <span>{copiedCmd === 'ytdlp' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <code className="block font-mono text-[10px] text-slate-300 truncate">
                  {ytdlpCmd}
                </code>
              </div>

              <div className="rounded-lg bg-slate-950 p-2 border border-slate-800">
                <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                  <span className="font-semibold text-slate-300">FFmpeg (HLS Stream Dump)</span>
                  <button
                    onClick={() => handleCopyCmd(ffmpegCmd, 'ffmpeg')}
                    className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                  >
                    {copiedCmd === 'ffmpeg' ? (
                      <Check className="h-3 w-3 text-emerald-400" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                    <span>{copiedCmd === 'ffmpeg' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <code className="block font-mono text-[10px] text-slate-300 truncate">
                  {ffmpegCmd}
                </code>
              </div>
            </div>
          </div>

          <div className="pt-4">
            <button
              onClick={() => handleCopyCmd(streamlinkCmd, 'streamlink')}
              className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700 transition-colors"
            >
              <Copy className="h-3.5 w-3.5" />
              <span>Copy Streamlink Command</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
