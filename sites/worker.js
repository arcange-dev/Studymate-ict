// StudyMate ICT — static app shell + AI endpoint on Cloudflare-compatible hosting.
//
// GET  /api/health  → whether this deployment has an AI key configured
// POST /api/ai      → validated AI request (see sites/ai-core.js)
// everything else   → the built static app in dist/
//
// The API key lives only in the hosting environment. It is never bundled into
// the browser assets, never returned by /api/health, and never logged.
import { handleAiRequest, healthPayload, LIMITS } from './ai-core.js';

function json(status, body, extraHeaders) {
  return new Response(JSON.stringify(body), {
    status: status,
    headers: Object.assign({
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff'
    }, extraHeaders || {})
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/health') {
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        return json(405, { ok: false, error: 'method-not-allowed', message: 'Use GET.' }, { allow: 'GET, HEAD' });
      }
      return json(200, healthPayload(env));
    }

    if (url.pathname === '/api/ai') {
      if (request.method !== 'POST') {
        return json(405, { ok: false, error: 'method-not-allowed', message: 'Use POST.' }, { allow: 'POST' });
      }
      const origin = request.headers.get('origin');
      if (origin && origin !== url.origin) {
        return json(403, { ok: false, error: 'forbidden-origin', message: 'This origin may not use the AI endpoint.' });
      }
      const text = await request.text();
      if (text.length > LIMITS.bodyMax) {
        return json(413, { ok: false, error: 'invalid-body', message: 'The request body is too large.' });
      }
      let body;
      try {
        body = JSON.parse(text);
      } catch {
        return json(400, { ok: false, error: 'invalid-json', message: 'Send valid JSON.' });
      }
      const clientKey = request.headers.get('cf-connecting-ip') || 'anonymous';
      const result = await handleAiRequest({ body: body, env: env, clientKey: clientKey });
      return json(result.status, result.json, result.headers);
    }

    if (url.pathname.startsWith('/api/')) {
      return json(404, { ok: false, error: 'not-found', message: 'Unknown API route.' });
    }

    const response = await env.ASSETS.fetch(request);
    // The app shell must never be pinned to an old build; the service worker
    // handles offline caching instead.
    const headers = new Headers(response.headers);
    if (response.headers.get('content-type')?.includes('text/html')) {
      headers.set('cache-control', 'no-cache');
    }
    headers.set('x-content-type-options', 'nosniff');
    headers.set('referrer-policy', 'same-origin');
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers: headers });
  }
};
