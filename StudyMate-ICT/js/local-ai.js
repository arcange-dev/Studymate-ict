/* StudyMate ICT — "bring your own key" mode.
   ---------------------------------------------
   A learner can paste their own provider key, base URL and model into the app.
   The key is stored in this browser's LocalStorage on this computer and is sent
   only to the provider base URL they chose — never to this app's server, never
   bundled into the app, never logged, and never rendered back into the page.

   This module holds no key of its own: every call reads the saved record at call
   time. The prompts and the request/response contract come from
   js/ai-contract.js, so both AI paths validate model output identically.
*/
(function () {
  'use strict';

  var SM = window.SM = window.SM || {};
  var contract = window.SMAiContract;
  if (!contract) throw new Error('StudyMate: js/ai-contract.js must load before js/local-ai.js');

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

  var listeners = [];

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

  function validBase(url) {
    return /^https:\/\/[^\s]+$/i.test(url) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(url);
  }

  /** Saved configuration. The key is returned only so a request can use it. */
  function get() {
    var raw = null;
    var ls = storage();
    if (ls) {
      try { raw = ls.getItem(STORE_KEY); } catch (err) { raw = null; }
    }
    var parsed = null;
    if (raw) {
      try { parsed = JSON.parse(raw); } catch (err) { parsed = null; }
    }
    var source = parsed && typeof parsed === 'object' ? parsed : {};
    return {
      provider: clean(source.provider).slice(0, 40) || 'custom',
      baseUrl: clean(source.baseUrl).replace(/\/+$/, '').slice(0, MAX_BASE),
      model: clean(source.model).slice(0, MAX_MODEL),
      apiKey: String(source.apiKey == null ? '' : source.apiKey).trim().slice(0, MAX_KEY)
    };
  }

  /** Persist a configuration. Throws a readable error when it is not usable. */
  function set(input) {
    var baseUrl = clean(input && input.baseUrl).replace(/\/+$/, '');
    var model = clean(input && input.model);
    var apiKey = String((input && input.apiKey) || '').trim();
    var provider = clean(input && input.provider) || 'custom';

    if (!apiKey) throw new Error('Paste your API key first.');
    if (apiKey.length < 8) throw new Error('That key looks too short to be valid.');
    if (!baseUrl) throw new Error('Enter the provider base URL, for example https://api.openai.com/v1');
    if (!validBase(baseUrl)) throw new Error('The base URL must start with https:// (http:// is allowed only for localhost).');
    if (!model) throw new Error('Enter the model name your key can use.');

    var ls = storage();
    if (!ls) throw new Error('This browser blocked local storage, so the key cannot be saved on this device.');
    try {
      ls.setItem(STORE_KEY, JSON.stringify({
        provider: provider.slice(0, 40),
        baseUrl: baseUrl.slice(0, MAX_BASE),
        model: model.slice(0, MAX_MODEL),
        apiKey: apiKey.slice(0, MAX_KEY)
      }));
    } catch (err) {
      throw new Error('This browser refused to store the key (storage may be full or blocked).');
    }
    notify();
  }

  function clear() {
    var ls = storage();
    if (ls) {
      try { ls.removeItem(STORE_KEY); } catch (err) { /* ignore */ }
    }
    notify();
  }

  function hasKey() {
    return Boolean(get().apiKey);
  }

  function isEnabled() {
    var c = get();
    return Boolean(c.apiKey && c.baseUrl && c.model && validBase(c.baseUrl));
  }

  function label() {
    var c = get();
    return c.model ? c.model + ' · your key' : 'your key';
  }

  /* ----------------------------------------------------------- provider */

  function friendly(status, fallback) {
    if (status === 401 || status === 403) return 'Your provider rejected the key. Check that the key is valid and allowed for this model.';
    if (status === 404) return 'The base URL or model was not found. Check the base URL ends with /v1 (or the provider’s documented path) and that the model name exists.';
    if (status === 429) return 'Your provider is rate limiting requests. Wait a moment and try again.';
    if (status === 400) return 'Your provider rejected the request. The model may not support JSON output — try a different model.';
    return fallback;
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
            var err = new contract.AiError(
              response.status === 401 || response.status === 403 ? 'unauthorized' : 'provider',
              friendly(response.status, 'The provider returned HTTP ' + response.status + '.')
            );
            err.status = response.status;
            err.detail = String(text || '').slice(0, 300);
            throw err;
          });
        }
        return response.json();
      })
      .then(function (json) {
        var content = json && json.choices && json.choices[0] && json.choices[0].message && json.choices[0].message.content;
        if (!content) throw new contract.AiError('empty', 'Your provider returned no text.');
        return { text: String(content), model: (json && json.model) || config.model };
      })
      .catch(function (err) {
        window.clearTimeout(timer);
        if (err && err.name === 'AbortError') throw new contract.AiError('timeout', 'Your provider took too long to answer.');
        if (err && err.code) throw err;
        // A CORS rejection surfaces as an opaque TypeError.
        throw new contract.AiError('network', 'Could not reach your provider from this browser. The provider may block browser (CORS) requests — use a provider that allows it, or ask the site owner to set a server key.');
      });
  }

  /**
   * Run an AI request using the learner's own key.
   * Resolves with the same normalised object the server endpoint returns.
   */
  function run(body) {
    if (!isEnabled()) {
      return Promise.reject(new contract.AiError('ai-not-configured', 'No API key is saved in this browser yet.'));
    }
    var checked = contract.validateRequest(body);
    if (!checked.ok) {
      return Promise.reject(new contract.AiError('invalid-request', checked.message));
    }

    return callProvider(get(), contract.buildMessages(checked.op, checked.payload)).then(function (result) {
      var parsed = contract.parseModelJson(result.text);
      var data = checked.op === 'explain'
        ? contract.validateExplanation(parsed)
        : contract.validateQuiz(parsed, checked.payload.count);
      return { data: data, model: result.model, source: 'local-key' };
    });
  }

  /** One tiny request, used by the "Save & test" button. */
  function test() {
    if (!isEnabled()) return Promise.reject(new contract.AiError('ai-not-configured', 'Save your key first.'));
    return callProvider(get(), [
      { role: 'system', content: 'Reply with one JSON object only: {"ok":true,"purpose":"connection test"}.' },
      { role: 'user', content: 'Connection test from StudyMate ICT.' }
    ]).then(function (result) {
      contract.parseModelJson(result.text);
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
    subscribe: function (fn) { if (typeof fn === 'function') listeners.push(fn); }
  };
})();
