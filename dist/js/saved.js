/* StudyMate ICT — Saved Learning: search, filter, copy and delete local items. */
(function () {
  'use strict';

  var SM = window.SM;
  var ui = SM.ui;

  var topicsList = ui.$('#saved-topics');
  if (!topicsList) return;

  var promptsList = ui.$('#saved-prompts');
  var glossList = ui.$('#saved-gloss');
  var activityList = ui.$('#saved-activity');
  var searchEl = ui.$('#saved-search');
  var filterEl = ui.$('#saved-filter');
  var countEl = ui.$('#saved-count');
  var clearBtn = ui.$('#saved-clear');

  var cards = {
    topics: ui.$('#saved-topics-card'),
    prompts: ui.$('#saved-prompts-card'),
    glossary: ui.$('#saved-gloss-card'),
    activity: ui.$('#saved-activity-card')
  };

  function query() { return (searchEl.value || '').trim().toLowerCase(); }
  function filter() { return filterEl.value; }
  function isFiltered() { return Boolean(query()) || filter() !== 'all'; }
  function sectionVisible(name) { return filter() === 'all' || filter() === name; }

  function match(parts) {
    var q = query();
    if (!q) return true;
    return parts.join(' ').toLowerCase().indexOf(q) !== -1;
  }

  function emptyLine(text) {
    var li = document.createElement('li');
    var p = document.createElement('p');
    p.className = 'empty-line';
    p.textContent = text;
    li.appendChild(p);
    return li;
  }

  function copyButton(textLabel, payload, label) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'mini-btn';
    btn.innerHTML = ui.icon('i-copy');
    btn.setAttribute('aria-label', textLabel);
    btn.addEventListener('click', function () {
      ui.copy(payload).then(function (ok) {
        ui.toast(ok ? 'Copied ' + label : 'Copy failed', ok ? 'ok' : 'error');
      });
    });
    return btn;
  }

  function deleteButton(label, onClick) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'mini-btn danger';
    btn.innerHTML = ui.icon('i-trash');
    btn.setAttribute('aria-label', label);
    btn.addEventListener('click', onClick);
    return btn;
  }

  function renderTopics() {
    var data = SM.store.get();
    topicsList.innerHTML = '';
    if (!data.topics.length) {
      topicsList.appendChild(emptyLine('No saved topics yet. Generate an explanation or a study plan and press Save.'));
      return;
    }
    var items = data.topics.filter(function (t) {
      return match([t.title, t.detail, ui.toolMeta(t.tool).name]);
    });
    if (!items.length) {
      topicsList.appendChild(emptyLine('No saved topics match your search.'));
      return;
    }
    items.forEach(function (t) {
      var li = document.createElement('li');
      li.className = 'saved-item';
      var main = document.createElement('div');
      main.className = 'saved-main';
      var title = document.createElement('p');
      title.className = 'saved-title';
      title.textContent = t.title;
      var meta = document.createElement('p');
      meta.className = 'saved-meta';
      meta.textContent = ui.toolMeta(t.tool).name + ' · ' + ui.formatDate(t.createdAt) + (t.detail ? ' · ' + t.detail : '');
      main.appendChild(title);
      main.appendChild(meta);

      var acts = document.createElement('div');
      acts.className = 'saved-acts';
      acts.appendChild(copyButton('Copy prompt for ' + t.title, t.prompt, 'prompt'));
      acts.appendChild(deleteButton('Delete saved topic ' + t.title, function () {
        if (window.confirm('Delete “' + t.title + '” from Saved Learning?')) {
          SM.store.removeTopic(t.id);
          ui.toast('Saved topic deleted');
        }
      }));
      li.appendChild(main);
      li.appendChild(acts);
      topicsList.appendChild(li);
    });
  }

  function renderPrompts() {
    var data = SM.store.get();
    promptsList.innerHTML = '';
    if (!data.prompts.length) {
      promptsList.appendChild(emptyLine('No saved prompts. Use Save on any generated prompt, or save a library template.'));
      return;
    }
    var items = data.prompts.filter(function (p) {
      return match([p.title, p.text, ui.toolMeta(p.tool).name]);
    });
    if (!items.length) {
      promptsList.appendChild(emptyLine('No saved prompts match your search.'));
      return;
    }
    items.forEach(function (p) {
      var li = document.createElement('li');
      li.className = 'saved-item';
      var main = document.createElement('div');
      main.className = 'saved-main';
      var title = document.createElement('p');
      title.className = 'saved-title';
      title.textContent = p.title;
      var meta = document.createElement('p');
      meta.className = 'saved-meta';
      meta.textContent = ui.toolMeta(p.tool).name + ' · ' + ui.formatDate(p.createdAt);
      main.appendChild(title);
      main.appendChild(meta);

      var acts = document.createElement('div');
      acts.className = 'saved-acts';
      acts.appendChild(copyButton('Copy prompt ' + p.title, p.text, 'prompt'));
      acts.appendChild(deleteButton('Delete saved prompt ' + p.title, function () {
        if (window.confirm('Delete this saved prompt?')) {
          SM.store.removePrompt(p.id);
          ui.toast('Saved prompt deleted');
        }
      }));
      li.appendChild(main);
      li.appendChild(acts);
      promptsList.appendChild(li);
    });
  }

  function savedGlossTerms() {
    var byId = {};
    SM.glossaryData.forEach(function (t) { byId[t.id] = t; });
    return SM.store.get().glossSaved.map(function (id) { return byId[id]; }).filter(Boolean);
  }

  function renderGloss() {
    var data = SM.store.get();
    glossList.innerHTML = '';

    if (!data.glossSaved.length) {
      glossList.appendChild(emptyLine('No glossary terms saved. Press Save on any term in the ICT Glossary.'));
      return;
    }
    var items = savedGlossTerms().filter(function (t) {
      return match([t.term, t.full, t.def, t.cat]);
    });
    if (!items.length) {
      glossList.appendChild(emptyLine('No saved glossary terms match your search.'));
      return;
    }
    items.forEach(function (t) {
      var li = document.createElement('li');
      li.className = 'saved-item';
      var main = document.createElement('div');
      main.className = 'saved-main';
      var title = document.createElement('p');
      title.className = 'saved-title';
      title.textContent = t.term + (t.full ? ' — ' + t.full : '');
      var meta = document.createElement('p');
      meta.className = 'saved-meta';
      meta.textContent = t.def.slice(0, 120) + (t.def.length > 120 ? '…' : '');
      main.appendChild(title);
      main.appendChild(meta);

      var acts = document.createElement('div');
      acts.className = 'saved-acts';
      acts.appendChild(copyButton('Copy definition of ' + t.term, t.term + ' — ' + t.def, 'definition'));
      acts.appendChild(deleteButton('Remove ' + t.term + ' from saved terms', function () {
        SM.store.toggleTerm(t.id);
        ui.toast(t.term + ' removed from saved terms');
      }));
      li.appendChild(main);
      li.appendChild(acts);
      glossList.appendChild(li);
    });
  }

  function renderActivity() {
    var data = SM.store.get();
    activityList.innerHTML = '';
    if (!data.activity.length) {
      activityList.appendChild(emptyLine('Nothing here yet. Your tool usage will appear in this list.'));
      return;
    }
    var items = data.activity.filter(function (item) {
      return match([item.label, ui.toolMeta(item.tool).name]);
    });
    if (!items.length) {
      activityList.appendChild(emptyLine('No activity matches your search.'));
      return;
    }
    items.slice(0, 20).forEach(function (item) {
      var meta = ui.toolMeta(item.tool);
      var li = document.createElement('li');
      li.innerHTML =
        '<span class="act-dot">' + ui.icon(meta.icon) + '</span>' +
        '<span class="act-body"><span class="act-title">' + ui.esc(item.label) + '</span>' +
        '<span class="act-time">' + ui.esc(meta.name) + ' · ' + ui.esc(ui.timeAgo(item.at)) + '</span></span>';
      activityList.appendChild(li);
    });
  }

  function renderCounts() {
    var data = SM.store.get();
    var total = data.topics.length + data.prompts.length + data.glossSaved.length + data.activity.length;
    var shown = 0;
    if (sectionVisible('topics')) shown += data.topics.filter(function (t) { return match([t.title, t.detail]); }).length;
    if (sectionVisible('prompts')) shown += data.prompts.filter(function (p) { return match([p.title, p.text]); }).length;
    if (sectionVisible('glossary')) {
      shown += savedGlossTerms().filter(function (t) { return match([t.term, t.full, t.def]); }).length;
    }
    if (sectionVisible('activity')) shown += data.activity.filter(function (item) { return match([item.label]); }).length;

    countEl.textContent = isFiltered()
      ? shown + ' of ' + total + ' saved items'
      : total + ' saved items';
    clearBtn.hidden = !isFiltered();
  }

  function renderAll() {
    Object.keys(cards).forEach(function (name) {
      if (cards[name]) cards[name].hidden = !sectionVisible(name);
    });
    renderTopics();
    renderPrompts();
    renderGloss();
    renderActivity();
    renderCounts();
  }

  searchEl.addEventListener('input', renderAll);
  filterEl.addEventListener('change', renderAll);
  clearBtn.addEventListener('click', function () {
    searchEl.value = '';
    filterEl.value = 'all';
    renderAll();
    searchEl.focus();
  });

  ui.$('#clear-topics').addEventListener('click', function () {
    if (!SM.store.get().topics.length) { ui.toast('There are no saved topics to clear', 'error'); return; }
    if (window.confirm('Delete all saved topics?')) { SM.store.clear('topics'); ui.toast('Saved topics cleared'); }
  });
  ui.$('#clear-prompts').addEventListener('click', function () {
    if (!SM.store.get().prompts.length) { ui.toast('There are no saved prompts to clear', 'error'); return; }
    if (window.confirm('Delete all saved prompts?')) { SM.store.clear('prompts'); ui.toast('Saved prompts cleared'); }
  });
  ui.$('#clear-gloss').addEventListener('click', function () {
    if (!SM.store.get().glossSaved.length) { ui.toast('No glossary terms are saved', 'error'); return; }
    if (window.confirm('Remove all saved glossary terms?')) { SM.store.clear('glossSaved'); ui.toast('Saved glossary terms cleared'); }
  });
  ui.$('#clear-activity').addEventListener('click', function () {
    if (!SM.store.get().activity.length) { ui.toast('There is no activity to clear', 'error'); return; }
    if (window.confirm('Clear the activity history?')) { SM.store.clear('activity'); ui.toast('Activity history cleared'); }
  });
  ui.$('#reset-all').addEventListener('click', function () {
    if (window.confirm('Delete ALL saved topics, prompts, glossary terms, personal terms, quiz results, study plans and activity? This cannot be undone.')) {
      SM.store.resetAll();
      ui.toast('All local data deleted');
    }
  });

  renderAll();
  SM.store.subscribe(renderAll);
})();
