import React, { useState, useEffect } from 'react';
import {
  Activity,
  Layers,
  Server,
  FileCode,
  Gauge,
  Radio,
  RefreshCw,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { StreamInfo, StreamMetadata } from '../types';

interface StreamInspectorProps {
  streamInfo: StreamInfo;
  metadata: StreamMetadata;
  useProxy: boolean;
  videoRef: React.RefObject<HTMLVideoElement | null>;
}

export const StreamInspector: React.FC<StreamInspectorProps> = ({
  streamInfo,
  metadata,
  useProxy,
  videoRef,
}) => {
  const [serverHeaders, setServerHeaders] = useState<any>(null);
  const [isLoadingHeaders, setIsLoadingHeaders] = useState(false);
  const [manifestText, setManifestText] = useState<string | null>(null);
  const [isLoadingManifest, setIsLoadingManifest] = useState(false);

  // Fetch server headers via backend inspect route
  const fetchInspection = async () => {
    if (!streamInfo.url || streamInfo.sourceType === 'embed') return;
    setIsLoadingHeaders(true);
    try {
      const res = await fetch(
        `/api/inspect?url=${encodeURIComponent(streamInfo.url)}`
      );
      if (res.ok) {
        const data = await res.json();
        setServerHeaders(data);
      }
    } catch {
      // ignore
    } finally {
      setIsLoadingHeaders(false);
    }
  };

  // Fetch playlist / manifest content
  const fetchManifest = async () => {
    if (!streamInfo.url.includes('.m3u8') && !streamInfo.url.includes('.mpd')) {
      return;
    }
    setIsLoadingManifest(true);
    try {
      const fetchUrl = useProxy
        ? `/api/proxy-stream?url=${encodeURIComponent(streamInfo.url)}`
        : streamInfo.url;
      const res = await fetch(fetchUrl);
      if (res.ok) {
        const text = await res.text();
        setManifestText(text);
      }
    } catch {
      // Fallback through proxy
      try {
        const res = await fetch(
          `/api/proxy-stream?url=${encodeURIComponent(streamInfo.url)}`
        );
        if (res.ok) {
          const text = await res.text();
          setManifestText(text);
        }
      } catch {
        // Failed
      }
    } finally {
      setIsLoadingManifest(false);
    }
  };

  useEffect(() => {
    fetchInspection();
    fetchManifest();
  }, [streamInfo.url, useProxy]);

  const video = videoRef.current;
  const videoWidth = metadata.resolution?.width || video?.videoWidth || 0;
  const videoHeight = metadata.resolution?.height || video?.videoHeight || 0;

  return (
    <div className="w-full space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Activity className="h-5 w-5 text-amber-400" />
            Stream Telemetry & Technical Inspector
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Deep diagnostic inspection of video resolution, codecs, bitrates, buffer health, and HTTP server headers.
          </p>
        </div>

        <button
          onClick={() => {
            fetchInspection();
            fetchManifest();
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900 text-xs font-medium text-slate-300 hover:text-white transition-colors"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoadingHeaders ? 'animate-spin' : ''}`} />
          <span>Refresh Telemetry</span>
        </button>
      </div>

      {/* Metrics Row (Zero-Pill Discipline, clean tabular data) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Metric 1: Resolution */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
            <Gauge className="h-4 w-4 text-indigo-400" />
            <span>Resolution</span>
          </div>
          <div className="mt-2 text-xl font-bold font-mono text-white tabular-nums">
            {videoWidth > 0 ? `${videoWidth} × ${videoHeight}` : 'Probing...'}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            {videoWidth > 0
              ? `${(videoWidth / (videoHeight || 1)).toFixed(2)}:1 Aspect Ratio`
              : 'Awaiting metadata'}
          </div>
        </div>

        {/* Metric 2: Stream Duration / Mode */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
            <Radio className="h-4 w-4 text-emerald-400" />
            <span>Stream Mode</span>
          </div>
          <div className="mt-2 text-xl font-bold font-mono text-white">
            {metadata.duration === Infinity ? 'LIVE STREAM' : 'VOD (Recorded)'}
          </div>
          <div className="mt-1 text-[11px] text-slate-400 font-mono">
            {metadata.duration && metadata.duration !== Infinity
              ? `${Math.floor(metadata.duration / 60)}m ${Math.floor(metadata.duration % 60)}s length`
              : 'Sliding live window'}
          </div>
        </div>

        {/* Metric 3: Active Quality Levels */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
            <Layers className="h-4 w-4 text-amber-400" />
            <span>Available Bitrates</span>
          </div>
          <div className="mt-2 text-xl font-bold font-mono text-white tabular-nums">
            {metadata.levels && metadata.levels.length > 0
              ? `${metadata.levels.length} Variants`
              : 'Single Bitrate'}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            {metadata.currentLevel !== undefined && metadata.currentLevel >= 0
              ? `Locked to Level #${metadata.currentLevel + 1}`
              : 'Adaptive Bitrate (ABR)'}
          </div>
        </div>

        {/* Metric 4: Server Status */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
            <Server className="h-4 w-4 text-cyan-400" />
            <span>Server Response</span>
          </div>
          <div className="mt-2 text-xl font-bold font-mono text-white flex items-center gap-2">
            {serverHeaders ? (
              serverHeaders.statusCode === 200 || serverHeaders.statusCode === 206 ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  <span>HTTP {serverHeaders.statusCode}</span>
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-amber-400" />
                  <span>HTTP {serverHeaders.statusCode || 'Err'}</span>
                </>
              )
            ) : (
              'Checking...'
            )}
          </div>
          <div className="mt-1 text-[11px] text-slate-400 truncate">
            {serverHeaders?.server ? `Server: ${serverHeaders.server}` : 'Direct connection'}
          </div>
        </div>
      </div>

      {/* HTTP Server Headers & Technical Specifications */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Server Diagnostic Details */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-3">
          <h4 className="text-sm font-semibold text-white flex items-center gap-2">
            <Server className="h-4 w-4 text-indigo-400" />
            HTTP Transmission Attributes
          </h4>

          <div className="space-y-2 text-xs divide-y divide-slate-800/80">
            <div className="flex items-center justify-between py-1.5">
              <span className="text-slate-400">Content-Type</span>
              <span className="font-mono text-slate-200">
                {serverHeaders?.contentType || 'Detecting...'}
              </span>
            </div>

            <div className="flex items-center justify-between py-1.5">
              <span className="text-slate-400">Payload Size</span>
              <span className="font-mono text-slate-200">
                {serverHeaders?.formattedSize || 'Live Chunked / Streaming'}
              </span>
            </div>

            <div className="flex items-center justify-between py-1.5">
              <span className="text-slate-400">Byte-Range Requests</span>
              <span className="font-mono text-slate-200">
                {serverHeaders?.acceptRanges === 'bytes'
                  ? 'Supported (Fast Seeking)'
                  : 'Streamed'}
              </span>
            </div>

            <div className="flex items-center justify-between py-1.5">
              <span className="text-slate-400">Proxy Engine</span>
              <span className="font-mono text-indigo-300">
                {useProxy ? 'Active (/api/proxy-stream)' : 'Bypassed (Direct Connect)'}
              </span>
            </div>
          </div>
        </div>

        {/* HLS / Manifest Raw Inspector */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-white flex items-center gap-2">
              <FileCode className="h-4 w-4 text-emerald-400" />
              Manifest Source (.m3u8 / .mpd)
            </h4>
            <span className="text-[11px] font-mono text-slate-500">
              {manifestText ? `${manifestText.split('\n').length} Lines` : 'VOD Stream'}
            </span>
          </div>

          <div className="h-48 overflow-y-auto rounded-lg bg-slate-950 p-3 font-mono text-[11px] text-slate-300 border border-slate-800">
            {isLoadingManifest ? (
              <span className="text-slate-500">Loading playlist manifest...</span>
            ) : manifestText ? (
              <pre className="whitespace-pre-wrap">{manifestText}</pre>
            ) : (
              <span className="text-slate-500">
                This stream is a direct video container (MP4/WebM) or embedded frame rather than a segmented M3U8 manifest.
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
