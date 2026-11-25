/* StudyMate ICT — the AI request/response contract.
   -------------------------------------------------
   One copy of the prompts, input validation, JSON parsing and response
   validation. It is used by both AI paths:

     • the browser, in js/local-ai.js ("bring your own key"), and
     • the server endpoint, in sites/ai-core.js (the deployment's own key).

   It is a classic script rather than an ES module so the app still runs
   straight from disk (file://), where modules are blocked. It publishes itself
   as `SMAiContract` on the global object; sites/ai-core.js imports it for that
   side effect and re-exports the pieces the server needs.

   Nothing here holds a key, reads storage or makes a network request.
*/
(function (root) {
  'use strict';

  var LIMITS = {
    topicMin: 2,
    topicMax: 120,
    priorMax: 200,
    notesMin: 50,
    notesMax: 12000,
    questionMin: 3,
    questionMax: 20,
    // Both servers already answer 413 for an oversized body; this is the
    // limit they check against.
    bodyMax: 65536
  };

  var LEVELS = {
    beginner: 'Beginner (first ICT course)',
    intermediate: 'Intermediate (some hardware knowledge)',
    advanced: 'Advanced / exam revision'
  };
  var LENGTHS = {
    short: 'short (about 150 words per section)',
    medium: 'medium (about 250 words per section)',
    long: 'detailed (about 400 words per section)'
  };
  var DIFFICULTIES = {
    easy: 'Easy — recall and recognition',
    medium: 'Medium — understanding and application',
    hard: 'Hard — analysis and troubleshooting'
  };
  var QUIZ_TYPES = {
    mixed: 'Mixed — multiple choice, true/false and short answer',
    mcq: 'Multiple choice',
    truefalse: 'True or false',
    short: 'Short answer'
  };

  var JSON_RULES = [
    'Return ONE JSON object and nothing else. No markdown, no code fences, no commentary before or after.',
    'Never invent sources, statistics, dates, quotations or textbook page numbers.',
    'If you are unsure of a detail, say so inside the text instead of guessing.'
  ].join(' ');

  class AiError extends Error {
    constructor(code, message) {
      super(message);
      this.name = 'AiError';
      this.code = code;
    }
  }

  function clean(value) {
    return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
  }

  function pick(value, table, fallback) {
    var v = clean(value).toLowerCase();
    if (!v) return fallback;
    return Object.prototype.hasOwnProperty.call(table, v) ? v : null;
  }

  function fail(status, message) {
    return { ok: false, status: status, message: message };
  }

  /* ----------------------------------------------------------- validation */

  /** Check an explain/quiz request. Returns { ok, op, payload } or { ok:false, status, message }. */
  function validateRequest(body) {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return fail(400, 'Send a JSON object with an "op" field.');
    }
    var op = String(body.op || '');
    if (op === 'explain') return validateExplainInput(body);
    if (op === 'quiz') return validateQuizInput(body);
    return fail(400, 'Unknown operation. Use "explain" or "quiz".');
  }

  function validateExplainInput(body) {
    var topic = clean(body.topic);
    if (topic.length < LIMITS.topicMin) return fail(400, 'Enter an ICT topic with at least two characters.');
    if (topic.length > LIMITS.topicMax) return fail(400, 'That topic is too long (maximum ' + LIMITS.topicMax + ' characters).');
    var level = pick(body.level, LEVELS, 'beginner');
    if (!level) return fail(400, 'Choose a level of beginner, intermediate or advanced.');
    var length = pick(body.length, LENGTHS, 'medium');
    if (!length) return fail(400, 'Choose a length of short, medium or long.');
    return {
      ok: true,
      op: 'explain',
      payload: { topic: topic, level: level, length: length, prior: clean(body.prior).slice(0, LIMITS.priorMax) }
    };
  }

  function validateQuizInput(body) {
    var notes = String(body.notes == null ? '' : body.notes).trim();
    if (notes.length < LIMITS.notesMin) {
      return fail(400, 'Paste at least a couple of sentences (' + LIMITS.notesMin + ' characters or more) to build a quiz from.');
    }
    if (notes.length > LIMITS.notesMax) {
      return fail(400, 'Those notes are too long (maximum ' + LIMITS.notesMax + ' characters). Split them into sections.');
    }
    var count = parseInt(body.count, 10);
    if (isNaN(count) || count < LIMITS.questionMin || count > LIMITS.questionMax) {
      return fail(400, 'Choose between ' + LIMITS.questionMin + ' and ' + LIMITS.questionMax + ' questions.');
    }
    var difficulty = pick(body.difficulty, DIFFICULTIES, 'medium');
    if (!difficulty) return fail(400, 'Choose a difficulty of easy, medium or hard.');
    var type = pick(body.type, QUIZ_TYPES, 'mixed');
    if (!type) return fail(400, 'Choose a question type of mixed, mcq, truefalse or short.');
    return {
      ok: true,
      op: 'quiz',
      payload: { notes: notes, count: count, difficulty: difficulty, type: type }
    };
  }

  /* --------------------------------------------------------- prompt build */

  function buildMessages(op, payload) {
    if (op === 'explain') {
      var system = [
        'You are an experienced ICT tutor teaching computer systems, networking, programming, databases, operating systems and cybersecurity.',
        'You write in plain, everyday language for the stated level and you define every technical term the first time you use it.',
        JSON_RULES,
        'Schema: {"definition":string,"whyItMatters":string,"steps":string[3-7],"example":string,"realWorld":string,"misconceptions":[{"belief":string,"correction":string}],"vocabulary":[{"term":string,"meaning":string}],"summary":string,"questions":[{"q":string,"a":string}]}',
        'Give exactly 5 objects in "questions". Give 2-3 misconceptions and 3-6 vocabulary items.'
      ].join('\n');
      var user = [
        'Topic: ' + payload.topic,
        'Learner level: ' + LEVELS[payload.level] + '.',
        'Prior knowledge: ' + (payload.prior || 'none — treat me as a complete beginner') + '.',
        'Length per section: ' + LENGTHS[payload.length] + '.',
        'Explain this topic as JSON matching the schema. Keep "steps" as short numbered instructions, and make "questions" test understanding rather than definitions.',
        'Make the examples concrete: something the learner could point at on a real computer or in a real network.'
      ].join('\n');
      return [{ role: 'system', content: system }, { role: 'user', content: user }];
    }

    var typeRule = {
      mcq: 'Every question must be type "mcq" with exactly four unique options and one correct answer.',
      truefalse: 'Every question must be type "truefalse" with a boolean answer.',
      short: 'Every question must be type "short" with a model answer of one or two sentences.',
      mixed: 'Use a mix of "mcq" (about half), "truefalse" (about a quarter) and "short" (about a quarter).'
    }[payload.type];

    var systemQ = [
      'You are an ICT examiner writing a practice quiz. You are strict about accuracy.',
      'The supplied notes are the ONLY permitted source of facts. Do not use outside knowledge, names, numbers or examples that are absent from the notes.',
      JSON_RULES,
      'Schema: {"questions":[{"id":number,"type":"mcq"|"truefalse"|"short","prompt":string,"options":string[4]?,"answerIndex":number?,"answer":boolean|string?,"explanation":string,"source":string}]}',
      'For "mcq" include options and answerIndex (0-3). For "truefalse" include a boolean answer. For "short" include a string answer.',
      'In "source", quote the phrase from the notes that supports the answer. In "explanation", say in one sentence why the answer is correct.',
      'Never use "all of the above" or "none of the above". If the notes cannot support that many distinct questions, return fewer and do not pad.'
    ].join('\n');

    var userQ = [
      'SOURCE NOTES (the only allowed source):',
      '<<<NOTES',
      payload.notes,
      'NOTES>>>',
      '',
      'Write exactly ' + payload.count + ' questions at ' + DIFFICULTIES[payload.difficulty].toLowerCase() + ' level.',
      typeRule,
      'Number the questions from 1 in "id".'
    ].join('\n');

    return [{ role: 'system', content: systemQ }, { role: 'user', content: userQ }];
  }

  /* ------------------------------------------------------- response checks */

  function parseModelJson(text) {
    var raw = String(text == null ? '' : text).trim();
    if (!raw) throw new AiError('empty', 'The AI provider returned an empty response.');
    // Strip a ```json fence if the provider added one despite the instructions.
    var fence = raw.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
    if (fence) raw = fence[1].trim();
    var start = raw.indexOf('{');
    var end = raw.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) {
      throw new AiError('not-json', 'The AI provider did not return JSON. Try a model that supports JSON output.');
    }
    try {
      return JSON.parse(raw.slice(start, end + 1));
    } catch (err) {
      throw new AiError('not-json', 'The AI provider returned malformed JSON.');
    }
  }

  function validateExplanation(data) {
    if (!data || typeof data !== 'object') throw new AiError('schema', 'The AI response was not an object.');
    var out = {
      definition: str(data.definition, 1, 1200),
      whyItMatters: str(data.whyItMatters, 0, 1600),
      steps: arr(data.steps, 1, 10).map(function (s) { return str(s, 1, 500); }),
      example: str(data.example, 0, 1600),
      realWorld: str(data.realWorld, 0, 1600),
      misconceptions: arr(data.misconceptions, 0, 6).map(function (m) {
        return { belief: str(m && m.belief, 1, 400), correction: str(m && m.correction, 1, 500) };
      }),
      vocabulary: arr(data.vocabulary, 0, 10).map(function (v) {
        return { term: str(v && v.term, 1, 120), meaning: str(v && v.meaning, 1, 500) };
      }),
      summary: str(data.summary, 1, 1200),
      questions: arr(data.questions, 1, 10).map(function (q) {
        return { q: str(q && q.q, 1, 500), a: str(q && q.a, 1, 800) };
      })
    };
    if (out.questions.length !== 5) throw new AiError('schema', 'Expected exactly five revision questions.');
    return out;
  }

  function validateQuiz(data, expectedCount) {
    if (!data || !Array.isArray(data.questions)) throw new AiError('schema', 'The AI response did not contain questions.');
    var questions = data.questions.slice(0, expectedCount).map(function (q) {
      if (!q || typeof q !== 'object') throw new AiError('schema', 'A generated question was not an object.');
      var type = String(q.type || '').toLowerCase();
      var base = {
        type: type,
        prompt: str(q.prompt, 3, 1200),
        explanation: str(q.explanation, 0, 1000),
        source: str(q.source, 0, 1000)
      };
      if (type === 'mcq') {
        var options = arr(q.options, 4, 4).map(function (o) { return str(o, 1, 400); });
        var unique = options.map(function (o) { return o.toLowerCase(); }).filter(function (o, idx, all) { return all.indexOf(o) === idx; });
        if (unique.length !== 4) throw new AiError('schema', 'A multiple-choice question did not have four distinct options.');
        var answerIndex = parseInt(q.answerIndex, 10);
        if (isNaN(answerIndex) || answerIndex < 0 || answerIndex > 3) throw new AiError('schema', 'A multiple-choice question had an invalid answer index.');
        base.options = options;
        base.answerIndex = answerIndex;
        base.answer = options[answerIndex];
        return base;
      }
      if (type === 'truefalse') {
        if (typeof q.answer !== 'boolean') throw new AiError('schema', 'A true/false question had no boolean answer.');
        base.answer = q.answer;
        return base;
      }
      if (type === 'short') {
        base.answer = str(q.answer, 1, 800);
        base.keywords = keywordsOf(base.answer).slice(0, 6);
        return base;
      }
      throw new AiError('schema', 'Unsupported question type: ' + (type || 'missing') + '.');
    });
    if (!questions.length) throw new AiError('schema', 'The AI response contained no usable questions.');
    // Renumber after any filtering so ids are contiguous.
    questions.forEach(function (q, i) { q.id = i + 1; });
    return { questions: questions };
  }

  function str(value, min, max) {
    var s = clean(value);
    if (s.length < min) throw new AiError('schema', 'A field in the AI response was empty or too short.');
    return s.length > max ? s.slice(0, max - 1) + '…' : s;
  }

  function arr(value, min, max) {
    if (!Array.isArray(value)) throw new AiError('schema', 'A list in the AI response was not an array.');
    if (value.length < min || value.length > max) throw new AiError('schema', 'A list in the AI response had the wrong length.');
    return value;
  }

  var STOP = ['the', 'and', 'for', 'with', 'that', 'this', 'are', 'was', 'were', 'from', 'have', 'has', 'into', 'its', 'it', 'a', 'an', 'of', 'to', 'in', 'on', 'is', 'or', 'as', 'be', 'by'];

  function keywordsOf(text) {
    var seen = [];
    String(text).toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').split(/\s+/).forEach(function (w) {
      if (w.length > 2 && STOP.indexOf(w) === -1 && seen.indexOf(w) === -1) seen.push(w);
    });
    return seen;
  }

  var contract = {
    LIMITS: LIMITS,
    LEVELS: LEVELS,
    LENGTHS: LENGTHS,
    DIFFICULTIES: DIFFICULTIES,
    AiError: AiError,
    validateRequest: validateRequest,
    buildMessages: buildMessages,
    parseModelJson: parseModelJson,
    validateExplanation: validateExplanation,
    validateQuiz: validateQuiz,
    keywordsOf: keywordsOf
  };

  root.SMAiContract = contract;
  // In a VM sandbox (the tests) `window` is a separate object from the global.
  if (typeof window !== 'undefined' && window !== root) window.SMAiContract = contract;
})(typeof globalThis !== 'undefined' ? globalThis : this);
