/* StudyMate ICT — "connect your own AI key" panel.
   Renders the same form wherever a [data-key-panel] mount exists (the landing
   page and Settings) and keeps both copies in sync. The key never leaves this
   device except as an Authorization header to the provider the learner chose. */
(function () {
  'use strict';

  var SM = window.SM;
  var ui = SM.ui;
  var local = SM.localAi;

  var mounts = ui.$all('[data-key-panel]');
  if (!mounts.length) return;

  function template(mount, index) {
    var id = function (name) { return 'key-' + index + '-' + name; };
    var presets = local.presets.map(function (p) {
      return '<option value="' + ui.esc(p.id) + '">' + ui.esc(p.name) + '</option>';
    }).join('');
    var compact = mount.dataset.keyPanel === 'compact';

    return [
      '<div class="key-head">',
      '  <h2 class="key-title">' + (compact ? 'Add your API key to unlock AI' : 'Your own AI key') + '</h2>',
      '  <p class="key-lede">StudyMate works offline in prompt mode with no key. To get real AI explanations, quizzes and study plans, add a key from any OpenAI-compatible provider — OpenAI, OpenRouter, Groq, Gemini, Mistral, DeepSeek, Together, Z.ai or any other. It is stored <strong>only in this browser on this computer</strong>.</p>',
      '</div>',
      '<div class="field-row">',
      '  <div class="field">',
      '    <label for="' + id('preset') + '">Provider</label>',
      '    <select id="' + id('preset') + '" data-key="preset">' + presets + '</select>',
      '  </div>',
      '  <div class="field">',
      '    <label for="' + id('model') + '">Model</label>',
      '    <input type="text" id="' + id('model') + '" data-key="model" autocomplete="off" spellcheck="false" placeholder="e.g. gpt-4o-mini" />',
      '  </div>',
      '</div>',
      '<div class="field">',
      '  <label for="' + id('base') + '">Base URL <span class="optional">(the provider’s OpenAI-compatible endpoint)</span></label>',
      '  <input type="url" id="' + id('base') + '" data-key="base" autocomplete="off" spellcheck="false" placeholder="https://api.openai.com/v1" />',
      '  <p class="hint">It must end at the API root, not at /chat/completions. StudyMate adds that part itself.</p>',
      '</div>',
      '<div class="field">',
      '  <label for="' + id('secret') + '">API key</label>',
      '  <div class="key-input">',
      '    <input type="password" id="' + id('secret') + '" data-key="secret" autocomplete="off" spellcheck="false" placeholder="sk-…" aria-describedby="' + id('privacy') + '" />',
      '    <button type="button" class="btn btn-ghost btn-sm" data-key="reveal" aria-pressed="false">Show</button>',
      '  </div>',
      '</div>',
      '<div class="key-actions">',
      '  <button type="button" class="btn btn-primary" data-key="save">Save &amp; test key</button>',
      '  <button type="button" class="btn btn-ghost" data-key="remove" hidden>Remove saved key</button>',
      '</div>',
      '<p class="key-status" data-key="status" role="status" aria-live="polite"></p>',
      '<p class="key-privacy tiny" id="' + id('privacy') + '">',
      '  The key is kept in this browser’s LocalStorage on this device and is sent only to the provider you choose. It is never sent to this site’s server and never bundled into the app.',
      '  Avoid saving a key on a shared or public computer, and revoke it at the provider if this device is lost.',
      '  Some providers block direct browser requests (CORS); if the test fails with a network error, that provider needs a server-side key instead.',
      '</p>'
    ].join('\n');
  }

  function sync(mount) {
    var config = local.get();
    var preset = mount.querySelector('[data-key="preset"]');
    var base = mount.querySelector('[data-key="base"]');
    var model = mount.querySelector('[data-key="model"]');
    var secret = mount.querySelector('[data-key="secret"]');
    var remove = mount.querySelector('[data-key="remove"]');
    var status = mount.querySelector('[data-key="status"]');

    var match = local.presets.filter(function (p) { return p.id === config.provider; })[0];
    preset.value = match ? match.id : (config.baseUrl ? 'custom' : 'openai');
    base.value = config.baseUrl || (match && match.baseUrl) || local.presets[0].baseUrl;
    model.value = config.model || (match && match.model) || local.presets[0].model;
    // Never render the stored secret into the DOM; show only that one exists.
    secret.value = '';
    secret.placeholder = local.hasKey() ? 'Saved key on this device — paste a new one to replace it' : 'sk-…';
    remove.hidden = !local.hasKey();

    if (status && !status.textContent) {
      status.textContent = local.isEnabled()
        ? 'AI is enabled in this browser with ' + local.label() + '.'
        : 'No key saved yet — prompt mode is active.';
      status.dataset.kind = local.isEnabled() ? 'ok' : 'muted';
    }
  }

  function setStatus(mount, message, kind) {
    var status = mount.querySelector('[data-key="status"]');
    if (!status) return;
    status.textContent = message;
    status.dataset.kind = kind || 'muted';
  }

  function bind(mount) {
    var preset = mount.querySelector('[data-key="preset"]');
    var base = mount.querySelector('[data-key="base"]');
    var model = mount.querySelector('[data-key="model"]');
    var secret = mount.querySelector('[data-key="secret"]');
    var reveal = mount.querySelector('[data-key="reveal"]');
    var save = mount.querySelector('[data-key="save"]');
    var remove = mount.querySelector('[data-key="remove"]');

    preset.addEventListener('change', function () {
      var chosen = local.presets.filter(function (p) { return p.id === preset.value; })[0];
      if (!chosen) return;
      if (chosen.baseUrl) base.value = chosen.baseUrl;
      if (chosen.model) model.value = chosen.model;
      base.focus();
    });

    reveal.addEventListener('click', function () {
      var showing = secret.getAttribute('type') === 'text';
      secret.setAttribute('type', showing ? 'password' : 'text');
      reveal.textContent = showing ? 'Show' : 'Hide';
      reveal.setAttribute('aria-pressed', showing ? 'false' : 'true');
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
        setStatus(mount, 'Connected. ' + (result.model || model.value) + ' answered successfully — AI is ready.', 'ok');
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
})();
