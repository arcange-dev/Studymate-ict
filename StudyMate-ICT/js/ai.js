/* StudyMate ICT — browser client for the AI endpoint.
   Talks only to this app's own origin (POST /api/ai). If the deployment has no
   key, the endpoint answers 503 and the tools stay in prompt mode; nothing here
   ever pretends an answer came from a model when it did not. */
(function () {
  'use strict';

  var SM = window.SM = window.SM || {};

  var HEALTH_TIMEOUT = 5000;
  var AI_TIMEOUT = 60000;

  var state = {
    checked: false,
    mode: 'unknown', // unknown | live | prompt | offline
    configured: false,
    provider: null,
    model: null,
    verified: false, // true only after a real successful AI call
    checking: null
  };

  var listeners = [];
  var lastCheckAt = 0;

  function notify() {
    listeners.forEach(function (fn) {
      try { fn(state); } catch (err) { /* a listener must never break the app */ }
    });
  }

  function originIsHttp() {
    return /^https?:$/.test(window.location.protocol);
  }

  function fetchWithTimeout(url, options, ms) {
    var controller = new AbortController();
    var timer = window.setTimeout(function () { controller.abort(); }, ms);
    return fetch(url, Object.assign({}, options, { signal: controller.signal }))
      .then(function (response) {
        window.clearTimeout(timer);
        return response;
      })
      .catch(function (err) {
        window.clearTimeout(timer);
        throw err;
      });
  }

  /** Ask the server whether this deployment has AI configured. Cached. */
  function check() {
    if (state.checking) return state.checking;
    if (!originIsHttp()) {
      state.checked = true;
      state.mode = 'offline';
      state.configured = false;
      notify();
      return Promise.resolve(state);
    }
    lastCheckAt = Date.now();
    // A cache-buster as well as no-store: a proxy in front of the app may
    // otherwise replay an old "no key" answer and disable AI for the session.
    state.checking = fetchWithTimeout('api/health?ts=' + Date.now(), {
      headers: { accept: 'application/json' },
      cache: 'no-store'
    }, HEALTH_TIMEOUT)
      .then(function (response) {
        if (!response.ok) throw new Error('health ' + response.status);
        return response.json();
      })
      .then(function (json) {
        var ai = (json && json.ai) || {};
        state.configured = ai.configured === true;
        state.mode = state.configured ? 'live' : 'prompt';
        state.provider = ai.provider || null;
        state.model = ai.model || null;
      })
      .catch(function () {
        state.mode = 'offline';
        state.configured = false;
      })
      .then(function () {
        state.checked = true;
        state.checking = null;
        notify();
        return state;
      });
    return state.checking;
  }

  function messageFor(payload, status) {
    if (payload && typeof payload.message === 'string' && payload.message) return payload.message;
    if (status === 429) return 'Too many AI requests right now. Wait a minute and try again.';
    if (status === 503) return 'AI is not configured on this deployment, so prompt mode is being used.';
    return 'The AI request failed. Check your connection and try again.';
  }

  function request(body, options) {
    var retries = options && options.retries ? options.retries : 1;
    var attempt = 0;

    function run() {
      attempt += 1;
      return fetchWithTimeout('api/ai', {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify(body)
      }, AI_TIMEOUT)
        .then(function (response) {
          return response.json().catch(function () { return null; }).then(function (payload) {
            if (response.ok && payload && payload.ok) return payload;
            var err = new Error(messageFor(payload, response.status));
            err.status = response.status;
            err.code = (payload && payload.error) || 'http-' + response.status;
            err.retryable = response.status >= 500 || response.status === 429;
            throw err;
          });
        })
        .catch(function (err) {
          var timedOut = err && err.name === 'AbortError';
          if (timedOut) {
            err = new Error('The AI took too long to answer. Try again, or use a shorter request.');
            err.code = 'timeout';
            err.retryable = true;
          }
          if (!err.status && !err.code) {
            err = new Error('Could not reach the StudyMate server. Check your connection, then retry.');
            err.code = 'network';
            err.retryable = true;
          }
          if (err.retryable && attempt <= retries) {
            return new Promise(function (resolve) { window.setTimeout(resolve, 700 * attempt); }).then(run);
          }
          throw err;
        });
    }

    return run().then(function (payload) {
      // A real, validated model response: only now may the UI say "live".
      if (!state.verified) {
        state.verified = true;
        state.mode = 'live';
        notify();
      }
      return payload.data;
    });
  }

  SM.ai = {
    state: function () { return state; },
    subscribe: function (fn) { if (typeof fn === 'function') listeners.push(fn); },
    check: check,
    /** Re-ask the server, at most once per interval. */
    recheck: function (minInterval) {
      if (Date.now() - lastCheckAt < (minInterval || 20000)) return;
      check();
    },
    /** Explain an ICT topic. Resolves with the validated explanation object. */
    explain: function (input) {
      return request({
        op: 'explain',
        topic: input.topic,
        level: input.level,
        prior: input.prior,
        length: input.length
      });
    },
    /** Generate a quiz from notes. Resolves with { questions }. */
    quiz: function (input) {
      return request({
        op: 'quiz',
        notes: input.notes,
        count: input.count,
        difficulty: input.difficulty,
        type: input.type
      });
    },
    label: function () {
      if (state.mode === 'live') {
        return state.verified
          ? 'AI live · ' + (state.model || state.provider || 'model')
          : 'AI ready · ' + (state.model || state.provider || 'model');
      }
      if (state.mode === 'prompt') return 'Prompt mode · no API key';
      if (state.mode === 'offline') return 'Prompt mode · offline';
      return 'Checking AI…';
    }
  };

  // Start the health check immediately so the status chip is honest on load.
  check();
})();
