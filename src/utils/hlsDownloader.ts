import { DownloadState } from '../types';

export class HlsDownloader {
  private abortController: AbortController | null = null;
  private onProgressCallback: ((state: DownloadState) => void) | null = null;

  public async startDownload(
    m3u8Url: string,
    filename: string,
    useProxy: boolean,
    onProgress: (state: DownloadState) => void
  ): Promise<Blob | null> {
    this.abortController = new AbortController();
    this.onProgressCallback = onProgress;

    const baseState: DownloadState = {
      status: 'parsing',
      progress: 0,
      downloadedBytes: 0,
      currentSegment: 0,
      totalSegments: 0,
      speed: '0 KB/s',
      filename: filename.endsWith('.ts') ? filename : `${filename}.ts`,
    };
    onProgress(baseState);

    try {
      // 1. Fetch Playlist
      const fetchUrl = useProxy
        ? `/api/proxy-stream?url=${encodeURIComponent(m3u8Url)}`
        : m3u8Url;

      const playlistRes = await fetch(fetchUrl, {
        signal: this.abortController.signal,
      });

      if (!playlistRes.ok) {
        throw new Error(`Failed to fetch M3U8 playlist (${playlistRes.status})`);
      }

      const playlistText = await playlistRes.text();
      let mediaPlaylistUrl = m3u8Url;
      let mediaPlaylistText = playlistText;

      // Check if it's a master playlist
      if (playlistText.includes('#EXT-X-STREAM-INF')) {
        const lines = playlistText.split('\n');
        let highestBandwidth = -1;
        let selectedSubPlaylist = '';

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (line.startsWith('#EXT-X-STREAM-INF:')) {
            const bwMatch = line.match(/BANDWIDTH=(\d+)/);
            const bandwidth = bwMatch ? parseInt(bwMatch[1], 10) : 0;
            const nextLine = lines[i + 1]?.trim();
            if (nextLine && !nextLine.startsWith('#') && bandwidth > highestBandwidth) {
              highestBandwidth = bandwidth;
              selectedSubPlaylist = nextLine;
            }
          }
        }

        if (selectedSubPlaylist) {
          mediaPlaylistUrl = new URL(selectedSubPlaylist, m3u8Url).toString();
          const subFetchUrl = useProxy
            ? `/api/proxy-stream?url=${encodeURIComponent(mediaPlaylistUrl)}`
            : mediaPlaylistUrl;
          const subRes = await fetch(subFetchUrl, {
            signal: this.abortController.signal,
          });
          if (subRes.ok) {
            mediaPlaylistText = await subRes.text();
          }
        }
      }

      // 2. Parse Segments
      const segmentUrls: string[] = [];
      const lines = mediaPlaylistText.split('\n');
      const baseSegmentUrl = mediaPlaylistUrl.substring(
        0,
        mediaPlaylistUrl.lastIndexOf('/') + 1
      );

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line && !line.startsWith('#')) {
          let fullSegUrl = line;
          if (!line.startsWith('http://') && !line.startsWith('https://')) {
            fullSegUrl = new URL(line, baseSegmentUrl).toString();
          }
          segmentUrls.push(fullSegUrl);
        }
      }

      if (segmentUrls.length === 0) {
        throw new Error('No video segments found in the playlist');
      }

      const totalSegments = segmentUrls.length;
      let downloadedBytes = 0;
      const segmentBuffers: ArrayBuffer[] = [];
      const startTime = Date.now();

      onProgress({
        ...baseState,
        status: 'downloading',
        totalSegments,
        currentSegment: 0,
      });

      // 3. Download segments in sequence
      for (let index = 0; index < segmentUrls.length; index++) {
        if (this.abortController.signal.aborted) {
          throw new Error('Download aborted by user');
        }

        const segUrl = segmentUrls[index];
        const segFetchUrl = useProxy
          ? `/api/proxy-stream?url=${encodeURIComponent(segUrl)}`
          : segUrl;

        let segRes: Response;
        try {
          segRes = await fetch(segFetchUrl, {
            signal: this.abortController.signal,
          });
          if (!segRes.ok && !useProxy) {
            // Try fallback with proxy if direct fails
            segRes = await fetch(`/api/proxy-stream?url=${encodeURIComponent(segUrl)}`, {
              signal: this.abortController.signal,
            });
          }
        } catch {
          // If direct fetch had CORS, fallback to proxy
          segRes = await fetch(`/api/proxy-stream?url=${encodeURIComponent(segUrl)}`, {
            signal: this.abortController.signal,
          });
        }

        if (!segRes.ok) {
          throw new Error(`Failed to download segment ${index + 1}/${totalSegments}`);
        }

        const buf = await segRes.arrayBuffer();
        segmentBuffers.push(buf);
        downloadedBytes += buf.byteLength;

        const elapsedSec = (Date.now() - startTime) / 1000;
        const speedBytesPerSec = elapsedSec > 0 ? downloadedBytes / elapsedSec : 0;
        const speedStr =
          speedBytesPerSec > 1024 * 1024
            ? `${(speedBytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`
            : `${(speedBytesPerSec / 1024).toFixed(0)} KB/s`;

        const progressPercent = Math.round(((index + 1) / totalSegments) * 100);

        onProgress({
          ...baseState,
          status: 'downloading',
          progress: progressPercent,
          downloadedBytes,
          currentSegment: index + 1,
          totalSegments,
          speed: speedStr,
        });
      }

      // 4. Merge Segments into unified Blob
      onProgress({
        ...baseState,
        status: 'merging',
        progress: 100,
        downloadedBytes,
        currentSegment: totalSegments,
        totalSegments,
        speed: 'Assembling...',
      });

      const totalSize = segmentBuffers.reduce((acc, b) => acc + b.byteLength, 0);
      const mergedArray = new Uint8Array(totalSize);
      let offset = 0;
      for (const buffer of segmentBuffers) {
        mergedArray.set(new Uint8Array(buffer), offset);
        offset += buffer.byteLength;
      }

      const blob = new Blob([mergedArray], { type: 'video/mp2t' });
      const blobUrl = URL.createObjectURL(blob);

      onProgress({
        ...baseState,
        status: 'completed',
        progress: 100,
        downloadedBytes,
        currentSegment: totalSegments,
        totalSegments,
        speed: 'Done',
        blobUrl,
      });

      return blob;
    } catch (err: any) {
      if (this.abortController?.signal.aborted) {
        onProgress({
          ...baseState,
          status: 'idle',
          error: 'Download cancelled',
        });
        return null;
      }

      onProgress({
        ...baseState,
        status: 'error',
        error: err.message || 'An error occurred during HLS download',
      });
      return null;
    }
  }

  public cancel() {
    if (this.abortController) {
      this.abortController.abort();
    }
  }
}
