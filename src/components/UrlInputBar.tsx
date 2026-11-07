import React, { useState } from 'react';
import { Play, Clipboard, X, Globe, Shield, Radio, Check } from 'lucide-react';
import { StreamInfo, StreamPreset } from '../types';
import { STREAM_PRESETS } from '../utils/streamDetector';

interface UrlInputBarProps {
  url: string;
  onUrlChange: (newUrl: string) => void;
  onSubmit: (submittedUrl: string) => void;
  detectedInfo: StreamInfo;
  useProxy: boolean;
  onToggleProxy: (val: boolean) => void;
  isLoading: boolean;
}

export const UrlInputBar: React.FC<UrlInputBarProps> = ({
  url,
  onUrlChange,
  onSubmit,
  detectedInfo,
  useProxy,
  onToggleProxy,
  isLoading,
}) => {
  const [copiedPreset, setCopiedPreset] = useState<string | null>(null);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        onUrlChange(text.trim());
      }
    } catch {
      // Clipboard access denied or not supported in this frame
    }
  };

  const handleSelectPreset = (preset: StreamPreset) => {
    onUrlChange(preset.url);
    onSubmit(preset.url);
    setCopiedPreset(preset.id);
    setTimeout(() => setCopiedPreset(null), 1500);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      onSubmit(url.trim());
    }
  };

  const formatLabels: Record<string, string> = {
    hls: 'Apple HLS (.m3u8)',
    youtube: 'YouTube Video',
    mp4: 'Direct MP4 Stream',
    webm: 'WebM Video',
    dash: 'MPEG-DASH (.mpd)',
    vimeo: 'Vimeo Video',
    dailymotion: 'Dailymotion Video',
    unknown: 'Direct / Web Stream',
  };

  return (
    <div className="w-full space-y-3">
      {/* Main Input Form */}
      <form onSubmit={handleSubmit} className="relative w-full">
        <div className="relative flex items-center rounded-xl border border-slate-800 bg-slate-900/90 shadow-xl transition-all focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500/50">
          <div className="pl-4 text-slate-500">
            <Radio className="h-5 w-5 text-indigo-400 animate-pulse" />
          </div>

          <input
            type="text"
            value={url}
            onChange={(e) => onUrlChange(e.target.value)}
            placeholder="Paste any video link: HLS (.m3u8), YouTube, MP4, DASH, Vimeo, etc."
            className="w-full bg-transparent px-3.5 py-3.5 text-sm md:text-base text-white placeholder-slate-500 focus:outline-none"
          />

          <div className="flex items-center gap-1.5 pr-2">
            {url && (
              <button
                type="button"
                onClick={() => onUrlChange('')}
                className="p-1.5 text-slate-400 hover:text-slate-200 transition-colors"
                title="Clear input"
              >
                <X className="h-4 w-4" />
              </button>
            )}

            <button
              type="button"
              onClick={handlePaste}
              className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 rounded-lg border border-slate-700/60 transition-colors"
              title="Paste from clipboard"
            >
              <Clipboard className="h-3.5 w-3.5" />
              <span>Paste</span>
            </button>

            <button
              type="submit"
              disabled={!url.trim() || isLoading}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 disabled:opacity-50 disabled:pointer-events-none transition-all shadow-md shadow-indigo-600/30 whitespace-nowrap shrink-0"
            >
              <Play className="h-4 w-4 fill-white" />
              <span>{isLoading ? 'Loading...' : 'Play Stream'}</span>
            </button>
          </div>
        </div>
      </form>

      {/* Stream Controls & Metadata Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 px-1">
        {/* Stream Type Detection (Zero-Pill Discipline: unboxed metadata) */}
        <div className="flex items-center gap-2">
          <span className="text-slate-500">Detected Source:</span>
          <span className="font-semibold text-slate-200">
            {formatLabels[detectedInfo.type] || 'Auto Detect'}
          </span>
          <span aria-hidden="true" className="text-slate-600">·</span>
          <span className="text-slate-400">
            {detectedInfo.sourceType === 'embed' ? 'Embed Player' : 'Direct / HLS Engine'}
          </span>
        </div>

        {/* CORS Proxy Toggle */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onToggleProxy(!useProxy)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors border ${
              useProxy
                ? 'bg-indigo-950/60 border-indigo-500/50 text-indigo-300'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title="Bypasses CORS restrictions on external stream servers by proxying through backend"
          >
            {useProxy ? (
              <Shield className="h-3.5 w-3.5 text-indigo-400" />
            ) : (
              <Globe className="h-3.5 w-3.5 text-slate-500" />
            )}
            <span>CORS Proxy: {useProxy ? 'ON (Bypass CORS)' : 'OFF (Direct)'}</span>
          </button>
        </div>
      </div>

      {/* Quick Stream Preset Selector */}
      <div className="space-y-1.5 pt-1">
        <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
          <span>Quick Test Streams (Click to play):</span>
          <span>Adaptive HLS · Direct MP4 · YouTube</span>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {STREAM_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => handleSelectPreset(preset)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900/60 hover:bg-slate-800/80 hover:border-slate-700 text-xs text-slate-300 transition-colors whitespace-nowrap shrink-0 group"
            >
              {copiedPreset === preset.id ? (
                <Check className="h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <Play className="h-3 w-3 text-indigo-400 group-hover:scale-110 transition-transform" />
              )}
              <span className="font-medium text-slate-200">{preset.name}</span>
              <span className="text-slate-500 text-[10px] uppercase font-mono">
                {preset.badge}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
