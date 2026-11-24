/* StudyMate ICT — hash router, navigation, theme, sidebar and global search. */
(function () {
  'use strict';

  var SM = window.SM;
  var ui = SM.ui;

  var ROUTES = {
    home: { title: 'Home', hint: 'Welcome to StudyMate ICT', group: 'Workspace' },
    dashboard: { title: 'Dashboard', hint: 'Your learning at a glance', group: 'Workspace' },
    explain: { title: 'ICT Concept Explainer', hint: 'Turn a topic into a structured lesson', group: 'Learning tools' },
    quiz: { title: 'Quiz Generator', hint: 'Practise from your own notes', group: 'Learning tools' },
    planner: { title: 'Study Planner', hint: 'Plan the time you actually have', group: 'Learning tools' },
    source: { title: 'Source-Grounded Learning', hint: 'Answers only from your notes', group: 'Learning tools' },
    glossary: { title: 'ICT Glossary', hint: 'Plain-language ICT definitions', group: 'Learning tools' },
    library: { title: 'Prompt Library', hint: 'Reusable study prompts', group: 'Learning tools' },
    saved: { title: 'Saved Learning', hint: 'Everything you have saved', group: 'Your learning' },
    settings: { title: 'Settings', hint: 'Appearance, access and your data', group: 'Your learning' },
    about: { title: 'About StudyMate', hint: 'Why this app exists', group: 'Your learning' }
  };

  var SHELL_KEY = 'studymate.ict.shell.v1';

  var views = ui.$all('.view');
  var navLinks = ui.$all('.nav-link');
  var crumb = ui.$('#page-crumb');
  var crumbParent = ui.$('#crumb-parent');
  var pageHint = ui.$('#page-hint');
  var sidebar = ui.$('#sidebar');
  var scrim = ui.$('#scrim');
  var menuBtn = ui.$('#menu-btn');
  var collapseBtn = ui.$('#sidebar-collapse');
  var themeBtn = ui.$('#theme-toggle');
  var main = ui.$('#main');
  var root = document.documentElement;

  /* ------------------------------------------------------------- routing */

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
    pageHint.textContent = meta.hint;
    if (crumbParent) {
      crumbParent.textContent = meta.group;
      crumbParent.href = '#/dashboard';
    }
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

  window.addEventListener('hashchange', function () {
    show(routeFromHash());
  });

  menuBtn.addEventListener('click', function () {
    if (sidebar.classList.contains('open')) closeMenu();
    else openMenu();
  });
  scrim.addEventListener('click', closeMenu);

  window.addEventListener('resize', function () {
    if (window.innerWidth > 900) closeMenu();
  });

  /* --------------------------------------------------- sidebar collapse */

  function setCollapsed(collapsed) {
    root.dataset.sidebar = collapsed ? 'collapsed' : 'expanded';
    collapseBtn.setAttribute('aria-pressed', collapsed ? 'true' : 'false');
    collapseBtn.setAttribute('aria-label', collapsed ? 'Expand sidebar' : 'Collapse sidebar');
    collapseBtn.title = collapsed ? 'Expand sidebar' : 'Collapse sidebar';
    try { window.localStorage.setItem(SHELL_KEY, collapsed ? 'collapsed' : 'expanded'); } catch (err) { /* ignore */ }
  }

  var savedShell = null;
  try { savedShell = window.localStorage.getItem(SHELL_KEY); } catch (err) { savedShell = null; }
  root.dataset.sidebar = savedShell === 'collapsed' ? 'collapsed' : 'expanded';
  collapseBtn.setAttribute('aria-pressed', root.dataset.sidebar === 'collapsed' ? 'true' : 'false');
  collapseBtn.setAttribute('aria-label', root.dataset.sidebar === 'collapsed' ? 'Expand sidebar' : 'Collapse sidebar');
  collapseBtn.title = collapseBtn.getAttribute('aria-label');

  collapseBtn.addEventListener('click', function () {
    setCollapsed(root.dataset.sidebar !== 'collapsed');
  });

  /* --------------------------------------------------------------- theme */

  function syncThemeButton() {
    var dark = root.dataset.theme === 'dark';
    themeBtn.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
    themeBtn.title = themeBtn.getAttribute('aria-label');
    themeBtn.setAttribute('aria-pressed', dark ? 'true' : 'false');
  }

  themeBtn.addEventListener('click', function () {
    var next = root.dataset.theme === 'dark' ? 'light' : 'dark';
    if (SM.settings) SM.settings.update({ theme: next });
    syncThemeButton();
  });

  /* The Settings page can change the theme too; keep the button honest. */
  if (window.MutationObserver) {
    new MutationObserver(syncThemeButton).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
  }
  syncThemeButton();

  /* -------------------------------------------------------------- search */

  var overlay = ui.$('#search-overlay');
  var searchInput = ui.$('#search-input');
  var resultsEl = ui.$('#search-results');
  var searchOpenBtn = ui.$('#search-open');
  var searchCloseBtn = ui.$('#search-close');
  var lastFocused = null;

  function normalise(value) {
    return String(value == null ? '' : value).toLowerCase();
  }

  function activePlanTitle() {
    var plan = SM.store.activePlan();
    return plan ? plan.title : '';
  }

  /** Build the searchable index from the pages, glossary and saved items. */
  function searchIndex() {
    var items = [];
    Object.keys(ROUTES).forEach(function (route) {
      if (route === 'home') return;
      items.push({
        group: 'Pages',
        title: ROUTES[route].title,
        sub: ROUTES[route].hint,
        icon: route === 'dashboard' ? 'i-grid' : route === 'saved' ? 'i-saved' : route === 'settings' ? 'i-gear' : route === 'about' ? 'i-info' : route === 'glossary' ? 'i-glossary' : route === 'quiz' ? 'i-quiz' : route === 'planner' ? 'i-calendar' : route === 'source' ? 'i-shield' : route === 'library' ? 'i-library' : 'i-book',
        href: '#/' + route
      });
    });

    SM.glossaryData.forEach(function (t) {
      items.push({
        group: 'Glossary',
        title: t.term + (t.full ? ' — ' + t.full : ''),
        sub: t.def,
        meta: t.cat,
        icon: 'i-glossary',
        action: function () { openGlossary(t.id); }
      });
    });

    var data = SM.store.get();
    data.topics.forEach(function (t) {
      items.push({
        group: 'Saved topics',
        title: t.title,
        sub: ui.toolMeta(t.tool).name + ' · ' + ui.formatDate(t.createdAt),
        icon: 'i-saved',
        action: function () { openSaved(t.title); }
      });
    });
    data.prompts.forEach(function (p) {
      items.push({
        group: 'Saved prompts',
        title: p.title,
        sub: ui.toolMeta(p.tool).name + ' · ' + ui.formatDate(p.createdAt),
        icon: 'i-library',
        action: function () { openSaved(p.title); }
      });
    });
    (data.personalTerms || []).forEach(function (p) {
      items.push({
        group: 'Glossary',
        title: p.term,
        sub: p.def,
        meta: 'Your term',
        icon: 'i-glossary',
        action: function () { openGlossary('p:' + p.id); }
      });
    });
    var plan = activePlanTitle();
    if (plan) {
      items.push({ group: 'Your learning', title: plan, sub: 'Active study plan', icon: 'i-calendar', href: '#/planner' });
    }
    return items;
  }

  function openGlossary(id) {
    window.location.hash = '#/glossary';
    window.setTimeout(function () {
      var card = document.querySelector('.gloss-card[data-id="' + String(id).replace(/"/g, '') + '"]');
      if (card) {
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        card.setAttribute('tabindex', '-1');
        card.focus({ preventScroll: true });
      }
    }, 90);
  }

  function openSaved(query) {
    window.location.hash = '#/saved';
    window.setTimeout(function () {
      var field = ui.$('#saved-search');
      if (!field) return;
      field.value = query;
      field.dispatchEvent(new Event('input', { bubbles: true }));
      field.focus();
    }, 90);
  }

  function openSearch() {
    lastFocused = document.activeElement;
    overlay.hidden = false;
    document.body.classList.add('search-open');
    searchInput.value = '';
    renderResults('');
    searchInput.focus();
  }

  function closeSearch() {
    if (overlay.hidden) return;
    overlay.hidden = true;
    document.body.classList.remove('search-open');
    if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
  }

  /** Whole-word prefix match, so "ram" does not match "program". */
  function containsTerm(text, q) {
    var escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp('(^|[^a-z0-9])' + escaped).test(normalise(text));
  }

  /** Title matches rank above category matches, which rank above body text. */
  function rank(item, q) {
    if (containsTerm(item.title, q)) return 0;
    if (containsTerm(item.meta || '', q) || containsTerm(item.group, q)) return 1;
    if (containsTerm(item.sub || '', q)) return 2;
    return -1;
  }

  function renderResults(query) {
    var q = normalise(query).trim();
    var matches;

    if (!q) {
      // Before typing, show a short useful starting set rather than everything.
      matches = searchIndex().filter(function (item) {
        return item.group === 'Pages' || item.group === 'Your learning';
      });
    } else {
      var GROUPS = ['Pages', 'Glossary', 'Saved topics', 'Saved prompts', 'Your learning'];
      matches = searchIndex()
        .map(function (item) { return { item: item, score: rank(item, q) }; })
        .filter(function (entry) { return entry.score !== -1; })
        .sort(function (a, b) {
          var ga = GROUPS.indexOf(a.item.group);
          var gb = GROUPS.indexOf(b.item.group);
          return ga === gb ? a.score - b.score : ga - gb;
        })
        .map(function (entry) { return entry.item; });
    }
    matches = matches.slice(0, 24);

    resultsEl.innerHTML = '';
    if (!matches.length) {
      var empty = document.createElement('li');
      empty.className = 'search-empty';
      empty.textContent = 'No matches for “' + String(query).trim() + '”. Try “RAM”, “quiz” or “plan”.';
      resultsEl.appendChild(empty);
      searchInput.setAttribute('aria-activedescendant', '');
      return;
    }

    var group = '';
    matches.forEach(function (item, index) {
      if (item.group !== group) {
        group = item.group;
        var label = document.createElement('li');
        label.className = 'search-group';
        label.setAttribute('role', 'presentation');
        label.textContent = group;
        resultsEl.appendChild(label);
      }
      var li = document.createElement('li');
      li.setAttribute('role', 'option');
      li.id = 'search-result-' + index;
      li.dataset.index = String(index);

      var link = document.createElement('a');
      link.className = 'search-result';
      link.href = item.href || '#/dashboard';
      link.innerHTML =
        '<span class="search-result-ico">' + ui.icon(item.icon || 'i-search') + '</span>' +
        '<span class="search-result-body"><span class="search-result-title"></span><span class="search-result-sub"></span></span>' +
        (item.meta ? '<span class="search-result-meta"></span>' : '');
      link.querySelector('.search-result-title').textContent = item.title;
      link.querySelector('.search-result-sub').textContent = item.sub || '';
      if (item.meta) link.querySelector('.search-result-meta').textContent = item.meta;

      link.addEventListener('click', function (event) {
        if (!item.action) {
          closeSearch();
          return;
        }
        event.preventDefault();
        closeSearch();
        item.action();
      });
      li.appendChild(link);
      resultsEl.appendChild(li);
    });

    searchInput.setAttribute('aria-activedescendant', 'search-result-0');
  }

  searchOpenBtn.addEventListener('click', openSearch);
  searchCloseBtn.addEventListener('click', closeSearch);
  searchInput.addEventListener('input', function () { renderResults(searchInput.value); });

  overlay.addEventListener('click', function (event) {
    if (event.target === overlay) closeSearch();
  });

  function resultLinks() {
    return ui.$all('.search-result', resultsEl);
  }

  overlay.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeSearch();
      return;
    }
    if (event.key === 'Enter' && document.activeElement === searchInput) {
      var first = resultLinks()[0];
      if (first) {
        event.preventDefault();
        first.click();
      }
      return;
    }
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    var links = resultLinks();
    if (!links.length) return;
    event.preventDefault();
    var current = links.indexOf(document.activeElement);
    var next = event.key === 'ArrowDown'
      ? (current + 1) % links.length
      : (current <= 0 ? links.length - 1 : current - 1);
    links[next].focus();
  });

  document.addEventListener('keydown', function (event) {
    var target = event.target;
    var typing = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable);

    if ((event.key === 'k' || event.key === 'K') && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      if (overlay.hidden) openSearch();
      else searchInput.focus();
      return;
    }
    if (event.key === '/' && !typing && overlay.hidden && !event.metaKey && !event.ctrlKey && !event.altKey) {
      event.preventDefault();
      openSearch();
      return;
    }
    if (event.key === 'Escape' && sidebar.classList.contains('open')) {
      closeMenu();
      menuBtn.focus();
    }
  });

  /* --------------------------------------------------------- saved badge */

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

  /* ------------------------------------------------------------ AI status */

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
      var own = state.provider === 'your own API key';
      chip.dataset.mode = state.mode;
      chip.title = state.mode === 'live'
        ? (own
          ? 'Requests use the key saved in this browser and go straight to your provider'
          : 'AI requests go to ' + (state.provider || 'the configured provider') + ' through this app’s server')
        : 'No model is contacted in this mode';
    }
    if (text) text.textContent = SM.ai.label();

    if (note) {
      note.textContent = state.mode === 'live'
        ? (state.provider === 'your own API key'
          ? 'AI is enabled with your own key, stored in this browser. Requests go straight from this page to your provider.'
          : 'AI is enabled: explanations and quizzes are generated on demand. Your notes are sent to the provider only when you press an AI button.')
        : 'Without an API key StudyMate ICT never contacts a model — it builds the prompt for you to copy. Add your own key in Settings to switch AI on.';
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

  /* ------------------------------------------------------------- startup */

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
