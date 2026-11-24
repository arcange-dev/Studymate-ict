/* Tests for the provider catalogue in StudyMate-ICT/js/providers.js.
   The module is a classic browser script, so it runs in a VM sandbox with a
   bare window object. No network request is involved. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const source = readFileSync(new URL('../StudyMate-ICT/js/providers.js', import.meta.url), 'utf8');

function load() {
  const sandbox = { window: {} };
  runInNewContext(source, sandbox);
  return sandbox.window.SM.providers;
}

test('the catalogue covers the world with unique ids and valid entries', () => {
  const providers = load();
  assert.ok(providers.count() >= 40, `expected 40+ providers, got ${providers.count()}`);

  const ids = providers.list.map((p) => p.id);
  assert.equal(new Set(ids).size, ids.length, 'provider ids must be unique');

  for (const provider of providers.list) {
    assert.match(provider.id, /^[a-z0-9-]+$/, `bad id: ${provider.id}`);
    assert.ok(provider.name.length > 2, `bad name for ${provider.id}`);
    assert.ok(provider.group, `missing group for ${provider.id}`);
    assert.ok(['openai', 'anthropic', 'gemini'].includes(provider.protocol), `bad protocol: ${provider.id}`);
    assert.ok(['allowed', 'blocked', 'local', 'unknown'].includes(provider.cors), `bad cors: ${provider.id}`);
    assert.match(provider.docs, /^https:\/\//, `missing docs for ${provider.id}`);
    if (provider.id === 'custom') continue;
    assert.ok(provider.baseUrl, `missing base URL for ${provider.id}`);
    assert.ok(
      /^https:\/\//.test(provider.baseUrl) || /^http:\/\/(localhost|127\.0\.0\.1)/.test(provider.baseUrl),
      `base URL must be https (or localhost): ${provider.id}`
    );
    assert.ok(provider.model, `missing default model for ${provider.id}`);
  }
});

test('every group in the catalogue has at least one provider and a label', () => {
  const providers = load();
  const grouped = providers.grouped();
  assert.ok(grouped.length >= 4);
  for (const group of grouped) {
    assert.ok(group.name);
    assert.ok(group.providers.length > 0);
  }
  const total = grouped.reduce((sum, group) => sum + group.providers.length, 0);
  assert.equal(total, providers.count());
});

test('a base URL is normalised to the API root', () => {
  const { normalizeBase } = load();
  assert.equal(normalizeBase('https://api.openai.com/v1/'), 'https://api.openai.com/v1');
  assert.equal(normalizeBase('https://api.openai.com/v1/chat/completions'), 'https://api.openai.com/v1');
  assert.equal(normalizeBase('https://api.anthropic.com/v1/messages'), 'https://api.anthropic.com/v1');
  assert.equal(normalizeBase('https://api.groq.com/openai/v1/models'), 'https://api.groq.com/openai/v1');
  assert.equal(normalizeBase('  https://example.com/v1//  '), 'https://example.com/v1');
  assert.equal(normalizeBase(''), '');
});

test('only https URLs and localhost are accepted', () => {
  const { isHttpUrl } = load();
  assert.equal(isHttpUrl('https://api.openai.com/v1'), true);
  assert.equal(isHttpUrl('http://localhost:11434/v1'), true);
  assert.equal(isHttpUrl('http://127.0.0.1:8000/v1'), true);
  assert.equal(isHttpUrl('http://example.com/v1'), false);
  assert.equal(isHttpUrl('ftp://example.com'), false);
  assert.equal(isHttpUrl('api.openai.com'), false);
});

test('a pasted base URL is recognised as its provider', () => {
  const { detect } = load();
  assert.equal(detect('https://api.openai.com/v1').id, 'openai');
  assert.equal(detect('https://api.groq.com/openai/v1/').id, 'groq');
  assert.equal(detect('https://openrouter.ai/api/v1/chat/completions').id, 'openrouter');
  assert.equal(detect('https://generativelanguage.googleapis.com/v1beta').id, 'gemini');
  assert.equal(detect('https://api.anthropic.com/v1').id, 'anthropic');
  assert.equal(detect('http://localhost:11434/v1').id, 'ollama');
  assert.equal(detect('https://my-own-gateway.example.com/v1'), null);
  assert.equal(detect(''), null);
});

test('each protocol gets the right chat and model-list URLs', () => {
  const providers = load();
  assert.equal(providers.chatUrl('https://api.openai.com/v1', 'openai', 'gpt-4o-mini'), 'https://api.openai.com/v1/chat/completions');
  assert.equal(providers.chatUrl('https://api.anthropic.com/v1', 'anthropic', 'claude-sonnet-4-5'), 'https://api.anthropic.com/v1/messages');
  assert.equal(
    providers.chatUrl('https://generativelanguage.googleapis.com/v1beta', 'gemini', 'gemini-2.5-flash'),
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'
  );
  assert.equal(providers.modelsUrl('https://api.openai.com/v1', 'openai'), 'https://api.openai.com/v1/models');
  assert.equal(providers.modelsUrl(providers.get('groq')), 'https://api.groq.com/openai/v1/models');
});

test('search finds providers by name, id and model', () => {
  const providers = load();
  assert.ok(providers.search('claude').some((p) => p.id === 'anthropic'));
  assert.ok(providers.search('qwen').some((p) => p.id === 'dashscope'));
  assert.ok(providers.search('llama').length >= 3);
  assert.ok(providers.search('ollama').some((p) => p.id === 'ollama'));
  assert.equal(providers.search('no-such-provider-xyz').length, 0);
  assert.equal(providers.search('').length, providers.count());
});
