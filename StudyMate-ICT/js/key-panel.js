/* StudyMate ICT — the "add an AI provider" panel.
   ------------------------------------------------
   Renders wherever a [data-key-panel] mount exists (the landing page and
   Settings) and keeps every copy in sync. It is the only place a learner enters
   a provider, base URL, model and key.

   What it does on its own, without the learner pressing anything:
     • filters the provider catalogue as they search,
     • fills the correct base URL and model when a provider is chosen,
     • automatically tests the base URL (debounced) and reports reachability,
       latency and how many models the key can use,
     • warns when the chosen provider blocks browser (CORS) requests.

   The key never leaves this device except as an Authorization / x-api-key
   header to the provider the learner chose.
*/
(function () {
  'use strict';

  var SM = window.SM;
  var ui = SM.ui;
  var local = SM.localAi;
  var providers = SM.providers;

  var mounts = ui.$all('[data-key-panel]');
  if (!mounts.length) return;

  var PROTOCOL_LABEL = {
    openai: 'OpenAI-compatible protocol',
    anthropic: 'Anthropic Messages API',
    gemini: 'Google Gemini API'
  };

  function template(mount, index) {
    var id = function (name) { return 'key-' + index + '-' + name; };
    var compact = mount.dataset.keyPanel === 'compact';

    return [
      '<div class="key-head">',
      '  <h2 class="key-title">' + (compact ? 'Add an AI provider to unlock AI' : 'Add an AI provider') + '</h2>',
      '  <p class="key-lede">StudyMate works offline in prompt mode with no key. Connect any provider below — ' + providers.count() + ' presets covering OpenAI, Claude, Gemini, Groq, OpenRouter, Mistral, DeepSeek, Qwen, Z.ai, Ollama and the rest — or paste any other OpenAI-compatible base URL. The key is stored <strong>only in this browser on this computer</strong>.</p>',
      '  <div class="key-badges">',
      '    <span class="key-badge" data-key="badge-state">Prompt mode</span>',
      '    <span class="key-badge" data-key="badge-protocol">OpenAI-compatible protocol</span>',
      '  </div>',
      '</div>',
      '<div class="field">',
      '  <label for="' + id('search') + '">Find a provider <span class="optional">(' + providers.count() + ' available)</span></label>',
      '  <input type="search" id="' + id('search') + '" data-key="search" autocomplete="off" spellcheck="false" placeholder="Search: OpenAI, Claude, Gemini, Qwen, Groq, Ollama…" />',
      '</div>',
      '<div class="field-row">',
      '  <div class="field">',
      '    <label for="' + id('preset') + '">Provider</label>',
      '    <select id="' + id('preset') + '" data-key="preset"></select>',
      '  </div>',
      '  <div class="field">',
      '    <label for="' + id('model') + '">Model</label>',
      '    <input type="text" id="' + id('model') + '" data-key="model" list="' + id('models') + '" autocomplete="off" spellcheck="false" placeholder="e.g. gpt-4o-mini" />',
      '    <datalist id="' + id('models') + '" data-key="models"></datalist>',
      '  </div>',
      '</div>',
      '<div class="field">',
      '  <label for="' + id('base') + '">Base URL <span class="optional">(the provider’s API root — StudyMate adds /chat/completions itself)</span></label>',
      '  <div class="key-input">',
      '    <input type="url" id="' + id('base') + '" data-key="base" autocomplete="off" spellcheck="false" inputmode="url" placeholder="https://api.openai.com/v1" />',
      '    <button type="button" class="btn btn-ghost btn-sm" data-key="urltest">Test URL</button>',
      '  </div>',
      '  <p class="key-urltest" data-key="urlstatus" role="status" aria-live="polite">Paste a base URL and StudyMate tests it automatically.</p>',
      '</div>',
      '<div class="field">',
      '  <label for="' + id('secret') + '">API key</label>',
      '  <div class="key-input">',
      '    <input type="password" id="' + id('secret') + '" data-key="secret" autocomplete="off" spellcheck="false" placeholder="sk-…" aria-describedby="' + id('privacy') + '" />',
      '    <button type="button" class="btn btn-ghost btn-sm" data-key="reveal" aria-pressed="false">Show</button>',
      '  </div>',
      '</div>',
      '<div class="key-actions">',
      '  <button type="button" class="btn btn-primary" data-key="save">Save &amp; test connection</button>',
      '  <button type="button" class="btn btn-outline" data-key="test">Test connection</button>',
      '  <button type="button" class="btn btn-ghost" data-key="models">Fetch models</button>',
      '  <button type="button" class="btn btn-ghost" data-key="remove" hidden>Remove saved key</button>',
      '</div>',
      '<p class="key-status" data-key="status" role="status" aria-live="polite"></p>',
      '<details class="hint-box key-docs" data-key="docsbox">',
      '  <summary>About this provider &amp; its API docs</summary>',
      '  <p data-key="provider-note"></p>',
      '  <p><a data-key="docs" href="https://platform.openai.com/docs/api-reference/chat" target="_blank" rel="noopener noreferrer">Open the provider documentation</a></p>',
      '</details>',
      '<p class="key-privacy tiny" id="' + id('privacy') + '">',
      '  The key is kept in this browser’s LocalStorage on this device and is sent only to the provider you choose. It is never sent to this site’s server and never bundled into the app.',
      '  Avoid saving a key on a shared or public computer, and revoke it at the provider if this device is lost.',
      '  Some providers block direct browser requests (CORS); StudyMate reports that when it tests the URL, and you can still use such a provider with a server-side key.',
      '</p>'
    ].join('\n');
  }

  /* ------------------------------------------------------------- rendering */

  function optionMarkup(query) {
    var matches = providers.search(query);
    var ids = matches.map(function (provider) { return provider.id; });
    return providers.grouped().map(function (group) {
      var inGroup = group.providers.filter(function (provider) { return ids.indexOf(provider.id) !== -1; });
      if (!inGroup.length) return '';
      return '<optgroup label="' + ui.esc(group.name) + '">' + inGroup.map(function (provider) {
        return '<option value="' + ui.esc(provider.id) + '">' + ui.esc(provider.name) + '</option>';
      }).join('') + '</optgroup>';
    }).join('');
  }

  function fillPresets(mount, query) {
    var select = mount.querySelector('[data-key="preset"]');
    var current = select.value;
    var markup = optionMarkup(query);
    if (!markup) return false;
    select.innerHTML = markup;
    if (query && select.options.length === 1) select.selectedIndex = 0;
    if (current && select.querySelector('option[value="' + current + '"]')) select.value = current;
    return true;
  }

  function setUrlStatus(mount, message, kind) {
    var el = mount.querySelector('[data-key="urlstatus"]');
    if (!el) return;
    el.textContent = message;
    el.dataset.kind = kind || 'muted';
  }

  function setStatus(mount, message, kind) {
    var status = mount.querySelector('[data-key="status"]');
    if (!status) return;
    status.textContent = message;
    status.dataset.kind = kind || 'muted';
  }

  function describeProvider(mount, providerId) {
    var provider = providers.get(providerId);
    var badge = mount.querySelector('[data-key="badge-protocol"]');
    var note = mount.querySelector('[data-key="provider-note"]');
    var docs = mount.querySelector('[data-key="docs"]');
    var protocol = (provider && provider.protocol) || 'openai';

    if (badge) badge.textContent = PROTOCOL_LABEL[protocol] || PROTOCOL_LABEL.openai;
    if (note) {
      var parts = [];
      if (provider && provider.note) parts.push(provider.note);
      if (provider && provider.cors === 'blocked') parts.push('This provider is known to block browser (CORS) requests, so the in-browser test may fail even with a valid key.');
      if (provider && provider.cors === 'allowed') parts.push('This provider allows direct browser calls.');
      if (provider && provider.cors === 'local') parts.push('This provider runs on your own computer, so nothing leaves this device.');
      note.textContent = parts.join(' ') || 'Enter the base URL, model and key this provider gave you.';
    }
    if (docs && provider && provider.docs) docs.href = provider.docs;
  }

  function sync(mount) {
    var config = local.get();
    var preset = mount.querySelector('[data-key="preset"]');
    var base = mount.querySelector('[data-key="base"]');
    var model = mount.querySelector('[data-key="model"]');
    var secret = mount.querySelector('[data-key="secret"]');
    var remove = mount.querySelector('[data-key="remove"]');
    var status = mount.querySelector('[data-key="status"]');
    var badge = mount.querySelector('[data-key="badge-state"]');

    var match = providers.get(config.provider);
    if (match && preset.querySelector('option[value="' + match.id + '"]')) preset.value = match.id;
    base.value = config.baseUrl || (match && match.baseUrl) || '';
    model.value = config.model || (match && match.model) || '';
    // Never render the stored secret into the DOM; show only that one exists.
    secret.value = '';
    secret.placeholder = local.hasKey() ? 'Saved key on this device — paste a new one to replace it' : 'sk-…';
    remove.hidden = !local.hasKey();

    if (badge) {
      badge.textContent = local.isEnabled() ? 'Key saved on this device' : 'Prompt mode — no key saved';
      badge.dataset.kind = local.isEnabled() ? 'ok' : 'muted';
    }
    describeProvider(mount, preset.value);

    if (status && !status.textContent) {
      status.textContent = local.isEnabled()
        ? 'AI is enabled in this browser with ' + local.label() + '.'
        : 'No key saved yet — prompt mode is active.';
      status.dataset.kind = local.isEnabled() ? 'ok' : 'muted';
    }
  }

  /* ------------------------------------------------- automatic URL testing */

  function typedBase(mount) {
    return providers.normalizeBase(mount.querySelector('[data-key="base"]').value);
  }

  function currentKey(mount) {
    var typed = mount.querySelector('[data-key="secret"]').value.trim();
    return typed || local.get().apiKey;
  }

  function currentProvider(mount) {
    return mount.querySelector('[data-key="preset"]').value;
  }

  function runUrlTest(mount, options) {
    var options2 = options || {};
    var base = typedBase(mount);
    var button = mount.querySelector('[data-key="urltest"]');
    var token = (mount.dataset.probeToken = String(Number(mount.dataset.probeToken || 0) + 1));

    if (!base) {
      setUrlStatus(mount, 'Add a base URL and StudyMate tests it automatically.', 'muted');
      return Promise.resolve(null);
    }
    if (!providers.isHttpUrl(base)) {
      setUrlStatus(mount, 'That is not a usable URL — use https://… (http://localhost is allowed for local servers).', 'error');
      return Promise.resolve(null);
    }

    setUrlStatus(mount, 'Testing ' + base + ' …', 'muted');
    if (button) button.disabled = true;

    return local.probe({
      provider: currentProvider(mount),
      baseUrl: base,
      model: mount.querySelector('[data-key="model"]').value,
      apiKey: currentKey(mount)
    }).then(function (result) {
      // A newer test started while this one was in flight: ignore the answer.
      if (mount.dataset.probeToken !== token) return result;
      if (!result) return result;

      if (result.ok) {
        setUrlStatus(mount, '✓ ' + result.message + ' · ' + result.latencyMs + ' ms', 'ok');
        if (result.models && result.models.length) fillModels(mount, result.models);
      } else {
        setUrlStatus(mount, '⚠ ' + result.message, result.kind === 'unauthorized' ? 'warn' : 'error');
      }
      if (options2.announce && result.ok) ui.toast('Provider URL is reachable');
      return result;
    }).then(function (result) {
      if (button) button.disabled = false;
      return result;
    });
  }

  var timers = new WeakMap();

  function scheduleUrlTest(mount) {
    var previous = timers.get(mount);
    if (previous) window.clearTimeout(previous);
    var base = typedBase(mount);
    if (!base || !providers.isHttpUrl(base)) {
      setUrlStatus(mount, base
        ? 'That is not a usable URL — use https://… (http://localhost is allowed for local servers).'
        : 'Add a base URL and StudyMate tests it automatically.', base ? 'error' : 'muted');
      return;
    }
    setUrlStatus(mount, 'Testing ' + base + ' …', 'muted');
    timers.set(mount, window.setTimeout(function () { runUrlTest(mount); }, 700));
  }

  function fillModels(mount, models) {
    var list = mount.querySelector('[data-key="models"]');
    if (!list) return;
    list.innerHTML = models.slice(0, 200).map(function (name) {
      return '<option value="' + ui.esc(name) + '"></option>';
    }).join('');
  }

  /* ---------------------------------------------------------------- events */

  function bind(mount) {
    var search = mount.querySelector('[data-key="search"]');
    var preset = mount.querySelector('[data-key="preset"]');
    var base = mount.querySelector('[data-key="base"]');
    var model = mount.querySelector('[data-key="model"]');
    var secret = mount.querySelector('[data-key="secret"]');
    var reveal = mount.querySelector('[data-key="reveal"]');
    var save = mount.querySelector('[data-key="save"]');
    var testBtn = mount.querySelector('[data-key="test"]');
    var modelsBtn = mount.querySelector('[data-key="models"]');
    var urlTestBtn = mount.querySelector('[data-key="urltest"]');
    var remove = mount.querySelector('[data-key="remove"]');

    fillPresets(mount, '');

    search.addEventListener('input', function () {
      if (!fillPresets(mount, search.value)) {
        // Nothing matched: keep the current list so the select never empties.
        fillPresets(mount, '');
        setStatus(mount, 'No provider matches “' + search.value + '”. Pick “Other provider” and paste its base URL.', 'muted');
      }
    });

    preset.addEventListener('change', function () {
      var chosen = providers.get(preset.value);
      if (!chosen) return;
      if (chosen.baseUrl) base.value = chosen.baseUrl;
      if (chosen.model) model.value = chosen.model;
      describeProvider(mount, chosen.id);
      setStatus(mount, chosen.note || '', 'muted');
      scheduleUrlTest(mount);
    });

    base.addEventListener('input', function () { scheduleUrlTest(mount); });
    base.addEventListener('change', function () {
      var detected = providers.detect(base.value);
      if (detected && detected.id !== preset.value && preset.querySelector('option[value="' + detected.id + '"]')) {
        preset.value = detected.id;
        if (!model.value.trim() && detected.model) model.value = detected.model;
        describeProvider(mount, detected.id);
        setStatus(mount, 'Recognised ' + detected.name + ' from the URL.', 'ok');
      }
      scheduleUrlTest(mount);
    });

    urlTestBtn.addEventListener('click', function () {
      runUrlTest(mount, { announce: true }).then(function (result) {
        if (result && !result.ok) setStatus(mount, result.message, 'error');
      });
    });

    reveal.addEventListener('click', function () {
      var showing = secret.getAttribute('type') === 'text';
      secret.setAttribute('type', showing ? 'password' : 'text');
      reveal.textContent = showing ? 'Show' : 'Hide';
      reveal.setAttribute('aria-pressed', showing ? 'false' : 'true');
    });

    modelsBtn.addEventListener('click', function () {
      if (!typedBase(mount)) {
        setStatus(mount, 'Enter a base URL first.', 'error');
        base.focus();
        return;
      }
      modelsBtn.disabled = true;
      setUrlStatus(mount, 'Asking ' + typedBase(mount) + ' for its model list…', 'muted');
      runUrlTest(mount).then(function (result) {
        modelsBtn.disabled = false;
        if (!result) return;
        if (result.ok && result.models && result.models.length) {
          setStatus(mount, result.models.length + ' models found — choose one from the Model field.', 'ok');
          model.focus();
        } else if (result.ok) {
          setStatus(mount, 'The provider answered but listed no models. Type the model name from its docs.', 'muted');
        } else {
          setStatus(mount, result.message, 'error');
        }
      });
    });

    testBtn.addEventListener('click', function () {
      var key = currentKey(mount);
      if (!key) {
        setStatus(mount, 'Paste your API key first, then test.', 'error');
        secret.focus();
        return;
      }
      testBtn.disabled = true;
      setStatus(mount, 'Testing ' + (model.value || 'the model') + ' …', 'muted');
      local.testConnection({
        provider: preset.value,
        baseUrl: base.value,
        model: model.value,
        apiKey: key
      }).then(function (result) {
        testBtn.disabled = false;
        if (result.ok) {
          setStatus(mount, '✓ ' + result.message + ' in ' + result.latencyMs + ' ms. ' + (local.hasKey() ? 'Saved key is in use.' : 'Press Save to use this key in the app.'), 'ok');
        } else {
          setStatus(mount, '✕ ' + result.message, 'error');
        }
      });
    });

    save.addEventListener('click', function () {
      // A blank field means "keep the key already saved on this device".
      var key = secret.value.trim();
      var existing = local.get().apiKey;
      if (!key && !existing) {
        setStatus(mount, 'Paste your API key first.', 'error');
        secret.focus();
        return;
      }
      try {
        local.set({
          provider: preset.value,
          protocol: (providers.get(preset.value) || {}).protocol,
          baseUrl: base.value,
          model: model.value,
          apiKey: key || existing
        });
      } catch (err) {
        setStatus(mount, err.message, 'error');
        return;
      }

      secret.value = '';
      remove.hidden = false;
      save.disabled = true;
      setStatus(mount, 'Saved on this device. Testing the connection…', 'muted');

      local.test().then(function (result) {
        setStatus(mount, '✓ Connected. ' + (result.model || model.value) + ' answered successfully in ' + result.latencyMs + ' ms — AI is ready.', 'ok');
        ui.toast('AI key saved and verified');
        sync(mount);
      }).catch(function (err) {
        setStatus(mount, 'Key saved, but the test failed: ' + (err.message || 'unknown error'), 'error');
        sync(mount);
      }).then(function () {
        save.disabled = false;
      });
    });

    remove.addEventListener('click', function () {
      if (!window.confirm('Remove the saved AI key from this browser?')) return;
      local.clear();
      secret.value = '';
      reveal.textContent = 'Show';
      secret.setAttribute('type', 'password');
      setStatus(mount, 'Key removed. StudyMate is back in prompt mode.', 'ok');
      ui.toast('AI key removed from this device');
      sync(mount);
    });

    mount.addEventListener('keydown', function (event) {
      if (event.key === 'Enter' && event.target && event.target.dataset && event.target.dataset.key === 'secret') {
        event.preventDefault();
        save.click();
      }
    });

    sync(mount);
  }

  mounts.forEach(function (mount, index) {
    mount.innerHTML = template(mount, index);
    bind(mount);
  });

  // Keep every mounted copy consistent when the key changes anywhere. A form
  // the learner is typing in is left alone apart from its Remove button.
  local.subscribe(function () {
    mounts.forEach(function (mount) {
      if (mount.contains(document.activeElement)) {
        mount.querySelector('[data-key="remove"]').hidden = !local.hasKey();
        return;
      }
      sync(mount);
    });
  });

  // CTA buttons that send the learner to the first key panel.
  ui.$all('[data-focus-key]').forEach(function (btn) {
    btn.addEventListener('click', function (event) {
      var target = mounts[0];
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: document.documentElement.dataset.reduceMotion === 'true' ? 'auto' : 'smooth', block: 'center' });
      var field = target.querySelector('[data-key="secret"]');
      if (field) window.setTimeout(function () { field.focus({ preventScroll: true }); }, 280);
    });
  });

  /* One automatic URL test on load, so a returning learner sees whether their
     saved endpoint still answers. Skipped for empty or local-only setups. */
  var first = mounts[0];
  if (first && typedBase(first)) runUrlTest(first);
})();
