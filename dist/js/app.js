/* StudyMate ICT — hash router, navigation and global wiring. */
(function () {
  'use strict';

  var SM = window.SM;
  var ui = SM.ui;

  var ROUTES = {
    dashboard: { title: 'Dashboard', heading: 'StudyMate ICT' },
    explain: { title: 'Explain ICT', heading: 'ICT concept explainer' },
    quiz: { title: 'Quiz Generator', heading: 'Quiz generator' },
    planner: { title: 'Study Planner', heading: 'Smart study planner' },
    glossary: { title: 'ICT Glossary', heading: 'ICT glossary' },
    source: { title: 'Source-Grounded Learning', heading: 'Source-grounded learning' },
    library: { title: 'Prompt Library', heading: 'Prompt library' },
    saved: { title: 'Saved Learning', heading: 'Saved learning' },
    settings: { title: 'Settings', heading: 'Settings' },
    about: { title: 'About the Project', heading: 'About StudyMate ICT' }
  };

  var views = ui.$all('.view');
  var navLinks = ui.$all('.nav-link');
  var crumb = ui.$('#page-crumb');
  var sidebar = ui.$('#sidebar');
  var scrim = ui.$('#scrim');
  var menuBtn = ui.$('#menu-btn');
  var main = ui.$('#main');

  function routeFromHash() {
    var raw = window.location.hash.replace(/^#\/?/, '').split(/[?&]/)[0].trim();
    return Object.prototype.hasOwnProperty.call(ROUTES, raw) ? raw : 'dashboard';
  }

  function closeMenu() {
    sidebar.classList.remove('open');
    scrim.hidden = true;
    menuBtn.setAttribute('aria-expanded', 'false');
    menuBtn.setAttribute('aria-label', 'Open navigation menu');
  }

  function openMenu() {
    sidebar.classList.add('open');
    scrim.hidden = false;
    menuBtn.setAttribute('aria-expanded', 'true');
    menuBtn.setAttribute('aria-label', 'Close navigation menu');
    var first = sidebar.querySelector('.nav-link');
    if (first) first.focus();
  }

  var initialised = false;

  function show(route) {
    views.forEach(function (view) {
      view.hidden = view.dataset.view !== route;
    });
    navLinks.forEach(function (link) {
      if (link.dataset.route === route) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });

    var meta = ROUTES[route];
    crumb.textContent = meta.title;
    document.title = meta.title + ' · StudyMate ICT';

    closeMenu();

    /* A deployment can gain or lose its AI key while a tab stays open, so
       re-check when the user opens a tool that depends on it. */
    if ((route === 'explain' || route === 'quiz') && SM.ai.state().mode !== 'live') {
      SM.ai.recheck(20000);
    }

    if (initialised) {
      main.focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
    initialised = true;
  }

  function onHashChange() {
    show(routeFromHash());
  }

  menuBtn.addEventListener('click', function () {
    if (sidebar.classList.contains('open')) closeMenu();
    else openMenu();
  });
  scrim.addEventListener('click', closeMenu);

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && sidebar.classList.contains('open')) {
      closeMenu();
      menuBtn.focus();
    }
  });

  window.addEventListener('resize', function () {
    if (window.innerWidth > 900) closeMenu();
  });

  window.addEventListener('hashchange', onHashChange);

  /* Saved-count badge in the sidebar. */
  function updateBadge() {
    var data = SM.store.get();
    var total = data.topics.length + data.prompts.length + data.glossSaved.length + data.personalTerms.length;
    var badge = ui.$('#nav-saved-count');
    if (!badge) return;
    badge.textContent = total;
    badge.hidden = total === 0;
  }
  updateBadge();
  SM.store.subscribe(updateBadge);

  /* The AI status chip is driven by the real endpoint state, never by hope:
     "AI live" only appears after a successful request. */
  function renderAiStatus() {
    var state = SM.ai.state();
    var chip = ui.$('#ai-status');
    var text = ui.$('#ai-status-text');
    var note = ui.$('#hero-ai-note');
    var pill = ui.$('#about-ai-pill');
    var aboutText = ui.$('#about-ai-text');

    if (chip) {
      chip.dataset.mode = state.mode;
      chip.title = state.mode === 'live'
        ? 'AI requests go to ' + (state.provider || 'the configured provider') + ' through this app’s server'
        : 'No model is contacted in this mode';
    }
    if (text) text.textContent = SM.ai.label();

    if (note) {
      note.textContent = state.mode === 'live'
        ? 'AI is enabled: explanations and quizzes are generated on demand. Your notes are sent to the provider only when you press an AI button.'
        : 'Without an API key StudyMate ICT never contacts a model — it builds the prompt for you to copy.';
    }
    if (pill) {
      pill.textContent = state.mode === 'live'
        ? (state.verified ? 'AI live · verified request' : 'AI configured · ' + (state.model || 'model'))
        : state.mode === 'prompt' ? 'Prompt mode · no API key' : state.mode === 'offline' ? 'Prompt mode · offline' : 'Checking AI…';
    }
    if (aboutText && state.mode === 'live') {
      aboutText.textContent = 'This deployment has an AI key, so the AI buttons call a server-side endpoint that proxies ' +
        (state.provider || 'an OpenAI-compatible provider') + ' (' + (state.model || 'model') + '). The key never reaches the browser, and requests are validated and rate limited on the server.';
    }
  }
  renderAiStatus();
  SM.ai.subscribe(renderAiStatus);

  if (!window.location.hash) {
    try {
      window.history.replaceState(null, '', '#/dashboard');
    } catch (err) {
      window.location.hash = '#/dashboard';
    }
  }
  show(routeFromHash());

  if (!SM.store.isAvailable()) {
    ui.toast('LocalStorage is blocked — saved items will last only for this session', 'error');
  }

  ui.bindCopyButtons(document);
})();
