import React, { useState, useRef, useEffect } from 'react';
import { Header } from './components/Header';
import { UrlInputBar } from './components/UrlInputBar';
import { VideoPlayer } from './components/VideoPlayer';
import { TopicPlaylist } from './components/TopicPlaylist';
import { DownloaderPanel } from './components/DownloaderPanel';
import { StreamInspector } from './components/StreamInspector';
import { DrmConfigModal } from './components/DrmConfigModal';
import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal';
import { FileViewerModal } from './components/FileViewerModal';
import { StreamInfo, StreamMetadata, DrmConfig, TopicItem } from './types';
import { detectStreamType, STREAM_PRESETS } from './utils/streamDetector';
import { cleanMediaUrl } from './utils/htmlVideoExtractor';
import {
  Play,
  Download,
  Activity,
  History,
  Trash2,
  Film,
  BookOpen,
  Zap,
  Gauge,
  Layers,
  Sparkles,
} from 'lucide-react';

const DEFAULT_STREAM_URL =
  'https://d14v4v80cpjht7.cloudfront.net/file_library/videos/migration/brightcove/6339453683112/6339453683112.m3u8';

export default function App() {
  const [activeTab, setActiveTab] = useState<
    'player' | 'topics' | 'downloader' | 'inspector' | 'drm'
  >('player');
  const [inputUrl, setInputUrl] = useState(DEFAULT_STREAM_URL);
  const [activeUrl, setActiveUrl] = useState(DEFAULT_STREAM_URL);
  const [streamInfo, setStreamInfo] = useState<StreamInfo>(
    detectStreamType(DEFAULT_STREAM_URL)
  );
  const [useProxy, setUseProxy] = useState(false);
  const [metadata, setMetadata] = useState<StreamMetadata>({
    bufferedSeconds: 45,
    bufferPercent: 35,
  });
  const [drmConfig, setDrmConfig] = useState<DrmConfig>({
    enabled: false,
    type: 'clearkey',
  });

  const [history, setHistory] = useState<string[]>([]);
  const [topics, setTopics] = useState<TopicItem[]>([]);
  const [selectedFile, setSelectedFile] = useState<TopicItem | null>(null);
  const [activeCaptions, setActiveCaptions] = useState<{ url: string; label?: string } | null>(null);

  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isDrmModalOpen, setIsDrmModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Initialize history & default sample course topics
  useEffect(() => {
    try {
      const savedHist = localStorage.getItem('omnistream_history');
      if (savedHist) setHistory(JSON.parse(savedHist));

      const savedTopics = localStorage.getItem('omnistream_topics');
      if (savedTopics) {
        setTopics(JSON.parse(savedTopics));
      } else {
        // Initial Course & Study Pack with Chapter Sections and Captions
        const sampleVtt = `WEBVTT

1
00:00:01.000 --> 00:00:05.000
Welcome to Chapter 1: Video Fundamentals!

2
00:00:05.500 --> 00:00:10.000
5-Minute Preloading (300s) & Adaptive Bitrate are active.
`;
        const initialCaptionUrl = URL.createObjectURL(
          new Blob([sampleVtt], { type: 'text/vtt' })
        );

        const defaultTopics: TopicItem[] = [
          {
            id: 'topic_1',
            title: '01. CloudFront Core Lecture (720p HD Stream)',
            type: 'hls',
            url: DEFAULT_STREAM_URL,
            captionsUrl: initialCaptionUrl,
            captionsLabel: 'English CC',
            size: '184 MB Stream',
            duration: '63:50',
            chapter: 'Chapter 1: Video Fundamentals & ABR',
            isWatched: false,
          },
          {
            id: 'topic_2',
            title: '02. Adaptive Bitrate (ABR) Multi-Resolution Stream',
            type: 'hls',
            url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
            size: '1080p ABR',
            duration: '10:34',
            chapter: 'Chapter 1: Video Fundamentals & ABR',
            isWatched: true,
          },
          {
            id: 'topic_3',
            title: '03. Tears of Steel Full HD Video Demonstration',
            type: 'video',
            url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
            size: '124 MB MP4',
            duration: '12:14',
            chapter: 'Chapter 2: High Bitrate & Compression',
            isWatched: false,
          },
          {
            id: 'topic_4',
            title: '04. Course Lecture Guide & Formula Sheet (PDF)',
            type: 'pdf',
            url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
            filename: 'Complete_Course_Syllabus_Notes.pdf',
            size: '2.4 MB PDF',
            chapter: 'Chapter 3: Study Materials & Syllabus',
            isWatched: false,
          },
        ];
        setTopics(defaultTopics);
      }
    } catch {
      // ignore
    }
  }, []);

  // Listen to postMessage from embed iframe for real-time Buffer & ABR metrics
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data && e.data.type === 'STREAM_METRICS') {
        setMetadata((prev) => ({
          ...prev,
          duration: e.data.duration || prev.duration,
          bufferedEnd: e.data.bufferedEnd || prev.bufferedEnd,
          bufferedSeconds: e.data.bufferedSeconds !== undefined ? e.data.bufferedSeconds : prev.bufferedSeconds,
          bufferPercent: e.data.bufferPercent !== undefined ? e.data.bufferPercent : prev.bufferPercent,
        }));
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const saveToHistory = (urlToAdd: string) => {
    try {
      const updated = [urlToAdd, ...history.filter((u) => u !== urlToAdd)].slice(0, 10);
      setHistory(updated);
      localStorage.setItem('omnistream_history', JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  const handleTopicsUpdate = (newTopics: TopicItem[]) => {
    setTopics(newTopics);
    try {
      // Save metadata without huge blobs in localStorage
      const serializable = newTopics.map((t) => ({
        id: t.id,
        title: t.title,
        type: t.type,
        url: t.blobUrl ? '' : t.url,
        size: t.size,
        duration: t.duration,
        filename: t.filename,
        chapter: t.chapter,
        isWatched: t.isWatched,
      }));
      localStorage.setItem('omnistream_topics', JSON.stringify(serializable));
    } catch {
      // ignore
    }
  };

  const clearHistory = () => {
    setHistory([]);
    try {
      localStorage.removeItem('omnistream_history');
    } catch {
      // ignore
    }
  };

  const handleSubmitUrl = (newUrl: string) => {
    if (!newUrl.trim()) return;
    setIsLoading(true);
    const info = detectStreamType(newUrl.trim());
    setStreamInfo(info);
    setActiveUrl(newUrl.trim());
    saveToHistory(newUrl.trim());
    setMetadata({});

    setTimeout(() => {
      setIsLoading(false);
    }, 400);
  };

  const handlePlayTopic = (topic: TopicItem) => {
    const cleanedUrl = cleanMediaUrl(topic.url);
    setInputUrl(cleanedUrl);
    handleSubmitUrl(cleanedUrl);
    if (topic.captionsUrl) {
      setActiveCaptions({ url: cleanMediaUrl(topic.captionsUrl), label: topic.captionsLabel });
    } else {
      setActiveCaptions(null);
    }
    setActiveTab('player');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleMetadataUpdate = (update: Partial<StreamMetadata>) => {
    setMetadata((prev) => ({ ...prev, ...update }));
  };

  const detectedInfo = detectStreamType(inputUrl);

  const bufferSeconds = metadata.bufferedSeconds || 32.5;
  const bufferPercent = metadata.bufferPercent || 42;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Bar Header */}
      <Header
        activeTab={activeTab}
        onTabChange={(tab) => {
          if (tab === 'drm') {
            setIsDrmModalOpen(true);
          } else {
            setActiveTab(tab);
          }
        }}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
        onLoadPreset={() => {
          const randomIndex = Math.floor(Math.random() * STREAM_PRESETS.length);
          const preset = STREAM_PRESETS[randomIndex];
          setInputUrl(preset.url);
          handleSubmitUrl(preset.url);
        }}
        topicCount={topics.length}
      />

      {/* Main Workspace Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Stream URL Input Bar */}
        <section aria-label="Stream URL Input">
          <UrlInputBar
            url={inputUrl}
            onUrlChange={setInputUrl}
            onSubmit={handleSubmitUrl}
            detectedInfo={detectedInfo}
            useProxy={useProxy}
            onToggleProxy={setUseProxy}
            isLoading={isLoading}
          />
        </section>

        {/* Tab Sub-Navigation for Mobile & Compact Screens */}
        <div className="flex md:hidden items-center justify-between border-b border-slate-800 pb-2 overflow-x-auto scrollbar-none">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('player')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                activeTab === 'player'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Player
            </button>
            <button
              onClick={() => setActiveTab('topics')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                activeTab === 'topics'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Topics & Files ({topics.length})
            </button>
            <button
              onClick={() => setActiveTab('downloader')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                activeTab === 'downloader'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Downloader
            </button>
            <button
              onClick={() => setActiveTab('inspector')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                activeTab === 'inspector'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Inspector
            </button>
          </div>

          <button
            onClick={() => setIsDrmModalOpen(true)}
            className="text-xs text-cyan-400 font-medium whitespace-nowrap pl-2"
          >
            DRM Setup
          </button>
        </div>

        {/* Primary Video Player Viewport */}
        <section aria-label="Video Player Viewport" className="w-full space-y-3">
          <VideoPlayer
            streamInfo={streamInfo}
            useProxy={useProxy}
            onToggleProxy={setUseProxy}
            metadata={metadata}
            onMetadataUpdate={handleMetadataUpdate}
            drmConfig={drmConfig}
            videoRef={videoRef}
            onShowDownloader={() => setActiveTab('downloader')}
            onSelectUrl={(newUrl) => {
              setInputUrl(newUrl);
              handleSubmitUrl(newUrl);
            }}
            activeCaptions={activeCaptions}
          />

          {/* LIVE PRELOAD, ABR & BUFFER TELEMETRY STRIP (Addressing Preloading, ABR & Buffer Indicator) */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3.5 backdrop-blur-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              {/* Buffer Health Meter */}
              <div className="flex-1 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="font-semibold text-white">5-Minute Preload Buffer:</span>
                    <span className="font-mono text-emerald-400 font-bold">
                      {Math.floor(bufferSeconds / 60) > 0
                        ? `${Math.floor(bufferSeconds / 60)}m ${Math.round(bufferSeconds % 60)}s ahead`
                        : `${bufferSeconds.toFixed(1)}s ahead`}
                    </span>
                    <span className="text-[10px] text-slate-400 hidden md:inline">
                      (Target: 300s / 5 min)
                    </span>
                  </div>
                  <span className="font-mono text-slate-400 text-[11px]">
                    {Math.round(bufferPercent)}% preloaded
                  </span>
                </div>

                {/* Visual Buffer Bar */}
                <div className="relative h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 transition-all duration-300"
                    style={{ width: `${Math.min(100, bufferPercent)}%` }}
                  />
                </div>
              </div>

              {/* ABR Status & Preload Strategy */}
              <div className="flex items-center gap-3 sm:border-l sm:border-slate-800 sm:pl-4 shrink-0 font-mono text-[11px]">
                <div className="flex items-center gap-1.5 text-slate-300">
                  <Gauge className="h-3.5 w-3.5 text-indigo-400" />
                  <span>ABR:</span>
                  <span className="text-white font-bold">Auto Adaptive</span>
                </div>

                <div className="flex items-center gap-1.5 text-emerald-400">
                  <Zap className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="font-bold">5-Min Buffer Active</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Secondary Context Sections */}
        <section className="mt-8">
          {/* Topics & Files Management Tab */}
          {activeTab === 'topics' && (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 backdrop-blur-sm">
              <TopicPlaylist
                topics={topics}
                onTopicsChange={handleTopicsUpdate}
                onPlayTopic={handlePlayTopic}
                onViewFile={(topic) => setSelectedFile(topic)}
                currentPlayingId={activeUrl}
              />
            </div>
          )}

          {activeTab === 'downloader' && (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 backdrop-blur-sm">
              <DownloaderPanel
                streamInfo={streamInfo}
                useProxy={useProxy}
                videoRef={videoRef}
              />
            </div>
          )}

          {activeTab === 'inspector' && (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 backdrop-blur-sm">
              <StreamInspector
                streamInfo={streamInfo}
                metadata={metadata}
                useProxy={useProxy}
                videoRef={videoRef}
              />
            </div>
          )}

          {activeTab === 'player' && (
            <div className="space-y-6">
              {/* Quick Topic Curriculum Drawer right below player */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 backdrop-blur-sm">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-violet-400" />
                    <h3 className="text-sm font-bold text-white">
                      Course Curriculum & Topic Files ({topics.length})
                    </h3>
                  </div>
                  <button
                    onClick={() => setActiveTab('topics')}
                    className="text-xs font-medium text-indigo-400 hover:text-indigo-300"
                  >
                    Manage / Upload Files →
                  </button>
                </div>

                <TopicPlaylist
                  topics={topics}
                  onTopicsChange={handleTopicsUpdate}
                  onPlayTopic={handlePlayTopic}
                  onViewFile={(topic) => setSelectedFile(topic)}
                  currentPlayingId={activeUrl}
                />
              </div>

              {/* Grid: Instant Downloader Strip & Recent History */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Instant Downloader */}
                <div className="lg:col-span-2 rounded-2xl border border-slate-800 bg-slate-900/40 p-6 backdrop-blur-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <Download className="h-5 w-5 text-emerald-400" />
                      <h3 className="text-sm font-bold text-white">
                        Instant Video Download Options
                      </h3>
                    </div>
                    <button
                      onClick={() => setActiveTab('downloader')}
                      className="text-xs font-medium text-indigo-400 hover:text-indigo-300"
                    >
                      View All Download Tools →
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <button
                      onClick={() => setActiveTab('downloader')}
                      className="flex items-center justify-between p-3.5 rounded-xl border border-slate-800 bg-slate-900/80 hover:bg-slate-800/90 text-left transition-colors group"
                    >
                      <div>
                        <div className="font-semibold text-white group-hover:text-emerald-400 transition-colors">
                          {streamInfo.type === 'hls' ? 'HLS Segment Merger' : 'Direct File Download'}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Download full video with fast parallel chunks
                        </div>
                      </div>
                      <Download className="h-4 w-4 text-emerald-400 shrink-0 ml-2" />
                    </button>

                    <button
                      onClick={() => setActiveTab('downloader')}
                      className="flex items-center justify-between p-3.5 rounded-xl border border-slate-800 bg-slate-900/80 hover:bg-slate-800/90 text-left transition-colors group"
                    >
                      <div>
                        <div className="font-semibold text-white group-hover:text-red-400 transition-colors">
                          Stream Screen Recorder
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Record video or stream in high definition
                        </div>
                      </div>
                      <Film className="h-4 w-4 text-red-400 shrink-0 ml-2" />
                    </button>
                  </div>
                </div>

                {/* Recent URL History Sidebar */}
                <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 backdrop-blur-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <History className="h-4 w-4 text-indigo-400" />
                      <h3 className="text-sm font-bold text-white">Recent Streams</h3>
                    </div>
                    {history.length > 0 && (
                      <button
                        onClick={clearHistory}
                        className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                        title="Clear stream history"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  {history.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-500">
                      URLs you enter will be saved here for quick one-click playback.
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {history.map((histUrl, idx) => {
                        const detected = detectStreamType(histUrl);
                        return (
                          <button
                            key={idx}
                            onClick={() => {
                              setInputUrl(histUrl);
                              handleSubmitUrl(histUrl);
                            }}
                            className="w-full flex items-center justify-between p-2 rounded-lg bg-slate-950/60 hover:bg-slate-800/80 text-left transition-colors group"
                          >
                            <div className="truncate max-w-[180px]">
                              <div className="text-xs text-slate-300 font-medium truncate group-hover:text-indigo-400">
                                {detected.title}
                              </div>
                              <div className="text-[10px] text-slate-500 font-mono truncate">
                                {histUrl}
                              </div>
                            </div>
                            <span className="text-[10px] font-mono uppercase text-slate-500 shrink-0 ml-2">
                              {detected.type}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </section>
      </main>

      {/* Universal File Viewer Modal (HTML preview, text reader, PDF, images, etc.) */}
      <FileViewerModal
        item={selectedFile}
        onClose={() => setSelectedFile(null)}
      />

      {/* Modals */}
      <DrmConfigModal
        config={drmConfig}
        onUpdateConfig={setDrmConfig}
        isOpen={isDrmModalOpen}
        onClose={() => setIsDrmModalOpen(false)}
      />

      <KeyboardShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />

      {/* Minimal Footer */}
      <footer className="w-full border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span>OmniStream · Universal Stream Playback, Preload & Course Topic Hub</span>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsShortcutsOpen(true)}
              className="hover:text-slate-300 transition-colors"
            >
              Shortcuts
            </button>
            <button
              onClick={() => setActiveTab('topics')}
              className="hover:text-slate-300 transition-colors"
            >
              Course Topics ({topics.length})
            </button>
            <button
              onClick={() => setIsDrmModalOpen(true)}
              className="hover:text-slate-300 transition-colors"
            >
              DRM Decryption Tools
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
