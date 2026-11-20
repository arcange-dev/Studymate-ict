/* StudyMate ICT — Feature 2: quiz generator and practice runner.
   • "Generate & practise" asks the server-side AI endpoint for questions built
     only from the pasted notes, then renders an interactive quiz and marks it.
   • "Build copy-paste prompt" always works (offline, file://, no key).
   Marking is done in the browser by SM.core.markQuiz, so the answer key is
   checked deterministically instead of by another model. */
(function () {
  'use strict';

  var SM = window.SM;
  var ui = SM.ui;

  var form = ui.$('#quiz-form');
  if (!form) return;

  var notesEl = ui.$('#quiz-notes');
  var countEl = ui.$('#quiz-count');
  var numEl = ui.$('#quiz-num');
  var diffEl = ui.$('#quiz-diff');
  var typeEl = ui.$('#quiz-type');
  var errorEl = ui.$('#quiz-error');
  var emptyEl = ui.$('#quiz-empty');
  var promptBodyEl = ui.$('#quiz-body');
  var outEl = ui.$('#quiz-output');
  var tagEl = ui.$('#quiz-out-tag');
  var promptSaveBtn = ui.$('#quiz-save');
  var generateBtn = ui.$('#quiz-generate');
  var aiPanel = ui.$('#quiz-ai-panel');
  var aiNote = ui.$('#quiz-ai-note');
  var disclosure = ui.$('#quiz-disclosure');
  var loadingEl = ui.$('#quiz-loading');
  var runnerEl = ui.$('#quiz-runner');
  var questionsEl = ui.$('#quiz-questions');
  var submitBtn = ui.$('#quiz-submit');
  var retryBtn = ui.$('#quiz-retry');
  var markErrorEl = ui.$('#quiz-mark-error');
  var resultEl = ui.$('#quiz-result');

  var lastPrompt = null;
  var quiz = null;
  var answers = {};
  var busy = false;

  function wordCount(text) {
    var t = text.trim();
    return t ? t.split(/\s+/).length : 0;
  }

  function refreshCount() {
    var n = wordCount(notesEl.value);
    countEl.textContent = n + (n === 1 ? ' word' : ' words');
  }

  notesEl.addEventListener('input', refreshCount);
  refreshCount();

  var TYPE_TO_API = {
    'Multiple choice (4 options)': 'mcq',
    'True or false': 'truefalse',
    'Short answer': 'short',
    'Mixed': 'mixed'
  };
  var DIFF_TO_API = {
    'Easy — recall and recognition': 'easy',
    'Medium — understanding and application': 'medium',
    'Hard — analysis and troubleshooting': 'hard'
  };

  function syncAiState() {
    var state = SM.ai.state();
    aiPanel.dataset.mode = state.mode;
    generateBtn.disabled = busy || state.mode !== 'live';
    disclosure.hidden = state.mode !== 'live';

    if (state.mode === 'live') {
      aiNote.textContent = 'AI is enabled (' + (state.model || state.provider || 'model') + '). Questions are generated from your notes only, then marked in this browser.';
    } else if (state.mode === 'prompt') {
      aiNote.textContent = 'No API key is configured, so live quiz generation is off. Build the prompt instead — it pins the AI to your notes.';
    } else if (state.mode === 'offline') {
      aiNote.textContent = 'You are offline or opened the app from disk. Prompt mode still works; live generation needs a connection.';
    } else {
      aiNote.textContent = 'Checking whether this deployment has AI enabled…';
    }
  }

  function clearRunner() {
    quiz = null;
    answers = {};
    runnerEl.hidden = true;
    resultEl.hidden = true;
    resultEl.textContent = '';
    questionsEl.textContent = '';
    submitBtn.hidden = false;
    markErrorEl.hidden = true;
  }

  function clearPrompt() {
    lastPrompt = null;
    promptBodyEl.hidden = true;
    outEl.textContent = '';
    tagEl.hidden = true;
  }

  function readInput() {
    ui.clearError(errorEl, [notesEl]);
    var notes = notesEl.value.trim();

    if (!notes) {
      ui.showError(errorEl, 'Study notes are required. A quiz must be built from a real source, so empty notes are not allowed.', [notesEl]);
      notesEl.focus();
      return null;
    }
    if (notes.length < 50) {
      ui.showError(errorEl, 'These notes are too short to build a reliable quiz. Paste at least a couple of sentences.', [notesEl]);
      notesEl.focus();
      return null;
    }
    if (notes.length > 12000) {
      ui.showError(errorEl, 'These notes are too long for one request. Split them into sections of 12 000 characters or fewer.', [notesEl]);
      notesEl.focus();
      return null;
    }
    return {
      notes: notes,
      count: parseInt(numEl.value, 10),
      difficulty: DIFF_TO_API[diffEl.value] || 'medium',
      type: TYPE_TO_API[typeEl.value] || 'mixed',
      typeLabel: typeEl.value,
      difficultyLabel: diffEl.value
    };
  }

  /* ---------------------------------------------------------- runner UI */

  function node(tag, className, text) {
    var el = document.createElement(tag);
    if (className) el.className = className;
    if (text != null) el.textContent = text;
    return el;
  }

  function renderQuiz(data, input) {
    quiz = data.questions;
    answers = {};
    questionsEl.textContent = '';
    resultEl.hidden = true;
    resultEl.textContent = '';
    submitBtn.hidden = false;
    markErrorEl.hidden = true;

    data.questions.forEach(function (q) {
      var fieldset = node('fieldset', 'quiz-q');
      var legend = node('legend', null, q.id + '. ' + q.prompt);
      fieldset.appendChild(legend);

      if (q.type === 'mcq') {
        q.options.forEach(function (option, index) {
          var label = node('label', 'quiz-option');
          var radio = document.createElement('input');
          radio.type = 'radio';
          radio.name = 'q-' + q.id;
          radio.value = String(index);
          radio.addEventListener('change', function () { answers[q.id] = index; });
          label.appendChild(radio);
          label.appendChild(node('span', null, option));
          fieldset.appendChild(label);
        });
      } else if (q.type === 'truefalse') {
        [['True', true], ['False', false]].forEach(function (pair) {
          var label = node('label', 'quiz-option');
          var radio = document.createElement('input');
          radio.type = 'radio';
          radio.name = 'q-' + q.id;
          radio.value = String(pair[1]);
          radio.addEventListener('change', function () { answers[q.id] = pair[1]; });
          label.appendChild(radio);
          label.appendChild(node('span', null, pair[0]));
          fieldset.appendChild(label);
        });
      } else {
        var input2 = document.createElement('input');
        input2.type = 'text';
        input2.className = 'quiz-text';
        input2.placeholder = 'Your answer in one or two sentences';
        input2.setAttribute('aria-label', 'Answer to question ' + q.id);
        input2.addEventListener('input', function () { answers[q.id] = input2.value; });
        fieldset.appendChild(input2);
      }

      questionsEl.appendChild(fieldset);
    });

    runnerEl.hidden = false;
    emptyEl.hidden = true;
    tagEl.textContent = data.questions.length + ' questions · ' + input.difficultyLabel.split(' —')[0] + ' · ' + wordCount(input.notes) + ' note words';
    tagEl.hidden = false;
  }

  function renderResult(marked) {
    resultEl.textContent = '';

    var head = node('div', 'result-head');
    head.appendChild(node('p', 'result-score', marked.score + '%'));
    var summary = 'You answered ' + marked.correct + ' of ' + marked.total + ' correctly.';
    if (marked.review) summary += ' ' + marked.review + ' short answer' + (marked.review === 1 ? '' : 's') + ' need a quick self-check.';
    head.appendChild(node('p', 'result-summary', summary));
    resultEl.appendChild(head);

    var wrong = marked.results.filter(function (r) { return r.status !== 'correct'; });
    if (!wrong.length) {
      resultEl.appendChild(node('p', 'result-perfect', 'Every answer was correct. Try a harder difficulty or more questions next time.'));
    } else {
      var h = node('h3', null, 'Review');
      resultEl.appendChild(h);
      var list = node('ul', 'result-list');
      wrong.forEach(function (r) {
        var li = node('li', 'result-item');
        li.appendChild(node('p', 'result-q', r.id + '. ' + r.prompt));
        li.appendChild(node('p', 'result-given', 'Your answer: ' + (r.given === '' || r.given == null ? '— not answered —' : String(r.given))));
        var expectedValue = typeof r.expected === 'boolean' ? (r.expected ? 'True' : 'False') : r.expected;
        li.appendChild(node('p', 'result-expected', 'Correct answer: ' + expectedValue));
        if (r.explanation) li.appendChild(node('p', 'result-why', r.explanation));
        if (r.source) li.appendChild(node('p', 'result-source', 'From your notes: “' + r.source + '”'));
        if (r.status === 'review') li.appendChild(node('span', 'result-flag', 'Marked for self-check — your wording may still be right'));
        list.appendChild(li);
      });
      resultEl.appendChild(list);
    }

    var saveNote = node('p', 'tiny', 'This score was saved to your dashboard.');
    resultEl.appendChild(saveNote);
    resultEl.hidden = false;
    submitBtn.hidden = true;

    SM.store.addQuizResult({
      title: quiz.length + '-question quiz · ' + (quiz[0].type === 'mcq' ? 'multiple choice' : quiz[0].type),
      score: marked.score,
      correct: marked.correct,
      incorrect: marked.incorrect,
      review: marked.review,
      total: marked.total
    });
    SM.store.log('quiz', 'Practised ' + quiz.length + ' AI questions · ' + marked.score + '%');
  }

  /* ------------------------------------------------------------ AI path */

  function runGenerate(input) {
    if (busy) return;
    busy = true;
    generateBtn.disabled = true;
    clearRunner();
    clearPrompt();
    emptyEl.hidden = true;
    errorEl.hidden = true;
    loadingEl.hidden = false;
    generateBtn.setAttribute('aria-busy', 'true');

    SM.ai.quiz(input).then(function (data) {
      renderQuiz(data, input);
      runnerEl.scrollIntoView({ block: 'nearest', behavior: SM.store.getSettings().reduceMotion ? 'auto' : 'smooth' });
    }).catch(function (err) {
      ui.showError(errorEl, err.message || 'The AI request failed. Try again.', []);
      emptyEl.hidden = false;
    }).then(function () {
      busy = false;
      loadingEl.hidden = true;
      generateBtn.removeAttribute('aria-busy');
      syncAiState();
    });
  }

  generateBtn.addEventListener('click', function () {
    var input = readInput();
    if (!input) {
      clearRunner();
      clearPrompt();
      emptyEl.hidden = false;
      return;
    }
    runGenerate(input);
  });

  retryBtn.addEventListener('click', function () {
    var input = readInput();
    if (!input) return;
    runGenerate(input);
  });

  submitBtn.addEventListener('click', function () {
    if (!quiz) return;
    var unanswered = quiz.filter(function (q) {
      return !SM.core.isAnswered(q, Object.prototype.hasOwnProperty.call(answers, q.id) ? answers[q.id] : '');
    });
    if (unanswered.length) {
      ui.showError(markErrorEl, 'Answer all ' + quiz.length + ' questions first — ' + unanswered.length + ' still blank.', []);
      var first = questionsEl.querySelector('.quiz-q');
      if (first) first.scrollIntoView({ block: 'center', behavior: 'auto' });
      return;
    }
    markErrorEl.hidden = true;
    var marked = SM.core.markQuiz(quiz, answers);
    renderResult(marked);
    resultEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    ui.toast('Marked · ' + marked.score + '%');
  });

  SM.ai.subscribe(syncAiState);
  syncAiState();

  /* ---------------------------------------------------- prompt (offline) */

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    var input = readInput();
    if (!input) {
      clearPrompt();
      emptyEl.hidden = false;
      return;
    }

    var text = SM.prompts.quiz({
      notes: input.notes,
      num: String(input.count),
      difficulty: input.difficultyLabel,
      type: input.typeLabel
    });

    lastPrompt = {
      title: input.count + '-question quiz · ' + input.typeLabel.split(' ')[0].toLowerCase(),
      prompt: text,
      notes: input.notes
    };

    outEl.textContent = text;
    tagEl.textContent = input.count + ' questions · ' + wordCount(input.notes) + ' note words';
    tagEl.hidden = false;
    emptyEl.hidden = true;
    promptBodyEl.hidden = false;
    promptSaveBtn.disabled = false;
    promptSaveBtn.innerHTML = ui.icon('i-saved') + 'Save prompt';

    SM.store.log('quiz', 'Quiz prompt from ' + wordCount(input.notes) + '-word notes');
    ui.bindCopyButtons(promptBodyEl);
    ui.toast('Quiz prompt generated');
  });

  form.addEventListener('reset', function () {
    ui.clearError(errorEl, [notesEl]);
    clearRunner();
    clearPrompt();
    emptyEl.hidden = false;
    loadingEl.hidden = true;
    window.setTimeout(refreshCount, 0);
  });

  promptSaveBtn.addEventListener('click', function () {
    if (!lastPrompt) return;
    SM.store.addPrompt({ title: lastPrompt.title, tool: 'quiz', text: lastPrompt.prompt });
    promptSaveBtn.innerHTML = ui.icon('i-check') + 'Saved';
    promptSaveBtn.disabled = true;
    ui.toast('Quiz prompt saved');
  });
})();
