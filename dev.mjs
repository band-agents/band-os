// Run the whole site and the portal API on your own machine: `node dev.mjs`, then open http://localhost:3000/portal/
// It reads .env.local (STAFF_CODE, SESSION_SECRET) and keeps data in .data/store.json.
import http from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';

if (existsSync('.env.local')) for (const l of readFileSync('.env.local', 'utf8').split(/\r?\n/)) { const m = l.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ''); }
const { handle } = await import('./server/routes.js');

const T = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png', '.mp4': 'video/mp4', '.webp': 'image/webp', '.gif': 'image/gif', '.ico': 'image/x-icon', '.ttf': 'font/ttf', '.woff2': 'font/woff2', '.txt': 'text/plain' };
const port = Number(process.env.PORT) || 3000;
http.createServer((req, res) => {
  if (req.url.startsWith('/api/')) return handle(req, res);
  let p = normalize(decodeURIComponent(req.url.split('?')[0])).replace(/^(\.\.[/\\])+/, '');
  let f = join(process.cwd(), p);
  if (existsSync(f) && statSync(f).isDirectory()) f = join(f, 'index.html');
  if (!existsSync(f)) { res.writeHead(404); return res.end('Not found'); }
  res.writeHead(200, { 'content-type': T[extname(f)] || 'application/octet-stream' });
  res.end(readFileSync(f));
}).listen(port, () => console.log(`band. OS on http://localhost:${port}   (portal: /portal/)`));
