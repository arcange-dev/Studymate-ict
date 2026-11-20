/* Unit tests for the shared AI core: validation, JSON parsing, schema checks,
   provider adapter behaviour and rate limiting. No network: fetch is mocked. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LIMITS,
  resolveConfig,
  healthPayload,
  validateRequest,
  buildMessages,
  parseModelJson,
  validateExplanation,
  validateQuiz,
  createRateLimiter,
  handleAiRequest
} from '../sites/ai-core.js';

const EXPLANATION = {
  definition: 'RAM is the working memory a computer uses while it is running.',
  whyItMatters: 'It explains why more RAM helps with many open programs.',
  steps: ['The CPU asks for data.', 'The memory controller checks RAM.', 'Data is copied into cache.'],
  example: 'Open Task Manager and watch memory usage change.',
  realWorld: 'Servers in a data centre are sized by RAM per virtual machine.',
  misconceptions: [{ belief: 'More RAM makes the CPU faster', correction: 'It only lets more work be held in memory.' }],
  vocabulary: [{ term: 'Volatile', meaning: 'Loses its contents when power is removed.' }],
  summary: 'RAM is fast, temporary working storage.',
  questions: [1, 2, 3, 4, 5].map((n) => ({ q: 'Question ' + n + '?', a: 'Answer ' + n }))
};

const QUIZ = {
  questions: [
    { id: 1, type: 'mcq', prompt: 'Which is volatile?', options: ['RAM', 'ROM', 'SSD', 'HDD'], answerIndex: 0, explanation: 'RAM loses data without power.', source: 'RAM is volatile.' },
    { id: 2, type: 'truefalse', prompt: 'ROM keeps its contents without power.', answer: true, explanation: 'ROM is non-volatile.', source: 'ROM is non-volatile.' },
    { id: 3, type: 'short', prompt: 'Why does a computer need RAM?', answer: 'It holds running programs and data close to the CPU.', explanation: 'Working memory.', source: 'The CPU uses RAM while running.' }
  ]
};

function mockProvider(content, status = 200) {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    return new Response(JSON.stringify({ model: 'test-model', choices: [{ message: { content } }], usage: { prompt_tokens: 10, completion_tokens: 20 } }), {
      status,
      headers: { 'content-type': 'application/json' }
    });
  };
  return { fetchImpl, calls };
}

test('healthPayload never exposes the API key', () => {
  const payload = healthPayload({ AI_API_KEY: 'sk-secret-value', AI_MODEL: 'test-model' });
  assert.equal(payload.ai.configured, true);
  assert.equal(payload.ai.model, 'test-model');
  assert.ok(!JSON.stringify(payload).includes('sk-secret-value'));
});

test('resolveConfig falls back to prompt mode with no key', () => {
  const cfg = resolveConfig({});
  assert.equal(cfg.configured, false);
  assert.equal(cfg.baseUrl, 'https://api.openai.com/v1');
  assert.equal(cfg.rateLimit, 20);
});

test('validateRequest rejects bad input and normalises good input', () => {
  assert.equal(validateRequest(null).ok, false);
  assert.equal(validateRequest({ op: 'nope' }).status, 400);
  assert.equal(validateRequest({ op: 'explain', topic: '' }).ok, false);
  assert.equal(validateRequest({ op: 'explain', topic: 'x'.repeat(LIMITS.topicMax + 1) }).ok, false);

  const ok = validateRequest({ op: 'explain', topic: '  RAM  ', level: 'advanced', length: 'short' });
  assert.equal(ok.ok, true);
  assert.deepEqual(ok.payload, { topic: 'RAM', level: 'advanced', length: 'short', prior: '' });

  // An unknown enum is an error, not a silent fallback.
  assert.equal(validateRequest({ op: 'explain', topic: 'RAM', level: 'genius' }).ok, false);
});

test('validateRequest enforces quiz limits and note length', () => {
  assert.equal(validateRequest({ op: 'quiz', notes: 'short', count: 5 }).ok, false);
  const notes = 'Operating systems manage memory and processes. '.repeat(3);
  assert.equal(validateRequest({ op: 'quiz', notes, count: 2 }).ok, false);
  assert.equal(validateRequest({ op: 'quiz', notes, count: 21 }).ok, false);
  const ok = validateRequest({ op: 'quiz', notes, count: 5, difficulty: 'easy', type: 'mcq' });
  assert.equal(ok.ok, true);
  assert.equal(ok.payload.count, 5);
  assert.equal(ok.payload.type, 'mcq');
});

test('buildMessages pins the quiz to the supplied notes', () => {
  const messages = buildMessages('quiz', { notes: 'Only these facts matter.', count: 4, difficulty: 'easy', type: 'mixed' });
  assert.equal(messages.length, 2);
  const user = messages[1].content;
  assert.ok(user.includes('Only these facts matter.'));
  assert.ok(user.includes('only allowed source'));
  assert.ok(messages[0].content.includes('JSON object'));
});

test('parseModelJson strips code fences and rejects prose', () => {
  assert.deepEqual(parseModelJson('```json\n{"a":1}\n```'), { a: 1 });
  assert.deepEqual(parseModelJson('Here you go: {"a":2} thanks'), { a: 2 });
  assert.throws(() => parseModelJson('no json here'));
  assert.throws(() => parseModelJson(''));
});

test('validateExplanation accepts a complete payload and enforces five questions', () => {
  const data = validateExplanation(EXPLANATION);
  assert.equal(data.questions.length, 5);
  assert.equal(data.steps.length, 3);
  assert.throws(() => validateExplanation({ ...EXPLANATION, questions: [] }));
  assert.throws(() => validateExplanation({ definition: 'only this' }));
});

test('validateQuiz checks options, indexes and types', () => {
  const data = validateQuiz(QUIZ, 3);
  assert.equal(data.questions.length, 3);
  assert.equal(data.questions[0].answer, 'RAM');
  assert.equal(data.questions[1].answer, true);
  assert.ok(Array.isArray(data.questions[2].keywords));
  assert.ok(data.questions[2].keywords.length > 0);

  const duplicateOptions = JSON.parse(JSON.stringify(QUIZ));
  duplicateOptions.questions[0].options = ['RAM', 'RAM', 'SSD', 'HDD'];
  assert.throws(() => validateQuiz(duplicateOptions, 3));

  const badIndex = JSON.parse(JSON.stringify(QUIZ));
  badIndex.questions[0].answerIndex = 9;
  assert.throws(() => validateQuiz(badIndex, 3));

  const noBoolean = JSON.parse(JSON.stringify(QUIZ));
  noBoolean.questions[1].answer = 'yes please';
  assert.throws(() => validateQuiz(noBoolean, 3));
});

test('rate limiter enforces the window and the daily cap', () => {
  const limiter = createRateLimiter({ windowMs: 60000, max: 2, dailyCap: 0 });
  const now = Date.now();
  assert.equal(limiter.take('a', now).allowed, true);
  assert.equal(limiter.take('a', now).allowed, true);
  const blocked = limiter.take('a', now);
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.reason, 'window');
  assert.ok(blocked.retryAfter > 0);
  // A different client is unaffected.
  assert.equal(limiter.take('b', now).allowed, true);
  // The window resets.
  assert.equal(limiter.take('a', now + 61000).allowed, true);

  const daily = createRateLimiter({ windowMs: 60000, max: 100, dailyCap: 1 });
  assert.equal(daily.take('x', now).allowed, true);
  assert.equal(daily.take('x', now).reason, 'daily');
});

test('handleAiRequest refuses to run without a key', async () => {
  const result = await handleAiRequest({ body: { op: 'explain', topic: 'RAM' }, env: {}, clientKey: 't' });
  assert.equal(result.status, 503);
  assert.equal(result.json.error, 'ai-not-configured');
});

test('handleAiRequest validates before calling the provider', async () => {
  let called = false;
  const result = await handleAiRequest({
    body: { op: 'explain', topic: '' },
    env: { AI_API_KEY: 'k' },
    clientKey: 't',
    fetchImpl: async () => { called = true; return new Response('{}'); }
  });
  assert.equal(result.status, 400);
  assert.equal(called, false);
});

test('handleAiRequest returns a validated explanation and sends the key only upstream', async () => {
  const { fetchImpl, calls } = mockProvider(JSON.stringify(EXPLANATION));
  const result = await handleAiRequest({
    body: { op: 'explain', topic: 'RAM', level: 'beginner', length: 'medium' },
    env: { AI_API_KEY: 'sk-test', AI_MODEL: 'test-model' },
    clientKey: 'ip-1',
    fetchImpl,
    now: Date.now()
  });

  assert.equal(result.status, 200);
  assert.equal(result.json.ok, true);
  assert.equal(result.json.data.definition, EXPLANATION.definition);
  assert.equal(calls.length, 1);
  assert.ok(calls[0].url.endsWith('/chat/completions'));
  assert.equal(calls[0].init.headers.authorization, 'Bearer sk-test');
  assert.ok(!JSON.stringify(result.json).includes('sk-test'));
});

test('handleAiRequest marks a malformed model answer as a 502, not a crash', async () => {
  const { fetchImpl } = mockProvider('I am sorry, I cannot do that.');
  const result = await handleAiRequest({
    body: { op: 'explain', topic: 'RAM' },
    env: { AI_API_KEY: 'k' },
    clientKey: 'ip-2',
    fetchImpl
  });
  assert.equal(result.status, 502);
  assert.equal(result.json.error, 'not-json');
  assert.ok(result.json.message.length > 0);
});

test('handleAiRequest reports provider auth failure without leaking details', async () => {
  const fetchImpl = async () => new Response('{"error":"bad key sk-test"}', { status: 401 });
  const result = await handleAiRequest({
    body: { op: 'explain', topic: 'RAM' },
    env: { AI_API_KEY: 'sk-test' },
    clientKey: 'ip-3',
    fetchImpl
  });
  assert.equal(result.status, 500);
  assert.equal(result.json.error, 'unauthorized');
  assert.ok(!JSON.stringify(result.json).includes('sk-test'));
});

test('handleAiRequest returns 429 through its own limiter', async () => {
  const { fetchImpl } = mockProvider(JSON.stringify(EXPLANATION));
  const limiter = createRateLimiter({ windowMs: 60000, max: 1 });
  const env = { AI_API_KEY: 'k' };
  const body = { op: 'explain', topic: 'RAM' };

  const first = await handleAiRequest({ body, env, clientKey: 'same', fetchImpl, limiter });
  assert.equal(first.status, 200);
  const second = await handleAiRequest({ body, env, clientKey: 'same', fetchImpl, limiter });
  assert.equal(second.status, 429);
  assert.equal(second.json.error, 'local-rate-limit');
  assert.ok(Number(second.headers['retry-after']) > 0);
});
