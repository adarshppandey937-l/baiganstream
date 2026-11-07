import React, { useState, useRef } from 'react';
import {
  Upload,
  Play,
  Download,
  FileText,
  Video,
  CheckCircle2,
  Trash2,
  Search,
  Plus,
  BookOpen,
  FolderOpen,
  Sparkles,
  FileCode,
  File,
  Eye,
  Image as ImageIcon,
  ChevronDown,
  ChevronRight,
  Captions,
  Layers,
  FolderCheck,
  Check,
  ExternalLink,
} from 'lucide-react';
import { TopicItem } from '../types';
import { extractMediaFromContent, cleanMediaUrl } from '../utils/htmlVideoExtractor';

interface TopicPlaylistProps {
  topics: TopicItem[];
  onTopicsChange: (newTopics: TopicItem[]) => void;
  onPlayTopic: (topic: TopicItem) => void;
  onViewFile: (topic: TopicItem) => void;
  currentPlayingId?: string;
}

export const TopicPlaylist: React.FC<TopicPlaylistProps> = ({
  topics,
  onTopicsChange,
  onPlayTopic,
  onViewFile,
  currentPlayingId,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<
    'all' | 'video' | 'pdf' | 'html' | 'text'
  >('all');
  const [viewMode, setViewMode] = useState<'chapters' | 'list'>('chapters');
  const [collapsedChapters, setCollapsedChapters] = useState<Record<string, boolean>>({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newCaptionsUrl, setNewCaptionsUrl] = useState('');
  const [newType, setNewType] = useState<
    'video' | 'pdf' | 'hls' | 'html' | 'text' | 'file'
  >('video');
  const [newChapter, setNewChapter] = useState('Chapter 1: Video Fundamentals');

  const [extractionAlert, setExtractionAlert] = useState<{
    fileName: string;
    videoCount: number;
    chapterCount: number;
    hasCaptions: boolean;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleChapter = (chapterName: string) => {
    setCollapsedChapters((prev) => ({
      ...prev,
      [chapterName]: !prev[chapterName],
    }));
  };

  const isPlayableMedia = (item: TopicItem): boolean => {
    if (item.type === 'video' || item.type === 'hls' || item.type === 'link') return true;
    if (!item.url) return false;
    const lower = item.url.toLowerCase();
    return (
      lower.includes('.m3u8') ||
      lower.includes('.mp4') ||
      lower.includes('.webm') ||
      lower.includes('.mkv') ||
      lower.includes('.mpd') ||
      lower.includes('youtube.com') ||
      lower.includes('youtu.be') ||
      lower.includes('vimeo.com') ||
      lower.includes('cloudfront.net')
    );
  };

  // Handle ANY file uploads (.html, .text, .pdf, .mp4, images, etc.) from phone/PC
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newItems: TopicItem[] = [];
    let extractedVideosTotal = 0;
    let extractedChaptersTotal = 0;
    let extractedCaptionsTotal = false;
    let lastParsedHtmlName = '';

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const blobUrl = URL.createObjectURL(file);
      const lowerName = file.name.toLowerCase();

      let detectedType: TopicItem['type'] = 'file';
      let chapter = 'Uploaded Files';
      let textContent: string | undefined = undefined;

      if (
        lowerName.endsWith('.html') ||
        lowerName.endsWith('.htm') ||
        lowerName.match(/\.(txt|text|json|md|csv|js|ts|py|c|cpp|css|log)$/i)
      ) {
        const isHtml = lowerName.endsWith('.html') || lowerName.endsWith('.htm');
        detectedType = isHtml ? 'html' : 'text';
        chapter = isHtml ? 'HTML Syllabus' : 'Text & Course Notes';
        lastParsedHtmlName = file.name;
        try {
          textContent = await file.text();
          // Universal extractor parses ALL video links, chapters, and captions from BOTH HTML and TXT files!
          const extraction = extractMediaFromContent(textContent, file.name);
          if (extraction.topics.length > 0) {
            newItems.push(...extraction.topics);
            extractedVideosTotal += extraction.totalVideos;
            extractedChaptersTotal += extraction.chapterCount;
            if (extraction.hasCaptions) extractedCaptionsTotal = true;
          }
        } catch {
          // ignore
        }
      } else if (lowerName.endsWith('.pdf') || file.type.includes('pdf')) {
        detectedType = 'pdf';
        chapter = 'PDF Study Materials';
      } else if (
        file.type.includes('video') ||
        lowerName.match(/\.(mp4|webm|mkv|mov|ts|m3u8|m4v)$/i)
      ) {
        detectedType = 'video';
        chapter = 'Video Lectures';
      } else if (
        file.type.includes('image') ||
        lowerName.match(/\.(png|jpg|jpeg|gif|webp|svg)$/i)
      ) {
        detectedType = 'image';
        chapter = 'Diagrams & Images';
      }

      const sizeMb = (file.size / (1024 * 1024)).toFixed(2);

      // Keep the primary uploaded file item as well
      newItems.push({
        id: `upload_${Date.now()}_${i}`,
        title: file.name.replace(/\.[^/.]+$/, ''),
        type: detectedType,
        url: blobUrl,
        filename: file.name,
        size: `${sizeMb} MB`,
        fileBlob: file,
        blobUrl: blobUrl,
        textContent,
        chapter,
        isWatched: false,
        addedAt: Date.now(),
      });
    }

    if (extractedVideosTotal > 0) {
      setExtractionAlert({
        fileName: lastParsedHtmlName,
        videoCount: extractedVideosTotal,
        chapterCount: extractedChaptersTotal,
        hasCaptions: extractedCaptionsTotal,
      });
    }

    onTopicsChange([...newItems, ...topics]);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDownload = (topic: TopicItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const a = document.createElement('a');
    a.href = topic.url;
    a.download = topic.filename || `${topic.title}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onTopicsChange(topics.filter((t) => t.id !== id));
  };

  const handleToggleWatched = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onTopicsChange(
      topics.map((t) => (t.id === id ? { ...t, isWatched: !t.isWatched } : t))
    );
  };

  const handleAddManualTopic = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newUrl.trim()) return;

    const newItem: TopicItem = {
      id: `manual_${Date.now()}`,
      title: newTitle.trim(),
      type: newType,
      url: newUrl.trim(),
      captionsUrl: newCaptionsUrl.trim() || undefined,
      captionsLabel: newCaptionsUrl.trim() ? 'English Captions' : undefined,
      chapter: newChapter.trim() || 'General Videos',
      isWatched: false,
      addedAt: Date.now(),
    };

    onTopicsChange([newItem, ...topics]);
    setNewTitle('');
    setNewUrl('');
    setNewCaptionsUrl('');
    setShowAddModal(false);
  };

  // Pre-load comprehensive sample course with multiple chapters, captions, and HTML syllabus
  const handleLoadSampleCourse = () => {
    const sampleVtt = `WEBVTT

1
00:00:01.000 --> 00:00:05.000
Welcome to Chapter 1: CloudFront Video Fundamentals!

2
00:00:05.500 --> 00:00:10.000
5-Minute Preloading (300s ahead) and Adaptive Bitrate (ABR) are active.

3
00:00:10.500 --> 00:00:16.000
Speed controls (1x, 1.25x, 2x) and Quality (144p to 1080p) are ready.
`;
    const sampleCaptionUrl = URL.createObjectURL(new Blob([sampleVtt], { type: 'text/vtt' }));

    const sampleHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Course Syllabus & Video Lectures</title>
  <style>
    body { font-family: sans-serif; padding: 20px; background: #0f172a; color: #f8fafc; }
    h1 { color: #818cf8; }
    h2 { color: #38bdf8; border-bottom: 1px solid #334155; padding-bottom: 4px; }
    .lecture-card { background: #1e293b; padding: 12px; margin: 8px 0; border-radius: 8px; border: 1px solid #334155; }
    a { color: #818cf8; text-decoration: none; font-weight: bold; }
  </style>
</head>
<body>
  <h1>Course Syllabus: Video Engineering & Streams</h1>
  
  <h2>Chapter 1: Core Stream Architectures</h2>
  <div class="lecture-card">
    <video src="https://d14v4v80cpjht7.cloudfront.net/file_library/videos/migration/brightcove/6339453683112/6339453683112.m3u8" title="01. CloudFront Core Video Stream (720p HD)">
      <track src="${sampleCaptionUrl}" label="English" kind="subtitles" default />
    </video>
    <p>Includes English captions and 5-min preloading.</p>
  </div>

  <h2>Chapter 2: Adaptive Bitrate & Multi-Resolution</h2>
  <div class="lecture-card">
    <a href="https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8">02. Mux 1080p Multi-Bitrate ABR Demonstration</a>
  </div>

  <h2>Chapter 3: High Bitrate & Compression Test</h2>
  <div class="lecture-card">
    <a href="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4">03. Tears of Steel Full HD Video</a>
  </div>
</body>
</html>`;

    const sampleText = `Course Summary & Quick Reference Formulas
------------------------------------------------
1. HLS Architecture:
   - Master playlist index references media playlists.
   - Segments buffered up to 300 seconds (5 minutes ahead).
2. Adaptive Bitrate (ABR):
   - EWMA bandwidth estimator switches resolution automatically.
3. Captions & Subtitles:
   - WebVTT tracks supported in embed player and native player.
`;

    const samples: TopicItem[] = [
      {
        id: 'sample_1',
        title: '01. CloudFront Multi-Bitrate Video (720p HD)',
        type: 'hls',
        url: 'https://d14v4v80cpjht7.cloudfront.net/file_library/videos/migration/brightcove/6339453683112/6339453683112.m3u8',
        captionsUrl: sampleCaptionUrl,
        captionsLabel: 'English Captions',
        size: '184 MB Stream',
        duration: '63:50',
        chapter: 'Chapter 1: Video Fundamentals & ABR',
        isWatched: true,
      },
      {
        id: 'sample_2',
        title: '02. Mux Adaptive Bitrate (1080p FHD Stream)',
        type: 'hls',
        url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
        size: '1080p ABR',
        duration: '10:34',
        chapter: 'Chapter 1: Video Fundamentals & ABR',
        isWatched: false,
      },
      {
        id: 'sample_3',
        title: '03. Tears of Steel Full HD Video Demonstration',
        type: 'video',
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
        size: '124 MB MP4',
        duration: '12:14',
        chapter: 'Chapter 2: High Bitrate & Compression',
        isWatched: false,
      },
      {
        id: 'sample_4',
        title: '04. Course Syllabus & Extracted Lectures (HTML)',
        type: 'html',
        url: URL.createObjectURL(new Blob([sampleHtml], { type: 'text/html' })),
        filename: 'Course_Syllabus_Lectures.html',
        textContent: sampleHtml,
        size: '2.4 KB HTML',
        chapter: 'Chapter 3: HTML Syllabus & Documentation',
        isWatched: false,
      },
      {
        id: 'sample_5',
        title: '05. Course Guide & Architecture Formula Sheet (PDF)',
        type: 'pdf',
        url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        filename: 'Complete_Formula_Sheet.pdf',
        size: '2.4 MB PDF',
        chapter: 'Chapter 3: HTML Syllabus & Documentation',
        isWatched: false,
      },
      {
        id: 'sample_6',
        title: '06. Video Streaming Notes & Quick Reference (Text)',
        type: 'text',
        url: URL.createObjectURL(new Blob([sampleText], { type: 'text/plain' })),
        filename: 'quick_notes.txt',
        textContent: sampleText,
        size: '0.9 KB Text',
        chapter: 'Chapter 4: Quick Reference & Study Notes',
        isWatched: false,
      },
    ];

    onTopicsChange([...samples, ...topics]);
  };

  // Filter topics
  const filteredTopics = topics.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.chapter && item.chapter.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.filename && item.filename.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;
    if (filterType === 'video') return item.type === 'video' || item.type === 'hls';
    if (filterType === 'pdf') return item.type === 'pdf';
    if (filterType === 'html') return item.type === 'html';
    if (filterType === 'text') return item.type === 'text';
    return true;
  });

  // Group filtered topics by Chapter
  const chapterGroups = React.useMemo(() => {
    const groups: { [key: string]: TopicItem[] } = {};
    filteredTopics.forEach((item) => {
      const chap = item.chapter || 'Chapter 1: General Videos';
      if (!groups[chap]) {
        groups[chap] = [];
      }
      groups[chap].push(item);
    });
    return groups;
  }, [filteredTopics]);

  const chapterNames = Object.keys(chapterGroups);

  return (
    <div className="w-full space-y-5">
      {/* Top Header & Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-indigo-400" />
            <span>Course Chapters & Universal File Hub</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            HTML file upload karein — uske <strong>saare video links, chapters aur captions</strong> automatically extract hokar isi player me play honge!
          </p>
        </div>

        {/* Buttons: Upload from Phone (ANY file) & Add Manual Link */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Universal File Input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            multiple
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-md shadow-indigo-600/30 transition-all"
            title="Upload any file: HTML files will automatically parse all video links & captions!"
          >
            <Upload className="h-4 w-4" />
            <span>Upload Any File (.html, .txt, .pdf, .mp4)</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Add Link / Video</span>
          </button>

          {topics.length === 0 && (
            <button
              onClick={handleLoadSampleCourse}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-950/70 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-800/80 text-xs font-semibold transition-colors"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Load Sample Chapters (4 Chapters with Captions & HTML)</span>
            </button>
          )}
        </div>
      </div>

      {/* HTML Video Extraction Success Banner */}
      {extractionAlert && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-950/80 border border-emerald-800 text-xs text-emerald-200 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <Sparkles className="h-4 w-4 text-emerald-400 shrink-0" />
            <div>
              <span className="font-bold text-white">HTML File Parsed Successfully: </span>
              <span>
                Found <strong>{extractionAlert.videoCount} videos</strong> across{' '}
                <strong>{extractionAlert.chapterCount} chapter sections</strong> from{' '}
                <span className="font-mono text-emerald-300">{extractionAlert.fileName}</span>.
                {extractionAlert.hasCaptions && ' Subtitles/Captions loaded!'}
              </span>
            </div>
          </div>
          <button
            onClick={() => setExtractionAlert(null)}
            className="text-emerald-400 hover:text-white font-bold ml-3 text-sm"
          >
            ×
          </button>
        </div>
      )}

      {/* Filter Tabs & Search Bar & View Mode Toggle */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-900 border border-slate-800 overflow-x-auto w-full sm:w-auto scrollbar-none">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
              filterType === 'all'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All Items ({topics.length})
          </button>
          <button
            onClick={() => setFilterType('video')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
              filterType === 'video'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Videos ({topics.filter((t) => t.type === 'video' || t.type === 'hls').length})
          </button>
          <button
            onClick={() => setFilterType('pdf')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
              filterType === 'pdf'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            PDFs ({topics.filter((t) => t.type === 'pdf').length})
          </button>
          <button
            onClick={() => setFilterType('html')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
              filterType === 'html'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            HTML ({topics.filter((t) => t.type === 'html').length})
          </button>
          <button
            onClick={() => setFilterType('text')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
              filterType === 'text'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Notes ({topics.filter((t) => t.type === 'text').length})
          </button>
        </div>

        {/* View Mode Toggle: Chapter Sections View vs Flat List */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="flex items-center p-0.5 rounded-lg bg-slate-900 border border-slate-800 text-xs">
            <button
              onClick={() => setViewMode('chapters')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-semibold transition-colors ${
                viewMode === 'chapters'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Organize videos into Chapter Folders & Sections"
            >
              <Layers className="h-3.5 w-3.5" />
              <span>Chapter Sections ({chapterNames.length})</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-semibold transition-colors ${
                viewMode === 'list'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Show as a flat single list"
            >
              <File className="h-3.5 w-3.5" />
              <span>Full List</span>
            </button>
          </div>

          {/* Search */}
          <div className="relative flex-1 sm:w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search chapters or videos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-800 bg-slate-900/80 pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Topics Content: CHAPTER SECTIONS VIEW */}
      {filteredTopics.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 py-12 px-4 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-800 text-slate-400 mb-3">
            <FolderOpen className="h-6 w-6" />
          </div>
          <h4 className="text-sm font-semibold text-white">No Files or Chapters Uploaded</h4>
          <p className="mt-1 text-xs text-slate-400 max-w-sm leading-relaxed">
            Upload an HTML syllabus file to automatically create video chapter sections with captions, or load the sample course.
          </p>
          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-colors"
            >
              <Upload className="h-3.5 w-3.5" />
              <span>Upload HTML / Video File</span>
            </button>
            <button
              onClick={handleLoadSampleCourse}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition-colors"
            >
              Load Sample 4-Chapter Course
            </button>
          </div>
        </div>
      ) : viewMode === 'chapters' ? (
        /* CHAPTER ACCORDION VIEW ("all vdo chapter ka section bn jaye") */
        <div className="space-y-4">
          {chapterNames.map((chapterName, cIdx) => {
            const chapterItems = chapterGroups[chapterName];
            const isCollapsed = !!collapsedChapters[chapterName];
            const watchedCount = chapterItems.filter((i) => i.isWatched).length;
            const progressPercent = Math.round((watchedCount / chapterItems.length) * 100);
            const hasAnyCaptions = chapterItems.some((i) => !!i.captionsUrl);

            return (
              <div
                key={chapterName}
                className="rounded-2xl border border-slate-800/90 bg-slate-900/70 overflow-hidden shadow-lg transition-all"
              >
                {/* Chapter Section Header Banner */}
                <div
                  onClick={() => toggleChapter(chapterName)}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 bg-slate-950/70 hover:bg-slate-900/90 border-b border-slate-800/80 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      className="p-1 rounded-md text-slate-400 hover:text-white"
                      title={isCollapsed ? 'Expand Chapter' : 'Collapse Chapter'}
                    >
                      {isCollapsed ? (
                        <ChevronRight className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </button>

                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 text-xs font-bold">
                      {cIdx + 1}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-white">{chapterName}</h4>
                        {hasAnyCaptions && (
                          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-800">
                            <Captions className="h-3 w-3" />
                            <span>CC</span>
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                        {chapterItems.length} Lectures & Materials · {watchedCount} of {chapterItems.length} completed ({progressPercent}%)
                      </p>
                    </div>
                  </div>

                  {/* Chapter Progress Bar */}
                  <div className="flex items-center gap-3 sm:self-auto self-end">
                    <div className="w-24 sm:w-32 h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 transition-all duration-300"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                    <span className="text-[11px] font-mono text-slate-300 font-semibold">
                      {progressPercent}%
                    </span>
                  </div>
                </div>

                {/* Chapter Items List */}
                {!isCollapsed && (
                  <div className="p-3 space-y-2">
                    {chapterItems.map((topic) => {
                      const isPlaying =
                        currentPlayingId === topic.id || currentPlayingId === topic.url;
                      const isVideo = isPlayableMedia(topic);
                      const isHtml = topic.type === 'html';
                      const isText = topic.type === 'text';
                      const isPdf = topic.type === 'pdf';
                      const isImage = topic.type === 'image';

                      return (
                        <div
                          key={topic.id}
                          onClick={() => {
                            if (isVideo) {
                              onPlayTopic(topic);
                            } else {
                              onViewFile(topic);
                            }
                          }}
                          className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border transition-all cursor-pointer group ${
                            isPlaying
                              ? 'border-indigo-500 bg-indigo-950/40 shadow-md shadow-indigo-500/10'
                              : 'border-slate-800/80 bg-slate-900/50 hover:bg-slate-800/80 hover:border-slate-700'
                          }`}
                        >
                          {/* Left: Icon, Title & Captions badge */}
                          <div className="flex items-start sm:items-center gap-3 min-w-0">
                            <div
                              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-colors ${
                                isHtml
                                  ? 'bg-amber-950/60 border-amber-800/60 text-amber-400'
                                  : isText
                                  ? 'bg-blue-950/60 border-blue-800/60 text-blue-400'
                                  : isPdf
                                  ? 'bg-red-950/60 border-red-800/60 text-red-400'
                                  : isImage
                                  ? 'bg-emerald-950/60 border-emerald-800/60 text-emerald-400'
                                  : isPlaying
                                  ? 'bg-indigo-600 text-white border-indigo-500'
                                  : 'bg-slate-800 border-slate-700/80 text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white'
                              }`}
                            >
                              {isHtml ? (
                                <FileCode className="h-4 w-4" />
                              ) : isText ? (
                                <FileText className="h-4 w-4" />
                              ) : isPdf ? (
                                <BookOpen className="h-4 w-4" />
                              ) : isImage ? (
                                <ImageIcon className="h-4 w-4" />
                              ) : isPlaying ? (
                                <span className="flex h-2.5 w-2.5 rounded-full bg-white animate-ping" />
                              ) : (
                                <Play className="h-3.5 w-3.5 fill-current ml-0.5" />
                              )}
                            </div>

                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-semibold text-xs sm:text-sm text-white truncate max-w-sm sm:max-w-md">
                                  {topic.title}
                                </span>
                                {isPlaying && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-400 uppercase">
                                    Playing Now
                                  </span>
                                )}
                                {topic.captionsUrl && (
                                  <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-800" title="Subtitles/Captions available">
                                    <Captions className="h-3 w-3" />
                                    <span>{topic.captionsLabel || 'CC'}</span>
                                  </span>
                                )}
                                {topic.sourceFile && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-400 border border-slate-700">
                                    From {topic.sourceFile}
                                  </span>
                                )}
                              </div>

                              <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400 mt-0.5 font-mono">
                                <span className="text-slate-300 uppercase font-semibold">
                                  {topic.type.toUpperCase()}
                                </span>
                                {topic.size && (
                                  <>
                                    <span aria-hidden="true" className="text-slate-600">·</span>
                                    <span>{topic.size}</span>
                                  </>
                                )}
                                {topic.duration && (
                                  <>
                                    <span aria-hidden="true" className="text-slate-600">·</span>
                                    <span>{topic.duration}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Right: Actions */}
                          <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                            <button
                              onClick={(e) => handleToggleWatched(topic.id, e)}
                              className={`p-1.5 rounded-lg text-xs transition-colors ${
                                topic.isWatched
                                  ? 'text-emerald-400 bg-emerald-950/50'
                                  : 'text-slate-500 hover:text-slate-300'
                              }`}
                              title={topic.isWatched ? 'Marked as Completed' : 'Mark as Completed'}
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </button>

                            {/* Play Video directly in player ("esi me play ho") */}
                            {isVideo ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onPlayTopic(topic);
                                }}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow transition-colors"
                              >
                                <Play className="h-3 w-3 fill-white" />
                                <span>Play</span>
                              </button>
                            ) : isHtml ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onViewFile(topic);
                                }}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-950/80 hover:bg-amber-900 border border-amber-800 text-amber-300 text-xs font-semibold transition-colors"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                <span>View HTML</span>
                              </button>
                            ) : isText ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onViewFile(topic);
                                }}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-950/80 hover:bg-blue-900 border border-blue-800 text-blue-300 text-xs font-semibold transition-colors"
                              >
                                <FileText className="h-3.5 w-3.5" />
                                <span>Read</span>
                              </button>
                            ) : isPdf ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onViewFile(topic);
                                }}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-950/80 hover:bg-red-900 border border-red-800 text-red-300 text-xs font-semibold transition-colors"
                              >
                                <BookOpen className="h-3.5 w-3.5" />
                                <span>PDF</span>
                              </button>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onViewFile(topic);
                                }}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                <span>View</span>
                              </button>
                            )}

                            {/* Download Button */}
                            <button
                              onClick={(e) => handleDownload(topic, e)}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 text-xs font-medium transition-colors"
                              title="Download this lecture file"
                            >
                              <Download className="h-3.5 w-3.5 text-emerald-400" />
                              <span className="hidden sm:inline">Save</span>
                            </button>

                            {/* Remove item */}
                            <button
                              onClick={(e) => handleDelete(topic.id, e)}
                              className="p-1.5 text-slate-500 hover:text-red-400 transition-colors"
                              title="Remove"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* FLAT LIST VIEW */
        <div className="space-y-2.5">
          {filteredTopics.map((topic) => {
            const isPlaying =
              currentPlayingId === topic.id || currentPlayingId === topic.url;
            const isVideo = isPlayableMedia(topic);
            const isHtml = topic.type === 'html';
            const isText = topic.type === 'text';
            const isPdf = topic.type === 'pdf';
            const isImage = topic.type === 'image';

            return (
              <div
                key={topic.id}
                onClick={() => {
                  if (isVideo) {
                    onPlayTopic(topic);
                  } else {
                    onViewFile(topic);
                  }
                }}
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border transition-all cursor-pointer group ${
                  isPlaying
                    ? 'border-indigo-500 bg-indigo-950/30 shadow-md shadow-indigo-500/10'
                    : 'border-slate-800/90 bg-slate-900/60 hover:bg-slate-800/70 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start sm:items-center gap-3 min-w-0">
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-colors ${
                      isHtml
                        ? 'bg-amber-950/60 border-amber-800/60 text-amber-400'
                        : isText
                        ? 'bg-blue-950/60 border-blue-800/60 text-blue-400'
                        : isPdf
                        ? 'bg-red-950/60 border-red-800/60 text-red-400'
                        : isImage
                        ? 'bg-emerald-950/60 border-emerald-800/60 text-emerald-400'
                        : isPlaying
                        ? 'bg-indigo-600 text-white border-indigo-500'
                        : 'bg-slate-800 border-slate-700/80 text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white'
                    }`}
                  >
                    {isHtml ? (
                      <FileCode className="h-4 w-4" />
                    ) : isText ? (
                      <FileText className="h-4 w-4" />
                    ) : isPdf ? (
                      <BookOpen className="h-4 w-4" />
                    ) : isImage ? (
                      <ImageIcon className="h-4 w-4" />
                    ) : isPlaying ? (
                      <span className="flex h-2.5 w-2.5 rounded-full bg-white animate-ping" />
                    ) : (
                      <Play className="h-4 w-4 fill-current ml-0.5" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-xs sm:text-sm text-white truncate max-w-sm sm:max-w-md">
                        {topic.title}
                      </span>
                      {topic.captionsUrl && (
                        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-800">
                          <Captions className="h-3 w-3" />
                          <span>CC</span>
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400 mt-0.5 font-mono">
                      <span>{topic.chapter || 'Topic'}</span>
                      <span aria-hidden="true" className="text-slate-600">·</span>
                      <span className="text-slate-300 font-semibold uppercase">
                        {topic.type.toUpperCase()}
                      </span>
                      {topic.size && (
                        <>
                          <span aria-hidden="true" className="text-slate-600">·</span>
                          <span>{topic.size}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                  {isVideo ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onPlayTopic(topic);
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow transition-colors"
                    >
                      <Play className="h-3 w-3 fill-white" />
                      <span>Play</span>
                    </button>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewFile(topic);
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>View</span>
                    </button>
                  )}

                  <button
                    onClick={(e) => handleDownload(topic, e)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 text-xs font-medium transition-colors"
                  >
                    <Download className="h-3.5 w-3.5 text-emerald-400" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Manual Link Modal with Chapter & Caption URL input */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <form
            onSubmit={handleAddManualTopic}
            className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4"
          >
            <h4 className="text-base font-bold text-white">Add Video or Topic Resource</h4>

            <div>
              <label className="text-xs font-medium text-slate-400">Title</label>
              <input
                type="text"
                required
                placeholder="e.g. Lesson 05: Stream Optimization"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white placeholder-slate-600 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-400">Stream or File URL</label>
              <input
                type="url"
                required
                placeholder="https://example.com/video.m3u8 or .mp4 or .html"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white placeholder-slate-600 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-400">
                Subtitles / Caption URL (.vtt or .srt) (Optional)
              </label>
              <input
                type="url"
                placeholder="https://example.com/subtitles.vtt (optional)"
                value={newCaptionsUrl}
                onChange={(e) => setNewCaptionsUrl(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white placeholder-slate-600 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-400">Format</label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as any)}
                  className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
                >
                  <option value="hls">HLS (.m3u8)</option>
                  <option value="video">MP4 Video</option>
                  <option value="html">HTML Syllabus</option>
                  <option value="pdf">PDF Document</option>
                  <option value="text">Notes / Code</option>
                  <option value="file">Other File</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-400">Chapter Section</label>
                <input
                  type="text"
                  placeholder="e.g. Chapter 1: Basics"
                  value={newChapter}
                  onChange={(e) => setNewChapter(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white placeholder-slate-600 focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow"
              >
                Add to Chapter
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
