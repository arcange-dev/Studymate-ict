/* StudyMate ICT — Feature 4: searchable ICT glossary with personal terms. */
(function () {
  'use strict';

  var SM = window.SM;
  var ui = SM.ui;

  var grid = ui.$('#gloss-grid');
  if (!grid) return;

  var searchEl = ui.$('#gloss-search');
  var catEl = ui.$('#gloss-cat');
  var countEl = ui.$('#gloss-count');
  var emptyEl = ui.$('#gloss-empty');
  var emptyMsg = ui.$('#gloss-empty-msg');
  var clearBtn = ui.$('#gloss-clear');
  var personalCard = ui.$('#personal-terms-card');
  var personalList = ui.$('#personal-terms');
  var personalCount = ui.$('#personal-count');
  var termForm = ui.$('#term-form');
  var termError = ui.$('#term-error');

  var builtins = SM.glossaryData.slice();

  function allTerms() {
    var personal = SM.store.get().personalTerms.map(function (p) {
      return {
        id: 'p:' + p.id,
        personal: true,
        term: p.term,
        full: '',
        cat: p.cat || 'Personal',
        def: p.def,
        eg: p.example
      };
    });
    return personal.concat(builtins);
  }

  function populateCategories() {
    var cats = [];
    allTerms().forEach(function (t) {
      if (t.cat && cats.indexOf(t.cat) === -1) cats.push(t.cat);
    });
    var current = catEl.value;
    catEl.innerHTML = '<option value="all">All categories</option>';
    cats.sort().forEach(function (c) {
      var opt = document.createElement('option');
      opt.value = c;
      opt.textContent = c;
      catEl.appendChild(opt);
    });
    catEl.value = cats.indexOf(current) !== -1 || current === 'all' ? current : 'all';
  }

  function matches(term, q) {
    if (!q) return true;
    var hay = [term.term, term.full, term.def, term.eg, term.cat].join(' ').toLowerCase();
    return hay.indexOf(q) !== -1;
  }

  function render() {
    var q = searchEl.value.trim().toLowerCase();
    var cat = catEl.value;
    var terms = allTerms();
    var filtered = terms.filter(function (t) {
      return (cat === 'all' || t.cat === cat) && matches(t, q);
    });

    grid.innerHTML = '';
    filtered.forEach(function (t) {
      grid.appendChild(termCard(t));
    });

    countEl.textContent = q || cat !== 'all'
      ? filtered.length + ' of ' + terms.length + ' terms'
      : terms.length + ' terms';

    emptyEl.hidden = filtered.length !== 0;
    if (!filtered.length) {
      emptyMsg.textContent = q
        ? 'No term matches “' + searchEl.value.trim() + '”. Try a shorter word, or add it as your own term below.'
        : 'There are no terms in this category yet.';
    }

    renderPersonal();
  }

  function termCard(t) {
    var article = document.createElement('article');
    article.className = 'gloss-card';
    article.dataset.id = t.id;

    var top = document.createElement('div');
    top.className = 'gloss-card-top';
    var h = document.createElement('h3');
    h.textContent = t.term;
    if (t.full && t.full !== t.term) {
      var small = document.createElement('small');
      small.textContent = t.full;
      h.appendChild(small);
    }
    var cat = document.createElement('span');
    cat.className = 'gloss-cat';
    cat.textContent = t.cat || 'General';
    top.appendChild(h);
    top.appendChild(cat);

    var def = document.createElement('p');
    def.className = 'gloss-def';
    def.textContent = t.def;

    article.appendChild(top);
    article.appendChild(def);

    if (t.eg) {
      var eg = document.createElement('p');
      eg.className = 'gloss-eg';
      var b = document.createElement('b');
      b.textContent = 'Example: ';
      eg.appendChild(b);
      eg.appendChild(document.createTextNode(t.eg));
      article.appendChild(eg);
    }

    var acts = document.createElement('div');
    acts.className = 'gloss-acts';

    var copyBtn = document.createElement('button');
    copyBtn.type = 'button';
    copyBtn.className = 'chip-btn';
    copyBtn.dataset.act = 'copy';
    copyBtn.innerHTML = ui.icon('i-copy') + 'Copy';
    copyBtn.setAttribute('aria-label', 'Copy the definition of ' + t.term);
    acts.appendChild(copyBtn);

    if (t.personal) {
      var del = document.createElement('button');
      del.type = 'button';
      del.className = 'chip-btn';
      del.dataset.act = 'delete';
      del.innerHTML = ui.icon('i-trash') + 'Remove';
      acts.appendChild(del);
    } else {
      var saved = SM.store.isTermSaved(t.id);
      var saveBtn = document.createElement('button');
      saveBtn.type = 'button';
      saveBtn.className = 'chip-btn';
      saveBtn.dataset.act = 'save';
      saveBtn.setAttribute('aria-pressed', saved ? 'true' : 'false');
      saveBtn.innerHTML = ui.icon(saved ? 'i-check' : 'i-saved') + (saved ? 'Saved' : 'Save');
      acts.appendChild(saveBtn);
    }

    article.appendChild(acts);
    return article;
  }

  function definitionText(t) {
    var text = t.term + (t.full && t.full !== t.term ? ' (' + t.full + ')' : '') + ' — ' + t.def;
    if (t.eg) text += '\nExample: ' + t.eg;
    return text;
  }

  grid.addEventListener('click', function (event) {
    var btn = event.target.closest('[data-act]');
    if (!btn) return;
    var card = btn.closest('.gloss-card');
    if (!card) return;
    var t = allTerms().filter(function (x) { return x.id === card.dataset.id; })[0];
    if (!t) return;

    if (btn.dataset.act === 'copy') {
      ui.copy(definitionText(t)).then(function (ok) {
        if (ok) {
          ui.toast('Definition copied');
          SM.store.log('glossary', 'Copied definition: ' + t.term);
        } else {
          ui.toast('Copy failed — select the text manually', 'error');
        }
      });
    }

    if (btn.dataset.act === 'save') {
      var nowSaved = SM.store.toggleTerm(t.id);
      btn.setAttribute('aria-pressed', nowSaved ? 'true' : 'false');
      btn.innerHTML = ui.icon(nowSaved ? 'i-check' : 'i-saved') + (nowSaved ? 'Saved' : 'Save');
      ui.toast(nowSaved ? t.term + ' saved to your list' : t.term + ' removed from saved terms');
    }

    if (btn.dataset.act === 'delete') {
      var raw = t.id.replace(/^p:/, '');
      if (window.confirm('Delete your personal term “' + t.term + '”?')) {
        SM.store.removePersonalTerm(raw);
        ui.toast('Personal term deleted');
      }
    }
  });

  function renderPersonal() {
    var personal = SM.store.get().personalTerms;
    personalCard.hidden = personal.length === 0;
    personalCount.textContent = personal.length + (personal.length === 1 ? ' term' : ' terms');
    personalList.innerHTML = '';
    personal.forEach(function (p) {
      var li = document.createElement('li');
      li.className = 'saved-item';
      var main = document.createElement('div');
      main.className = 'saved-main';
      var title = document.createElement('p');
      title.className = 'saved-title';
      title.textContent = p.term;
      var meta = document.createElement('p');
      meta.className = 'saved-meta';
      meta.textContent = (p.cat || 'Personal') + ' · ' + p.def;
      main.appendChild(title);
      main.appendChild(meta);

      var acts = document.createElement('div');
      acts.className = 'saved-acts';
      var del = document.createElement('button');
      del.className = 'mini-btn danger';
      del.type = 'button';
      del.setAttribute('aria-label', 'Delete personal term ' + p.term);
      del.innerHTML = ui.icon('i-trash');
      del.addEventListener('click', function () {
        if (window.confirm('Delete your personal term “' + p.term + '”?')) {
          SM.store.removePersonalTerm(p.id);
          ui.toast('Personal term deleted');
        }
      });
      acts.appendChild(del);

      li.appendChild(main);
      li.appendChild(acts);
      personalList.appendChild(li);
    });
  }

  searchEl.addEventListener('input', render);
  catEl.addEventListener('change', render);
  clearBtn.addEventListener('click', function () {
    searchEl.value = '';
    catEl.value = 'all';
    render();
    searchEl.focus();
  });

  termForm.addEventListener('submit', function (event) {
    event.preventDefault();
    ui.clearError(termError, [ui.$('#term-name'), ui.$('#term-def')]);
    var name = ui.$('#term-name').value.trim();
    var def = ui.$('#term-def').value.trim();

    if (!name) {
      ui.showError(termError, 'Give your term a name.', [ui.$('#term-name')]);
      ui.$('#term-name').focus();
      return;
    }
    if (!def) {
      ui.showError(termError, 'Write a short definition so the term is useful later.', [ui.$('#term-def')]);
      ui.$('#term-def').focus();
      return;
    }

    SM.store.addPersonalTerm({
      term: name,
      cat: ui.$('#term-cat').value,
      def: def,
      example: ui.$('#term-example').value
    });
    termForm.reset();
    ui.clearError(termError);
    ui.toast('“' + name + '” added to your glossary');
    populateCategories();
    render();
  });

  SM.store.subscribe(function () {
    populateCategories();
    render();
  });

  populateCategories();
  render();
})();
