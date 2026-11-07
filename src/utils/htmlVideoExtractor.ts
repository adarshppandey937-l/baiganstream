import { TopicItem } from '../types';

export interface ExtractedVideoResult {
  topics: TopicItem[];
  chapterCount: number;
  totalVideos: number;
  hasCaptions: boolean;
}

// Clean and sanitize any URL extracted from HTML or TXT
export function cleanMediaUrl(raw: string): string {
  if (!raw) return '';
  return raw
    .trim()
    .replace(/\\\//g, '/') // Unescape JSON slashes https:\/\/ -> https://
    .replace(/&amp;/g, '&') // Decode HTML entity &amp; -> &
    .replace(/&quot;/g, '')
    .replace(/&#39;/g, '')
    .replace(/^['"`\s({\[<]+|['"`\s)}\],;>]+$/g, '') // Strip surrounding quotes/brackets
    .trim();
}

/**
 * Universal Media Extractor:
 * Handles HTML files, TXT files, JSON playlists, and markdown.
 * Extracts video links (.m3u8, .mp4, YouTube, Vimeo), subtitles/captions (.vtt, .srt),
 * and automatically groups them into chapter sections.
 */
export function extractMediaFromContent(
  rawContent: string,
  fileName: string
): ExtractedVideoResult {
  const extractedItems: TopicItem[] = [];
  const seenUrls = new Set<string>();

  const isHtml =
    fileName.toLowerCase().endsWith('.html') ||
    fileName.toLowerCase().endsWith('.htm') ||
    rawContent.includes('<html') ||
    rawContent.includes('<video') ||
    rawContent.includes('<div') ||
    rawContent.includes('<body');

  const baseChapterName = fileName.replace(/\.[^/.]+$/, '') || 'Chapter 1: Extracted Lectures';

  // 1. If HTML, parse DOM structures first
  if (isHtml && typeof DOMParser !== 'undefined') {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(rawContent, 'text/html');

      // Helper to find closest chapter heading for an HTML element
      const findChapterForElement = (el: Element): string => {
        let current: Element | null = el;
        while (current && current !== doc.body) {
          const chapAttr =
            current.getAttribute('data-chapter') ||
            current.getAttribute('data-section') ||
            current.getAttribute('data-module');
          if (chapAttr) return chapAttr.trim();

          const headingInside = current.querySelector('h1, h2, h3, h4, .chapter-title, .section-header');
          if (headingInside && headingInside !== el) {
            const txt = headingInside.textContent?.trim();
            if (txt && txt.length < 80) return txt;
          }
          current = current.parentElement;
        }

        let prev = el.previousElementSibling;
        while (prev) {
          if (['H1', 'H2', 'H3', 'H4', 'H5'].includes(prev.tagName)) {
            const txt = prev.textContent?.trim();
            if (txt) return txt;
          }
          const heading = prev.querySelector('h1, h2, h3, h4');
          if (heading) {
            const txt = heading.textContent?.trim();
            if (txt) return txt;
          }
          prev = prev.previousElementSibling;
        }

        return baseChapterName;
      };

      // Extract from <video> and <source> tags
      const videoElements = doc.querySelectorAll('video');
      videoElements.forEach((videoEl, idx) => {
        let src = videoEl.getAttribute('src');
        if (!src) {
          const sourceEl = videoEl.querySelector('source');
          if (sourceEl) src = sourceEl.getAttribute('src');
        }

        const cleanSrc = cleanMediaUrl(src || '');
        if (cleanSrc && cleanSrc.startsWith('http') && !seenUrls.has(cleanSrc)) {
          seenUrls.add(cleanSrc);
          const chapter = findChapterForElement(videoEl);
          const title =
            videoEl.getAttribute('title') ||
            videoEl.getAttribute('data-title') ||
            `Lecture ${extractedItems.length + 1} (${chapter})`;

          let captionsUrl: string | undefined;
          let captionsLabel: string | undefined;
          const track = videoEl.querySelector('track');
          if (track) {
            captionsUrl = cleanMediaUrl(track.getAttribute('src') || '');
            captionsLabel = track.getAttribute('label') || 'Subtitles';
          }

          const isHls = cleanSrc.includes('.m3u8');
          extractedItems.push({
            id: `media_dom_vid_${Date.now()}_${idx}`,
            title,
            type: isHls ? 'hls' : 'video',
            url: cleanSrc,
            chapter,
            captionsUrl,
            captionsLabel,
            sourceFile: fileName,
            isWatched: false,
            size: isHls ? 'HLS Stream' : 'Video',
            addedAt: Date.now(),
          });
        }
      });

      // Extract from <a> tags
      const links = doc.querySelectorAll('a[href]');
      links.forEach((aEl, idx) => {
        const href = cleanMediaUrl(aEl.getAttribute('href') || '');
        if (!href || seenUrls.has(href)) return;

        const lower = href.toLowerCase();
        const isMedia =
          lower.includes('.m3u8') ||
          lower.includes('.mp4') ||
          lower.includes('.webm') ||
          lower.includes('.mkv') ||
          lower.includes('youtube.com/watch') ||
          lower.includes('youtu.be/') ||
          lower.includes('vimeo.com/');

        if (isMedia && href.startsWith('http')) {
          seenUrls.add(href);
          const chapter = findChapterForElement(aEl);
          const linkText = aEl.textContent?.trim();
          const title =
            linkText && linkText.length > 2 && linkText.length < 100
              ? linkText
              : aEl.getAttribute('title') || `Lecture ${extractedItems.length + 1}`;

          let captionsUrl: string | undefined;
          const nextSibling = aEl.nextElementSibling;
          if (nextSibling && nextSibling.getAttribute('href')?.match(/\.(vtt|srt)$/i)) {
            captionsUrl = cleanMediaUrl(nextSibling.getAttribute('href') || '');
          }

          const isHls = lower.includes('.m3u8');
          const isYt = lower.includes('youtube.com') || lower.includes('youtu.be');

          extractedItems.push({
            id: `media_dom_a_${Date.now()}_${idx}`,
            title,
            type: isYt ? 'video' : isHls ? 'hls' : 'video',
            url: href,
            chapter,
            captionsUrl,
            captionsLabel: captionsUrl ? 'Captions' : undefined,
            sourceFile: fileName,
            isWatched: false,
            size: isHls ? 'HLS Stream' : 'Video',
            addedAt: Date.now(),
          });
        }
      });

      // Extract from <iframe> tags
      const iframes = doc.querySelectorAll('iframe[src]');
      iframes.forEach((iframeEl, idx) => {
        const src = cleanMediaUrl(iframeEl.getAttribute('src') || '');
        if (!src || seenUrls.has(src)) return;

        if (
          src.includes('youtube.com') ||
          src.includes('youtu.be') ||
          src.includes('vimeo.com') ||
          src.includes('.m3u8')
        ) {
          seenUrls.add(src);
          const chapter = findChapterForElement(iframeEl);
          const title = iframeEl.getAttribute('title') || `Embedded Lecture ${extractedItems.length + 1}`;

          extractedItems.push({
            id: `media_dom_iframe_${Date.now()}_${idx}`,
            title,
            type: src.includes('.m3u8') ? 'hls' : 'video',
            url: src,
            chapter,
            sourceFile: fileName,
            isWatched: false,
            size: 'Embedded Video',
            addedAt: Date.now(),
          });
        }
      });
    } catch {
      // DOMParser fallback to regex below
    }
  }

  // 2. Line-by-Line & Universal Regex Scanner for BOTH HTML and TXT files
  const normalized = rawContent.replace(/\\\//g, '/').replace(/&amp;/g, '&');
  const lines = normalized.split(/\r?\n/);
  let currentChapter = baseChapterName;
  let activeCaptionUrl: string | undefined;

  // Search for any global subtitle file (.vtt or .srt)
  const globalCaptionMatch = normalized.match(/https?:\/\/[^\s"'<>\`\)\]]+\.(vtt|srt)[^\s"'<>\`\)\]]*/i);
  if (globalCaptionMatch) {
    activeCaptionUrl = cleanMediaUrl(globalCaptionMatch[0]);
  }

  // Scan line by line for chapters, titles, and media URLs
  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    // Detect chapter headings in text/html (e.g., "Chapter 1: ...", "Module 2: ...", "Section 3: ...", "# Title")
    const chapterMatch = trimmed.match(
      /^(?:#+\s*|(?:chapter|module|section|day|part|unit)\s*[\d.:\-–]+[:\s]*)(.*)/i
    );
    if (chapterMatch && trimmed.length < 90 && !trimmed.includes('http')) {
      currentChapter = trimmed.replace(/^#+\s*/, '').trim();
      return;
    }

    // Check if line contains a caption/subtitle link (.vtt / .srt)
    const captionLineMatch = trimmed.match(/https?:\/\/[^\s"'<>\`\)\]]+\.(vtt|srt)[^\s"'<>\`\)\]]*/i);
    if (captionLineMatch) {
      activeCaptionUrl = cleanMediaUrl(captionLineMatch[0]);
    }

    // Comprehensive URL regex matching .m3u8, .mp4, .webm, youtube, vimeo, cloudfront
    const urlMatches = trimmed.match(
      /https?:\/\/[^\s"'<>\`\)\]]+(?:\.m3u8|\.mp4|\.webm|\.mkv|youtu\.be\/|youtube\.com\/|vimeo\.com\/|cloudfront\.net\/)[^\s"'<>\`\)\]]*/gi
    );

    if (urlMatches) {
      urlMatches.forEach((rawUrl) => {
        const cleanUrl = cleanMediaUrl(rawUrl);
        if (cleanUrl && cleanUrl.startsWith('http') && !seenUrls.has(cleanUrl)) {
          seenUrls.add(cleanUrl);

          // Infer title from line text if available
          let title = '';
          const lineWithoutUrl = trimmed.replace(rawUrl, '').replace(/[:\-–|]+/g, ' ').trim();
          if (lineWithoutUrl.length > 2 && lineWithoutUrl.length < 80) {
            title = lineWithoutUrl;
          } else {
            // Infer from URL path
            try {
              const urlObj = new URL(cleanUrl);
              const lastSegment = urlObj.pathname.split('/').filter(Boolean).pop();
              if (lastSegment && lastSegment.length > 1) {
                title = decodeURIComponent(lastSegment).replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ');
              }
            } catch {
              // fallback
            }
          }

          if (!title) {
            title = `Lecture ${extractedItems.length + 1}`;
          }

          const isHls = cleanUrl.toLowerCase().includes('.m3u8');
          const isYt = cleanUrl.toLowerCase().includes('youtube.com') || cleanUrl.toLowerCase().includes('youtu.be');

          extractedItems.push({
            id: `media_regex_${Date.now()}_${extractedItems.length + 1}`,
            title,
            type: isYt ? 'video' : isHls ? 'hls' : 'video',
            url: cleanUrl,
            chapter: currentChapter,
            captionsUrl: activeCaptionUrl,
            captionsLabel: activeCaptionUrl ? 'Captions Available' : undefined,
            sourceFile: fileName,
            isWatched: false,
            size: isHls ? 'Adaptive HLS' : isYt ? 'YouTube' : 'Video',
            addedAt: Date.now(),
          });
        }
      });
    }
  });

  const distinctChapters = new Set(extractedItems.map((i) => i.chapter || 'Chapter 1'));

  return {
    topics: extractedItems,
    chapterCount: distinctChapters.size,
    totalVideos: extractedItems.length,
    hasCaptions: extractedItems.some((i) => !!i.captionsUrl),
  };
}

// Backward compatibility alias
export const extractVideosFromHtml = extractMediaFromContent;
