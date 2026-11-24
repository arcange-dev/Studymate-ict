/*
  StudyMate ICT — server-side AI core.

  Shared by both server targets (the Cloudflare Worker in sites/worker.js and
  the zero-dependency Node server in server/node-server.js) so the config,
  provider adapter, rate limiting and response checking exist in exactly one
  place.

  The prompts and the request/response contract are not duplicated here: they
  live in StudyMate-ICT/js/ai-contract.js, the same classic script the browser
  uses for "bring your own key" mode. This file imports it for that side effect
  and re-exports the pieces other modules and tests import.

  Runs unchanged in Node 18+ and in Workers: it only uses fetch, crypto-free
  primitives and plain JavaScript. It holds no secrets — every key comes from
  the server environment at call time.

  Provider adapter: any OpenAI-compatible /chat/completions endpoint. Swapping
  provider is a matter of AI_BASE_URL + AI_MODEL, not code.
*/

import '../StudyMate-ICT/js/ai-contract.js';

const contract = globalThis.SMAiContract;
if (!contract) throw new Error('StudyMate: the shared AI contract failed to load.');

export const { LIMITS, AiError, validateRequest, buildMessages, parseModelJson, validateExplanation, validateQuiz } = contract;
export const keywordsOf = contract.keywordsOf;

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

/* ----------------------------------------------------------- rate limiting */

export function createRateLimiter(options) {
  const windowMs = (options && options.windowMs) || 600000;
  const max = (options && options.max) || 20;
  const dailyCap = (options && options.dailyCap) || 0;
  const buckets = new Map();
  let dayStart = startOfUtcDay(Date.now());
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
 * The whole POST /api/ai flow: validate → rate limit → call provider → validate
 * the model's JSON → return a normalised object.
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
