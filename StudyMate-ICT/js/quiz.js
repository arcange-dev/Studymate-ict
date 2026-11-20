/* StudyMate ICT — Feature 2: quiz generator from student notes. */
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
  var bodyEl = ui.$('#quiz-body');
  var outEl = ui.$('#quiz-output');
  var tagEl = ui.$('#quiz-out-tag');
  var saveBtn = ui.$('#quiz-save');
  var last = null;

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

  /* A failed attempt must not leave an older quiz prompt looking like the
     result of the current input. */
  function invalidateOutput() {
    last = null;
    emptyEl.hidden = false;
    bodyEl.hidden = true;
    tagEl.hidden = true;
    saveBtn.disabled = true;
    saveBtn.innerHTML = ui.icon('i-saved') + 'Save prompt';
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    ui.clearError(errorEl, [notesEl]);

    var notes = notesEl.value.trim();
    if (!notes) {
      ui.showError(errorEl, 'Study notes are required. A quiz must be built from a real source, so empty notes are not allowed.', [notesEl]);
      invalidateOutput();
      notesEl.focus();
      return;
    }
    if (notes.length < 30) {
      ui.showError(errorEl, 'These notes are too short to build a reliable quiz. Paste at least a couple of sentences.', [notesEl]);
      invalidateOutput();
      notesEl.focus();
      return;
    }

    var text = SM.prompts.quiz({
      notes: notes,
      num: numEl.value,
      difficulty: diffEl.value,
      type: typeEl.value
    });

    last = {
      title: numEl.value + '-question quiz · ' + typeEl.value.split(' ')[0].toLowerCase(),
      prompt: text,
      notes: notes
    };

    outEl.textContent = text;
    tagEl.textContent = numEl.value + ' questions · ' + wordCount(notes) + ' note words';
    tagEl.hidden = false;
    emptyEl.hidden = true;
    bodyEl.hidden = false;
    saveBtn.disabled = false;
    saveBtn.innerHTML = ui.icon('i-saved') + 'Save prompt';

    SM.store.log('quiz', 'Quiz prompt from ' + wordCount(notes) + '-word notes');
    ui.bindCopyButtons(bodyEl);
    ui.toast('Quiz prompt generated');
  });

  form.addEventListener('reset', function () {
    ui.clearError(errorEl, [notesEl]);
    last = null;
    emptyEl.hidden = false;
    bodyEl.hidden = true;
    tagEl.hidden = true;
    outEl.textContent = '';
    window.setTimeout(refreshCount, 0);
  });

  saveBtn.addEventListener('click', function () {
    if (!last) return;
    SM.store.addPrompt({ title: last.title, tool: 'quiz', text: last.prompt });
    saveBtn.innerHTML = ui.icon('i-check') + 'Saved';
    saveBtn.disabled = true;
    ui.toast('Quiz prompt saved');
  });
})();
