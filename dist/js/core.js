/* StudyMate ICT — pure application logic.
   No DOM, no network, no storage: everything here is a plain function so it can
   be tested in Node (`node --test`) and reused by the browser features. */
(function () {
  'use strict';

  var STOP = ['the', 'and', 'for', 'with', 'that', 'this', 'are', 'was', 'were', 'from', 'have',
    'has', 'into', 'its', 'it', 'a', 'an', 'of', 'to', 'in', 'on', 'is', 'or', 'as', 'be', 'by'];

  function normalise(text) {
    return String(text == null ? '' : text)
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function keywords(text) {
    var seen = [];
    normalise(text).split(' ').forEach(function (w) {
      if (w.length > 2 && STOP.indexOf(w) === -1 && seen.indexOf(w) === -1) seen.push(w);
    });
    return seen;
  }

  var TRUE_WORDS = ['true', 't', 'yes', 'correct'];
  var FALSE_WORDS = ['false', 'f', 'no', 'incorrect'];

  function parseBoolAnswer(value) {
    if (typeof value === 'boolean') return value;
    var v = normalise(value);
    if (TRUE_WORDS.indexOf(v) !== -1) return true;
    if (FALSE_WORDS.indexOf(v) !== -1) return false;
    return null;
  }

  /**
   * Mark one answer.
   * mcq / truefalse are marked exactly. Short answers are keyword-marked:
   * every keyword of the model answer present → correct; at least 60% → review
   * (a human should check the wording); otherwise incorrect.
   */
  function markAnswer(question, given) {
    if (!question) return 'incorrect';
    if (question.type === 'mcq') {
      var idx = typeof given === 'number' ? given : parseInt(given, 10);
      return idx === question.answerIndex ? 'correct' : 'incorrect';
    }
    if (question.type === 'truefalse') {
      var b = parseBoolAnswer(given);
      if (b === null) return 'incorrect';
      return b === question.answer ? 'correct' : 'incorrect';
    }
    var text = normalise(given);
    if (!text) return 'incorrect';
    var expected = question.keywords && question.keywords.length ? question.keywords : keywords(question.answer);
    if (!expected.length) return 'review';
    var hits = expected.filter(function (k) { return text.indexOf(k) !== -1; });
    if (hits.length === expected.length) return 'correct';
    if (hits.length / expected.length >= 0.6) return 'review';
    return 'incorrect';
  }

  /** Grade a whole quiz. `answers` maps question id → the student's answer. */
  function markQuiz(questions, answers) {
    var list = Array.isArray(questions) ? questions : [];
    var given = answers || {};
    var results = list.map(function (q) {
      var answer = Object.prototype.hasOwnProperty.call(given, q.id) ? given[q.id] : '';
      var outcome = markAnswer(q, answer);
      /* Show what the learner chose, not the internal index. */
      var shown = answer;
      if (q.type === 'mcq') {
        var idx = typeof answer === 'number' ? answer : parseInt(answer, 10);
        shown = q.options && q.options[idx] ? q.options[idx] : '';
      } else if (q.type === 'truefalse') {
        var bool = parseBoolAnswer(answer);
        shown = bool === null ? '' : (bool ? 'True' : 'False');
      }
      return {
        id: q.id,
        status: outcome,
        given: shown,
        givenIndex: answer,
        expected: q.type === 'mcq' ? q.options[q.answerIndex] : q.answer,
        explanation: q.explanation || '',
        source: q.source || '',
        prompt: q.prompt
      };
    });
    var counts = { correct: 0, incorrect: 0, review: 0 };
    results.forEach(function (r) { counts[r.status] += 1; });
    var autoTotal = counts.correct + counts.incorrect;
    return {
      results: results,
      correct: counts.correct,
      incorrect: counts.incorrect,
      review: counts.review,
      total: results.length,
      score: autoTotal ? Math.round((counts.correct / autoTotal) * 100) : 0
    };
  }

  function isAnswered(question, value) {
    if (value === undefined || value === null) return false;
    if (question.type === 'truefalse') return parseBoolAnswer(value) !== null;
    return String(value).trim().length > 0;
  }

  var THEMES = ['light', 'dark', 'system'];
  var LEVELS = ['beginner', 'intermediate', 'advanced'];

  function defaultSettings() {
    return {
      theme: 'system',
      level: 'beginner',
      subjects: [],
      reduceMotion: false,
      largerText: false,
      discloseNotes: false
    };
  }

  /** Validate a settings object coming from storage or the UI. Never throws. */
  function normaliseSettings(value) {
    var base = defaultSettings();
    if (!value || typeof value !== 'object') return base;
    if (THEMES.indexOf(value.theme) !== -1) base.theme = value.theme;
    if (LEVELS.indexOf(value.level) !== -1) base.level = value.level;
    if (Array.isArray(value.subjects)) {
      var seen = [];
      base.subjects = value.subjects
        .map(function (s) { return String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, 40); })
        .filter(Boolean)
        .filter(function (s) {
          var lower = s.toLowerCase();
          if (seen.indexOf(lower) !== -1) return false;
          seen.push(lower);
          return true;
        })
        .slice(0, 10);
    }
    base.reduceMotion = value.reduceMotion === true;
    base.largerText = value.largerText === true;
    base.discloseNotes = value.discloseNotes === true;
    return base;
  }

  /** "3 of 15 activities done · 20%". Plan may be null. */
  function planProgress(plan) {
    if (!plan || !Array.isArray(plan.days)) return { done: 0, total: 0, percent: 0 };
    var total = 0;
    var done = 0;
    plan.days.forEach(function (day) {
      (day.sessions || []).forEach(function (s) {
        if (s.kind === 'break') return;
        total += 1;
        if (s.done) done += 1;
      });
    });
    return { done: done, total: total, percent: total ? Math.round((done / total) * 100) : 0 };
  }

  /** Small helper so every AI text field is trimmed to a sane length. */
  function text(value, max) {
    var s = String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
    return s.length > max ? s.slice(0, max - 1) + '…' : s;
  }

  var api = {
    normalise: normalise,
    keywords: keywords,
    parseBoolAnswer: parseBoolAnswer,
    markAnswer: markAnswer,
    markQuiz: markQuiz,
    isAnswered: isAnswered,
    defaultSettings: defaultSettings,
    normaliseSettings: normaliseSettings,
    planProgress: planProgress,
    text: text,
    THEMES: THEMES,
    LEVELS: LEVELS
  };

  if (typeof window !== 'undefined') {
    window.SM = window.SM || {};
    window.SM.core = api;
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
