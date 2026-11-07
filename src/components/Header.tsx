import React from 'react';
import {
  Play,
  Download,
  Activity,
  ShieldCheck,
  Sparkles,
  Keyboard,
  BookOpen,
} from 'lucide-react';

interface HeaderProps {
  activeTab: 'player' | 'topics' | 'downloader' | 'inspector' | 'drm';
  onTabChange: (tab: 'player' | 'topics' | 'downloader' | 'inspector' | 'drm') => void;
  onOpenShortcuts: () => void;
  onLoadPreset: () => void;
  topicCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabChange,
  onOpenShortcuts,
  onLoadPreset,
  topicCount,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
        {/* Zone 1: Brand wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-500 shadow-md shadow-indigo-500/20">
            <Play className="h-4 w-4 fill-white text-white ml-0.5" />
          </div>
          <span className="text-lg font-bold tracking-tight text-white whitespace-nowrap">
            OmniStream
          </span>
        </div>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden md:flex items-center gap-1">
          <button
            onClick={() => onTabChange('player')}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'player'
                ? 'bg-slate-800 text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            <Play className="h-4 w-4 text-indigo-400" />
            <span>Player</span>
          </button>

          <button
            onClick={() => onTabChange('topics')}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'topics'
                ? 'bg-slate-800 text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            <BookOpen className="h-4 w-4 text-violet-400" />
            <span>Topics & Files ({topicCount})</span>
          </button>

          <button
            onClick={() => onTabChange('downloader')}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'downloader'
                ? 'bg-slate-800 text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            <Download className="h-4 w-4 text-emerald-400" />
            <span>Downloader</span>
          </button>

          <button
            onClick={() => onTabChange('inspector')}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'inspector'
                ? 'bg-slate-800 text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            <Activity className="h-4 w-4 text-amber-400" />
            <span>Inspector</span>
          </button>

          <button
            onClick={() => onTabChange('drm')}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'drm'
                ? 'bg-slate-800 text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            <ShieldCheck className="h-4 w-4 text-cyan-400" />
            <span>DRM Setup</span>
          </button>
        </nav>

        {/* Zone 3: Primary Action & Utilities */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={onOpenShortcuts}
            title="Keyboard shortcuts"
            className="hidden sm:flex items-center justify-center h-9 w-9 rounded-lg border border-slate-800 bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:border-slate-700 transition-colors"
          >
            <Keyboard className="h-4 w-4" />
          </button>

          <button
            onClick={onLoadPreset}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 shadow-sm shadow-indigo-600/30 transition-colors whitespace-nowrap shrink-0"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Sample Streams</span>
          </button>
        </div>
      </div>
    </header>
  );
};
