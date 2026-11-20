/* StudyMate ICT — Feature 3: smart study planner.
   The schedule is computed in the browser. The invariant enforced below is:
   for every day, sum(session minutes) + sum(break minutes) + self-assessment
   === the minutes the student said they have. Nothing is ever overbooked. */
(function () {
  'use strict';

  var SM = window.SM;
  var ui = SM.ui;

  var form = ui.$('#planner-form');
  if (!form) return;

  var topicsEl = ui.$('#plan-topics');
  var minutesEl = ui.$('#plan-minutes');
  var daysEl = ui.$('#plan-days');
  var diffEl = ui.$('#plan-difficulty');
  var examEl = ui.$('#plan-exam');
  var errorEl = ui.$('#plan-error');
  var emptyEl = ui.$('#plan-empty');
  var bodyEl = ui.$('#plan-body');
  var summaryEl = ui.$('#plan-summary');
  var daysWrap = ui.$('#plan-days-list');
  var tagEl = ui.$('#plan-out-tag');
  var promptWrap = ui.$('#plan-prompt-wrap');
  var promptEl = ui.$('#plan-output');
  var toggleBtn = ui.$('#plan-prompt-toggle');
  var copyBtn = ui.$('#plan-copy');
  var saveBtn = ui.$('#plan-save');

  var planData = null;
  var lastInput = null;
  var savedId = null;

  /* Pre-fill topics from the subjects saved in Settings. */
  (function prefillSubjects() {
    var subjects = SM.store.getSettings().subjects;
    if (subjects.length && !topicsEl.value.trim()) topicsEl.value = subjects.join('\n');
  })();

  function invalidateOutput() {
    planData = null;
    lastInput = null;
    savedId = null;
    emptyEl.hidden = false;
    bodyEl.hidden = true;
    tagEl.hidden = true;
    summaryEl.innerHTML = '';
    daysWrap.innerHTML = '';
    promptWrap.hidden = true;
    promptEl.textContent = '';
    saveBtn.disabled = true;
    saveBtn.innerHTML = ui.icon('i-saved') + 'Save plan';
  }

  var ACTIVITIES = [
    'Write 5 flashcard questions from today’s topics, then answer them without looking.',
    'Draw a labelled diagram of today’s topic from memory, then check it against your notes.',
    'Explain today’s topic aloud for 3 minutes as if teaching a classmate.',
    'Do 10 minutes of past-paper or textbook questions on today’s topics.',
    'Build a mind map linking today’s topics to something you already know.',
    'Teach-back: summarise the hardest idea in 60 seconds, then find one gap.'
  ];

  var QUESTION_TEMPLATES = [
    'In one or two sentences, what is {t} and why does it matter?',
    'Give one real-world example of {t} that you could point to on a computer.',
    'What is one mistake beginners make about {t}, and how do you avoid it?'
  ];

  var PROMPTS = {
    Light: { maxBlock: 40, breakLen: 8, label: 'Light — revision, low effort' },
    Standard: { maxBlock: 30, breakLen: 5, label: 'Standard — steady new learning' },
    Intensive: { maxBlock: 25, breakLen: 5, label: 'Intensive — exam crunch' }
  };

  function parseTopics(raw) {
    return String(raw || '')
      .split(/[\n,;]+/)
      .map(function (t) { return t.replace(/\s+/g, ' ').trim(); })
      .filter(Boolean)
      .filter(function (t, i, arr) {
        return arr.findIndex(function (x) { return x.toLowerCase() === t.toLowerCase(); }) === i;
      })
      .slice(0, 12);
  }

  function dayLabel(offset) {
    var d = new Date();
    d.setDate(d.getDate() + offset);
    return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
  }

  /** Split usable minutes into study blocks separated by real breaks. */
  function buildSessions(usable, maxBlock, breakLen) {
    var out = [];
    var left = usable;
    var guard = 0;

    if (usable <= maxBlock) {
      return [{ kind: 'study', minutes: usable }];
    }

    while (left > 0 && guard < 40) {
      guard++;
      var take = Math.min(maxBlock, left);
      out.push({ kind: 'study', minutes: take });
      left -= take;
      if (left > breakLen + 4 && left >= 12) {
        out.push({ kind: 'break', minutes: breakLen });
        left -= breakLen;
      }
    }
    return out;
  }

  function makeQuestions(dayTopics) {
    var out = [];
    dayTopics.slice(0, 3).forEach(function (topic, i) {
      var tpl = QUESTION_TEMPLATES[i % QUESTION_TEMPLATES.length];
      out.push(tpl.replace('{t}', topic));
    });
    out.push('Which part of today’s topic is still unclear, and what will you do about it before the next session?');
    return out;
  }

  function buildPlan(input) {
    var usableDay = input.minutes;
    var cfg = PROMPTS[input.difficulty] || PROMPTS.Standard;
    var days = [];

    /* Distribute topics across days (round robin keeps the given order). */
    var buckets = [];
    for (var i = 0; i < input.days; i++) buckets.push([]);
    input.topics.forEach(function (topic, i) { buckets[i % input.days].push(topic); });

    for (var d = 0; d < input.days; d++) {
      var assessment = usableDay >= 25 ? 5 : 0;
      var usable = usableDay - assessment;
      var sessions = buildSessions(usable, cfg.maxBlock, cfg.breakLen);
      var dayTopics = buckets[d].length ? buckets[d] : [input.topics[d % input.topics.length]];
      var studyIndex = 0;
      var labels = [];

      sessions.forEach(function (s) {
        if (s.kind === 'break') {
          labels.push({ kind: 'break', minutes: s.minutes, label: 'Break — stand up, look away from the screen' });
          return;
        }
        var topic = dayTopics[studyIndex % dayTopics.length];
        studyIndex++;
        s.topic = topic;
        labels.push({ kind: 'study', minutes: s.minutes, label: 'Study: ' + topic });
      });

      /* Convert the final study session into revision on review days. */
      var isReviewDay = d === input.days - 1 || (d > 0 && (d + 1) % 3 === 0);
      if (isReviewDay) {
        for (var k = labels.length - 1; k >= 0; k--) {
          if (labels[k].kind === 'study') {
            var earlier = input.topics.filter(function (t) {
              return dayTopics.indexOf(t) === -1;
            });
            labels[k].label = 'Revision: ' +
              (dayTopics.join(', ') + (earlier.length ? ' + earlier topics' : ''));
            labels[k].kind = 'revision';
            break;
          }
        }
      }

      if (assessment > 0) {
        labels.push({ kind: 'assess', minutes: assessment, label: 'Self-assessment quiz (answer without notes)' });
      }

      var total = labels.reduce(function (sum, x) { return sum + x.minutes; }, 0);
      /* Safety net: if rounding ever pushed past the budget, trim the first block. */
      if (total > usableDay) {
        var over = total - usableDay;
        for (var q = 0; q < labels.length && over > 0; q++) {
          if (labels[q].kind === 'study' && labels[q].minutes - over >= 10) {
            labels[q].minutes -= over;
            over = 0;
          }
        }
        total = labels.reduce(function (sum, x) { return sum + x.minutes; }, 0);
      }

      var objective = 'Be able to explain ' + dayTopics.join(' and ') +
        ' in your own words and give one real example.';

      days.push({
        index: d + 1,
        date: dayLabel(d),
        minutes: total,
        available: usableDay,
        topics: dayTopics,
        objective: objective,
        sessions: labels,
        questions: makeQuestions(dayTopics),
        activity: ACTIVITIES[d % ACTIVITIES.length],
        review: isReviewDay
      });
    }

    return {
      days: days,
      totalMinutes: days.reduce(function (s, d) { return s + d.minutes; }, 0)
    };
  }

  function renderPlan(plan) {
    summaryEl.innerHTML = '';
    var chips = [
      plan.days.length + ' days',
      lastInput.topics.length + ' topic' + (lastInput.topics.length === 1 ? '' : 's'),
      lastInput.minutes + ' min/day',
      plan.totalMinutes + ' min total',
      lastInput.difficulty
    ];
    chips.forEach(function (text) {
      var span = document.createElement('span');
      span.className = 'plan-chip';
      span.textContent = text;
      summaryEl.appendChild(span);
    });

    daysWrap.innerHTML = '';
    plan.days.forEach(function (day) {
      var art = document.createElement('article');
      art.className = 'plan-day';

      var head = document.createElement('div');
      head.className = 'plan-day-head';
      var h = document.createElement('h3');
      h.textContent = 'Day ' + day.index + ' · ' + day.date;
      var meta = document.createElement('span');
      meta.className = 'plan-day-meta';
      meta.textContent = day.minutes + ' / ' + day.available + ' min used';
      head.appendChild(h);
      head.appendChild(meta);

      var obj = document.createElement('p');
      obj.className = 'plan-obj';
      var strong = document.createElement('strong');
      strong.textContent = 'Objective: ';
      obj.appendChild(strong);
      obj.appendChild(document.createTextNode(day.objective));

      var list = document.createElement('ul');
      list.className = 'plan-sessions';
      var clock = 0;
      day.sessions.forEach(function (s) {
        var li = document.createElement('li');
        if (s.kind === 'break') li.className = 'sess-break';

        var time = document.createElement('span');
        time.className = 'sess-time';
        time.textContent = formatClock(clock);
        clock += s.minutes;

        var name = document.createElement('span');
        name.className = 'sess-name';
        name.textContent = s.label;
        if (s.kind === 'revision') {
          var kind = document.createElement('span');
          kind.className = 'sess-kind';
          kind.textContent = '  · revision';
          name.appendChild(kind);
        }

        var len = document.createElement('span');
        len.className = 'sess-len';
        len.textContent = s.minutes + ' min';

        if (s.kind !== 'break' && savedId) {
          li.classList.add('has-check');
          var check = document.createElement('input');
          check.type = 'checkbox';
          check.className = 'sess-check';
          check.checked = s.done === true;
          check.setAttribute('aria-label', 'Mark done: ' + s.label);
          (function (dayIndex, sessionIndex) {
            check.addEventListener('change', function () {
              SM.store.toggleSession(savedId, dayIndex, sessionIndex);
              s.done = check.checked;
              updateProgress();
              ui.toast(check.checked ? 'Activity marked done' : 'Activity marked not done');
            });
          })(day.index - 1, day.sessions.indexOf(s));
          li.appendChild(check);
        }

        li.appendChild(time);
        li.appendChild(name);
        li.appendChild(len);
        list.appendChild(li);
      });

      var foot = document.createElement('div');
      foot.className = 'plan-foot';
      var p = document.createElement('p');
      p.className = 'plan-foot';
      p.style.padding = '0';
      p.style.margin = '0 0 4px';
      p.textContent = 'Practice activity: ' + day.activity;
      var qLabel = document.createElement('p');
      qLabel.style.margin = '6px 0 2px';
      qLabel.style.fontWeight = '600';
      qLabel.style.fontSize = '.8rem';
      qLabel.textContent = 'Self-assessment questions';
      var qs = document.createElement('ul');
      qs.className = 'plan-questions';
      day.questions.forEach(function (q) {
        var li = document.createElement('li');
        li.textContent = q;
        qs.appendChild(li);
      });
      foot.appendChild(p);
      foot.appendChild(qLabel);
      foot.appendChild(qs);

      art.appendChild(head);
      art.appendChild(obj);
      art.appendChild(list);
      art.appendChild(foot);
      daysWrap.appendChild(art);
    });
  }

  /** Progress strip under the summary chips (only for a saved plan). */
  function updateProgress() {
    var progressEl = ui.$('#plan-progress');
    if (!progressEl) return;
    if (!planData || !savedId) {
      progressEl.hidden = true;
      return;
    }
    var progress = SM.core.planProgress(planData);
    progressEl.hidden = false;
    var fill = progressEl.querySelector('.progress-fill');
    var track = progressEl.querySelector('.progress-track');
    var text = progressEl.querySelector('.progress-text');
    if (fill) fill.style.width = progress.percent + '%';
    if (track) track.setAttribute('aria-valuenow', String(progress.percent));
    if (text) {
      text.textContent = progress.done + ' of ' + progress.total + ' activities done · ' + progress.percent + '%' +
        (progress.percent === 100 ? ' — plan complete, well done.' : '');
    }
  }

  /** Bring back the most recently saved plan, with its tick marks intact. */
  function restoreActivePlan() {
    var saved = SM.store.activePlan();
    if (!saved || !saved.days || !saved.days.length) return;

    savedId = saved.id;
    planData = {
      days: saved.days,
      totalMinutes: saved.days.reduce(function (sum, d) { return sum + (Number(d.minutes) || 0); }, 0)
    };
    lastInput = {
      topics: saved.topics && saved.topics.length ? saved.topics : ['Study plan'],
      minutes: saved.minutes || 60,
      days: saved.days.length,
      difficulty: saved.difficulty || 'Standard',
      exam: ''
    };

    renderPlan(planData);
    tagEl.textContent = 'Saved plan · ' + saved.days.length + ' days';
    tagEl.hidden = false;
    emptyEl.hidden = true;
    bodyEl.hidden = false;
    promptWrap.hidden = true;
    saveBtn.disabled = true;
    saveBtn.innerHTML = ui.icon('i-check') + 'Plan saved';
    updateProgress();
  }

  function formatClock(offset) {
    var start = 9 * 60; /* plans are displayed as a 09:00 start */
    var total = start + offset;
    var h = Math.floor(total / 60) % 24;
    var m = total % 60;
    return pad(h) + ':' + pad(m);
  }

  function pad(n) { return n < 10 ? '0' + n : String(n); }

  function planToText(plan) {
    var lines = [
      'StudyMate ICT — study plan',
      'Topics: ' + lastInput.topics.join(', '),
      'Time per day: ' + lastInput.minutes + ' minutes · Days: ' + plan.days.length,
      lastInput.exam ? 'Exam date: ' + lastInput.exam : '',
      'Total planned study: ' + plan.totalMinutes + ' minutes',
      ''
    ];
    plan.days.forEach(function (day) {
      lines.push('DAY ' + day.index + ' — ' + day.date + ' (' + day.minutes + ' min)');
      lines.push('Objective: ' + day.objective);
      var clock = 0;
      day.sessions.forEach(function (s) {
        lines.push('  ' + formatClock(clock) + '  ' + s.label + ' — ' + s.minutes + ' min');
        clock += s.minutes;
      });
      lines.push('Practice activity: ' + day.activity);
      day.questions.forEach(function (q) { lines.push('Question: ' + q); });
      lines.push('');
    });
    lines.push('Check every study point against your class notes or textbook.');
    return lines.join('\n');
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    ui.clearError(errorEl, [topicsEl, minutesEl, daysEl, examEl]);

    var topics = parseTopics(topicsEl.value);
    var minutes = parseInt(minutesEl.value, 10);
    var days = parseInt(daysEl.value, 10);
    var difficulty = diffEl.value.split(' —')[0];

    if (!topics.length) {
      ui.showError(errorEl, 'Add at least one topic to study. Write one topic per line.', [topicsEl]);
      invalidateOutput();
      topicsEl.focus();
      return;
    }
    if (!minutes || isNaN(minutes) || minutes < 15 || minutes > 480) {
      ui.showError(errorEl, 'Study time per day must be between 15 and 480 minutes.', [minutesEl]);
      invalidateOutput();
      minutesEl.focus();
      return;
    }
    if (!days || isNaN(days) || days < 1 || days > 30) {
      ui.showError(errorEl, 'Number of days must be between 1 and 30.', [daysEl]);
      invalidateOutput();
      daysEl.focus();
      return;
    }

    var notes = [];
    if (examEl.value) {
      var exam = new Date(examEl.value + 'T00:00:00');
      var today = new Date();
      today.setHours(0, 0, 0, 0);
      var until = Math.round((exam - today) / 86400000);
      if (isNaN(until)) {
        ui.showError(errorEl, 'That examination date is not valid. Clear it or choose a real date.', [examEl]);
        invalidateOutput();
        return;
      }
      if (until < 0) {
        ui.showError(errorEl, 'The examination date is in the past. Choose a future date or clear the field.', [examEl]);
        invalidateOutput();
        return;
      }
      var limit = until === 0 ? 1 : until;
      if (days > limit) {
        notes.push('The exam is in ' + limit + ' day' + (limit === 1 ? '' : 's') + ', so the plan was shortened from ' + days + ' days to ' + limit + '.');
        days = limit;
      }
    }

    lastInput = {
      topics: topics,
      minutes: minutes,
      days: days,
      difficulty: difficulty,
      exam: examEl.value || ''
    };

    var plan = buildPlan({
      topics: topics,
      minutes: minutes,
      days: days,
      difficulty: difficulty
    });

    planData = plan;
    renderPlan(plan);

    tagEl.textContent = plan.days.length + ' days · ≤' + minutes + ' min/day';
    tagEl.hidden = false;
    emptyEl.hidden = true;
    bodyEl.hidden = false;
    promptWrap.hidden = true;
    toggleBtn.textContent = 'Build an AI enrichment prompt';
    saveBtn.disabled = false;
    saveBtn.innerHTML = ui.icon('i-saved') + 'Save plan';

    savedId = null;
    updateProgress();
    promptEl.textContent = SM.prompts.planner({ plan: plan, topics: topics, minutes: minutes, difficulty: difficulty, exam: examEl.value });
    ui.bindCopyButtons(promptWrap);
    ui.bindCopyButtons(bodyEl);

    SM.store.log('planner', 'Plan: ' + topics.length + ' topics, ' + plan.days.length + ' days');
    ui.toast('Plan ready · ' + plan.totalMinutes + ' minutes scheduled');
    if (notes.length) ui.toast(notes[0]);

    bodyEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  });

  form.addEventListener('reset', function () {
    ui.clearError(errorEl, [topicsEl, minutesEl, daysEl, examEl]);
    planData = null;
    emptyEl.hidden = false;
    bodyEl.hidden = true;
    tagEl.hidden = true;
    summaryEl.innerHTML = '';
    daysWrap.innerHTML = '';
    promptEl.textContent = '';
  });

  toggleBtn.addEventListener('click', function () {
    promptWrap.hidden = !promptWrap.hidden;
    toggleBtn.textContent = promptWrap.hidden ? 'Build an AI enrichment prompt' : 'Hide AI enrichment prompt';
    if (!promptWrap.hidden) {
      SM.store.log('planner', 'Requested AI enrichment prompt');
      promptEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  });

  copyBtn.addEventListener('click', function () {
    if (!planData) return;
    ui.copy(planToText(planData)).then(function (ok) {
      if (ok) ui.toast('Plan copied as text');
      else ui.toast('Copy failed — select the plan text manually', 'error');
    });
  });

  saveBtn.addEventListener('click', function () {
    if (!planData || !lastInput) return;

    var saved = SM.store.savePlan({
      title: lastInput.topics.join(', ').slice(0, 110) + ' — study plan',
      topics: lastInput.topics,
      minutes: lastInput.minutes,
      difficulty: lastInput.difficulty,
      days: planData.days
    });
    savedId = saved.id;

    SM.store.addTopic({
      title: lastInput.topics.join(', ').slice(0, 110),
      tool: 'planner',
      detail: planData.days.length + ' days · ' + lastInput.minutes + ' min/day · ' + lastInput.difficulty,
      prompt: planToText(planData)
    });
    if (promptEl.textContent) {
      SM.store.addPrompt({
        title: 'Study plan enrichment · ' + lastInput.topics.length + ' topics',
        tool: 'planner',
        text: promptEl.textContent
      });
    }

    renderPlan(planData);
    updateProgress();
    saveBtn.innerHTML = ui.icon('i-check') + 'Plan saved';
    saveBtn.disabled = true;
    ui.toast('Plan saved — tick activities as you finish them');
  });

  restoreActivePlan();

  ui.$('#plan-print').addEventListener('click', function () {
    if (!planData) {
      ui.toast('Build a plan first, then print it', 'error');
      return;
    }
    window.print();
  });
})();
