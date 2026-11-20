/*
  StudyMate ICT — zero-dependency Node server.

  Serves the built static app from dist/ and exposes the AI endpoint
  (POST /api/ai) plus a health check (GET /api/health). This is the service
  that runs on Render as a Web Service; locally it is the same server.

  No npm dependencies on purpose: the project stays free to host, quick to
  audit as a student capstone, and has no supply chain to update.

  Environment (see .env.example):
    PORT, HOST, SERVE_DIR
    AI_API_KEY (or OPENAI_API_KEY), AI_BASE_URL, AI_MODEL
    AI_TIMEOUT_MS, AI_RATE_LIMIT, AI_RATE_WINDOW_MS, AI_DAILY_CAP
    AI_ALLOWED_ORIGINS (comma separated, optional; same-origin always allowed)
*/

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { handleAiRequest, healthPayload, LIMITS } from '../sites/ai-core.js';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const ROOT = resolve(HERE, '..');
const SERVE_DIR = resolve(process.env.SERVE_DIR || join(ROOT, 'dist'));
const PORT = parseInt(process.env.PORT, 10) || 3000;
const HOST = process.env.HOST || '0.0.0.0';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8'
};

function securityHeaders(extra) {
  return Object.assign({
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'same-origin',
    'x-frame-options': 'DENY',
    'content-security-policy': [
      "default-src 'self'",
      "img-src 'self' data:",
      "style-src 'self' 'unsafe-inline'",
      "script-src 'self' 'unsafe-inline'",
      "connect-src 'self'",
      "manifest-src 'self'",
      "object-src 'none'",
      "base-uri 'none'",
      "form-action 'self'",
      "frame-ancestors 'none'"
    ].join('; '),
    'permissions-policy': 'geolocation=(), microphone=(), camera=()'
  }, extra || {});
}

function sendJson(res, status, body, extraHeaders) {
  const text = JSON.stringify(body);
  res.writeHead(status, securityHeaders(Object.assign({
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(text),
    'cache-control': 'no-store'
  }, extraHeaders || {})));
  res.end(text);
}

function readBody(req, limit) {
  return new Promise(function (resolvePromise, rejectPromise) {
    let size = 0;
    const chunks = [];
    req.on('data', function (chunk) {
      size += chunk.length;
      if (size > limit) {
        rejectPromise(Object.assign(new Error('Payload too large'), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', function () { resolvePromise(Buffer.concat(chunks).toString('utf8')); });
    req.on('error', rejectPromise);
  });
}

function clientKey(req) {
  // Render terminates TLS in front of the service, so the forwarded address is
  // the only useful client identifier. Never trust it for security decisions
  // beyond rate limiting.
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return forwarded || req.socket.remoteAddress || 'unknown';
}

function sameOrigin(req, extraOrigins) {
  const origin = req.headers.origin;
  if (!origin) return true; // non-browser clients (curl, tests) send no Origin
  const host = req.headers.host;
  try {
    const parsed = new URL(origin);
    if (host && parsed.host === host) return true;
  } catch (err) {
    return false;
  }
  return extraOrigins.indexOf(origin) !== -1;
}

export function createApp(options) {
  const opts = options || {};
  const serveDir = opts.serveDir || SERVE_DIR;
  const extraOrigins = String(process.env.AI_ALLOWED_ORIGINS || '')
    .split(',').map(function (s) { return s.trim(); }).filter(Boolean);

  return async function handler(req, res) {
    const url = new URL(req.url, 'http://localhost');
    const pathname = decodeURIComponent(url.pathname);

    if (pathname === '/api/health') {
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        res.setHeader('allow', 'GET, HEAD');
        return sendJson(res, 405, { ok: false, error: 'method-not-allowed', message: 'Use GET.' });
      }
      const payload = healthPayload(process.env);
      return sendJson(res, 200, payload);
    }

    if (pathname === '/api/ai') {
      if (req.method !== 'POST') {
        res.setHeader('allow', 'POST');
        return sendJson(res, 405, { ok: false, error: 'method-not-allowed', message: 'Use POST.' });
      }
      if (!sameOrigin(req, extraOrigins)) {
        return sendJson(res, 403, { ok: false, error: 'forbidden-origin', message: 'This origin may not use the AI endpoint.' });
      }
      let raw;
      try {
        raw = await readBody(req, LIMITS.bodyMax);
      } catch (err) {
        return sendJson(res, err.status || 400, { ok: false, error: 'invalid-body', message: 'The request body could not be read.' });
      }
      let body;
      try {
        body = JSON.parse(raw);
      } catch (err) {
        return sendJson(res, 400, { ok: false, error: 'invalid-json', message: 'Send valid JSON.' });
      }
      const result = await handleAiRequest({
        body: body,
        env: process.env,
        clientKey: clientKey(req),
        fetchImpl: opts.fetchImpl
      });
      return sendJson(res, result.status, result.json, result.headers);
    }

    if (pathname.startsWith('/api/')) {
      return sendJson(res, 404, { ok: false, error: 'not-found', message: 'Unknown API route.' });
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, securityHeaders({ allow: 'GET, HEAD', 'content-type': 'text/plain; charset=utf-8' }));
      return res.end('Method not allowed');
    }

    // Resolve inside the serve directory only: no traversal via ../ or encoded
    // variants, and no following of symlinks that leave the root.
    const requested = pathname === '/' ? '/index.html' : pathname;
    const safePath = normalize(join(serveDir, requested));
    if (!safePath.startsWith(serveDir + sep)) {
      res.writeHead(403, securityHeaders({ 'content-type': 'text/plain; charset=utf-8' }));
      return res.end('Forbidden');
    }

    let filePath = safePath;
    let info = await stat(filePath).catch(function () { return null; });
    if (!info || !info.isFile()) {
      // Single-page-app fallback for extension-less paths, matching the hosted
      // deployment (sites/site.manifest.json uses spa: true).
      if (!extname(pathname)) {
        filePath = join(serveDir, 'index.html');
        info = await stat(filePath).catch(function () { return null; });
      }
    }
    if (!info || !info.isFile()) {
      res.writeHead(404, securityHeaders({ 'content-type': 'text/plain; charset=utf-8' }));
      return res.end('Not found');
    }

    const ext = extname(filePath).toLowerCase();
    const type = TYPES[ext] || 'application/octet-stream';
    const isHtml = ext === '.html';
    const cache = isHtml ? 'no-cache' : ext === '.png' || ext === '.svg' || ext === '.webmanifest' ? 'public, max-age=3600' : 'public, max-age=300';

    try {
      const data = await readFile(filePath);
      res.writeHead(200, securityHeaders({
        'content-type': type,
        'content-length': data.length,
        'cache-control': cache
      }));
      if (req.method === 'HEAD') return res.end();
      res.end(data);
    } catch (err) {
      res.writeHead(500, securityHeaders({ 'content-type': 'text/plain; charset=utf-8' }));
      res.end('Server error');
    }
  };
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  const server = createServer(createApp());
  server.listen(PORT, HOST, function () {
    const cfg = healthPayload(process.env).ai;
    console.log('StudyMate ICT listening on http://' + HOST + ':' + PORT);
    console.log('Serving: ' + SERVE_DIR);
    console.log('AI: ' + (cfg.configured ? cfg.provider + ' / ' + cfg.model : 'prompt mode — no API key configured'));
  });

  function shutdown(signal) {
    console.log('Received ' + signal + ', shutting down');
    server.close(function () { process.exit(0); });
    setTimeout(function () { process.exit(1); }, 8000).unref();
  }
  process.on('SIGTERM', function () { shutdown('SIGTERM'); });
  process.on('SIGINT', function () { shutdown('SIGINT'); });
}

export { SERVE_DIR };
