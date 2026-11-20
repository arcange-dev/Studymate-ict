/* StudyMate ICT — Feature 7: learning dashboard. */
(function () {
  'use strict';

  var SM = window.SM;
  var ui = SM.ui;

  var toolGrid = ui.$('#tool-grid');
  if (!toolGrid) return;

  function renderTools() {
    toolGrid.innerHTML = '';
    ui.tools.forEach(function (tool) {
      var a = document.createElement('a');
      a.className = 'tool-card';
      a.href = tool.href;
      a.innerHTML =
        '<span class="tool-ico">' + ui.icon(tool.icon) + '</span>' +
        '<h3>' + ui.esc(tool.name) + '</h3>' +
        '<p>' + ui.esc(tool.blurb) + '</p>' +
        '<span class="tool-meta">' + ui.esc(tool.meta) + ' →</span>';
      toolGrid.appendChild(a);
    });
  }

  function renderStats() {
    var s = SM.store.stats();
    ui.$('#stat-topics').textContent = s.topics;
    ui.$('#stat-prompts').textContent = s.prompts;
    ui.$('#stat-terms').textContent = s.terms + s.personal;
    ui.$('#stat-activity').textContent = s.activity;
  }

  function renderRecent() {
    var list = ui.$('#recent-list');
    var data = SM.store.get();
    list.innerHTML = '';

    if (!data.activity.length) {
      var li = document.createElement('li');
      li.innerHTML = '<p class="empty-line" style="width:100%">No activity yet. Generate your first prompt to see it here.</p>';
      list.appendChild(li);
      return;
    }

    data.activity.slice(0, 5).forEach(function (item) {
      var meta = ui.toolMeta(item.tool);
      var el = document.createElement('li');
      el.innerHTML =
        '<span class="act-dot">' + ui.icon(meta.icon) + '</span>' +
        '<span class="act-body"><span class="act-title">' + ui.esc(item.label) + '</span>' +
        '<span class="act-time">' + ui.esc(meta.name) + ' · ' + ui.esc(ui.timeAgo(item.at)) + '</span></span>';
      list.appendChild(el);
    });
  }

  function renderFocus() {
    var body = ui.$('#focus-body');
    var data = SM.store.get();
    body.innerHTML = '';

    if (!data.topics.length) {
      var empty = document.createElement('p');
      empty.className = 'empty-line';
      empty.textContent = 'No saved topics yet. Save one from the explainer or the planner to build your revision list.';
      body.appendChild(empty);
    } else {
      var ul = document.createElement('ul');
      ul.className = 'saved-list';
      data.topics.slice(0, 3).forEach(function (t) {
        var li = document.createElement('li');
        li.className = 'saved-item';
        li.innerHTML =
          '<div class="saved-main"><p class="saved-title">' + ui.esc(t.title) + '</p>' +
          '<p class="saved-meta">' + ui.esc(ui.toolMeta(t.tool).name) + ' · ' + ui.esc(ui.formatDate(t.createdAt)) + '</p></div>' +
          '<div class="saved-acts"><button type="button" class="mini-btn" data-copy-text aria-label="Copy saved prompt">' + ui.icon('i-copy') + '</button></div>';
        var btn = li.querySelector('[data-copy-text]');
        btn.addEventListener('click', function () {
          ui.copy(t.prompt).then(function (ok) {
            ui.toast(ok ? 'Prompt copied' : 'Copy failed', ok ? 'ok' : 'error');
          });
        });
        ul.appendChild(li);
      });
      body.appendChild(ul);
    }

    var termsWrap = document.createElement('div');
    termsWrap.style.marginTop = '14px';
    termsWrap.innerHTML =
      '<p class="saved-meta">Saved glossary terms: <strong>' + data.glossSaved.length + '</strong> · ' +
      'Personal terms: <strong>' + data.personalTerms.length + '</strong></p>' +
      '<a class="link" href="#/saved">Open Saved Learning →</a>';
    body.appendChild(termsWrap);
  }

  function renderQuizResults() {
    var list = ui.$('#quiz-results');
    if (!list) return;
    var quizzes = SM.store.get().quizzes.slice(0, 4);
    list.innerHTML = '';

    if (!quizzes.length) {
      var empty = document.createElement('li');
      var p = document.createElement('p');
      p.className = 'empty-line';
      p.style.width = '100%';
      p.textContent = 'No marked quizzes yet. Generate a quiz from your notes, answer it and your scores appear here.';
      empty.appendChild(p);
      list.appendChild(empty);
      return;
    }

    quizzes.forEach(function (q) {
      var li = document.createElement('li');
      li.className = 'saved-item';
      var main = document.createElement('div');
      main.className = 'saved-main';
      var title = document.createElement('p');
      title.className = 'saved-title';
      title.textContent = q.title;
      var meta = document.createElement('p');
      meta.className = 'saved-meta';
      meta.textContent = q.correct + '/' + q.total + ' correct' + (q.review ? ' · ' + q.review + ' to self-check' : '') + ' · ' + ui.timeAgo(q.at);
      main.appendChild(title);
      main.appendChild(meta);
      var score = document.createElement('span');
      score.className = 'score-pill' + (q.score >= 80 ? ' good' : q.score >= 50 ? '' : ' low');
      score.textContent = q.score + '%';
      li.appendChild(main);
      li.appendChild(score);
      list.appendChild(li);
    });
  }

  function renderPlanProgress() {
    var host = ui.$('#plan-progress-card');
    if (!host) return;
    var plan = SM.store.activePlan();
    host.innerHTML = '';

    if (!plan) {
      var empty = document.createElement('p');
      empty.className = 'empty-line';
      empty.textContent = 'No saved plan yet. Build one in the planner and press “Save plan” to track it here.';
      host.appendChild(empty);
      return;
    }

    var progress = SM.core.planProgress(plan);
    var wrap = document.createElement('div');
    wrap.className = 'plan-progress';
    wrap.innerHTML =
      '<p class="saved-title">' + ui.esc(plan.title) + '</p>' +
      '<div class="progress-track" role="progressbar" aria-label="Plan progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + progress.percent + '"><span class="progress-fill" style="width:' + progress.percent + '%"></span></div>' +
      '<p class="progress-text">' + progress.done + ' of ' + progress.total + ' activities done · ' + progress.percent + '%</p>' +
      '<p class="saved-meta">Saved ' + ui.esc(ui.formatDate(plan.createdAt)) + ' · ' + plan.days.length + ' days</p>';
    host.appendChild(wrap);
  }

  function refresh() {
    renderStats();
    renderRecent();
    renderFocus();
    renderQuizResults();
    renderPlanProgress();
  }

  renderTools();
  refresh();
  SM.store.subscribe(refresh);
})();
