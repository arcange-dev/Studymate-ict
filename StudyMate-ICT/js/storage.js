/* StudyMate ICT — local persistence layer.
   Everything is stored in LocalStorage under one key. If LocalStorage is
   unavailable (private browsing, file restrictions), an in-memory copy keeps
   the app working for the current session and the UI warns the user. */
(function () {
  'use strict';

  var KEY = 'studymate.ict.v1';
  var memory = null;
  var available = true;
  var listeners = [];

  function blank() {
    return {
      topics: [],
      prompts: [],
      glossSaved: [],
      personalTerms: [],
      activity: [],
      quizzes: [],
      plans: [],
      settings: null,
      counts: { explain: 0, quiz: 0, planner: 0, glossary: 0, source: 0, library: 0 }
    };
  }

  function normalise(data) {
    var base = blank();
    if (!data || typeof data !== 'object') return base;
    base.topics = Array.isArray(data.topics) ? data.topics : [];
    base.prompts = Array.isArray(data.prompts) ? data.prompts : [];
    base.glossSaved = Array.isArray(data.glossSaved) ? data.glossSaved : [];
    base.personalTerms = Array.isArray(data.personalTerms) ? data.personalTerms : [];
    base.activity = Array.isArray(data.activity) ? data.activity : [];
    base.quizzes = Array.isArray(data.quizzes) ? data.quizzes : [];
    base.plans = Array.isArray(data.plans) ? data.plans : [];
    base.settings = data.settings && typeof data.settings === 'object' ? data.settings : null;
    if (data.counts && typeof data.counts === 'object') {
      Object.keys(base.counts).forEach(function (k) {
        base.counts[k] = Number(data.counts[k]) || 0;
      });
    }
    return base;
  }

  function load() {
    if (memory) return memory;
    try {
      var raw = window.localStorage.getItem(KEY);
      memory = normalise(raw ? JSON.parse(raw) : null);
    } catch (err) {
      available = false;
      memory = blank();
    }
    return memory;
  }

  function save() {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(memory));
      available = true;
    } catch (err) {
      available = false;
    }
    notify();
  }

  function notify() {
    listeners.forEach(function (fn) {
      try { fn(memory); } catch (err) { /* a listener must never break saving */ }
    });
  }

  function uid() {
    return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
  }

  function trim(text, max) {
    var s = String(text == null ? '' : text).replace(/\s+/g, ' ').trim();
    return s.length > max ? s.slice(0, max - 1) + '…' : s;
  }

  var store = {
    isAvailable: function () { return available; },

    subscribe: function (fn) {
      if (typeof fn === 'function') listeners.push(fn);
    },

    get: function () { return load(); },

    /** Record a tool use in the activity log and bump its counter. */
    log: function (tool, label) {
      var data = load();
      data.counts[tool] = (data.counts[tool] || 0) + 1;
      data.activity.unshift({ id: uid(), tool: tool, label: trim(label, 120), at: Date.now() });
      data.activity = data.activity.slice(0, 60);
      save();
    },

    addTopic: function (item) {
      var data = load();
      var topic = {
        id: uid(),
        title: trim(item.title, 120) || 'Untitled topic',
        tool: item.tool || 'explain',
        detail: trim(item.detail, 200),
        prompt: String(item.prompt || ''),
        createdAt: Date.now()
      };
      data.topics.unshift(topic);
      data.topics = data.topics.slice(0, 50);
      save();
      return topic;
    },

    removeTopic: function (id) {
      var data = load();
      data.topics = data.topics.filter(function (t) { return t.id !== id; });
      save();
    },

    addPrompt: function (item) {
      var data = load();
      var prompt = {
        id: uid(),
        title: trim(item.title, 120) || 'Saved prompt',
        tool: item.tool || 'library',
        text: String(item.text || ''),
        createdAt: Date.now()
      };
      data.prompts.unshift(prompt);
      data.prompts = data.prompts.slice(0, 50);
      save();
      return prompt;
    },

    removePrompt: function (id) {
      var data = load();
      data.prompts = data.prompts.filter(function (p) { return p.id !== id; });
      save();
    },

    isTermSaved: function (id) {
      return load().glossSaved.indexOf(id) !== -1;
    },

    toggleTerm: function (id) {
      var data = load();
      var i = data.glossSaved.indexOf(id);
      if (i === -1) { data.glossSaved.push(id); } else { data.glossSaved.splice(i, 1); }
      save();
      return i === -1;
    },

    addPersonalTerm: function (item) {
      var data = load();
      var term = {
        id: uid(),
        term: trim(item.term, 60),
        cat: item.cat || 'Personal',
        def: trim(item.def, 400),
        example: trim(item.example, 240),
        createdAt: Date.now()
      };
      data.personalTerms.unshift(term);
      save();
      return term;
    },

    removePersonalTerm: function (id) {
      var data = load();
      data.personalTerms = data.personalTerms.filter(function (t) { return t.id !== id; });
      save();
    },

    /* ---------------- settings ---------------- */

    getSettings: function () {
      var data = load();
      return SM.core ? SM.core.normaliseSettings(data.settings) : (data.settings || {});
    },

    setSettings: function (patch) {
      var data = load();
      var next = Object.assign({}, store.getSettings(), patch || {});
      data.settings = SM.core ? SM.core.normaliseSettings(next) : next;
      save();
      return data.settings;
    },

    /* ---------------- quiz results ---------------- */

    addQuizResult: function (result) {
      var data = load();
      var entry = {
        id: uid(),
        title: trim(result.title, 120) || 'Practice quiz',
        score: clamp(result.score, 0, 100),
        correct: Math.max(0, Number(result.correct) || 0),
        incorrect: Math.max(0, Number(result.incorrect) || 0),
        review: Math.max(0, Number(result.review) || 0),
        total: Math.max(0, Number(result.total) || 0),
        at: Date.now()
      };
      data.quizzes.unshift(entry);
      data.quizzes = data.quizzes.slice(0, 30);
      save();
      return entry;
    },

    removeQuizResult: function (id) {
      var data = load();
      data.quizzes = data.quizzes.filter(function (q) { return q.id !== id; });
      save();
    },

    /* ---------------- study plans ---------------- */

    savePlan: function (item) {
      var data = load();
      var plan = {
        id: uid(),
        title: trim(item.title, 120) || 'Study plan',
        createdAt: Date.now(),
        minutes: Number(item.minutes) || 0,
        difficulty: item.difficulty || '',
        topics: Array.isArray(item.topics) ? item.topics.slice(0, 12) : [],
        days: Array.isArray(item.days) ? item.days : []
      };
      data.plans.unshift(plan);
      data.plans = data.plans.slice(0, 10);
      save();
      return plan;
    },

    getPlan: function (id) {
      var found = null;
      load().plans.forEach(function (p) { if (p.id === id) found = p; });
      return found;
    },

    /** Toggle one session's completion flag and persist it. */
    toggleSession: function (planId, dayIndex, sessionIndex) {
      var data = load();
      var plan = null;
      data.plans.forEach(function (p) { if (p.id === planId) plan = p; });
      if (!plan) return null;
      var day = plan.days[dayIndex];
      if (!day || !Array.isArray(day.sessions)) return plan;
      var session = day.sessions[sessionIndex];
      if (!session || session.kind === 'break') return plan;
      session.done = !session.done;
      save();
      return plan;
    },

    removePlan: function (id) {
      var data = load();
      data.plans = data.plans.filter(function (p) { return p.id !== id; });
      save();
    },

    activePlan: function () {
      var plans = load().plans;
      return plans.length ? plans[0] : null;
    },

    /* ---------------- data management ---------------- */

    exportData: function () {
      return JSON.stringify({
        app: 'StudyMate ICT',
        version: 1,
        exportedAt: new Date().toISOString(),
        data: load()
      }, null, 2);
    },

    /** Import a previously exported file. Returns { ok, message }. */
    importData: function (json) {
      var parsed;
      try {
        parsed = JSON.parse(String(json || ''));
      } catch (err) {
        return { ok: false, message: 'That file is not valid JSON.' };
      }
      var payload = parsed && parsed.app === 'StudyMate ICT' ? parsed.data : parsed;
      if (!payload || typeof payload !== 'object' || !Array.isArray(payload.topics)) {
        return { ok: false, message: 'That file is not a StudyMate ICT backup.' };
      }
      memory = normalise(payload);
      save();
      return { ok: true, message: 'Backup imported' };
    },

    clear: function (what) {
      var data = load();
      if (what === 'topics') data.topics = [];
      if (what === 'prompts') data.prompts = [];
      if (what === 'glossSaved') data.glossSaved = [];
      if (what === 'activity') data.activity = [];
      if (what === 'quizzes') data.quizzes = [];
      if (what === 'plans') data.plans = [];
      save();
    },

    resetAll: function () {
      memory = blank();
      try { window.localStorage.removeItem(KEY); } catch (err) { /* ignore */ }
      notify();
    },

    stats: function () {
      var data = load();
      var total = 0;
      Object.keys(data.counts).forEach(function (k) { total += data.counts[k] || 0; });
      return {
        topics: data.topics.length,
        prompts: data.prompts.length,
        terms: data.glossSaved.length,
        personal: data.personalTerms.length,
        activity: total,
        counts: data.counts,
        quizzes: data.quizzes.slice(0, 5),
        quizCount: data.quizzes.length,
        plans: data.plans.length,
        recent: data.activity.slice(0, 6)
      };
    }
  };

  function clamp(value, min, max) {
    var n = Number(value);
    if (isNaN(n)) return min;
    return Math.min(max, Math.max(min, Math.round(n)));
  }

  window.SM = window.SM || {};
  SM.store = store;
})();
