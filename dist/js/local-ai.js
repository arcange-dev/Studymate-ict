/* StudyMate ICT — "bring your own key" mode.
   ---------------------------------------------
   A learner can paste their own provider key, base URL and model into the app.
   The key is stored in this browser's LocalStorage on this computer and is sent
   only to the provider base URL they chose — never to this app's server, never
   bundled into the app, never logged, and never rendered back into the page.

   Three protocols are supported, described once in js/providers.js:

     openai     POST {base}/chat/completions   (OpenAI, Groq, OpenRouter, …)
     anthropic  POST {base}/messages           (Claude)
     gemini     POST {base}/models/{m}:generateContent  (Google)

   Everything else — prompts, request validation, JSON parsing, schemas — comes
   from js/ai-contract.js, so both AI paths validate model output identically.

   This module holds no key of its own: every call reads the saved record at call
   time. It also provides the "add an API" panel's automatic checks:
     probe(input)          reachability + model list for a base URL
     testConnection(input) one tiny completion against any typed-in values
*/
(function () {
  'use strict';

  var SM = window.SM = window.SM || {};
  var contract = window.SMAiContract;
  var providers = window.SM.providers;
  if (!contract) throw new Error('StudyMate: js/ai-contract.js must load before js/local-ai.js');
  if (!providers) throw new Error('StudyMate: js/providers.js must load before js/local-ai.js');

  var STORE_KEY = 'studymate.ict.localai.v1';
  var TIMEOUT_MS = 60000;
  var PROBE_TIMEOUT_MS = 12000;
  var MAX_KEY = 400;
  var MAX_BASE = 300;
  var MAX_MODEL = 120;

  /* The catalogue is the single source of provider truth; this is the shape
     the rest of the app (and the old code) expects. */
  var PRESETS = providers.list.map(function (provider) {
    return {
      id: provider.id,
      name: provider.name,
      group: provider.group,
      protocol: provider.protocol,
      baseUrl: provider.baseUrl,
      model: provider.model,
      docs: provider.docs,
      cors: provider.cors,
      needsEdit: provider.needsEdit,
      note: provider.note
    };
  });

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
    return providers.isHttpUrl(url);
  }

  function presetFor(id) {
    return providers.get(id) || null;
  }

  function protocolFor(providerId, explicit) {
    if (explicit === 'openai' || explicit === 'anthropic' || explicit === 'gemini') return explicit;
    var provider = presetFor(providerId);
    return (provider && provider.protocol) || 'openai';
  }

  function catalogBaseFor(providerId) {
    var provider = presetFor(providerId);
    return provider && !provider.needsEdit ? provider.baseUrl : '';
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
    var provider = clean(source.provider).slice(0, 40) || 'custom';
    return {
      provider: provider,
      protocol: protocolFor(provider, source.protocol),
      baseUrl: providers.normalizeBase(clean(source.baseUrl)).slice(0, MAX_BASE),
      model: clean(source.model).slice(0, MAX_MODEL),
      apiKey: String(source.apiKey == null ? '' : source.apiKey).trim().slice(0, MAX_KEY)
    };
  }

  /**
   * Check typed-in values without saving anything. The key may be empty when
   * the caller only wants a URL check (see probe).
   */
  function inspect(input) {
    input = input || {};
    var saved = get();
    var providerId = clean(input.provider) || saved.provider || 'custom';
    var model = clean(input.model);
    var baseUrl = providers.normalizeBase(clean(input.baseUrl) || saved.baseUrl);
    var apiKey = String(input.apiKey == null ? saved.apiKey : input.apiKey).trim();
    // The catalogue decides the protocol for a known provider. Only a saved
    // custom endpoint keeps an explicit one, so "OpenAI" in storage can never
    // override Claude's or Gemini's own API shape.
    var explicitProtocol = clean(input.protocol);
    if (!explicitProtocol && providerId === saved.provider) explicitProtocol = saved.protocol;
    var protocol = protocolFor(providerId, explicitProtocol);

    if (baseUrl && !validBase(baseUrl)) {
      return { ok: false, message: 'The base URL must start with https:// (http:// is allowed only for localhost).', config: null };
    }
    if (!baseUrl) {
      return { ok: false, message: 'Enter the provider base URL, for example https://api.openai.com/v1', config: null };
    }
    if (!model) {
      return { ok: false, message: 'Enter the model name your key can use.', config: null };
    }
    return {
      ok: true,
      message: '',
      config: { provider: providerId, protocol: protocol, baseUrl: baseUrl, model: model, apiKey: apiKey }
    };
  }

  /** Persist a configuration. Throws a readable error when it is not usable. */
  function set(input) {
    var baseUrl = providers.normalizeBase(clean(input && input.baseUrl));
    var model = clean(input && input.model);
    var apiKey = String((input && input.apiKey) || '').trim();
    var provider = clean(input && input.provider) || 'custom';
    var protocol = protocolFor(provider, clean(input && input.protocol));

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
        protocol: protocol,
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

  /* ------------------------------------------------------------ request */

  function stripModelPrefix(model, protocol) {
    var value = clean(model);
    if (protocol === 'gemini') return value.replace(/^models\//i, '');
    return value;
  }

  function requestHeaders(config) {
    var headers = { 'content-type': 'application/json', accept: 'application/json' };
    if (config.protocol === 'anthropic') {
      headers['x-api-key'] = config.apiKey;
      headers['anthropic-version'] = '2023-06-01';
      // Anthropic requires this explicit opt-in before a browser may call it.
      headers['anthropic-dangerous-direct-browser-access'] = 'true';
      return headers;
    }
    if (config.protocol === 'gemini') {
      headers['x-goog-api-key'] = config.apiKey;
      return headers;
    }
    headers.authorization = 'Bearer ' + config.apiKey;
    return headers;
  }

  function requestBody(config, messages, protocol, maxTokens) {
    var system = messages.filter(function (m) { return m.role === 'system'; }).map(function (m) { return m.content; }).join('\n\n');
    var turns = messages.filter(function (m) { return m.role !== 'system'; });

    if (protocol === 'anthropic') {
      return {
        model: stripModelPrefix(config.model, protocol),
        max_tokens: maxTokens || 4096,
        temperature: 0.2,
        system: system,
        messages: turns.map(function (m) {
          return { role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content };
        })
      };
    }

    if (protocol === 'gemini') {
      return {
        systemInstruction: system ? { parts: [{ text: system }] } : undefined,
        contents: turns.map(function (m) {
          return { role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] };
        }),
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: maxTokens || 4096,
          responseMimeType: 'application/json'
        }
      };
    }

    return {
      model: config.model,
      messages: messages,
      temperature: 0.2,
      response_format: { type: 'json_object' }
    };
  }

  function extractText(json, protocol) {
    if (!json) return '';
    if (protocol === 'anthropic') {
      var blocks = Array.isArray(json.content) ? json.content : [];
      return blocks.filter(function (block) { return block && block.type === 'text'; })
        .map(function (block) { return String(block.text || ''); }).join('');
    }
    if (protocol === 'gemini') {
      var candidate = json.candidates && json.candidates[0];
      var parts = candidate && candidate.content && candidate.content.parts;
      return Array.isArray(parts) ? parts.map(function (part) { return String((part && part.text) || ''); }).join('') : '';
    }
    return json.choices && json.choices[0] && json.choices[0].message
      ? String(json.choices[0].message.content || '')
      : '';
  }

  function responseModel(json, config, protocol) {
    if (protocol === 'anthropic') return clean(json && json.model) || config.model;
    if (protocol === 'gemini') return clean(json && json.modelVersion) || config.model;
    return clean(json && json.model) || config.model;
  }

  function friendly(status, fallback) {
    if (status === 401 || status === 403) return 'Your provider rejected the key. Check that the key is valid and allowed for this model.';
    if (status === 404) return 'The base URL or model was not found. Check the base URL ends with /v1 (or the provider’s documented path) and that the model name exists.';
    if (status === 429) return 'Your provider is rate limiting requests. Wait a moment and try again.';
    if (status === 400) return 'Your provider rejected the request. The model may not support JSON output — try a different model.';
    return fallback;
  }

  function timeoutMessage() {
    return 'Your provider took too long to answer.';
  }

  /** Turn a failed fetch into a message a learner can act on. */
  function networkMessage(config) {
    var provider = presetFor(config.provider);
    if (provider && provider.cors === 'blocked') {
      return 'Could not reach ' + provider.name + ' from this browser. It blocks direct browser (CORS) requests, so use its key on the server instead, or pick a provider that allows browser calls.';
    }
    if (config.protocol === 'anthropic') {
      return 'Could not reach Anthropic from this browser. Check the base URL and your connection; Anthropic allows browser calls with the header StudyMate sends.';
    }
    return 'Could not reach your provider from this browser. The provider may block browser (CORS) requests — use a provider that allows it, or ask the site owner to set a server key.';
  }

  function requestMessages(config, messages, options) {
    var opts = options || {};
    var protocol = config.protocol || 'openai';
    var controller = new AbortController();
    var timer = window.setTimeout(function () { controller.abort(); }, opts.timeout || TIMEOUT_MS);
    var url = providers.chatUrl(config.baseUrl, protocol, config.model);

    return fetch(url, {
      method: 'POST',
      headers: requestHeaders(config),
      body: JSON.stringify(requestBody(config, messages, protocol, opts.maxTokens)),
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
        var content = extractText(json, protocol);
        if (!content) throw new contract.AiError('empty', 'Your provider returned no text.');
        return { text: String(content), model: responseModel(json, config, protocol) };
      })
      .catch(function (err) {
        window.clearTimeout(timer);
        if (err && err.name === 'AbortError') throw new contract.AiError('timeout', timeoutMessage());
        if (err && err.code) throw err;
        // A CORS rejection surfaces as an opaque TypeError.
        throw new contract.AiError('network', networkMessage(config));
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

    return requestMessages(get(), contract.buildMessages(checked.op, checked.payload)).then(function (result) {
      var parsed = contract.parseModelJson(result.text);
      var data = checked.op === 'explain'
        ? contract.validateExplanation(parsed)
        : contract.validateQuiz(parsed, checked.payload.count);
      return { data: data, model: result.model, source: 'local-key' };
    });
  }

  /* ------------------------------------------------- automatic URL testing */

  function modelNamesFrom(json, protocol) {
    if (!json) return [];
    if (protocol === 'gemini') {
      var list = Array.isArray(json.models) ? json.models : [];
      return list
        .filter(function (m) {
          var methods = m && m.supportedGenerationMethods;
          return !Array.isArray(methods) || methods.indexOf('generateContent') !== -1;
        })
        .map(function (m) { return clean(m && m.name).replace(/^models\//i, ''); })
        .filter(Boolean);
    }
    var data = Array.isArray(json.data) ? json.data : (Array.isArray(json.models) ? json.models : []);
    return data.map(function (item) {
      if (typeof item === 'string') return item;
      return clean(item && (item.id || item.name));
    }).filter(Boolean);
  }

  function probeHeaders(config, protocol) {
    if (protocol === 'anthropic') {
      return { accept: 'application/json', 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true', 'x-api-key': config.apiKey };
    }
    if (protocol === 'gemini') {
      return { accept: 'application/json', 'x-goog-api-key': config.apiKey };
    }
    var headers = { accept: 'application/json' };
    if (config.apiKey) headers.authorization = 'Bearer ' + config.apiKey;
    return headers;
  }

  /**
   * Automatic check of a base URL: is it reachable, does it answer the model
   * list, and what can this key use? A missing key still measures reachability
   * (401 means "the URL is live but the key was refused").
   */
  function probe(input) {
    input = input || {};
    var protocol = protocolFor(clean(input.provider), clean(input.protocol));
    var baseUrl = providers.normalizeBase(clean(input.baseUrl));

    if (!baseUrl) {
      return Promise.resolve({ ok: false, kind: 'invalid-url', message: 'Enter a base URL to test.' });
    }
    if (!validBase(baseUrl)) {
      return Promise.resolve({ ok: false, kind: 'invalid-url', message: 'Only https:// URLs (or http://localhost) can be tested.' });
    }

    var config = {
      provider: clean(input.provider) || 'custom',
      protocol: protocol,
      baseUrl: baseUrl,
      model: clean(input.model),
      apiKey: String(input.apiKey || '').trim()
    };
    var url = providers.modelsUrl(baseUrl, protocol);
    var controller = new AbortController();
    var started = Date.now();
    var timer = window.setTimeout(function () { controller.abort(); }, PROBE_TIMEOUT_MS);

    return fetch(url, { method: 'GET', headers: probeHeaders(config, protocol), signal: controller.signal, cache: 'no-store' })
      .then(function (response) {
        window.clearTimeout(timer);
        var latencyMs = Date.now() - started;
        if (response.status === 401 || response.status === 403) {
          return {
            ok: false,
            reachable: true,
            kind: 'unauthorized',
            status: response.status,
            latencyMs: latencyMs,
            message: 'The URL is live, but the key was refused (HTTP ' + response.status + '). Check the key and that it can use this model.'
          };
        }
        if (!response.ok) {
          return {
            ok: false,
            reachable: true,
            kind: 'http',
            status: response.status,
            latencyMs: latencyMs,
            message: 'The URL answered HTTP ' + response.status + '. Check that it is the API root (usually ending in /v1) for ' + (config.provider === 'custom' ? 'this provider' : config.provider) + '.'
          };
        }
        return response.json().catch(function () { return null; }).then(function (json) {
          var models = modelNamesFrom(json, protocol);
          return {
            ok: true,
            reachable: true,
            kind: models.length ? 'ok' : 'reachable',
            status: response.status,
            latencyMs: latencyMs,
            models: models,
            message: models.length
              ? models.length + ' model' + (models.length === 1 ? '' : 's') + ' available'
              : 'The URL is reachable, but it did not list any models. Enter the model name manually.'
          };
        });
      })
      .catch(function (err) {
        window.clearTimeout(timer);
        var latencyMs = Date.now() - started;
        if (err && err.name === 'AbortError') {
          return { ok: false, kind: 'timeout', latencyMs: latencyMs, message: 'The URL did not answer within ' + Math.round(PROBE_TIMEOUT_MS / 1000) + ' seconds.' };
        }
        return {
          ok: false,
          kind: 'cors',
          latencyMs: latencyMs,
          message: networkMessage(config)
        };
      });
  }

  /**
   * Test typed-in values with one tiny completion — before or after saving.
   * Resolves { ok, model, protocol, latencyMs, message }.
   */
  function testConnection(input) {
    var checked = inspect(input);
    if (!checked.ok) return Promise.resolve({ ok: false, kind: 'invalid', message: checked.message });
    var config = checked.config;
    if (!config.apiKey) {
      return Promise.resolve({ ok: false, kind: 'no-key', message: 'Paste the API key so the connection can be tested.' });
    }

    var started = Date.now();
    var messages = [
      { role: 'system', content: 'Reply with one JSON object only: {"ok":true,"purpose":"connection test"}.' },
      { role: 'user', content: 'Connection test from StudyMate ICT.' }
    ];

    return requestMessages(config, messages, { timeout: 25000, maxTokens: 64 })
      .then(function (result) {
        var parsed = contract.parseModelJson(result.text);
        return {
          ok: true,
          kind: 'ok',
          model: result.model,
          protocol: config.protocol,
          latencyMs: Date.now() - started,
          sample: parsed,
          message: (result.model || config.model) + ' answered successfully'
        };
      }, function (err) {
        return {
          ok: false,
          kind: (err && err.code) || 'provider',
          status: err && err.status,
          latencyMs: Date.now() - started,
          message: (err && err.message) || 'The connection test failed.'
        };
      });
  }

  /** One tiny request against the saved configuration. */
  function test() {
    if (!isEnabled()) return Promise.reject(new contract.AiError('ai-not-configured', 'Save your key first.'));
    return testConnection(get()).then(function (result) {
      if (!result.ok) {
        var err = new contract.AiError(result.kind || 'provider', result.message);
        err.status = result.status;
        throw err;
      }
      return { ok: true, model: result.model, latencyMs: result.latencyMs, protocol: result.protocol };
    });
  }

  SM.localAi = {
    STORE_KEY: STORE_KEY,
    presets: PRESETS,
    get: get,
    set: set,
    clear: clear,
    inspect: inspect,
    isEnabled: isEnabled,
    hasKey: hasKey,
    label: label,
    run: run,
    test: test,
    probe: probe,
    testConnection: testConnection,
    subscribe: function (fn) { if (typeof fn === 'function') listeners.push(fn); }
  };
})();
