import { createServer } from 'node:http';
import { readFile, realpath } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { PeerServer } from 'peer';
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webm': 'video/webm', '.txt': 'text/plain', '.map': 'application/json' };
const base = resolve('.');
const publicFiles = new Set(['/demo/index.html', '/demo/stremio-layout.html', '/demo/fixtures.js', '/demo/swap.js', '/demo/swap.js.map', '/demo/sample.webm', '/dist/SWaP.user.js', '/dist/THIRD-PARTY-NOTICES.txt', '/design/index.html']);
PeerServer({ host: '127.0.0.1', port: 9001, path: '/sidekick', allow_discovery: false });
createServer(async (req, res) => {
  try {
    if (!['GET', 'HEAD'].includes(req.method) || !/^(127\.0\.0\.1|localhost):9000$/.test(req.headers.host || '')) { res.writeHead(403).end(); return; }
    const pathname = new URL(req.url, 'http://localhost').pathname;
    const publicPath = pathname === '/' ? '/demo/index.html' : pathname;
    if (!publicFiles.has(publicPath)) { res.writeHead(403).end(); return; }
    const file = await realpath(resolve(base, '.' + publicPath));
    if (!file.startsWith(base + '/') || file !== resolve(base, '.' + publicPath)) { res.writeHead(403).end(); return; }
    const data = await readFile(file);
    const headers = { 'Content-Type': types[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store', 'Accept-Ranges': 'bytes', 'X-Content-Type-Options': 'nosniff' };
    const range = req.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
    if (range) {
      const start = Number(range[1]), end = Math.min(range[2] ? Number(range[2]) : data.length - 1, data.length - 1);
      if (start > end || start >= data.length) { res.writeHead(416, { 'Content-Range': `bytes */${data.length}` }).end(); return; }
      res.writeHead(206, { ...headers, 'Content-Range': `bytes ${start}-${end}/${data.length}`, 'Content-Length': end - start + 1 }); res.end(data.subarray(start, end + 1));
    } else { res.writeHead(200, { ...headers, 'Content-Length': data.length }); res.end(data); }
  } catch { res.writeHead(404).end('Not found'); }
}).listen(9000, '127.0.0.1', () => console.log('Demo: http://127.0.0.1:9000/?local=1 — local signaling, real WebRTC. Omit ?local=1 to test PeerJS Cloud.'));
