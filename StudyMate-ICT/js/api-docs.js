/* StudyMate ICT — live status for the API reference page.
   The documentation itself is static HTML; this file only replaces the
   "checking" placeholders with the deployment's real answers from
   GET /api/health. If the request fails the page says so instead of guessing. */
(function () {
  'use strict';

  function byId(id) {
    return document.getElementById(id);
  }

  function set(id, value) {
    var node = byId(id);
    if (!node) return;
    node.textContent = value === null || value === undefined || value === '' ? 'not set' : String(value);
  }

  /** 600000 → "10 min", 86400000 → "24 hours". */
  function windowLabel(ms) {
    var minutes = Math.round(Number(ms) / 60000);
    if (!minutes || minutes < 1) return 'under a minute';
    if (minutes < 60) return minutes + ' min';
    var hours = Math.round(minutes / 60);
    return hours + (hours === 1 ? ' hour' : ' hours');
  }

  function paint(health) {
    var ai = (health && health.ai) || {};
    var limits = (health && health.limits) || {};
    var live = ai.mode === 'live';
    var chip = byId('api-status-chip');
    if (chip) chip.dataset.mode = live ? 'live' : 'prompt';

    set('api-mode', live ? 'AI live' : 'Prompt mode');
    set('api-config', ai.configured ? 'Configured' : 'None — prompt only');
    set('api-provider', ai.provider || 'openai-compatible');
    set('api-model', ai.model || 'none');
    set('api-rate', limits.rateLimit
      ? limits.rateLimit + ' requests / ' + windowLabel(limits.rateWindowMs)
      : 'not reported');
    set('api-daily', limits.dailyCap ? limits.dailyCap + ' requests / day' : 'no daily cap');

    var note = byId('api-mode-note');
    if (note) {
      note.textContent = live
        ? 'This deployment holds its own provider key, so POST /api/ai can answer with live AI. The key stays in the server environment and never reaches the browser.'
        : 'This deployment has no server key, so POST /api/ai answers 503 ai-not-configured and every tool stays in prompt mode. Learner-supplied keys from Settings use the browser path documented under “Bring your own key”.';
    }
  }

  function unavailable() {
    var chip = byId('api-status-chip');
    if (chip) chip.dataset.mode = 'unknown';
    set('api-mode', 'Status unavailable');
    set('api-config', 'not checked');
    set('api-provider', 'not checked');
    set('api-model', 'not checked');
    set('api-rate', '20 requests / 10 min (default)');
    set('api-daily', '300 requests / day (default)');
    var note = byId('api-mode-note');
    if (note) {
      note.textContent = 'The live check could not run — this page may be open offline or served from a static file. The defaults shown are the settings the server uses when nothing is configured.';
    }
  }

  if (!document.getElementById('view-api')) return;

  fetch('/api/health', {
    cache: 'no-store',
    headers: { accept: 'application/json' }
  })
    .then(function (response) {
      if (!response.ok) throw new Error('health ' + response.status);
      return response.json();
    })
    .then(paint)
    .catch(unavailable);
})();
