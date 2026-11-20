/* Integration tests for the Node server: static serving, security headers,
   path-traversal protection, the SPA fallback and the AI endpoint. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, mkdir } from 'node:fs/promises';
import { createServer } from 'node:http';
import { connect } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../server/node-server.js';

const EXPLANATION = {
  definition: 'A router forwards packets between networks.',
  whyItMatters: 'It connects your home network to the internet.',
  steps: ['Receive a packet.', 'Read the destination address.', 'Forward it.'],
  example: 'The box your ISP supplies is usually a router.',
  realWorld: 'Data centres use routers between racks.',
  misconceptions: [{ belief: 'A router is a switch', correction: 'A switch works inside one network.' }],
  vocabulary: [{ term: 'Packet', meaning: 'A small unit of data.' }],
  summary: 'Routers move packets between networks.',
  questions: [1, 2, 3, 4, 5].map((n) => ({ q: 'Q' + n + '?', a: 'A' + n }))
};

async function makeSite() {
  const parent = await mkdtemp(join(tmpdir(), 'studymate-'));
  const dir = join(parent, 'public');
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, 'index.html'), '<!doctype html><title>StudyMate</title>');
  await writeFile(join(dir, 'sw.js'), 'self.addEventListener("install", () => {});');
  await mkdir(join(dir, 'assets'), { recursive: true });
  await writeFile(join(dir, 'assets', 'app.css'), 'body{color:#000}');
  // Deliberately outside the served directory: must never be reachable.
  await writeFile(join(parent, 'secret.txt'), 'TOP SECRET');
  return dir;
}

/** Send an un-normalised request path straight over a socket. */
function rawGet(port, path) {
  return new Promise((resolve, reject) => {
    const socket = connect(port, '127.0.0.1');
    let data = '';
    socket.setEncoding('utf8');
    socket.on('error', reject);
    socket.on('connect', () => {
      socket.write('GET ' + path + ' HTTP/1.1\r\nHost: 127.0.0.1\r\nConnection: close\r\n\r\n');
    });
    socket.on('data', (chunk) => { data += chunk; });
    socket.on('end', () => {
      const match = data.match(/^HTTP\/1\.1 (\d{3})/);
      resolve({ status: match ? Number(match[1]) : NaN, text: data });
    });
  });
}

async function start(opts) {
  const server = createServer(createApp(opts));
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  return {
    base: 'http://127.0.0.1:' + port,
    port,
    close: () => new Promise((resolve) => server.close(resolve))
  };
}

function withEnv(values, fn) {
  const saved = {};
  Object.keys(values).forEach((key) => {
    saved[key] = process.env[key];
    if (values[key] === undefined) delete process.env[key];
    else process.env[key] = values[key];
  });
  return Promise.resolve(fn()).finally(() => {
    Object.keys(saved).forEach((key) => {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    });
  });
}

test('serves the app shell with security headers and no-cache HTML', async () => {
  const serveDir = await makeSite();
  const app = await start({ serveDir });
  try {
    const res = await fetch(app.base + '/');
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type'), /text\/html/);
    assert.equal(res.headers.get('cache-control'), 'no-cache');
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
    assert.match(res.headers.get('content-security-policy'), /default-src 'self'/);
    assert.equal(await res.text(), '<!doctype html><title>StudyMate</title>');

    const css = await fetch(app.base + '/assets/app.css');
    assert.equal(css.status, 200);
    assert.match(css.headers.get('content-type'), /text\/css/);
    assert.match(css.headers.get('cache-control'), /max-age/);
  } finally {
    await app.close();
  }
});

test('falls back to index.html for app routes but 404s missing files', async () => {
  const serveDir = await makeSite();
  const app = await start({ serveDir });
  try {
    const route = await fetch(app.base + '/planner');
    assert.equal(route.status, 200);
    assert.match(await route.text(), /StudyMate/);

    const missing = await fetch(app.base + '/missing.js');
    assert.equal(missing.status, 404);
  } finally {
    await app.close();
  }
});

test('refuses path traversal and unknown API routes', async () => {
  const serveDir = await makeSite();
  const app = await start({ serveDir });
  try {
    // fetch() would collapse ".." before sending, so send the raw paths.
    // A dot segment is either normalised away (404) or rejected by the root
    // check (403); what matters is that the file outside the root is never read.
    for (const path of ['/../secret.txt', '/%2e%2e/secret.txt', '/assets/../../secret.txt', '/..%2fsecret.txt']) {
      const res = await rawGet(app.port, path);
      assert.ok([403, 404].includes(res.status), path + ' → ' + res.status);
      assert.ok(!res.text.includes('TOP SECRET'), path + ' leaked the file outside the root');
    }

    const api = await fetch(app.base + '/api/unknown');
    assert.equal(api.status, 404);
  } finally {
    await app.close();
  }
});

test('health reports prompt mode with no key and never echoes the key', async () => {
  const serveDir = await makeSite();
  const app = await start({ serveDir });
  try {
    await withEnv({ AI_API_KEY: undefined, OPENAI_API_KEY: undefined }, async () => {
      const res = await fetch(app.base + '/api/health');
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.ai.configured, false);
      assert.equal(body.ai.mode, 'prompt-only');
      assert.equal(body.ai.model, null);
    });

    await withEnv({ AI_API_KEY: 'sk-super-secret' }, async () => {
      const res = await fetch(app.base + '/api/health');
      const text = await res.text();
      assert.ok(!text.includes('sk-super-secret'));
      assert.equal(JSON.parse(text).ai.configured, true);
    });
  } finally {
    await app.close();
  }
});

test('AI endpoint: 405 on GET, 400 on bad JSON, 403 on foreign origin', async () => {
  const serveDir = await makeSite();
  const app = await start({ serveDir });
  try {
    const get = await fetch(app.base + '/api/ai');
    assert.equal(get.status, 405);
    assert.equal(get.headers.get('allow'), 'POST');

    const bad = await fetch(app.base + '/api/ai', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{oops' });
    assert.equal(bad.status, 400);
    assert.equal((await bad.json()).error, 'invalid-json');

    const foreign = await fetch(app.base + '/api/ai', {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'https://evil.example' },
      body: JSON.stringify({ op: 'explain', topic: 'RAM' })
    });
    assert.equal(foreign.status, 403);
  } finally {
    await app.close();
  }
});

test('AI endpoint returns 503 in prompt mode and a validated answer when configured', async () => {
  const serveDir = await makeSite();

  let captured = null;
  const fetchImpl = async (url, init) => {
    captured = { url, init };
    return new Response(JSON.stringify({
      model: 'mock-model',
      choices: [{ message: { content: JSON.stringify(EXPLANATION) } }],
      usage: { prompt_tokens: 5, completion_tokens: 50 }
    }), { status: 200, headers: { 'content-type': 'application/json' } });
  };

  const app = await start({ serveDir, fetchImpl });
  try {
    await withEnv({ AI_API_KEY: undefined, OPENAI_API_KEY: undefined }, async () => {
      const res = await fetch(app.base + '/api/ai', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ op: 'explain', topic: 'Routers' })
      });
      assert.equal(res.status, 503);
      assert.equal((await res.json()).error, 'ai-not-configured');
    });

    await withEnv({ AI_API_KEY: 'sk-test-key', AI_BASE_URL: 'https://provider.example/v1', AI_MODEL: 'mock-model' }, async () => {
      const res = await fetch(app.base + '/api/ai', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ op: 'explain', topic: 'Routers', level: 'beginner', length: 'short' })
      });
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.equal(body.ok, true);
      assert.equal(body.data.definition, EXPLANATION.definition);
      assert.equal(body.model, 'mock-model');
      assert.ok(!JSON.stringify(body).includes('sk-test-key'));

      assert.equal(captured.url, 'https://provider.example/v1/chat/completions');
      assert.equal(captured.init.headers.authorization, 'Bearer sk-test-key');
      const sent = JSON.parse(captured.init.body);
      assert.equal(sent.model, 'mock-model');
      assert.equal(sent.messages.length, 2);
    });
  } finally {
    await app.close();
  }
});
