/*
  StudyMate ICT — AI request core.

  Shared by both server targets (the Cloudflare Worker in sites/worker.js and
  the zero-dependency Node server in server/node-server.js) so the validation,
  provider adapter, rate limiting and response checking exist in exactly one
  place.

  Runs unchanged in Node 18+ and in Workers: it only uses fetch, crypto-free
  primitives and plain JavaScript. It holds no secrets — every key comes from
  the server environment at call time.

  Provider adapter: any OpenAI-compatible /chat/completions endpoint. Swapping
  provider is a matter of AI_BASE_URL + AI_MODEL, not code.
*/

export const LIMITS = {
  topicMin: 2,
  topicMax: 120,
  priorMax: 200,
  notesMin: 50,
  notesMax: 12000,
  questionMin: 3,
  questionMax: 20,
  bodyMax: 24000,
  outputMax: 20000
};

const LEVELS = { beginner: 'Beginner (first ICT course)', intermediate: 'Intermediate (some hardware knowledge)', advanced: 'Advanced / exam revision' };
const LENGTHS = { short: 'short (about 150 words per section)', medium: 'medium (about 250 words per section)', long: 'detailed (about 400 words per section)' };
const DIFFICULTIES = { easy: 'Easy — recall and recognition', medium: 'Medium — understanding and application', hard: 'Hard — analysis and troubleshooting' };
const TYPES = { mixed: 'Mixed — multiple choice, true/false and short answer' };

const JSON_RULES = [
  'Return ONE JSON object and nothing else. No markdown, no code fences, no commentary before or after.',
  'Never invent sources, statistics, dates, quotations or textbook page numbers.',
  'If you are unsure of a detail, say so inside the text instead of guessing.'
].join(' ');

/* ------------------------------------------------------------------ config */

export function resolveConfig(env) {
  const e = env || {};
  const apiKey = String(e.AI_API_KEY || e.OPENAI_API_KEY || '').trim();
  const baseUrl = String(e.AI_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, '');
  const model = String(e.AI_MODEL || 'gpt-4o-mini').trim();
  const timeoutMs = clampInt(e.AI_TIMEOUT_MS, 8000, 60000, 30000);
  const rateLimit = clampInt(e.AI_RATE_LIMIT, 1, 200, 20);
  const rateWindowMs = clampInt(e.AI_RATE_WINDOW_MS, 60000, 86400000, 600000);
  const dailyCap = clampInt(e.AI_DAILY_CAP, 0, 100000, 300);
  const jsonMode = String(e.AI_JSON_MODE || 'on').toLowerCase() !== 'off';
  return {
    provider: String(e.AI_PROVIDER || 'openai-compatible'),
    apiKey,
    baseUrl,
    model,
    timeoutMs,
    rateLimit,
    rateWindowMs,
    dailyCap,
    jsonMode,
    configured: apiKey.length > 0
  };
}

function clampInt(value, min, max, fallback) {
  const n = parseInt(value, 10);
  if (isNaN(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export function healthPayload(env) {
  const cfg = resolveConfig(env);
  return {
    ok: true,
    service: 'StudyMate ICT',
    ai: {
      configured: cfg.configured,
      provider: cfg.provider,
      model: cfg.configured ? cfg.model : null,
      mode: cfg.configured ? 'live' : 'prompt-only'
    },
    limits: { rateLimit: cfg.rateLimit, rateWindowMs: cfg.rateWindowMs, dailyCap: cfg.dailyCap }
  };
}

/* -------------------------------------------------------------- validation */

export function validateRequest(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return fail(400, 'Send a JSON object with an "op" field.');
  }
  const op = String(body.op || '');
  if (op === 'explain') return validateExplainInput(body);
  if (op === 'quiz') return validateQuizInput(body);
  return fail(400, 'Unknown operation. Use "explain" or "quiz".');
}

function validateExplainInput(body) {
  const topic = clean(body.topic);
  if (topic.length < LIMITS.topicMin) return fail(400, 'Enter an ICT topic with at least two characters.');
  if (topic.length > LIMITS.topicMax) return fail(400, 'That topic is too long (maximum ' + LIMITS.topicMax + ' characters).');
  const level = key(body.level, LEVELS, 'beginner');
  if (!level) return fail(400, 'Choose a level of beginner, intermediate or advanced.');
  const length = key(body.length, LENGTHS, 'medium');
  if (!length) return fail(400, 'Choose a length of short, medium or long.');
  const prior = clean(body.prior).slice(0, LIMITS.priorMax);
  return { ok: true, op: 'explain', payload: { topic, level, length, prior } };
}

function validateQuizInput(body) {
  const notes = String(body.notes == null ? '' : body.notes).trim();
  if (notes.length < LIMITS.notesMin) return fail(400, 'Paste at least a couple of sentences (' + LIMITS.notesMin + ' characters or more) to build a quiz from.');
  if (notes.length > LIMITS.notesMax) return fail(400, 'Those notes are too long (maximum ' + LIMITS.notesMax + ' characters). Split them into sections.');
  const count = parseInt(body.count, 10);
  if (isNaN(count) || count < LIMITS.questionMin || count > LIMITS.questionMax) {
    return fail(400, 'Choose between ' + LIMITS.questionMin + ' and ' + LIMITS.questionMax + ' questions.');
  }
  const difficulty = key(body.difficulty, DIFFICULTIES, 'medium');
  if (!difficulty) return fail(400, 'Choose a difficulty of easy, medium or hard.');
  const type = key(body.type, Object.assign({}, TYPES, { mcq: 'Multiple choice', truefalse: 'True or false', short: 'Short answer' }), 'mixed');
  if (!type) return fail(400, 'Choose a question type of mixed, mcq, truefalse or short.');
  return { ok: true, op: 'quiz', payload: { notes, count, difficulty, type } };
}

function key(value, table, fallback) {
  const v = clean(value).toLowerCase();
  if (!v) return fallback;
  return Object.prototype.hasOwnProperty.call(table, v) ? v : null;
}

function clean(value) {
  return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
}

function fail(status, message) {
  return { ok: false, status, message };
}

/* ------------------------------------------------------------ prompt build */

export function buildMessages(op, payload) {
  if (op === 'explain') {
    const system = [
      'You are an experienced ICT tutor teaching computer systems, networking, programming, databases, operating systems and cybersecurity.',
      'You write in plain, everyday language for the stated level and you define every technical term the first time you use it.',
      JSON_RULES,
      'Schema: {"definition":string,"whyItMatters":string,"steps":string[3-7],"example":string,"realWorld":string,"misconceptions":[{"belief":string,"correction":string}],"vocabulary":[{"term":string,"meaning":string}],"summary":string,"questions":[{"q":string,"a":string}]}',
      'Give exactly 5 objects in "questions". Give 2-3 misconceptions and 3-6 vocabulary items.'
    ].join('\n');
    const user = [
      'Topic: ' + payload.topic,
      'Learner level: ' + LEVELS[payload.level] + '.',
      'Prior knowledge: ' + (payload.prior || 'none — treat me as a complete beginner') + '.',
      'Length per section: ' + LENGTHS[payload.length] + '.',
      'Explain this topic as JSON matching the schema. Keep "steps" as short numbered instructions, and make "questions" test understanding rather than definitions.',
      'Make the examples concrete: something the learner could point at on a real computer or in a real network.'
    ].join('\n');
    return [{ role: 'system', content: system }, { role: 'user', content: user }];
  }

  const typeRule = {
    mcq: 'Every question must be type "mcq" with exactly four unique options and one correct answer.',
    truefalse: 'Every question must be type "truefalse" with a boolean answer.',
    short: 'Every question must be type "short" with a model answer of one or two sentences.',
    mixed: 'Use a mix of "mcq" (about half), "truefalse" (about a quarter) and "short" (about a quarter).'
  }[payload.type];

  const system = [
    'You are an ICT examiner writing a practice quiz. You are strict about accuracy.',
    'The supplied notes are the ONLY permitted source of facts. Do not use outside knowledge, names, numbers or examples that are absent from the notes.',
    JSON_RULES,
    'Schema: {"questions":[{"id":number,"type":"mcq"|"truefalse"|"short","prompt":string,"options":string[4]?,"answerIndex":number?,"answer":boolean|string?,"explanation":string,"source":string}]}',
    'For "mcq" include options and answerIndex (0-3). For "truefalse" include a boolean answer. For "short" include a string answer.',
    'In "source", quote the phrase from the notes that supports the answer. In "explanation", say in one sentence why the answer is correct.',
    'Never use "all of the above" or "none of the above". If the notes cannot support that many distinct questions, return fewer and do not pad.'
  ].join('\n');

  const user = [
    'SOURCE NOTES (the only allowed source):',
    '<<<NOTES',
    payload.notes,
    'NOTES>>>',
    '',
    'Write exactly ' + payload.count + ' questions at ' + DIFFICULTIES[payload.difficulty].toLowerCase() + ' level.',
    typeRule,
    'Number the questions from 1 in "id".'
  ].join('\n');

  return [{ role: 'system', content: system }, { role: 'user', content: user }];
}

/* --------------------------------------------------------- response checks */

export function parseModelJson(text) {
  var raw = String(text == null ? '' : text).trim();
  if (!raw) throw new AiError('empty', 'The AI service returned an empty response.');
  // Strip a ```json fence if the provider added one despite instructions.
  var fence = raw.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fence) raw = fence[1].trim();
  var start = raw.indexOf('{');
  var end = raw.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new AiError('not-json', 'The AI service did not return JSON.');
  }
  try {
    return JSON.parse(raw.slice(start, end + 1));
  } catch (err) {
    throw new AiError('not-json', 'The AI service returned malformed JSON.');
  }
}

export function validateExplanation(data) {
  if (!data || typeof data !== 'object') throw new AiError('schema', 'The AI response was not an object.');
  const out = {
    definition: str(data.definition, 1, 1200),
    whyItMatters: str(data.whyItMatters, 0, 1600),
    steps: arr(data.steps, 1, 10).map(function (s) { return str(s, 1, 500); }),
    example: str(data.example, 0, 1600),
    realWorld: str(data.realWorld, 0, 1600),
    misconceptions: arr(data.misconceptions, 0, 6).map(function (m) {
      return { belief: str(m && m.belief, 1, 400), correction: str(m && m.correction, 1, 500) };
    }),
    vocabulary: arr(data.vocabulary, 0, 10).map(function (v) {
      return { term: str(v && v.term, 1, 120), meaning: str(v && v.meaning, 1, 500) };
    }),
    summary: str(data.summary, 1, 1200),
    questions: arr(data.questions, 1, 10).map(function (q) {
      return { q: str(q && q.q, 1, 500), a: str(q && q.a, 1, 800) };
    })
  };
  if (out.questions.length !== 5) throw new AiError('schema', 'Expected exactly five revision questions.');
  return out;
}

export function validateQuiz(data, expectedCount) {
  if (!data || !Array.isArray(data.questions)) throw new AiError('schema', 'The AI response did not contain questions.');
  const questions = data.questions.slice(0, expectedCount).map(function (q, i) {
    if (!q || typeof q !== 'object') throw new AiError('schema', 'A generated question was not an object.');
    const type = String(q.type || '').toLowerCase();
    const base = {
      id: i + 1,
      type: type,
      prompt: str(q.prompt, 3, 1200),
      explanation: str(q.explanation, 0, 1000),
      source: str(q.source, 0, 1000)
    };
    if (type === 'mcq') {
      const options = arr(q.options, 4, 4).map(function (o) { return str(o, 1, 400); });
      const unique = options.map(function (o) { return o.toLowerCase(); }).filter(function (o, idx, all) { return all.indexOf(o) === idx; });
      if (unique.length !== 4) throw new AiError('schema', 'A multiple-choice question did not have four distinct options.');
      const answerIndex = parseInt(q.answerIndex, 10);
      if (isNaN(answerIndex) || answerIndex < 0 || answerIndex > 3) throw new AiError('schema', 'A multiple-choice question had an invalid answer index.');
      base.options = options;
      base.answerIndex = answerIndex;
      base.answer = options[answerIndex];
      return base;
    }
    if (type === 'truefalse') {
      if (typeof q.answer !== 'boolean') throw new AiError('schema', 'A true/false question had no boolean answer.');
      base.answer = q.answer;
      return base;
    }
    if (type === 'short') {
      base.answer = str(q.answer, 1, 800);
      base.keywords = keywordsOf(base.answer).slice(0, 6);
      return base;
    }
    throw new AiError('schema', 'Unsupported question type: ' + (type || 'missing') + '.');
  });
  if (!questions.length) throw new AiError('schema', 'The AI response contained no usable questions.');
  // Renumber after any filtering so ids are contiguous.
  questions.forEach(function (q, i) { q.id = i + 1; });
  return { questions: questions };
}

function str(value, min, max) {
  const s = String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
  if (s.length < min) throw new AiError('schema', 'A field in the AI response was empty or too short.');
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

function arr(value, min, max) {
  if (!Array.isArray(value)) throw new AiError('schema', 'A list in the AI response was not an array.');
  if (value.length < min || value.length > max) throw new AiError('schema', 'A list in the AI response had the wrong length.');
  return value;
}

const STOP = ['the', 'and', 'for', 'with', 'that', 'this', 'are', 'was', 'were', 'from', 'have', 'has', 'into', 'its', 'it', 'a', 'an', 'of', 'to', 'in', 'on', 'is', 'or', 'as', 'be', 'by'];

export function keywordsOf(text) {
  const seen = [];
  String(text).toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').split(/\s+/).forEach(function (w) {
    if (w.length > 2 && STOP.indexOf(w) === -1 && seen.indexOf(w) === -1) seen.push(w);
  });
  return seen;
}

export class AiError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'AiError';
    this.code = code;
  }
}

/* ----------------------------------------------------------- rate limiting */

export function createRateLimiter(options) {
  const windowMs = (options && options.windowMs) || 600000;
  const max = (options && options.max) || 20;
  const dailyCap = (options && options.dailyCap) || 0;
  const buckets = new Map();
  let dayStart = new Date().setUTCHours ? startOfUtcDay(Date.now()) : Date.now();
  let dayCount = 0;

  function startOfUtcDay(now) {
    const d = new Date(now);
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  }

  return {
    take(clientKey, now) {
      const t = now || Date.now();
      if (t - dayStart >= 86400000) { dayStart = startOfUtcDay(t); dayCount = 0; }
      if (dailyCap > 0 && dayCount >= dailyCap) {
        return { allowed: false, reason: 'daily', retryAfter: Math.ceil((dayStart + 86400000 - t) / 1000) };
      }
      const entry = buckets.get(clientKey);
      if (!entry || t >= entry.resetAt) {
        buckets.set(clientKey, { count: 1, resetAt: t + windowMs });
      } else if (entry.count >= max) {
        return { allowed: false, reason: 'window', retryAfter: Math.ceil((entry.resetAt - t) / 1000) };
      } else {
        entry.count += 1;
      }
      // Keep the map from growing without bound in a long-lived process.
      if (buckets.size > 5000) {
        buckets.forEach(function (v, k) { if (t >= v.resetAt) buckets.delete(k); });
      }
      dayCount += 1;
      return { allowed: true };
    }
  };
}

/* --------------------------------------------------------- provider call */

export async function callProvider(config, messages, options) {
  const fetchImpl = (options && options.fetchImpl) || fetch;
  const timeoutMs = (options && options.timeoutMs) || config.timeoutMs;
  const controller = new AbortController();
  const timer = setTimeout(function () { controller.abort(); }, timeoutMs);

  const body = {
    model: config.model,
    messages: messages,
    temperature: 0.2
  };
  if (config.jsonMode) body.response_format = { type: 'json_object' };

  let response;
  try {
    response = await fetchImpl(config.baseUrl + '/chat/completions', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: 'Bearer ' + config.apiKey
      },
      body: JSON.stringify(body),
      signal: controller.signal
    });
  } catch (err) {
    clearTimeout(timer);
    if (err && err.name === 'AbortError') throw new AiError('timeout', 'The AI service took too long to respond.');
    throw new AiError('network', 'The AI service could not be reached.');
  }
  clearTimeout(timer);

  if (response.status === 429) {
    const retry = response.headers.get('retry-after');
    throw new AiError('rate-limited', 'The AI service is rate limiting requests' + (retry ? ' — retry in ' + retry + 's' : '') + '.');
  }
  if (response.status === 401 || response.status === 403) {
    throw new AiError('unauthorized', 'The AI service rejected the server API key.');
  }
  if (!response.ok) {
    throw new AiError('provider', 'The AI service returned HTTP ' + response.status + '.');
  }

  let json;
  try {
    json = await response.json();
  } catch (err) {
    throw new AiError('provider', 'The AI service returned a response that was not JSON.');
  }
  const content = json && json.choices && json.choices[0] && json.choices[0].message && json.choices[0].message.content;
  if (!content) throw new AiError('empty', 'The AI service returned no text.');
  return { text: String(content), usage: (json && json.usage) || null, model: (json && json.model) || config.model };
}

/* ------------------------------------------------------------- top handler */

const STATUS_FOR = {
  timeout: 504,
  network: 502,
  empty: 502,
  'not-json': 502,
  schema: 502,
  provider: 502,
  unauthorized: 500,
  'rate-limited': 429
};

/**
 * The whole POST /api/ai flow: validate → rate limit → call provider →
 * validate the model's JSON → return a normalised object.
 * Returns { status, json } and never throws.
 */
export async function handleAiRequest(options) {
  const env = options.env || {};
  const config = resolveConfig(env);
  if (!config.configured) {
    return {
      status: 503,
      json: {
        ok: false,
        error: 'ai-not-configured',
        message: 'This deployment has no AI API key yet, so StudyMate is running in prompt mode.'
      }
    };
  }

  const check = validateRequest(options.body);
  if (!check.ok) return { status: check.status, json: { ok: false, error: 'invalid-request', message: check.message } };

  const limiter = options.limiter || defaultLimiter(config);
  const limit = limiter.take(options.clientKey || 'unknown', options.now);
  if (!limit.allowed) {
    const minutes = Math.max(1, Math.ceil(limit.retryAfter / 60));
    return {
      status: 429,
      json: {
        ok: false,
        error: 'local-rate-limit',
        message: (limit.reason === 'daily'
          ? 'The daily AI request limit for this deployment has been reached.'
          : 'You have made too many AI requests.') + ' Try again in about ' + minutes + ' minute' + (minutes === 1 ? '' : 's') + '.',
        retryAfter: limit.retryAfter
      },
      headers: { 'retry-after': String(limit.retryAfter) }
    };
  }

  const messages = buildMessages(check.op, check.payload);
  try {
    const result = await callProvider(config, messages, { fetchImpl: options.fetchImpl, timeoutMs: config.timeoutMs });
    const data = parseModelJson(result.text);
    const payload = check.op === 'explain'
      ? validateExplanation(data)
      : validateQuiz(data, check.payload.count);
    return {
      status: 200,
      json: {
        ok: true,
        op: check.op,
        model: result.model,
        data: payload,
        usage: result.usage ? { promptTokens: result.usage.prompt_tokens || null, completionTokens: result.usage.completion_tokens || null } : null
      }
    };
  } catch (err) {
    const code = err instanceof AiError ? err.code : 'provider';
    return {
      status: STATUS_FOR[code] || 502,
      json: {
        ok: false,
        error: code,
        message: err instanceof AiError ? err.message : 'The AI request failed. Try again.'
      }
    };
  }
}

let sharedLimiter = null;
function defaultLimiter(config) {
  if (!sharedLimiter) sharedLimiter = createRateLimiter({ windowMs: config.rateWindowMs, max: config.rateLimit, dailyCap: config.dailyCap });
  return sharedLimiter;
}

/** Test helper: reset the module-level limiter between test cases. */
export function _resetLimiter() {
  sharedLimiter = null;
}
