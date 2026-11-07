import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import http from 'http';
import https from 'https';
import { URL } from 'url';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

app.use(express.json());

// Enable open CORS for all API endpoints
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, HEAD, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Range, Authorization');
  res.header('Access-Control-Expose-Headers', 'Content-Range, Content-Length, Accept-Ranges, Content-Disposition');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

// Stream URL Inspector Endpoint
app.get('/api/inspect', async (req: Request, res: Response) => {
  const targetUrl = req.query.url as string;
  if (!targetUrl) {
    return res.status(400).json({ error: 'URL parameter is required' });
  }

  try {
    const parsed = new URL(targetUrl);
    const client = parsed.protocol === 'https:' ? https : http;

    const headReq = client.request(
      targetUrl,
      {
        method: 'HEAD',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: '*/*',
        },
        timeout: 8000,
      },
      (headRes) => {
        const contentType = headRes.headers['content-type'] || '';
        const contentLength = headRes.headers['content-length']
          ? parseInt(headRes.headers['content-length'], 10)
          : null;
        const acceptRanges = headRes.headers['accept-ranges'] || 'none';
        const isHls =
          targetUrl.toLowerCase().includes('.m3u8') ||
          contentType.includes('application/vnd.apple.mpegurl') ||
          contentType.includes('application/x-mpegurl');
        const isDash =
          targetUrl.toLowerCase().includes('.mpd') ||
          contentType.includes('application/dash+xml');
        const isMp4 =
          targetUrl.toLowerCase().includes('.mp4') || contentType.includes('video/mp4');
        const isWebm =
          targetUrl.toLowerCase().includes('.webm') ||
          contentType.includes('video/webm');

        return res.json({
          url: targetUrl,
          statusCode: headRes.statusCode,
          contentType,
          contentLength,
          formattedSize: contentLength
            ? `${(contentLength / (1024 * 1024)).toFixed(2)} MB`
            : 'Streaming / Unknown',
          acceptRanges,
          isHls,
          isDash,
          isMp4,
          isWebm,
          server: headRes.headers['server'] || 'Unknown',
        });
      }
    );

    headReq.on('error', (err) => {
      // If HEAD fails, attempt a partial GET with Range: bytes=0-1024
      const getReq = client.request(
        targetUrl,
        {
          method: 'GET',
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            Range: 'bytes=0-1024',
          },
          timeout: 8000,
        },
        (getRes) => {
          const contentType = getRes.headers['content-type'] || '';
          getRes.destroy();
          return res.json({
            url: targetUrl,
            statusCode: getRes.statusCode,
            contentType,
            contentLength: null,
            formattedSize: 'Stream',
            acceptRanges: 'bytes',
            isHls: targetUrl.toLowerCase().includes('.m3u8'),
            isDash: targetUrl.toLowerCase().includes('.mpd'),
            isMp4: targetUrl.toLowerCase().includes('.mp4'),
            isWebm: targetUrl.toLowerCase().includes('.webm'),
            server: getRes.headers['server'] || 'Unknown',
          });
        }
      );

      getReq.on('error', (gErr) => {
        res.status(502).json({
          error: `Could not reach target URL: ${gErr.message || err.message}`,
        });
      });

      getReq.end();
    });

    headReq.end();
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Invalid URL' });
  }
});

// Helper function to forward request with redirect-following capability
function forwardProxyRequest(
  targetUrl: string,
  req: Request,
  res: Response,
  redirectCount: number = 0
) {
  if (redirectCount > 5) {
    return res.status(508).json({ error: 'Too many redirects from stream host' });
  }

  try {
    const parsed = new URL(targetUrl);
    const client = parsed.protocol === 'https:' ? https : http;

    const headers: Record<string, string> = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: '*/*',
      Referer: `${parsed.protocol}//${parsed.host}/`,
      Origin: `${parsed.protocol}//${parsed.host}`,
    };

    if (req.headers.range) {
      headers['Range'] = req.headers.range;
    }

    const proxyReq = client.request(
      targetUrl,
      {
        method: req.method,
        headers,
      },
      (proxyRes) => {
        // Handle HTTP Redirects (301, 302, 307, 308)
        if (
          proxyRes.statusCode &&
          [301, 302, 303, 307, 308].includes(proxyRes.statusCode) &&
          proxyRes.headers.location
        ) {
          const redirectUrl = new URL(proxyRes.headers.location, targetUrl).toString();
          proxyRes.resume();
          return forwardProxyRequest(redirectUrl, req, res, redirectCount + 1);
        }

        // Forward status and headers
        const forwardHeaders = [
          'content-type',
          'content-length',
          'content-range',
          'accept-ranges',
          'cache-control',
          'last-modified',
          'etag',
        ];

        forwardHeaders.forEach((h) => {
          if (proxyRes.headers[h]) {
            res.setHeader(h, proxyRes.headers[h] as string);
          }
        });

        // Ensure CORS headers are explicitly set
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Headers', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');

        // Check if this is an M3U8 manifest. If so, rewrite relative segment URLs
        const contentType = (proxyRes.headers['content-type'] || '').toLowerCase();
        const isM3U8 =
          targetUrl.toLowerCase().includes('.m3u8') ||
          contentType.includes('mpegurl') ||
          contentType.includes('application/x-mpegurl');

        if (isM3U8 && proxyRes.statusCode && proxyRes.statusCode < 400) {
          let body = '';
          proxyRes.setEncoding('utf8');
          proxyRes.on('data', (chunk) => {
            body += chunk;
          });
          proxyRes.on('end', () => {
            const baseUrl = targetUrl.substring(0, targetUrl.lastIndexOf('/') + 1);
            const lines = body.split('\n');
            const rewritten = lines.map((line) => {
              const trimmed = line.trim();
              if (!trimmed || trimmed.startsWith('#')) {
                // If it's a URI in an EXT tag (e.g. #EXT-X-KEY:METHOD=...,URI="key.bin")
                if (trimmed.includes('URI="')) {
                  return trimmed.replace(/URI="([^"]+)"/g, (match, uri) => {
                    let fullUri = uri;
                    if (!uri.startsWith('http://') && !uri.startsWith('https://')) {
                      fullUri = new URL(uri, baseUrl).toString();
                    }
                    return `URI="/api/proxy-stream?url=${encodeURIComponent(fullUri)}"`;
                  });
                }
                return line;
              }
              // It's a segment or sub-playlist URL
              let fullUrl = trimmed;
              if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
                fullUrl = new URL(trimmed, baseUrl).toString();
              }
              return `/api/proxy-stream?url=${encodeURIComponent(fullUrl)}`;
            });

            const output = rewritten.join('\n');
            res.setHeader('Content-Type', 'application/vnd.apple.mpegurl; charset=utf-8');
            res.setHeader('Content-Length', Buffer.byteLength(output));
            res.status(proxyRes.statusCode || 200).send(output);
          });
          return;
        }

        res.status(proxyRes.statusCode || 200);
        proxyRes.pipe(res);
      }
    );

    proxyReq.on('error', (err) => {
      if (!res.headersSent) {
        res.status(502).json({ error: `Proxy connection error: ${err.message}` });
      }
    });

    if (['GET', 'HEAD'].includes(req.method)) {
      proxyReq.end();
    } else {
      req.pipe(proxyReq);
    }
  } catch (err: any) {
    if (!res.headersSent) {
      res.status(400).json({ error: err.message || 'Invalid stream URL' });
    }
  }
}

// Proxy Stream Endpoint - streams any video / m3u8 bypassing CORS
app.get('/api/proxy-stream', (req: Request, res: Response) => {
  const targetUrl = req.query.url as string;
  if (!targetUrl) {
    return res.status(400).send('URL query parameter is required');
  }
  forwardProxyRequest(targetUrl, req, res);
});

// Direct Video Downloader Endpoint (forces Content-Disposition download)
app.get('/api/download', (req: Request, res: Response) => {
  const targetUrl = req.query.url as string;
  let filename = (req.query.filename as string) || 'video_stream';

  if (!targetUrl) {
    return res.status(400).send('URL query parameter is required');
  }

  // Sanitize filename and ensure extension
  if (!filename.includes('.')) {
    if (targetUrl.includes('.mp4')) filename += '.mp4';
    else if (targetUrl.includes('.webm')) filename += '.webm';
    else if (targetUrl.includes('.m3u8')) filename += '.ts';
    else filename += '.mp4';
  }

  try {
    const parsed = new URL(targetUrl);
    const client = parsed.protocol === 'https:' ? https : http;

    const proxyReq = client.request(
      targetUrl,
      {
        method: 'GET',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: '*/*',
        },
      },
      (proxyRes) => {
        // Handle redirect
        if (
          proxyRes.statusCode &&
          [301, 302, 303, 307, 308].includes(proxyRes.statusCode) &&
          proxyRes.headers.location
        ) {
          const redirectUrl = new URL(proxyRes.headers.location, targetUrl).toString();
          return res.redirect(
            `/api/download?url=${encodeURIComponent(redirectUrl)}&filename=${encodeURIComponent(
              filename
            )}`
          );
        }

        res.setHeader(
          'Content-Disposition',
          `attachment; filename="${encodeURIComponent(filename)}"`
        );
        res.setHeader(
          'Content-Type',
          proxyRes.headers['content-type'] || 'application/octet-stream'
        );
        if (proxyRes.headers['content-length']) {
          res.setHeader('Content-Length', proxyRes.headers['content-length']);
        }
        res.status(proxyRes.statusCode || 200);
        proxyRes.pipe(res);
      }
    );

    proxyReq.on('error', (err) => {
      if (!res.headersSent) {
        res.status(502).send(`Error downloading: ${err.message}`);
      }
    });

    proxyReq.end();
  } catch (err: any) {
    if (!res.headersSent) {
      res.status(400).send(err.message || 'Invalid download URL');
    }
  }
});

// Setup Vite or static serving
async function setupServer() {
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

setupServer();
