/* StudyMate ICT — Feature 1: ICT concept explainer. */
(function () {
  'use strict';

  var SM = window.SM;
  var ui = SM.ui;

  var form = ui.$('#explain-form');
  if (!form) return;

  var topicEl = ui.$('#explain-topic');
  var levelEl = ui.$('#explain-level');
  var priorEl = ui.$('#explain-prior');
  var lengthEl = ui.$('#explain-length');
  var errorEl = ui.$('#explain-error');
  var emptyEl = ui.$('#explain-empty');
  var bodyEl = ui.$('#explain-body');
  var outEl = ui.$('#explain-output');
  var tagEl = ui.$('#explain-out-tag');
  var saveBtn = ui.$('#explain-save');
  var last = null;

  function invalidateOutput() {
    last = null;
    emptyEl.hidden = false;
    bodyEl.hidden = true;
    tagEl.hidden = true;
    saveBtn.disabled = true;
    saveBtn.innerHTML = ui.icon('i-saved') + 'Save to Saved Learning';
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    ui.clearError(errorEl, [topicEl]);
    var topic = topicEl.value.trim();

    if (!topic) {
      ui.showError(errorEl, 'Enter an ICT topic to explain — for example “RAM” or “how a CPU works”.', [topicEl]);
      invalidateOutput();
      topicEl.focus();
      return;
    }
    if (topic.length < 2) {
      ui.showError(errorEl, 'That topic is too short. Use at least two characters.', [topicEl]);
      invalidateOutput();
      topicEl.focus();
      return;
    }

    var text = SM.prompts.explainer({
      topic: topic,
      level: levelEl.value,
      prior: priorEl.value,
      length: lengthEl.value
    });

    last = { topic: topic, level: levelEl.value, length: lengthEl.value, prompt: text };
    outEl.textContent = text;
    tagEl.textContent = lengthEl.value.charAt(0).toUpperCase() + lengthEl.value.slice(1) + ' · 9 sections';
    tagEl.hidden = false;
    emptyEl.hidden = true;
    bodyEl.hidden = false;
    saveBtn.disabled = false;
    saveBtn.innerHTML = ui.icon('i-saved') + 'Save to Saved Learning';

    SM.store.log('explain', 'Explained “' + topic + '”');
    ui.bindCopyButtons(bodyEl);
    ui.toast('Prompt ready — ' + topic);
    outEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  });

  form.addEventListener('reset', function () {
    ui.clearError(errorEl, [topicEl]);
    last = null;
    emptyEl.hidden = false;
    bodyEl.hidden = true;
    tagEl.hidden = true;
    outEl.textContent = '';
  });

  saveBtn.addEventListener('click', function () {
    if (!last) return;
    SM.store.addTopic({
      title: last.topic,
      tool: 'explain',
      detail: last.level + ' · ' + last.length + ' length',
      prompt: last.prompt
    });
    saveBtn.innerHTML = ui.icon('i-check') + 'Saved';
    saveBtn.disabled = true;
    ui.toast('Topic saved to Saved Learning');
  });
})();
