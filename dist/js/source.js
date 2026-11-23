/* StudyMate ICT — Feature 5: source-grounded learning.
   Builds a prompt that forbids outside knowledge and mandates an exact
   refusal sentence. The coverage panel is a transparent keyword heuristic —
   it is not an AI judgement and is labelled as such. */
(function () {
  'use strict';

  var SM = window.SM;
  var ui = SM.ui;

  var form = ui.$('#source-form');
  if (!form) return;

  var notesEl = ui.$('#source-notes');
  var questionEl = ui.$('#source-question');
  var errorEl = ui.$('#source-error');
  var coverageEl = ui.$('#coverage');
  var coverageText = ui.$('#coverage-text');
  var emptyEl = ui.$('#source-empty');
  var bodyEl = ui.$('#source-body');
  var outEl = ui.$('#source-output');
  var tagEl = ui.$('#source-out-tag');
  var saveBtn = ui.$('#source-save');
  var last = null;

  function invalidateOutput() {
    last = null;
    emptyEl.hidden = false;
    bodyEl.hidden = true;
    tagEl.hidden = true;
    saveBtn.disabled = true;
    saveBtn.innerHTML = ui.icon('i-saved') + 'Save prompt';
  }

  var STOP = ['what', 'which', 'where', 'when', 'why', 'how', 'does', 'do', 'did', 'the', 'and',
    'for', 'with', 'from', 'that', 'this', 'these', 'those', 'are', 'was', 'were', 'can', 'could',
    'should', 'would', 'about', 'into', 'than', 'then', 'there', 'their', 'have', 'has', 'had',
    'need', 'needs', 'used', 'use', 'using', 'between', 'difference', 'explain', 'describe'];

  function keywords(text) {
    var seen = [];
    String(text).toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').split(/\s+/).forEach(function (word) {
      if (word.length > 3 && STOP.indexOf(word) === -1 && seen.indexOf(word) === -1) seen.push(word);
    });
    return seen.slice(0, 8);
  }

  function updateCoverage() {
    var question = questionEl.value.trim();
    var notes = notesEl.value.trim().toLowerCase();

    if (!question || !notes) {
      coverageEl.hidden = true;
      return;
    }

    var keys = keywords(question);
    if (!keys.length) {
      coverageEl.hidden = true;
      return;
    }

    var present = keys.filter(function (k) { return notes.indexOf(k) !== -1; });
    var missing = keys.filter(function (k) { return notes.indexOf(k) === -1; });

    var text;
    if (!present.length) {
      text = 'None of the important words from your question appear in the notes. The notes probably cannot answer this — expect the refusal message.';
    } else if (missing.length) {
      text = present.length + ' of ' + keys.length + ' key words appear in your notes. Missing: ' +
        missing.join(', ') + '. Parts of the answer may be unsupported.';
    } else {
      text = 'All ' + keys.length + ' key words appear in your notes. That is a good sign, but you must still check the answer line by line.';
    }

    coverageText.textContent = text;
    coverageEl.hidden = false;
  }

  var debounce;
  function scheduleCoverage() {
    window.clearTimeout(debounce);
    debounce = window.setTimeout(updateCoverage, 280);
  }
  notesEl.addEventListener('input', scheduleCoverage);
  questionEl.addEventListener('input', scheduleCoverage);

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    ui.clearError(errorEl, [notesEl, questionEl]);

    var notes = notesEl.value.trim();
    var question = questionEl.value.trim();

    if (!notes) {
      ui.showError(errorEl, 'Paste your notes first — this mode refuses to answer from general knowledge.', [notesEl]);
      invalidateOutput();
      notesEl.focus();
      return;
    }
    if (notes.length < 30) {
      ui.showError(errorEl, 'These notes are too short to ground an answer. Paste at least a couple of sentences.', [notesEl]);
      invalidateOutput();
      notesEl.focus();
      return;
    }
    if (!question) {
      ui.showError(errorEl, 'Type the question you want answered from these notes.', [questionEl]);
      invalidateOutput();
      questionEl.focus();
      return;
    }
    if (question.length < 5) {
      ui.showError(errorEl, 'That question is too short. Ask something specific, e.g. “Why does the CPU need cache?”', [questionEl]);
      invalidateOutput();
      questionEl.focus();
      return;
    }

    var text = SM.prompts.grounded({ notes: notes, question: question });
    last = { notes: notes, question: question, prompt: text };

    outEl.textContent = text;
    tagEl.textContent = 'Grounded · refusal required';
    tagEl.hidden = false;
    emptyEl.hidden = true;
    bodyEl.hidden = false;
    saveBtn.disabled = false;
    saveBtn.innerHTML = ui.icon('i-saved') + 'Save prompt';

    updateCoverage();
    SM.store.log('source', 'Grounded question: ' + question);
    ui.bindCopyButtons(bodyEl);
    ui.toast('Grounded prompt ready');
  });

  form.addEventListener('reset', function () {
    ui.clearError(errorEl, [notesEl, questionEl]);
    last = null;
    coverageEl.hidden = true;
    emptyEl.hidden = false;
    bodyEl.hidden = true;
    tagEl.hidden = true;
    outEl.textContent = '';
  });

  saveBtn.addEventListener('click', function () {
    if (!last) return;
    SM.store.addPrompt({
      title: 'Grounded: ' + last.question,
      tool: 'source',
      text: last.prompt
    });
    saveBtn.innerHTML = ui.icon('i-check') + 'Saved';
    saveBtn.disabled = true;
    ui.toast('Grounded prompt saved');
  });
})();
