/* StudyMate ICT — Feature 1: ICT concept explainer.
   Two honest paths:
     • "Explain with AI" calls this deployment's own /api/ai endpoint (only when
       the server reports a configured key) and renders validated sections.
     • "Build copy-paste prompt" keeps working everywhere, including offline and
       from file://, for learners who run prompts in another assistant. */
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
  var promptBodyEl = ui.$('#explain-body');
  var outEl = ui.$('#explain-output');
  var tagEl = ui.$('#explain-out-tag');
  var promptSaveBtn = ui.$('#explain-save');
  var aiBtn = ui.$('#explain-ai');
  var aiPanel = ui.$('#explain-ai-panel');
  var aiNote = ui.$('#explain-ai-note');
  var disclosure = ui.$('#explain-disclosure');
  var loadingEl = ui.$('#explain-loading');
  var resultEl = ui.$('#explain-ai-result');
  var sectionsEl = ui.$('#explain-ai-sections');
  var retryBtn = ui.$('#explain-retry');
  var aiSaveBtn = ui.$('#explain-ai-save');

  var lastPrompt = null;
  var lastExplanation = null;
  var busy = false;

  var LEVEL_TO_API = {
    'Beginner (first ICT course)': 'beginner',
    'TVET Level 4 learner': 'beginner',
    'Intermediate (some hardware knowledge)': 'intermediate',
    'Advanced / exam revision': 'advanced'
  };
  var LEVEL_FROM_SETTING = {
    beginner: 'Beginner (first ICT course)',
    intermediate: 'Intermediate (some hardware knowledge)',
    advanced: 'Advanced / exam revision'
  };

  /* Apply the saved default level once, without overwriting a deliberate choice. */
  (function prefillLevel() {
    var saved = LEVEL_FROM_SETTING[SM.store.getSettings().level];
    if (saved) levelEl.value = saved;
  })();

  function syncAiState() {
    var state = SM.ai.state();
    var mode = state.mode;
    aiPanel.dataset.mode = mode;
    aiBtn.disabled = busy || mode !== 'live';
    disclosure.hidden = mode !== 'live';

    if (mode === 'live') {
      aiNote.textContent = 'AI is enabled on this deployment (' + (state.model || state.provider || 'model') +
        '). “Explain with AI” sends your topic to the provider; the API key stays on the server.';
    } else if (mode === 'prompt') {
      aiNote.textContent = 'No API key is configured, so live AI is off. Every tool still works — build the prompt and run it in an assistant you are allowed to use.';
    } else if (mode === 'offline') {
      aiNote.textContent = 'You are offline or opened the app from disk, so live AI is unavailable. Prompt mode works fully offline.';
    } else {
      aiNote.textContent = 'Checking whether this deployment has AI enabled…';
    }
  }

  function clearAiResult() {
    lastExplanation = null;
    resultEl.hidden = true;
    sectionsEl.textContent = '';
    tagEl.hidden = true;
  }

  function clearPrompt() {
    lastPrompt = null;
    promptBodyEl.hidden = true;
    outEl.textContent = '';
  }

  function resetOutputs() {
    clearAiResult();
    clearPrompt();
    emptyEl.hidden = false;
    tagEl.hidden = true;
  }

  function readInput() {
    ui.clearError(errorEl, [topicEl]);
    var topic = topicEl.value.trim();

    if (!topic) {
      ui.showError(errorEl, 'Enter an ICT topic to explain — for example “RAM” or “how a CPU works”.', [topicEl]);
      topicEl.focus();
      return null;
    }
    if (topic.length < 2) {
      ui.showError(errorEl, 'That topic is too short. Use at least two characters.', [topicEl]);
      topicEl.focus();
      return null;
    }
    if (topic.length > 120) {
      ui.showError(errorEl, 'Keep the topic under 120 characters — one concept works best.', [topicEl]);
      topicEl.focus();
      return null;
    }
    return {
      topic: topic,
      levelLabel: levelEl.value,
      level: LEVEL_TO_API[levelEl.value] || 'beginner',
      prior: priorEl.value,
      length: lengthEl.value
    };
  }

  /* ------------------------------------------------------------ AI path */

  function node(tag, className, text) {
    var el = document.createElement(tag);
    if (className) el.className = className;
    if (text != null) el.textContent = text;
    return el;
  }

  function section(title, id) {
    var wrap = node('section', 'ai-section');
    wrap.setAttribute('aria-labelledby', id);
    var h = node('h3', null, title);
    h.id = id;
    wrap.appendChild(h);
    return wrap;
  }

  function renderExplanation(data, input) {
    sectionsEl.textContent = '';

    var def = section('1. Definition', 'ai-s1');
    def.appendChild(node('p', 'ai-strong', data.definition));
    sectionsEl.appendChild(def);

    if (data.whyItMatters) {
      var why = section('2. Why it matters', 'ai-s2');
      why.appendChild(node('p', null, data.whyItMatters));
      sectionsEl.appendChild(why);
    }

    var steps = section('3. Step by step', 'ai-s3');
    var ol = node('ol', 'ai-steps');
    data.steps.forEach(function (s) { ol.appendChild(node('li', null, s)); });
    steps.appendChild(ol);
    sectionsEl.appendChild(steps);

    if (data.example) {
      var ex = section('4. Practical example', 'ai-s4');
      ex.appendChild(node('p', null, data.example));
      sectionsEl.appendChild(ex);
    }

    if (data.realWorld) {
      var rw = section('5. Real-world application', 'ai-s5');
      rw.appendChild(node('p', null, data.realWorld));
      sectionsEl.appendChild(rw);
    }

    if (data.misconceptions.length) {
      var mis = section('6. Common misconceptions', 'ai-s6');
      var dl = node('dl', 'ai-misconceptions');
      data.misconceptions.forEach(function (m) {
        dl.appendChild(node('dt', null, '“' + m.belief + '”'));
        dl.appendChild(node('dd', null, m.correction));
      });
      mis.appendChild(dl);
      sectionsEl.appendChild(mis);
    }

    if (data.vocabulary.length) {
      var voc = section('7. Technical vocabulary', 'ai-s7');
      var table = node('dl', 'ai-vocab');
      data.vocabulary.forEach(function (v) {
        table.appendChild(node('dt', null, v.term));
        table.appendChild(node('dd', null, v.meaning));
      });
      voc.appendChild(table);
      sectionsEl.appendChild(voc);
    }

    var sum = section('8. Summary', 'ai-s8');
    sum.appendChild(node('p', 'ai-summary', data.summary));
    sectionsEl.appendChild(sum);

    var rev = section('9. Revision questions', 'ai-s9');
    var p = node('p', 'muted', 'Answer each question before opening the answer.');
    rev.appendChild(p);
    data.questions.forEach(function (q, i) {
      var details = node('details', 'ai-qa');
      details.appendChild(node('summary', null, (i + 1) + '. ' + q.q));
      details.appendChild(node('p', null, q.a));
      rev.appendChild(details);
    });
    sectionsEl.appendChild(rev);

    tagEl.textContent = input.levelLabel.split(' (')[0] + ' · AI explanation';
    tagEl.hidden = false;
    aiSaveBtn.disabled = false;
    aiSaveBtn.innerHTML = ui.icon('i-saved') + 'Save explanation';
  }

  function toText(data, topic) {
    var lines = ['StudyMate ICT — ' + topic, '', 'DEFINITION', data.definition, '', 'WHY IT MATTERS', data.whyItMatters, '', 'STEP BY STEP'];
    data.steps.forEach(function (s, i) { lines.push((i + 1) + '. ' + s); });
    lines.push('', 'PRACTICAL EXAMPLE', data.example, '', 'REAL-WORLD APPLICATION', data.realWorld, '', 'COMMON MISCONCEPTIONS');
    data.misconceptions.forEach(function (m) { lines.push('- ' + m.belief + ' → ' + m.correction); });
    lines.push('', 'VOCABULARY');
    data.vocabulary.forEach(function (v) { lines.push('- ' + v.term + ': ' + v.meaning); });
    lines.push('', 'SUMMARY', data.summary, '', 'REVISION QUESTIONS');
    data.questions.forEach(function (q, i) { lines.push((i + 1) + '. ' + q.q + '  →  ' + q.a); });
    lines.push('', 'Generated by an AI model. Check every claim against your notes, textbook or lecturer.');
    return lines.join('\n');
  }

  function runAi(input) {
    if (busy) return;
    busy = true;
    aiBtn.disabled = true;
    clearAiResult();
    clearPrompt();
    emptyEl.hidden = true;
    errorEl.hidden = true;
    loadingEl.hidden = false;
    aiBtn.setAttribute('aria-busy', 'true');

    SM.ai.explain(input).then(function (data) {
      lastExplanation = { data: data, input: input };
      renderExplanation(data, input);
      resultEl.hidden = false;
      SM.store.log('explain', 'AI explained “' + input.topic + '”');
      resultEl.scrollIntoView({ block: 'nearest', behavior: SM.store.getSettings().reduceMotion ? 'auto' : 'smooth' });
    }).catch(function (err) {
      ui.showError(errorEl, err.message || 'The AI request failed. Try again.', []);
      retryBtn.hidden = false;
      emptyEl.hidden = false;
    }).then(function () {
      busy = false;
      loadingEl.hidden = true;
      aiBtn.removeAttribute('aria-busy');
      syncAiState();
    });
  }

  aiBtn.addEventListener('click', function () {
    var input = readInput();
    if (!input) return;
    runAi(input);
  });

  retryBtn.addEventListener('click', function () {
    var input = readInput();
    if (!input) return;
    runAi(input);
  });

  aiSaveBtn.addEventListener('click', function () {
    if (!lastExplanation) return;
    SM.store.addTopic({
      title: lastExplanation.input.topic,
      tool: 'explain',
      detail: 'AI explanation · ' + lastExplanation.input.levelLabel.split(' (')[0],
      prompt: toText(lastExplanation.data, lastExplanation.input.topic)
    });
    aiSaveBtn.innerHTML = ui.icon('i-check') + 'Saved';
    aiSaveBtn.disabled = true;
    ui.toast('Explanation saved to Saved Learning');
  });

  SM.ai.subscribe(function () {
    syncAiState();
    if (SM.ai.state().mode === 'live' && SM.ai.state().model) {
      var pill = ui.$('#about-ai-pill');
      if (pill) pill.textContent = 'AI live · ' + SM.ai.state().model;
    }
  });
  syncAiState();

  /* ------------------------------------------------ prompt (offline) path */

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    var input = readInput();
    if (!input) {
      resetOutputs();
      return;
    }

    var text = SM.prompts.explainer({
      topic: input.topic,
      level: input.levelLabel,
      prior: input.prior,
      length: input.length
    });

    lastPrompt = { topic: input.topic, level: input.levelLabel, length: input.length, prompt: text };
    outEl.textContent = text;
    tagEl.textContent = input.length.charAt(0).toUpperCase() + input.length.slice(1) + ' · copy-paste prompt';
    tagEl.hidden = false;
    emptyEl.hidden = true;
    promptBodyEl.hidden = false;
    promptSaveBtn.disabled = false;
    promptSaveBtn.innerHTML = ui.icon('i-saved') + 'Save prompt';

    SM.store.log('explain', 'Prompt for “' + input.topic + '”');
    ui.bindCopyButtons(promptBodyEl);
    ui.toast('Prompt ready — ' + input.topic);
    promptBodyEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  });

  form.addEventListener('reset', function () {
    ui.clearError(errorEl, [topicEl]);
    retryBtn.hidden = false;
    resetOutputs();
    loadingEl.hidden = true;
  });

  promptSaveBtn.addEventListener('click', function () {
    if (!lastPrompt) return;
    SM.store.addTopic({
      title: lastPrompt.topic,
      tool: 'explain',
      detail: lastPrompt.level + ' · ' + lastPrompt.length + ' length',
      prompt: lastPrompt.prompt
    });
    promptSaveBtn.innerHTML = ui.icon('i-check') + 'Saved';
    promptSaveBtn.disabled = true;
    ui.toast('Topic saved to Saved Learning');
  });
})();
