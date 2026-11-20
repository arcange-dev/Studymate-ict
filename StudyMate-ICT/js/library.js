/* StudyMate ICT — Feature 6: reusable prompt library. */
(function () {
  'use strict';

  var SM = window.SM;
  var ui = SM.ui;

  var grid = ui.$('#lib-grid');
  if (!grid) return;

  var filterEl = ui.$('#lib-filter');
  var countEl = ui.$('#lib-count');
  var emptyEl = ui.$('#lib-empty');
  var templates = SM.prompts.library;

  function render() {
    var q = filterEl.value.trim().toLowerCase();
    var visible = templates.filter(function (t) {
      if (!q) return true;
      return (t.name + ' ' + t.purpose + ' ' + t.inputs.join(' ') + ' ' + t.expected + ' ' + t.prompt)
        .toLowerCase().indexOf(q) !== -1;
    });

    grid.innerHTML = '';
    visible.forEach(function (t) { grid.appendChild(templateCard(t)); });

    countEl.textContent = visible.length + ' of ' + templates.length + ' templates';
    emptyEl.hidden = visible.length !== 0;
    ui.bindCopyButtons(grid);
  }

  function templateCard(t) {
    var card = document.createElement('article');
    card.className = 'lib-card';

    var head = document.createElement('div');
    head.className = 'lib-card-head';
    var h = document.createElement('h2');
    h.textContent = t.name;
    var p = document.createElement('p');
    p.textContent = t.purpose;
    head.appendChild(h);
    head.appendChild(p);

    var body = document.createElement('div');
    body.className = 'lib-body';

    body.appendChild(row('Required inputs', list(t.inputs)));
    body.appendChild(row('Expected output', text(t.expected)));
    body.appendChild(row('Example use', text(t.example)));

    var promptWrap = document.createElement('details');
    promptWrap.className = 'lib-prompt lib-row';
    var summary = document.createElement('summary');
    summary.textContent = 'View full prompt';
    var pre = document.createElement('pre');
    pre.className = 'prompt-box';
    pre.id = 'lib-prompt-' + t.id;
    pre.textContent = t.prompt;
    pre.setAttribute('aria-label', t.name + ' prompt');
    promptWrap.appendChild(summary);
    promptWrap.appendChild(pre);
    body.appendChild(promptWrap);

    var reminder = document.createElement('p');
    reminder.className = 'lib-reminder';
    reminder.innerHTML = ui.icon('i-shield');
    reminder.appendChild(document.createTextNode(
      'Check every answer against your own notes or textbook. Replace the [PLACEHOLDERS] before use and never paste confidential data into an external AI tool.'
    ));
    body.appendChild(reminder);

    var acts = document.createElement('div');
    acts.className = 'lib-acts';

    var copyBtn = document.createElement('button');
    copyBtn.type = 'button';
    copyBtn.className = 'btn btn-primary btn-sm';
    copyBtn.dataset.copy = pre.id;
    copyBtn.dataset.log = t.name;
    copyBtn.innerHTML = ui.icon('i-copy') + 'Copy prompt';
    acts.appendChild(copyBtn);

    var saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.className = 'btn btn-outline btn-sm';
    saveBtn.innerHTML = ui.icon('i-saved') + 'Save';
    saveBtn.addEventListener('click', function () {
      SM.store.addPrompt({ title: t.name + ' template', tool: 'library', text: t.prompt });
      saveBtn.innerHTML = ui.icon('i-check') + 'Saved';
      saveBtn.disabled = true;
      ui.toast('“' + t.name + '” saved to Saved Learning');
    });
    acts.appendChild(saveBtn);

    card.appendChild(head);
    card.appendChild(body);
    card.appendChild(acts);
    return card;
  }

  function row(label, content) {
    var div = document.createElement('div');
    div.className = 'lib-row';
    var b = document.createElement('b');
    b.textContent = label;
    div.appendChild(b);
    div.appendChild(content);
    return div;
  }

  function list(items) {
    var ul = document.createElement('ul');
    items.forEach(function (item) {
      var li = document.createElement('li');
      li.textContent = item;
      ul.appendChild(li);
    });
    return ul;
  }

  function text(value) {
    var p = document.createElement('p');
    p.textContent = value;
    return p;
  }

  grid.addEventListener('click', function (event) {
    var btn = event.target.closest('[data-log]');
    if (btn) SM.store.log('library', 'Copied template: ' + btn.dataset.log);
  });

  filterEl.addEventListener('input', render);
  render();
})();
