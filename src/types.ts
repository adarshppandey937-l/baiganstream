export type StreamType =
  | 'hls'
  | 'mp4'
  | 'webm'
  | 'dash'
  | 'youtube'
  | 'vimeo'
  | 'dailymotion'
  | 'unknown';

export interface StreamInfo {
  url: string;
  type: StreamType;
  title: string;
  sourceType: 'direct' | 'hls' | 'embed';
  youtubeId?: string;
  vimeoId?: string;
  dailymotionId?: string;
  isLive?: boolean;
}

export interface StreamMetadata {
  contentType?: string;
  contentLength?: number | null;
  formattedSize?: string;
  acceptRanges?: string;
  statusCode?: number;
  server?: string;
  resolution?: { width: number; height: number };
  duration?: number;
  currentBitrate?: number;
  levels?: { id: number; height: number; bitrate: number; name: string }[];
  audioTracks?: { id: number; name: string; lang?: string }[];
  currentLevel?: number;
  currentAudioTrack?: number;
  bufferedEnd?: number;
  bufferedSeconds?: number;
  bufferPercent?: number;
}

export interface DrmConfig {
  enabled: boolean;
  type: 'clearkey' | 'widevine' | 'playready';
  keyId?: string;
  key?: string;
  licenseServerUrl?: string;
  customHeaders?: Record<string, string>;
}

export interface DownloadState {
  status: 'idle' | 'parsing' | 'downloading' | 'merging' | 'completed' | 'error';
  progress: number;
  downloadedBytes: number;
  totalBytes?: number;
  currentSegment: number;
  totalSegments: number;
  speed: string;
  error?: string;
  blobUrl?: string;
  filename?: string;
}

export interface StreamPreset {
  id: string;
  name: string;
  category: 'HLS (.m3u8)' | 'Direct MP4/WebM' | 'YouTube' | 'DASH/DRM';
  url: string;
  description: string;
  badge: string;
}

export interface TopicItem {
  id: string;
  title: string;
  type: 'video' | 'pdf' | 'hls' | 'link' | 'html' | 'text' | 'image' | 'file';
  url: string;
  size?: string;
  duration?: string;
  filename?: string;
  fileBlob?: Blob;
  blobUrl?: string;
  textContent?: string;
  captionsUrl?: string;
  captionsLabel?: string;
  sourceFile?: string;
  isWatched?: boolean;
  chapter?: string;
  addedAt?: number;
}
