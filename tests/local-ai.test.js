/* Tests for the "bring your own key" module in StudyMate-ICT/js/local-ai.js.
   The module is a classic browser script, so it runs in a VM sandbox with a
   small LocalStorage stub and a stubbed fetch — the real code path is exercised,
   but no network request ever leaves this machine. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const source = readFileSync(new URL('../StudyMate-ICT/js/local-ai.js', import.meta.url), 'utf8');
const contractSource = readFileSync(new URL('../StudyMate-ICT/js/ai-contract.js', import.meta.url), 'utf8');
const providersSource = readFileSync(new URL('../StudyMate-ICT/js/providers.js', import.meta.url), 'utf8');

function makeStorage(initial) {
  const map = new Map(Object.entries(initial || {}));
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, String(value)),
    removeItem: (key) => map.delete(key),
    dump: () => Object.fromEntries(map)
  };
}

function load(options = {}) {
  const storage = makeStorage(options.initial);
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    if (options.respond) return options.respond(url, init);
    return {
      ok: true,
      status: 200,
      json: async () => ({
        model: 'test-model',
        choices: [{ message: { content: JSON.stringify({ ok: true }) } }]
      })
    };
  };
  const sandbox = {
    window: { localStorage: storage, setTimeout, clearTimeout },
    AbortController,
    fetch: fetchImpl,
    console
  };
  runInNewContext(contractSource, sandbox);
  runInNewContext(providersSource, sandbox);
  runInNewContext(source, sandbox);
  return {
    localAi: sandbox.window.SM.localAi,
    contract: sandbox.window.SMAiContract,
    providers: sandbox.window.SM.providers,
    storage,
    calls
  };
}

const explanation = {
  definition: 'RAM is temporary working memory.',
  whyItMatters: 'It explains why computers slow down.',
  steps: ['Programs load from storage', 'The CPU reads instructions from RAM'],
  example: 'Opening a browser tab uses RAM.',
  realWorld: 'An office PC with 8 GB RAM.',
  misconceptions: [{ belief: 'RAM stores files', correction: 'It stores running programs.' }],
  vocabulary: [{ term: 'Volatile', meaning: 'Loses its contents without power.' }],
  summary: 'RAM is fast, temporary and volatile.',
  questions: [1, 2, 3, 4, 5].map((n) => ({ q: 'Question ' + n + '?', a: 'Answer ' + n }))
};

const quiz = {
  questions: [
    { id: 1, type: 'mcq', prompt: 'Which is volatile?', options: ['RAM', 'ROM', 'SSD', 'HDD'], answerIndex: 0, explanation: 'RAM loses data.', source: 'RAM is volatile.' },
    { id: 2, type: 'truefalse', prompt: 'ROM keeps data without power.', answer: true, explanation: 'ROM is non-volatile.', source: 'ROM is non-volatile.' },
    { id: 3, type: 'short', prompt: 'What is a bus?', answer: 'A path that carries data between components', explanation: 'It carries signals.', source: 'The bus carries data.' }
  ]
};

test('a key is only accepted with a usable https base URL, model and secret', () => {
  const { localAi } = load();
  assert.equal(localAi.isEnabled(), false);
  assert.throws(() => localAi.set({ baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini', apiKey: '' }), /API key/);
  assert.throws(() => localAi.set({ baseUrl: 'ftp://example.com', model: 'm', apiKey: 'sk-abcdefghij' }), /https/);
  assert.throws(() => localAi.set({ baseUrl: 'https://api.openai.com/v1', model: '', apiKey: 'sk-abcdefghij' }), /model/);

  localAi.set({ provider: 'openai', baseUrl: 'https://api.openai.com/v1/', model: 'gpt-4o-mini', apiKey: 'sk-abcdefghij' });
  const saved = localAi.get();
  assert.equal(saved.baseUrl, 'https://api.openai.com/v1'); // trailing slash trimmed
  assert.equal(saved.model, 'gpt-4o-mini');
  assert.equal(localAi.isEnabled(), true);
  assert.match(localAi.label(), /gpt-4o-mini/);
});

test('the key is stored in this browser only and can be removed', () => {
  const { localAi, storage } = load();
  localAi.set({ baseUrl: 'https://api.groq.com/openai/v1', model: 'llama-3.3-70b-versatile', apiKey: 'gsk-secret-value' });
  const raw = storage.dump()[localAi.STORE_KEY];
  assert.match(raw, /gsk-secret-value/);
  assert.equal(localAi.get().apiKey, 'gsk-secret-value');

  localAi.clear();
  assert.equal(localAi.isEnabled(), false);
  assert.equal(storage.dump()[localAi.STORE_KEY], undefined);
});

test('run() calls the chosen provider with the learner key and validates the answer', async () => {
  const { localAi, calls } = load({
    initial: { 'studymate.ict.localai.v1': JSON.stringify({ provider: 'openai', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini', apiKey: 'sk-test-123456' }) },
    respond: async () => ({ ok: true, status: 200, json: async () => ({ model: 'gpt-4o-mini', choices: [{ message: { content: JSON.stringify(explanation) } }] }) })
  });

  const result = await localAi.run({ op: 'explain', topic: 'RAM', level: 'beginner', length: 'short' });
  assert.equal(result.source, 'local-key');
  assert.equal(result.data.definition, explanation.definition);
  assert.equal(result.data.questions.length, 5);

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://api.openai.com/v1/chat/completions');
  assert.equal(calls[0].init.headers.authorization, 'Bearer sk-test-123456');
  const body = JSON.parse(calls[0].init.body);
  assert.equal(body.model, 'gpt-4o-mini');
  assert.equal(body.response_format.type, 'json_object');
  assert.match(body.messages[1].content, /Topic: RAM/);
});

test('a rejected key produces a clear message and not a raw provider body', async () => {
  const { localAi } = load({
    initial: { 'studymate.ict.localai.v1': JSON.stringify({ baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini', apiKey: 'sk-bad-key-123' }) },
    respond: async () => ({ ok: false, status: 401, text: async () => '{"error":{"message":"Incorrect API key"}}' })
  });
  await assert.rejects(() => localAi.run({ op: 'explain', topic: 'RAM', level: 'beginner' }), (err) => {
    assert.equal(err.code, 'unauthorized');
    assert.match(err.message, /rejected the key/i);
    return true;
  });
});

test('malformed and incomplete model output is refused before it reaches the screen', () => {
  const { contract } = load();
  assert.throws(() => contract.parseModelJson('not json at all'), /did not return JSON/i);
  assert.throws(() => contract.validateExplanation({ definition: 'x' }), /list|field/i);
  assert.throws(() => contract.validateQuiz({ questions: [{ type: 'mcq', prompt: 'Pick one', options: ['a', 'b', 'c'], answerIndex: 0 }] }, 3), /wrong length|four distinct options/i);
  assert.throws(() => contract.validateQuiz({ questions: [{ type: 'mcq', prompt: 'Pick one', options: ['a', 'a', 'b', 'c'], answerIndex: 0 }] }, 3), /four distinct options/i);
});

test('a valid quiz is normalised with ids, answers and short-answer keywords', () => {
  const { contract } = load();
  const checked = contract.validateQuiz(quiz, 3);
  assert.equal(checked.questions.length, 3);
  assert.deepEqual(checked.questions.map((q) => q.id), [1, 2, 3]);
  assert.equal(checked.questions[0].answer, 'RAM');
  assert.equal(checked.questions[1].answer, true);
  assert.match(checked.questions[2].answer, /path that carries data/);
  assert.ok(Array.isArray(checked.questions[2].keywords));
});

test('fenced JSON from a chatty model is still parsed', () => {
  const { contract } = load();
  const parsed = contract.parseModelJson('```json\n{"ok":true}\n```');
  // The object comes from the VM realm, so compare its serialised form.
  assert.equal(JSON.stringify(parsed), JSON.stringify({ ok: true }));
});

/* ---------------------------------------------- provider protocol adapters */

test('the connection test speaks the OpenAI protocol by default', async () => {
  const { localAi, calls } = load({
    respond: async () => ({ ok: true, status: 200, json: async () => ({ model: 'gpt-4o-mini', choices: [{ message: { content: '{"ok":true}' } }] }) })
  });

  const result = await localAi.testConnection({
    provider: 'openai',
    baseUrl: 'https://api.openai.com/v1/',
    model: 'gpt-4o-mini',
    apiKey: 'sk-test-123456'
  });

  assert.equal(result.ok, true);
  assert.equal(result.protocol, 'openai');
  assert.equal(result.model, 'gpt-4o-mini');
  assert.equal(calls[0].url, 'https://api.openai.com/v1/chat/completions');
  assert.equal(calls[0].init.headers.authorization, 'Bearer sk-test-123456');
  const body = JSON.parse(calls[0].init.body);
  assert.equal(body.model, 'gpt-4o-mini');
  assert.deepEqual(body.response_format, { type: 'json_object' });
});

test('Claude uses the Messages API with x-api-key and a system prompt', async () => {
  const { localAi, calls } = load({
    respond: async () => ({ ok: true, status: 200, json: async () => ({ model: 'claude-sonnet-4-5', content: [{ type: 'text', text: '{"ok":true}' }] }) })
  });

  const result = await localAi.testConnection({
    provider: 'anthropic',
    baseUrl: 'https://api.anthropic.com/v1',
    model: 'claude-sonnet-4-5',
    apiKey: 'sk-ant-key-123456'
  });

  assert.equal(result.ok, true);
  assert.equal(result.protocol, 'anthropic');
  assert.equal(calls[0].url, 'https://api.anthropic.com/v1/messages');
  assert.equal(calls[0].init.headers['x-api-key'], 'sk-ant-key-123456');
  assert.equal(calls[0].init.headers['anthropic-version'], '2023-06-01');
  assert.equal(calls[0].init.headers['anthropic-dangerous-direct-browser-access'], 'true');
  assert.equal(calls[0].init.headers.authorization, undefined);
  const body = JSON.parse(calls[0].init.body);
  assert.match(body.system, /connection test/i);
  assert.equal(body.messages.length, 1);
  assert.equal(body.messages[0].role, 'user');
});

test('Gemini uses generateContent with the key as a header and JSON output', async () => {
  const { localAi, calls } = load({
    respond: async () => ({ ok: true, status: 200, json: async () => ({ modelVersion: 'gemini-2.5-flash', candidates: [{ content: { parts: [{ text: '{"ok":true}' }] } }] }) })
  });

  const result = await localAi.testConnection({
    provider: 'gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    model: 'models/gemini-2.5-flash',
    apiKey: 'AIza-key-123456'
  });

  assert.equal(result.ok, true);
  assert.equal(result.protocol, 'gemini');
  assert.equal(result.model, 'gemini-2.5-flash');
  assert.equal(calls[0].url, 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent');
  assert.equal(calls[0].init.headers['x-goog-api-key'], 'AIza-key-123456');
  const body = JSON.parse(calls[0].init.body);
  assert.equal(body.generationConfig.responseMimeType, 'application/json');
  assert.match(body.systemInstruction.parts[0].text, /connection test/i);
});

test('the URL probe reports reachable models before a key is saved', async () => {
  const { localAi, calls } = load({
    respond: async () => ({ ok: true, status: 200, json: async () => ({ data: [{ id: 'gpt-4o-mini' }, { id: 'gpt-4o' }] }) })
  });

  const result = await localAi.probe({ provider: 'openai', baseUrl: 'https://api.openai.com/v1' });
  assert.equal(result.ok, true);
  assert.deepEqual(result.models, ['gpt-4o-mini', 'gpt-4o']);
  assert.match(result.message, /2 models/);
  assert.equal(calls[0].url, 'https://api.openai.com/v1/models');
  assert.equal(calls[0].init.headers.authorization, undefined);
});

test('the URL probe parses Gemini model names and ignores unsupported ones', async () => {
  const { localAi } = load({
    respond: async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        models: [
          { name: 'models/gemini-2.5-flash', supportedGenerationMethods: ['generateContent'] },
          { name: 'models/text-embedding-004', supportedGenerationMethods: ['embedContent'] }
        ]
      })
    })
  });

  const result = await localAi.probe({ provider: 'gemini', baseUrl: 'https://generativelanguage.googleapis.com/v1beta', apiKey: 'AIza-key-123456' });
  assert.equal(result.ok, true);
  assert.deepEqual(result.models, ['gemini-2.5-flash']);
});

test('a refused key still proves the URL is live', async () => {
  const { localAi } = load({ respond: async () => ({ ok: false, status: 401, json: async () => ({}) }) });
  const result = await localAi.probe({ provider: 'groq', baseUrl: 'https://api.groq.com/openai/v1', apiKey: 'gsk-bad-key' });
  assert.equal(result.ok, false);
  assert.equal(result.reachable, true);
  assert.equal(result.kind, 'unauthorized');
  assert.match(result.message, /live|refused/i);
});

test('a CORS failure explains itself instead of throwing', async () => {
  const { localAi } = load({ respond: async () => { throw new TypeError('Failed to fetch'); } });
  const result = await localAi.probe({ provider: 'openai', baseUrl: 'https://api.openai.com/v1', apiKey: 'sk-test-123456' });
  assert.equal(result.ok, false);
  assert.equal(result.kind, 'cors');
  assert.match(result.message, /CORS|browser/i);
});

test('an unusable base URL is rejected before any request is made', async () => {
  const { localAi, calls } = load();
  const probe = await localAi.probe({ baseUrl: 'http://example.com/v1' });
  assert.equal(probe.ok, false);
  assert.equal(probe.kind, 'invalid-url');

  const tested = await localAi.testConnection({ baseUrl: 'not-a-url', model: 'm', apiKey: 'sk-abcdefghij' });
  assert.equal(tested.ok, false);
  assert.equal(tested.kind, 'invalid');

  const noKey = await localAi.testConnection({ baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini', apiKey: '' });
  assert.equal(noKey.ok, false);
  assert.equal(noKey.kind, 'no-key');
  assert.equal(calls.length, 0);
});
