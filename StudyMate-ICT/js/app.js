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
