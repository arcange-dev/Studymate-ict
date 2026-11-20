/* Tests for the browser-side pure logic in StudyMate-ICT/js/core.js.
   The file is a classic script, so it is evaluated in a VM sandbox with a
   `module.exports` shim — the exact code the browser runs is what gets tested. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const source = readFileSync(new URL('../StudyMate-ICT/js/core.js', import.meta.url), 'utf8');
const sandbox = { module: { exports: {} }, window: {} };
runInNewContext(source, sandbox);
const core = sandbox.module.exports;

const questions = [
  { id: 1, type: 'mcq', prompt: 'Which is volatile?', options: ['RAM', 'ROM', 'SSD', 'HDD'], answerIndex: 0, answer: 'RAM' },
  { id: 2, type: 'truefalse', prompt: 'ROM is non-volatile.', answer: true, answer: true },
  { id: 3, type: 'short', prompt: 'Why RAM?', answer: 'It holds running programs and data', keywords: ['holds', 'running', 'programs', 'data'] }
];

test('marks multiple choice by index, not by text', () => {
  assert.equal(core.markAnswer(questions[0], 0), 'correct');
  assert.equal(core.markAnswer(questions[0], '0'), 'correct');
  assert.equal(core.markAnswer(questions[0], 1), 'incorrect');
  assert.equal(core.markAnswer(questions[0], undefined), 'incorrect');
});

test('marks true/false from booleans and words', () => {
  assert.equal(core.markAnswer(questions[1], true), 'correct');
  assert.equal(core.markAnswer(questions[1], 'True'), 'correct');
  assert.equal(core.markAnswer(questions[1], 'false'), 'incorrect');
  assert.equal(core.markAnswer(questions[1], 'maybe'), 'incorrect');
  assert.equal(core.parseBoolAnswer('yes'), true);
  assert.equal(core.parseBoolAnswer('nonsense'), null);
});

test('short answers: full keywords correct, partial flagged for review', () => {
  assert.equal(core.markAnswer(questions[2], 'It holds running programs and data.'), 'correct');
  assert.equal(core.markAnswer(questions[2], 'It holds running programs.'), 'review');
  assert.equal(core.markAnswer(questions[2], 'Because it is fast.'), 'incorrect');
  assert.equal(core.markAnswer(questions[2], '   '), 'incorrect');
});

test('markQuiz scores only auto-marked questions', () => {
  const marked = core.markQuiz(questions, { 1: 0, 2: false, 3: 'It holds running programs and data' });
  assert.equal(marked.total, 3);
  assert.equal(marked.correct, 2);
  assert.equal(marked.incorrect, 1);
  assert.equal(marked.review, 0);
  assert.equal(marked.score, 67);
  const wrong = marked.results.find((r) => r.id === 2);
  assert.equal(wrong.status, 'incorrect');
  assert.equal(wrong.expected, true);
});

test('markQuiz reports review answers without counting them wrong', () => {
  const marked = core.markQuiz(questions, { 1: 0, 2: true, 3: 'It holds running programs' });
  assert.equal(marked.review, 1);
  assert.equal(marked.incorrect, 0);
  assert.equal(marked.score, 100);
});

test('isAnswered understands each question type', () => {
  assert.equal(core.isAnswered(questions[0], 0), true);
  assert.equal(core.isAnswered(questions[0], ''), false);
  assert.equal(core.isAnswered(questions[1], false), true);
  assert.equal(core.isAnswered(questions[1], null), false);
  assert.equal(core.isAnswered(questions[2], '  '), false);
});

test('planProgress counts non-break activities only', () => {
  const plan = {
    days: [
      { sessions: [{ kind: 'study', done: true }, { kind: 'break' }, { kind: 'revision' }] },
      { sessions: [{ kind: 'study', done: false }, { kind: 'assess', done: true }] }
    ]
  };
  const progress = core.planProgress(plan);
  assert.equal(progress.done, 2);
  assert.equal(progress.total, 4);
  assert.equal(progress.percent, 50);
  assert.equal(core.planProgress(null).total, 0);
  assert.equal(core.planProgress(null).percent, 0);
});

test('settings are normalised and never trusted blindly', () => {
  assert.equal(core.normaliseSettings(null).theme, 'system');
  assert.equal(core.normaliseSettings(null).level, 'beginner');
  const clean = core.normaliseSettings({
    theme: 'dark',
    level: 'advanced',
    subjects: [' Networking ', 'networking', '', 'Databases'],
    reduceMotion: 'yes',
    largerText: true,
    discloseNotes: 1,
    evil: '<script>'
  });
  assert.equal(clean.theme, 'dark');
  assert.equal(clean.level, 'advanced');
  // Duplicates are removed case-insensitively but the first spelling wins.
  assert.equal(clean.subjects.length, 2);
  assert.equal(clean.subjects[0], 'Networking');
  assert.equal(clean.subjects[1], 'Databases');
  assert.equal(clean.reduceMotion, false, 'only a real boolean counts');
  assert.equal(clean.largerText, true);
  assert.equal(clean.discloseNotes, false, 'only a real boolean counts');
  assert.equal(clean.evil, undefined);

  assert.equal(core.normaliseSettings({ theme: 'neon' }).theme, 'system');
  assert.equal(core.normaliseSettings({ level: 'god' }).level, 'beginner');
});
