import React from 'react';
import { Gauge, FastForward, Sliders, Check, Sparkles } from 'lucide-react';

interface SpeedAndQualityBarProps {
  currentSpeed: number;
  onSpeedChange: (speed: number) => void;
  currentQuality: string; // e.g. 'auto', '144p', '240p', '360p', '480p', '720p', '1080p'
  onQualityChange: (quality: string, height: number | 'auto') => void;
  availableHeights?: number[];
}

const SPEED_OPTIONS = [
  { label: '0.5x', value: 0.5 },
  { label: '0.75x', value: 0.75 },
  { label: '1.0x Normal', value: 1.0 },
  { label: '1.25x', value: 1.25 },
  { label: '1.5x', value: 1.5 },
  { label: '1.75x', value: 1.75 },
  { label: '2.0x ⚡', value: 2.0 },
  { label: '2.5x', value: 2.5 },
];

const QUALITY_OPTIONS: { label: string; height: number | 'auto'; desc: string }[] = [
  { label: 'Auto (ABR)', height: 'auto', desc: 'Auto switches if network is slow' },
  { label: '144p', height: 144, desc: 'Ultra Data Saver' },
  { label: '240p', height: 240, desc: 'Low Bandwidth' },
  { label: '360p', height: 360, desc: 'Standard Mobile' },
  { label: '480p', height: 480, desc: 'SD Quality' },
  { label: '720p HD', height: 720, desc: 'High Definition' },
  { label: '1080p FHD', height: 1080, desc: 'Full HD Crisp' },
];

export const SpeedAndQualityBar: React.FC<SpeedAndQualityBarProps> = ({
  currentSpeed,
  onSpeedChange,
  currentQuality,
  onQualityChange,
}) => {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 backdrop-blur-md space-y-4">
      {/* 1. PLAYBACK SPEED SELECTOR */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <FastForward className="h-4 w-4 text-indigo-400" />
            <span className="font-bold text-white uppercase tracking-wider text-[11px]">
              Playback Speed
            </span>
            <span className="rounded bg-indigo-500/20 px-2 py-0.5 font-mono text-indigo-300 font-bold">
              {currentSpeed}x
            </span>
          </div>
          <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
            Speed control: 0.5x tak slow, 2.5x tak fast
          </span>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {SPEED_OPTIONS.map((opt) => {
            const isSelected = Math.abs(currentSpeed - opt.value) < 0.05;
            return (
              <button
                key={opt.value}
                onClick={() => onSpeedChange(opt.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold whitespace-nowrap transition-all duration-150 ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/40 ring-1 ring-indigo-400'
                    : 'bg-slate-950/80 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="border-t border-slate-800/80" />

      {/* 2. RESOLUTION / QUALITY SELECTOR */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Gauge className="h-4 w-4 text-emerald-400" />
            <span className="font-bold text-white uppercase tracking-wider text-[11px]">
              Video Resolution & Quality
            </span>
            <span className="rounded bg-emerald-500/20 px-2 py-0.5 font-mono text-emerald-300 font-bold">
              {currentQuality.toUpperCase()}
            </span>
          </div>
          <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
            144p se 1080p tak ya Auto Adaptive (ABR)
          </span>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {QUALITY_OPTIONS.map((opt) => {
            const isSelected =
              (opt.height === 'auto' && (currentQuality.toLowerCase() === 'auto' || currentQuality.toLowerCase().includes('auto'))) ||
              (typeof opt.height === 'number' && currentQuality.toLowerCase().includes(`${opt.height}`));

            return (
              <button
                key={opt.label}
                onClick={() => onQualityChange(opt.label, opt.height)}
                title={opt.desc}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold whitespace-nowrap transition-all duration-150 ${
                  isSelected
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/40 ring-1 ring-emerald-400'
                    : 'bg-slate-950/80 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800'
                }`}
              >
                {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
