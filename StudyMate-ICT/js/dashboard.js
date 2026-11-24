/* StudyMate ICT — learning dashboard.
   Every number here comes from LocalStorage: saved items, marked quizzes,
   study plans and the activity log. Nothing is estimated or invented. */
(function () {
  'use strict';

  var SM = window.SM;
  var ui = SM.ui;

  var toolGrid = ui.$('#tool-grid');
  if (!toolGrid) return;

  var data = null;

  function setText(selector, value) {
    var el = ui.$(selector);
    if (el) el.textContent = value;
  }

  function plural(n, one, many) {
    return n + ' ' + (n === 1 ? one : many);
  }

  function latestTitle(list, fallback) {
    return list.length ? 'Latest: ' + list[0].title : fallback;
  }

  /* --------------------------------------------------------- greeting */

  function renderGreeting() {
    var name = SM.store.getSettings().name;
    var eyebrow = ui.$('#dash-eyebrow');
    if (!eyebrow) return;
    eyebrow.textContent = name ? 'Welcome back, ' + name : 'Your learning workspace';
  }

  /* ------------------------------------------------------------ stats */

  function averageScore() {
    if (!data.quizzes.length) return null;
    var total = data.quizzes.reduce(function (sum, q) { return sum + (Number(q.score) || 0); }, 0);
    return Math.round(total / data.quizzes.length);
  }

  function renderStats() {
    var plan = SM.store.activePlan();
    var progress = SM.core.planProgress(plan);
    var avg = averageScore();
    var best = data.quizzes.reduce(function (top, q) { return Math.max(top, Number(q.score) || 0); }, 0);

    setText('#stat-topics', data.topics.length);
    setText('#stat-topics-sub', latestTitle(data.topics, 'From explainers and plans'));
    setText('#stat-prompts', data.prompts.length);
    setText('#stat-quizzes', data.quizzes.length);
    setText('#stat-quizzes-sub', data.quizzes.length ? 'Best score ' + best + '%' : 'No quiz marked yet');
    setText('#stat-score', avg === null ? '—' : avg + '%');
    setText('#stat-score-sub', avg === null ? 'Shown after your first quiz' : 'Across ' + plural(data.quizzes.length, 'marked quiz', 'marked quizzes'));
    setText('#stat-plan', plan ? progress.percent + '%' : '—');
    setText('#stat-plan-sub', plan
      ? progress.done + ' of ' + plural(progress.total, 'activity', 'activities') + ' done'
      : 'No active plan');

    var terms = data.glossSaved.length + data.personalTerms.length;
    setText('#stat-terms', terms);
    setText('#stat-terms-sub', data.personalTerms.length
      ? data.glossSaved.length + ' saved · ' + data.personalTerms.length + ' personal'
      : 'Saved to your list');
  }

  /* -------------------------------------------------- continue learning */

  function continueItem(item) {
    var el = document.createElement('a');
    el.className = 'continue-item';
    el.href = item.href;
    el.innerHTML =
      '<span class="continue-ico">' + ui.icon(item.icon) + '</span>' +
      '<span class="continue-body"><span class="continue-title"></span><span class="continue-meta"></span></span>' +
      '<span class="continue-action">' + item.action + ui.icon('i-arrow-right') + '</span>';
    el.querySelector('.continue-title').textContent = item.title;
    el.querySelector('.continue-meta').textContent = item.meta;
    return el;
  }

  function renderContinue() {
    var host = ui.$('#continue-body');
    if (!host) return;
    var plan = SM.store.activePlan();
    var items = [];

    if (data.topics.length) {
      items.push({
        icon: 'i-book',
        title: data.topics[0].title,
        meta: ui.toolMeta(data.topics[0].tool).name + ' · saved ' + ui.timeAgo(data.topics[0].createdAt),
        action: 'Resume',
        href: '#/explain'
      });
    }
    if (plan) {
      var progress = SM.core.planProgress(plan);
      items.push({
        icon: 'i-calendar',
        title: plan.title,
        meta: progress.percent + '% complete · ' + plan.days.length + ' days',
        action: 'Open',
        href: '#/planner'
      });
    }
    if (data.quizzes.length) {
      items.push({
        icon: 'i-quiz',
        title: data.quizzes[0].title,
        meta: data.quizzes[0].score + '% · ' + data.quizzes[0].correct + '/' + data.quizzes[0].total + ' correct · ' + ui.timeAgo(data.quizzes[0].at),
        action: 'Practise',
        href: '#/quiz'
      });
    }
    if (data.prompts.length) {
      items.push({
        icon: 'i-library',
        title: data.prompts[0].title,
        meta: 'Saved prompt · ' + ui.timeAgo(data.prompts[0].createdAt),
        action: 'Open',
        href: '#/saved'
      });
    }

    host.innerHTML = '';

    if (!items.length) {
      var empty = document.createElement('div');
      empty.className = 'dash-empty';
      empty.innerHTML =
        '<span class="dash-empty-ico" aria-hidden="true">' + ui.icon('i-spark') + '</span>' +
        '<div class="dash-empty-body">' +
        '<p class="dash-empty-title">Nothing saved yet — start with one topic.</p>' +
        '<p class="dash-empty-text">Ask the explainer about something from class, or build a quiz from your notes. Whatever you save will appear here next time.</p>' +
        '<div class="dash-empty-actions">' +
        '<a class="btn btn-primary btn-sm" href="#/explain">Explain a topic</a>' +
        '<a class="btn btn-outline btn-sm" href="#/quiz">Build a quiz</a>' +
        '</div></div>';
      host.appendChild(empty);
      return;
    }

    var list = document.createElement('div');
    list.className = 'continue-list';
    items.slice(0, 4).forEach(function (item) { list.appendChild(continueItem(item)); });
    host.appendChild(list);
  }

  /* ------------------------------------------------------ learning tools */

  function renderTools() {
    toolGrid.innerHTML = '';
    ui.tools.forEach(function (tool) {
      var a = document.createElement('a');
      a.className = 'tool-card';
      a.href = tool.href;
      a.innerHTML =
        '<span class="tool-top"><span class="tool-ico">' + ui.icon(tool.icon) + '</span>' +
        '<span class="tool-arrow" aria-hidden="true">' + ui.icon('i-arrow-right') + '</span></span>' +
        '<h3>' + ui.esc(tool.name) + '</h3>' +
        '<p>' + ui.esc(tool.blurb) + '</p>' +
        '<span class="tool-meta">' + ui.esc(tool.meta) + '</span>';
      toolGrid.appendChild(a);
    });
  }

  /* ------------------------------------------------------- quiz results */

  function renderQuizResults() {
    var list = ui.$('#quiz-results');
    if (!list) return;
    list.innerHTML = '';

    if (!data.quizzes.length) {
      var empty = document.createElement('li');
      var p = document.createElement('p');
      p.className = 'empty-line';
      p.textContent = 'No marked quizzes yet. Generate a quiz from your notes, answer it and your scores appear here.';
      empty.appendChild(p);
      list.appendChild(empty);
      return;
    }

    data.quizzes.slice(0, 4).forEach(function (q) {
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

  /** A bar per real marked quiz. Hidden entirely when there is no history. */
  function renderQuizChart() {
    var host = ui.$('#quiz-chart');
    if (!host) return;
    var recent = data.quizzes.slice(0, 6).reverse();
    if (!recent.length) {
      host.hidden = true;
      host.innerHTML = '';
      return;
    }
    var scores = recent.map(function (q) { return q.score + '%'; }).join(', ');
    host.hidden = false;
    host.innerHTML =
      '<div class="chart-head"><span>Scores, oldest to newest</span><span>' + recent.length + ' quizzes</span></div>' +
      '<div class="score-bars" role="img" aria-label="Quiz scores: ' + ui.esc(scores) + '">' +
      recent.map(function (q) {
        return '<span class="score-bar" title="' + ui.esc(q.title + ' — ' + q.score + '%') + '">' +
          '<span class="score-bar-fill' + (q.score >= 80 ? ' good' : q.score >= 50 ? '' : ' low') + '" style="height:' + Math.max(4, q.score) + '%"></span>' +
          '<span class="score-bar-value">' + q.score + '</span></span>';
      }).join('') +
      '</div>';
  }

  /* ---------------------------------------------------------- activity */

  function renderRecent() {
    var list = ui.$('#recent-list');
    if (!list) return;
    list.innerHTML = '';

    if (!data.activity.length) {
      var li = document.createElement('li');
      li.innerHTML = '<p class="empty-line">No activity yet. Generate your first prompt to see it here.</p>';
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

  /* ------------------------------------------------------ plan progress */

  function renderPlanProgress() {
    var host = ui.$('#plan-progress-card');
    if (!host) return;
    var plan = SM.store.activePlan();
    host.innerHTML = '';

    if (!plan) {
      var empty = document.createElement('div');
      empty.className = 'dash-empty compact';
      empty.innerHTML =
        '<span class="dash-empty-ico" aria-hidden="true">' + ui.icon('i-calendar') + '</span>' +
        '<div class="dash-empty-body"><p class="dash-empty-title">No active study plan.</p>' +
        '<p class="dash-empty-text">Add your topics and the minutes you have each day, then save the plan to track it here.</p>' +
        '<div class="dash-empty-actions"><a class="btn btn-primary btn-sm" href="#/planner">Create a study plan</a></div></div>';
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
      '<p class="saved-meta">Saved ' + ui.esc(ui.formatDate(plan.createdAt)) + ' · ' + plan.days.length + ' days · ' + ui.esc(plan.difficulty || 'standard') + '</p>' +
      '<a class="link" href="#/planner">Continue this plan →</a>';
    host.appendChild(wrap);
  }

  /* -------------------------------------------------------- study focus */

  function renderFocus() {
    var body = ui.$('#focus-body');
    if (!body) return;
    body.innerHTML = '';

    if (!data.topics.length) {
      var empty = document.createElement('div');
      empty.className = 'dash-empty compact';
      empty.innerHTML =
        '<span class="dash-empty-ico" aria-hidden="true">' + ui.icon('i-saved') + '</span>' +
        '<div class="dash-empty-body"><p class="dash-empty-title">No saved topics yet.</p>' +
        '<p class="dash-empty-text">Save a topic from the explainer, quiz generator or planner to build your revision list.</p>' +
        '<div class="dash-empty-actions"><a class="btn btn-outline btn-sm" href="#/explain">Explain a topic</a></div></div>';
      body.appendChild(empty);
      return;
    }

    var ul = document.createElement('ul');
    ul.className = 'saved-list focus-list';
    data.topics.slice(0, 4).forEach(function (t) {
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

    var counts = document.createElement('p');
    counts.className = 'saved-meta focus-counts';
    counts.innerHTML =
      'Saved glossary terms: <strong>' + data.glossSaved.length + '</strong> · ' +
      'Personal terms: <strong>' + data.personalTerms.length + '</strong> · ' +
      '<a class="link" href="#/saved">Open Saved Learning →</a>';
    body.appendChild(counts);
  }

  function refresh() {
    data = SM.store.get();
    renderGreeting();
    renderStats();
    renderContinue();
    renderQuizChart();
    renderQuizResults();
    renderRecent();
    renderPlanProgress();
    renderFocus();
  }

  renderTools();
  refresh();
  SM.store.subscribe(refresh);
})();
