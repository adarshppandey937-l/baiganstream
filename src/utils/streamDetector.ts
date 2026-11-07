import { StreamInfo, StreamType, StreamPreset } from '../types';

export function detectStreamType(url: string): StreamInfo {
  const cleanUrl = url.trim();
  const lower = cleanUrl.toLowerCase();

  // YouTube detection
  const ytMatch = cleanUrl.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/i
  );
  if (ytMatch && ytMatch[1]) {
    return {
      url: cleanUrl,
      type: 'youtube',
      title: 'YouTube Video',
      sourceType: 'embed',
      youtubeId: ytMatch[1],
    };
  }

  // Vimeo detection
  const vimeoMatch = cleanUrl.match(
    /(?:vimeo\.com\/(?:video\/)?|player\.vimeo\.com\/video\/)(\d+)/i
  );
  if (vimeoMatch && vimeoMatch[1]) {
    return {
      url: cleanUrl,
      type: 'vimeo',
      title: `Vimeo Video (${vimeoMatch[1]})`,
      sourceType: 'embed',
      vimeoId: vimeoMatch[1],
    };
  }

  // Dailymotion detection
  const dmMatch = cleanUrl.match(
    /(?:dailymotion\.com\/(?:video\/|embed\/video\/)|dai\.ly\/)([a-zA-Z0-9]+)/i
  );
  if (dmMatch && dmMatch[1]) {
    return {
      url: cleanUrl,
      type: 'dailymotion',
      title: `Dailymotion (${dmMatch[1]})`,
      sourceType: 'embed',
      dailymotionId: dmMatch[1],
    };
  }

  // HLS detection (.m3u8 extension or query string)
  if (lower.includes('.m3u8')) {
    const filename = getFilenameFromUrl(cleanUrl, 'hls_stream.m3u8');
    return {
      url: cleanUrl,
      type: 'hls',
      title: filename.replace('.m3u8', ''),
      sourceType: 'hls',
    };
  }

  // DASH detection (.mpd)
  if (lower.includes('.mpd')) {
    const filename = getFilenameFromUrl(cleanUrl, 'dash_stream.mpd');
    return {
      url: cleanUrl,
      type: 'dash',
      title: filename.replace('.mpd', ''),
      sourceType: 'direct',
    };
  }

  // Direct MP4
  if (lower.includes('.mp4') || lower.includes('.m4v')) {
    const filename = getFilenameFromUrl(cleanUrl, 'video.mp4');
    return {
      url: cleanUrl,
      type: 'mp4',
      title: filename,
      sourceType: 'direct',
    };
  }

  // WebM
  if (lower.includes('.webm')) {
    const filename = getFilenameFromUrl(cleanUrl, 'video.webm');
    return {
      url: cleanUrl,
      type: 'webm',
      title: filename,
      sourceType: 'direct',
    };
  }

  // Fallback for unknown / generic stream URLs
  const filename = getFilenameFromUrl(cleanUrl, 'stream_video');
  return {
    url: cleanUrl,
    type: 'unknown',
    title: filename,
    sourceType: 'direct',
  };
}

export function getFilenameFromUrl(url: string, fallback: string = 'video.mp4'): string {
  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname;
    const parts = pathname.split('/').filter(Boolean);
    if (parts.length > 0) {
      const last = parts[parts.length - 1];
      if (last.includes('.')) {
        return decodeURIComponent(last);
      }
    }
  } catch {
    // If not a valid standard URL, return fallback
  }
  return fallback;
}

export const STREAM_PRESETS: StreamPreset[] = [
  {
    id: 'brightcove-migration',
    name: 'CloudFront Video (User Stream)',
    category: 'HLS (.m3u8)',
    url: 'https://d14v4v80cpjht7.cloudfront.net/file_library/videos/migration/brightcove/6339453683112/6339453683112.m3u8',
    description: 'CloudFront hosted Brightcove multi-variant HLS stream (720p/360p/240p)',
    badge: 'CloudFront HLS',
  },
  {
    id: 'bbb-hls',
    name: 'Big Buck Bunny (Multi-Bitrate)',
    category: 'HLS (.m3u8)',
    url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    description: 'Apple HLS adaptive stream with multiple resolutions (1080p, 720p, 480p, 360p)',
    badge: 'HLS 1080p',
  },
  {
    id: 'sintel-hls',
    name: 'Sintel Open Movie (HLS Master)',
    category: 'HLS (.m3u8)',
    url: 'https://bitdash-a.akamaihd.net/content/sintel/hls/playlist.m3u8',
    description: 'High definition HLS stream with alternate audio and subtitles',
    badge: 'HLS Multi-Audio',
  },
  {
    id: 'tears-mp4',
    name: 'Tears of Steel (4K Direct MP4)',
    category: 'Direct MP4/WebM',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    description: 'Direct high-bitrate MP4 file with full seek and download capabilities',
    badge: 'MP4 HD',
  },
  {
    id: 'elephants-webm',
    name: 'Elephants Dream (WebM Format)',
    category: 'Direct MP4/WebM',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    description: 'Direct stream with fast seek buffers',
    badge: 'MP4 720p',
  },
  {
    id: 'yt-nature',
    name: 'YouTube 4K Demo',
    category: 'YouTube',
    url: 'https://www.youtube.com/watch?v=LXb3EKWsInQ',
    description: 'YouTube 4K video link testing embed and metadata detection',
    badge: 'YouTube',
  },
  {
    id: 'clear-key-drm',
    name: 'ClearKey Encrypted Stream Sample',
    category: 'DASH/DRM',
    url: 'https://dash.akamaized.net/dash264/TestCases/1c/qualcomm/1/ClearKey/manifest.mpd',
    description: 'DASH ClearKey DRM encrypted test manifest for security inspection',
    badge: 'DRM Sample',
  },
];
