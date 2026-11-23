/* StudyMate ICT — "bring your own key" mode.
   ---------------------------------------------
   A learner can paste their own provider key, base URL and model into the app.
   The key is stored in this browser's LocalStorage on this computer and is sent
   only to the provider base URL they chose — never to this app's server, never
   bundled into the app, never logged.

   This module holds no key of its own: every call reads the saved record at call
   time. It mirrors the request/response contract in sites/ai-core.js so the
   rest of the UI cannot tell which path answered — but the validation is
   repeated here rather than trusted from the provider.
*/
(function () {
  'use strict';

  var SM = window.SM = window.SM || {};

  var STORE_KEY = 'studymate.ict.localai.v1';
  var TIMEOUT_MS = 60000;
  var MAX_KEY = 400;
  var MAX_BASE = 300;
  var MAX_MODEL = 120;

  /* Providers that speak the OpenAI Chat Completions protocol. "custom" covers
     every other provider in the world: paste its OpenAI-compatible base URL. */
  var PRESETS = [
    { id: 'openai', name: 'OpenAI', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
    { id: 'openrouter', name: 'OpenRouter (many models)', baseUrl: 'https://openrouter.ai/api/v1', model: 'openai/gpt-4o-mini' },
    { id: 'groq', name: 'Groq', baseUrl: 'https://api.groq.com/openai/v1', model: 'llama-3.3-70b-versatile' },
    { id: 'gemini', name: 'Google Gemini (OpenAI-compatible)', baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai', model: 'gemini-2.0-flash' },
    { id: 'mistral', name: 'Mistral AI', baseUrl: 'https://api.mistral.ai/v1', model: 'mistral-small-latest' },
    { id: 'deepseek', name: 'DeepSeek', baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
    { id: 'together', name: 'Together AI', baseUrl: 'https://api.together.xyz/v1', model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo' },
    { id: 'zai', name: 'Z.ai (GLM)', baseUrl: 'https://api.z.ai/api/paas/v4', model: 'glm-4.5-flash' },
    { id: 'custom', name: 'Other provider — enter its base URL', baseUrl: '', model: '' }
  ];

  var LEVELS = {
    beginner: 'Beginner (first ICT course)',
    intermediate: 'Intermediate (some hardware knowledge)',
    advanced: 'Advanced / exam revision'
  };
  var LENGTHS = {
    short: 'short (about 150 words per section)',
    medium: 'medium (about 250 words per section)',
    long: 'detailed (about 400 words per section)'
  };
  var DIFFICULTIES = { easy: 'Easy', medium: 'Medium — understanding and application', hard: 'Hard — analysis and exam-style' };

  var JSON_RULES = [
    'Reply with one JSON object only — no prose, no markdown, no code fences.',
    'Never invent facts, statistics, dates, quotations or sources. If unsure, say so inside the JSON.'
  ].join('\n');

  var listeners = [];
  var memory = null;

  function notify() {
    var config = get();
    listeners.forEach(function (fn) {
      try { fn(config); } catch (err) { /* a listener must never break the app */ }
    });
  }

  function clean(value) {
    return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
  }

  function storage() {
    try { return window.localStorage || null; } catch (err) { return null; }
  }

  function normaliseBase(url) {
    var value = clean(url);
    if (!value) return '';
    return value.replace(/\/+$/, '');
  }

  function validBase(url) {
    return /^https:\/\/[^\s]+$/i.test(url) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(url);
  }

  /** Saved configuration. The key is returned only for calling the provider. */
  function get() {
    var raw = null;
    var ls = storage();
    if (ls) {
      try { raw = ls.getItem(STORE_KEY); } catch (err) { raw = null; }
    }
    if (!raw && memory) return memory;
    var parsed = null;
    if (raw) {
      try { parsed = JSON.parse(raw); } catch (err) { parsed = null; }
    }
    var source = parsed && typeof parsed === 'object' ? parsed : {};
    return {
      provider: clean(source.provider).slice(0, 40) || 'custom',
      baseUrl: normaliseBase(source.baseUrl).slice(0, MAX_BASE),
      model: clean(source.model).slice(0, MAX_MODEL),
      apiKey: String(source.apiKey == null ? '' : source.apiKey).trim().slice(0, MAX_KEY)
    };
  }

  /** Persist a configuration. Throws a readable error when it is not usable. */
  function set(input) {
    var baseUrl = normaliseBase(input && input.baseUrl);
    var model = clean(input && input.model);
    var apiKey = String((input && input.apiKey) || '').trim();
    var provider = clean(input && input.provider) || 'custom';

    if (!apiKey) throw new Error('Paste your API key first.');
    if (apiKey.length < 8) throw new Error('That key looks too short to be valid.');
    if (!baseUrl) throw new Error('Enter the provider base URL, for example https://api.openai.com/v1');
    if (!validBase(baseUrl)) throw new Error('The base URL must start with https:// (http:// is allowed only for localhost).');
    if (!model) throw new Error('Enter the model name your key can use.');

    var record = { provider: provider.slice(0, 40), baseUrl: baseUrl.slice(0, MAX_BASE), model: model.slice(0, MAX_MODEL), apiKey: apiKey.slice(0, MAX_KEY) };
    var ls = storage();
    memory = record;
    if (ls) {
      try {
        ls.setItem(STORE_KEY, JSON.stringify(record));
      } catch (err) {
        throw new Error('This browser refused to store the key (storage may be full or blocked).');
      }
    }
    notify();
    return { provider: record.provider, baseUrl: record.baseUrl, model: record.model, apiKey: '' };
  }

  function clear() {
    memory = null;
    var ls = storage();
    if (ls) {
      try { ls.removeItem(STORE_KEY); } catch (err) { /* ignore */ }
    }
    notify();
  }

  function isEnabled() {
    var c = get();
    return Boolean(c.apiKey && c.baseUrl && c.model && validBase(c.baseUrl));
  }

  function hasKey() {
    return Boolean(get().apiKey);
  }

  function label() {
    var c = get();
    return c.model ? c.model + ' · your key' : 'your key';
  }

  /* ------------------------------------------------------------ prompts */

  function buildMessages(op, payload) {
    if (op === 'explain') {
      var system = [
        'You are an experienced ICT tutor teaching computer systems, networking, programming, databases, operating systems and cybersecurity.',
        'You write in plain, everyday language for the stated level and you define every technical term the first time you use it.',
        JSON_RULES,
        'Schema: {"definition":string,"whyItMatters":string,"steps":string[3-7],"example":string,"realWorld":string,"misconceptions":[{"belief":string,"correction":string}],"vocabulary":[{"term":string,"meaning":string}],"summary":string,"questions":[{"q":string,"a":string}]}',
        'Give exactly 5 objects in "questions". Give 2-3 misconceptions and 3-6 vocabulary items.'
      ].join('\n');
      var user = [
        'Topic: ' + payload.topic,
        'Learner level: ' + (LEVELS[payload.level] || LEVELS.beginner) + '.',
        'Prior knowledge: ' + (payload.prior || 'none — treat me as a complete beginner') + '.',
        'Length per section: ' + (LENGTHS[payload.length] || LENGTHS.medium) + '.',
        'Explain this topic as JSON matching the schema. Keep "steps" as short numbered instructions, and make "questions" test understanding rather than definitions.',
        'Make the examples concrete: something the learner could point at on a real computer or in a real network.'
      ].join('\n');
      return [{ role: 'system', content: system }, { role: 'user', content: user }];
    }

    var typeRule = {
      mcq: 'Every question must be type "mcq" with exactly four unique options and one correct answer.',
      truefalse: 'Every question must be type "truefalse" with a boolean answer.',
      short: 'Every question must be type "short" with a model answer of one or two sentences.',
      mixed: 'Use a mix of "mcq" (about half), "truefalse" (about a quarter) and "short" (about a quarter).'
    }[payload.type] || 'Use a mix of "mcq", "truefalse" and "short".';

    var systemQ = [
      'You are an ICT examiner writing a practice quiz. You are strict about accuracy.',
      'The supplied notes are the ONLY permitted source of facts. Do not use outside knowledge, names, numbers or examples that are absent from the notes.',
      JSON_RULES,
      'Schema: {"questions":[{"id":number,"type":"mcq"|"truefalse"|"short","prompt":string,"options":string[4]?,"answerIndex":number?,"answer":boolean|string?,"explanation":string,"source":string}]}',
      'For "mcq" include options and answerIndex (0-3). For "truefalse" include a boolean answer. For "short" include a string answer.',
      'In "source", quote the phrase from the notes that supports the answer. In "explanation", say in one sentence why the answer is correct.',
      'Never use "all of the above" or "none of the above". If the notes cannot support that many distinct questions, return fewer and do not pad.'
    ].join('\n');

    var userQ = [
      'SOURCE NOTES (the only allowed source):',
      '<<<NOTES',
      payload.notes,
      'NOTES>>>',
      '',
      'Write exactly ' + payload.count + ' questions at ' + (DIFFICULTIES[payload.difficulty] || DIFFICULTIES.medium).toLowerCase() + ' level.',
      typeRule,
      'Number the questions from 1 in "id".'
    ].join('\n');

    return [{ role: 'system', content: systemQ }, { role: 'user', content: userQ }];
  }

  /* --------------------------------------------------------- validation */

  function AiError(code, message) {
    var err = new Error(message);
    err.name = 'LocalAiError';
    err.code = code;
    return err;
  }

  function str(value, min, max) {
    var s = clean(value);
    if (s.length < min) throw AiError('schema', 'The AI response was missing a required field.');
    return s.length > max ? s.slice(0, max - 1) + '…' : s;
  }

  function arr(value, min, max) {
    if (!Array.isArray(value)) throw AiError('schema', 'The AI response was missing a list.');
    if (value.length < min || value.length > max) throw AiError('schema', 'A list in the AI response had the wrong length.');
    return value;
  }

  var STOP = ['the', 'and', 'for', 'with', 'that', 'this', 'are', 'was', 'were', 'from', 'have', 'has', 'into', 'its', 'it', 'a', 'an', 'of', 'to', 'in', 'on', 'is', 'or', 'as', 'be', 'by'];

  function keywordsOf(text) {
    var seen = [];
    String(text).toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').split(/\s+/).forEach(function (w) {
      if (w.length > 2 && STOP.indexOf(w) === -1 && seen.indexOf(w) === -1) seen.push(w);
    });
    return seen;
  }

  function parseModelJson(text) {
    var raw = String(text == null ? '' : text).trim();
    if (!raw) throw AiError('empty', 'Your provider returned an empty response.');
    var fence = raw.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
    if (fence) raw = fence[1].trim();
    var start = raw.indexOf('{');
    var end = raw.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) throw AiError('not-json', 'Your provider did not return JSON. Try a model that supports JSON output.');
    try {
      return JSON.parse(raw.slice(start, end + 1));
    } catch (err) {
      throw AiError('not-json', 'Your provider returned malformed JSON.');
    }
  }

  function validateExplanation(data) {
    if (!data || typeof data !== 'object') throw AiError('schema', 'The AI response was not an object.');
    var out = {
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
    if (out.questions.length !== 5) throw AiError('schema', 'Expected exactly five revision questions.');
    return out;
  }

  function validateQuiz(data, expectedCount) {
    if (!data || !Array.isArray(data.questions)) throw AiError('schema', 'The AI response did not contain questions.');
    var questions = data.questions.slice(0, expectedCount).map(function (q) {
      if (!q || typeof q !== 'object') throw AiError('schema', 'A generated question was not an object.');
      var type = String(q.type || '').toLowerCase();
      var base = { type: type, prompt: str(q.prompt, 3, 1200), explanation: str(q.explanation, 0, 1000), source: str(q.source, 0, 1000) };
      if (type === 'mcq') {
        var options = arr(q.options, 4, 4).map(function (o) { return str(o, 1, 400); });
        var unique = options.map(function (o) { return o.toLowerCase(); }).filter(function (o, idx, all) { return all.indexOf(o) === idx; });
        if (unique.length !== 4) throw AiError('schema', 'A multiple-choice question did not have four distinct options.');
        var answerIndex = parseInt(q.answerIndex, 10);
        if (isNaN(answerIndex) || answerIndex < 0 || answerIndex > 3) throw AiError('schema', 'A multiple-choice question had an invalid answer index.');
        base.options = options;
        base.answerIndex = answerIndex;
        base.answer = options[answerIndex];
        return base;
      }
      if (type === 'truefalse') {
        if (typeof q.answer !== 'boolean') throw AiError('schema', 'A true/false question had no boolean answer.');
        base.answer = q.answer;
        return base;
      }
      if (type === 'short') {
        base.answer = str(q.answer, 1, 800);
        base.keywords = keywordsOf(base.answer).slice(0, 6);
        return base;
      }
      throw AiError('schema', 'Unsupported question type: ' + (type || 'missing') + '.');
    });
    if (!questions.length) throw AiError('schema', 'The AI response contained no usable questions.');
    questions.forEach(function (q, i) { q.id = i + 1; });
    return { questions: questions };
  }

  function validateInput(body) {
    var op = String((body && body.op) || '');
    if (op === 'explain') {
      var topic = clean(body.topic);
      if (topic.length < 2) throw AiError('invalid-request', 'Enter an ICT topic with at least two characters.');
      if (topic.length > 120) throw AiError('invalid-request', 'That topic is too long (maximum 120 characters).');
      return {
        op: 'explain',
        payload: {
          topic: topic,
          level: LEVELS[body.level] ? body.level : 'beginner',
          length: LENGTHS[body.length] ? body.length : 'medium',
          prior: clean(body.prior).slice(0, 200)
        }
      };
    }
    if (op === 'quiz') {
      var notes = String((body && body.notes) || '').trim();
      if (notes.length < 50) throw AiError('invalid-request', 'Paste at least a couple of sentences (50 characters or more) to build a quiz from.');
      if (notes.length > 12000) throw AiError('invalid-request', 'Those notes are too long (maximum 12000 characters). Split them into sections.');
      var count = parseInt(body.count, 10);
      if (isNaN(count) || count < 3 || count > 20) throw AiError('invalid-request', 'Choose between 3 and 20 questions.');
      return {
        op: 'quiz',
        payload: {
          notes: notes,
          count: count,
          difficulty: DIFFICULTIES[body.difficulty] ? body.difficulty : 'medium',
          type: ['mixed', 'mcq', 'truefalse', 'short'].indexOf(body.type) !== -1 ? body.type : 'mixed'
        }
      };
    }
    throw AiError('invalid-request', 'Unknown operation. Use "explain" or "quiz".');
  }

  /* ----------------------------------------------------------- provider */

  function friendly(err, status) {
    if (status === 401 || status === 403) return 'Your provider rejected the key. Check that the key is valid and allowed for this model.';
    if (status === 404) return 'The base URL or model was not found. Check the base URL ends with /v1 (or the provider’s documented path) and that the model name exists.';
    if (status === 429) return 'Your provider is rate limiting requests. Wait a moment and try again.';
    if (status === 400) return 'Your provider rejected the request. The model may not support JSON output — try a different model.';
    return err;
  }

  function callProvider(config, messages) {
    var controller = new AbortController();
    var timer = window.setTimeout(function () { controller.abort(); }, TIMEOUT_MS);

    return fetch(config.baseUrl + '/chat/completions', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
        authorization: 'Bearer ' + config.apiKey
      },
      body: JSON.stringify({
        model: config.model,
        messages: messages,
        temperature: 0.2,
        response_format: { type: 'json_object' }
      }),
      signal: controller.signal
    })
      .then(function (response) {
        window.clearTimeout(timer);
        if (!response.ok) {
          return response.text().catch(function () { return ''; }).then(function (text) {
            var err = AiError(response.status === 401 || response.status === 403 ? 'unauthorized' : 'provider', friendly('The provider returned HTTP ' + response.status + '.', response.status));
            err.status = response.status;
            err.detail = String(text || '').slice(0, 300);
            throw err;
          });
        }
        return response.json();
      })
      .then(function (json) {
        var content = json && json.choices && json.choices[0] && json.choices[0].message && json.choices[0].message.content;
        if (!content) throw AiError('empty', 'Your provider returned no text.');
        return { text: String(content), model: (json && json.model) || config.model };
      })
      .catch(function (err) {
        window.clearTimeout(timer);
        if (err && err.name === 'AbortError') throw AiError('timeout', 'Your provider took too long to answer.');
        if (err && err.code) throw err;
        // A CORS rejection surfaces as an opaque TypeError.
        throw AiError('network', 'Could not reach your provider from this browser. The provider may block browser (CORS) requests — use a provider that allows it, or ask the site owner to set a server key.');
      });
  }

  /**
   * Run an AI request using the learner's own key.
   * Resolves with the same normalised object the server endpoint returns.
   */
  function run(body) {
    var config = get();
    if (!isEnabled()) {
      var err = AiError('ai-not-configured', 'No API key is saved in this browser yet.');
      return Promise.reject(err);
    }
    var checked;
    try {
      checked = validateInput(body);
    } catch (validationError) {
      return Promise.reject(validationError);
    }

    return callProvider(config, buildMessages(checked.op, checked.payload)).then(function (result) {
      var parsed = parseModelJson(result.text);
      var data = checked.op === 'explain'
        ? validateExplanation(parsed)
        : validateQuiz(parsed, checked.payload.count);
      return { data: data, model: result.model, source: 'local-key' };
    });
  }

  /** One tiny request, used by the "Save & test" button. */
  function test() {
    var config = get();
    if (!isEnabled()) return Promise.reject(AiError('ai-not-configured', 'Save your key first.'));
    return callProvider(config, [
      { role: 'system', content: 'Reply with one JSON object only: {"ok":true,"purpose":"connection test"}.' },
      { role: 'user', content: 'Connection test from StudyMate ICT.' }
    ]).then(function (result) {
      parseModelJson(result.text);
      return { ok: true, model: result.model };
    });
  }

  SM.localAi = {
    STORE_KEY: STORE_KEY,
    presets: PRESETS,
    get: get,
    set: set,
    clear: clear,
    isEnabled: isEnabled,
    hasKey: hasKey,
    label: label,
    run: run,
    test: test,
    subscribe: function (fn) { if (typeof fn === 'function') listeners.push(fn); },
    /* Exported for tests and for the UI's own previews. */
    buildMessages: buildMessages,
    parseModelJson: parseModelJson,
    validateExplanation: validateExplanation,
    validateQuiz: validateQuiz,
    keywordsOf: keywordsOf
  };
})();
