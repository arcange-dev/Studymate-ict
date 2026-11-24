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
  runInNewContext(source, sandbox);
  return { localAi: sandbox.window.SM.localAi, contract: sandbox.window.SMAiContract, storage, calls };
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
