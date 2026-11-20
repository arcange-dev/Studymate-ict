/* StudyMate ICT — prompt engine.
   Every prompt is assembled here from explicit fields: role, learner context,
   task, output contract, constraints and a responsible-use footer. */
(function () {
  'use strict';

  var SM = window.SM = window.SM || {};

  var FALLBACK = 'The supplied notes do not provide enough information to answer that reliably.';

  var SAFETY = [
    'RESPONSIBLE USE (do not ignore)',
    '- Do not invent facts, statistics, dates, quotations, textbook titles or references.',
    '- If you are not sure of a detail, say so plainly instead of guessing.',
    '- Do not claim to have checked sources you cannot see.',
    '- End by reminding the learner to verify the answer against their own class notes, textbook or lecturer.'
  ].join('\n');

  var LENGTH = {
    short: { words: 150, label: 'short (about 150 words per section)' },
    medium: { words: 300, label: 'medium (about 300 words per section)' },
    long: { words: 500, label: 'detailed (about 500 words per section)' }
  };

  var LEVELS = {
    'Beginner (first ICT course)': 'a complete beginner on their first ICT course',
    'TVET Level 4 learner': 'a TVET Level 4 learner studying computer systems',
    'Intermediate (some hardware knowledge)': 'an intermediate learner who already knows basic computer parts',
    'Advanced / exam revision': 'an advanced learner revising for an examination'
  };

  function block(title, body) {
    return title + '\n' + body;
  }

  function explainer(input) {
    var topic = String(input.topic || '').trim();
    var level = LEVELS[input.level] || input.level || 'a beginner ICT student';
    var prior = input.prior || 'None — treat me as a complete beginner';
    var len = LENGTH[input.length] || LENGTH.medium;

    return [
      'ROLE',
      'You are an experienced ICT tutor. You teach computer systems and architecture to beginners, you use plain everyday language, and you never assume knowledge the learner has not stated.',
      '',
      'LEARNER CONTEXT',
      '- Who I am: ' + level + '.',
      '- What I already know: ' + prior + '.',
      '- How long I want the answer: ' + len.label + '.',
      '',
      'TOPIC',
      topic,
      '',
      'TASK',
      'Explain the topic above using exactly the nine numbered sections below, in this order. Keep the headings — I use them to study.',
      '',
      '1. Simple definition',
      '   One plain-English sentence, then one slightly more technical sentence. Define any technical word you introduce.',
      '2. Why it matters',
      '   Explain why an ICT student needs to understand this, in 2–3 sentences.',
      '3. Step-by-step explanation',
      '   How it works as numbered steps (maximum 7). One idea per step.',
      '4. Practical example',
      '   A concrete example I could point at on a real computer.',
      '5. Real-world application',
      '   Where this is used in a home, office or data centre. Give one specific scenario.',
      '6. Common misconceptions',
      '   2–3 beliefs beginners get wrong, each with a one-line correction.',
      '7. Short summary',
      '   At most four sentences. If I remember nothing else, this is what to remember.',
      '8. Practice questions',
      '   Exactly 5 questions that test understanding, not just definitions.',
      '9. Answers',
      '   Answers to the same 5 questions, numbered to match, each with a one-line reason.',
      '',
      'RULES',
      '- Use simple words. If a technical term is unavoidable, define it the first time.',
      '- Keep each section to roughly ' + len.words + ' words; stay under that rather than padding.',
      '- Use short paragraphs and plain sentences. No marketing language.',
      '- Do not invent any source, statistic or quotation.',
      '- If you are unsure about a detail, write "I am not certain — check this in your notes" rather than guessing.',
      '',
      SAFETY
    ].join('\n');
  }

  function quiz(input) {
    var notes = String(input.notes || '').trim();
    var count = String(input.num || '10');
    var diff = input.difficulty || 'Medium — understanding and application';
    var type = input.type || 'Mixed';

    var typeRule = {
      'Multiple choice (4 options)': 'Every question must be multiple choice with exactly four options (A–D) and exactly one correct answer.',
      'True or false': 'Every question must be a statement the learner marks True or False, with a one-sentence correction for any false statement.',
      'Short answer': 'Every question must be short answer, answerable in one or two sentences.',
      'Mixed': 'Use a mix: about half multiple choice (four options, one correct), a quarter true/false, and a quarter short answer.'
    }[type] || 'Use a mix of multiple choice, true/false and short answer questions.';

    return [
      'ROLE',
      'You are an ICT examiner writing a practice quiz for a beginner student. You are strict about accuracy and you never add facts that are not in the supplied notes.',
      '',
      'SOURCE NOTES — THE ONLY PERMITTED SOURCE OF FACTS',
      '<<<NOTES',
      notes,
      'NOTES>>>',
      '',
      'TASK',
      'Write exactly ' + count + ' questions at ' + diff.toLowerCase() + ' level, based ONLY on the notes above.',
      '',
      'QUESTION FORMAT',
      '- ' + typeRule,
      '- Number the questions 1 to ' + count + '.',
      '- Do not repeat or near-duplicate a question.',
      '- Never use "all of the above" or "none of the above".',
      '',
      'GROUNDING RULES',
      '- Every question must be answerable from the notes alone. Do not use outside knowledge.',
      '- Do not introduce names, numbers or examples that are absent from the notes.',
      '- If the notes cannot support ' + count + ' distinct questions, write fewer questions and state: "The notes only support N questions."',
      '- After each question, add a line: "Source: " followed by the phrase or sentence from the notes that supports it.',
      '',
      'ANSWER KEY (SEPARATE SECTION)',
      'After the last question, add a heading "Answer key" and for each question give:',
      '  • the correct answer;',
      '  • a one-sentence explanation of why it is correct;',
      '  • the part of the notes it comes from.',
      'Do not put answers next to the questions themselves.',
      '',
      SAFETY
    ].join('\n');
  }

  function plannerPrompt(input) {
    var plan = input.plan;
    var lines = [];
    plan.days.forEach(function (day) {
      lines.push('Day ' + day.index + ' (' + day.minutes + ' minutes):');
      day.sessions.forEach(function (s) {
        lines.push('  - [' + s.kind + '] ' + s.minutes + ' min — ' + s.label);
      });
      lines.push('  - Self-assessment: ' + day.questions.join(' '));
    });

    return [
      'ROLE',
      'You are a study coach for a beginner ICT student. You turn a fixed schedule into practical, active-learning tasks. You do not add extra study time.',
      '',
      'STUDENT CONTEXT',
      '- Topics: ' + input.topics.join(', '),
      '- Difficulty: ' + input.difficulty,
      '- Days available: ' + plan.days.length,
      '- Time per day: ' + input.minutes + ' minutes' + (input.exam ? '\n- Examination date: ' + input.exam : ''),
      '',
      'MY FIXED SCHEDULE (do not change the minutes)',
      lines.join('\n'),
      '',
      'TASK',
      'For every study session in the schedule above, give:',
      '1. A specific micro-task (what to read, write, draw or practise) that fits the listed minutes.',
      '2. One active-recall activity (flashcard prompt, diagram from memory, explain-aloud prompt).',
      '3. One way to check understanding at the end of the session.',
      '',
      'RULES',
      '- Do not add sessions, days or minutes. The total must equal ' + (plan.days.length * input.minutes) + ' minutes.',
      '- Keep every task achievable in the stated time.',
      '- Breaks stay breaks: do not schedule work into them.',
      '- Use simple language and no invented resources, websites or textbook page numbers.',
      '- If a task would need more time than the session allows, shorten the task instead.',
      '',
      SAFETY
    ].join('\n');
  }

  function grounded(input) {
    var notes = String(input.notes || '').trim();
    var question = String(input.question || '').trim();

    return [
      'ROLE',
      'You are a strict source-grounded tutor. Your only evidence is the notes below. You would rather refuse than guess.',
      '',
      'SUPPLIED NOTES — THE ONLY ALLOWED SOURCE',
      '<<<NOTES',
      notes,
      'NOTES>>>',
      '',
      'QUESTION',
      question,
      '',
      'HOW TO ANSWER',
      '1. Answer only from the supplied notes. Do not use outside knowledge, even if you are confident it is correct.',
      '2. For each point you make, quote or closely paraphrase the sentence in the notes that supports it.',
      '3. Clearly label anything that is your own inference, using the label "Inference (not stated in the notes):".',
      '4. If the notes state something that contradicts the question\'s assumption, correct that assumption using the notes.',
      '5. Explain the answer simply, as to a beginner, in no more than 150 words.',
      '',
      'MANDATORY REFUSAL',
      'If the supplied notes do not contain enough information to answer the question reliably, do not guess and do not fill the gap with general knowledge. Reply with exactly this sentence and nothing else:',
      '"' + FALLBACK + '"',
      '',
      'OUTPUT FORMAT',
      '- Direct answer (1–2 sentences)',
      '- Evidence from the notes (quoted)',
      '- Simple explanation',
      '- Confidence: High / Medium / Low, with one line saying why',
      '- Anything the notes leave unanswered',
      '',
      SAFETY
    ].join('\n');
  }

  /* ---------- Prompt library templates ---------- */
  var library = [
    {
      id: 'explainer',
      name: 'ICT Concept Explainer',
      purpose: 'Turn a single ICT topic into a structured, beginner-friendly lesson.',
      inputs: ['Topic', 'Learner level', 'Prior knowledge', 'Preferred length'],
      expected: 'Nine sections: definition, importance, steps, example, real-world use, misconceptions, summary, practice questions, answers.',
      example: 'Topic: RAM · Level: beginner · Output: RAM explained with a desk analogy, 5 questions and answers.',
      prompt: [
        'You are an experienced ICT tutor teaching a complete beginner.',
        '',
        'Explain this topic: [TOPIC]',
        'Learner level: [LEVEL]',
        'Prior knowledge: [PRIOR KNOWLEDGE]',
        'Length: [SHORT / MEDIUM / DETAILED]',
        '',
        'Use exactly these nine sections:',
        '1. Simple definition',
        '2. Why it matters',
        '3. Step-by-step explanation (max 7 steps)',
        '4. Practical example',
        '5. Real-world application',
        '6. Common misconceptions (2–3, each corrected)',
        '7. Short summary (max 4 sentences)',
        '8. Practice questions (5)',
        '9. Answers (numbered to match)',
        '',
        'Use plain language and define every technical term. Do not invent sources, statistics or quotations. If you are unsure, say so.'
      ].join('\n')
    },
    {
      id: 'hardware',
      name: 'Hardware Comparison',
      purpose: 'Compare two pieces of hardware so the differences are exam-ready.',
      inputs: ['Component A', 'Component B', 'Comparison goal (speed, cost, durability…)'],
      expected: 'A comparison table, a plain-language explanation of each difference, and when to choose each component.',
      example: 'SSD vs HDD for a student laptop — table plus a buy/advice recommendation with reasons.',
      prompt: [
        'You are an ICT tutor comparing two hardware components for a beginner student.',
        '',
        'Compare: [COMPONENT A] vs [COMPONENT B]',
        'Focus on: [SPEED / COST / DURABILITY / POWER / USE CASE]',
        '',
        'Provide:',
        '1. A comparison table with rows: what it is, how it works, speed, capacity, cost, durability, typical use.',
        '2. The three differences that matter most, explained simply.',
        '3. A short "choose A when… / choose B when…" summary.',
        '4. Two exam-style questions with answers.',
        '',
        'Rules: no invented specifications or prices. Where exact figures vary by model, say "varies by model" instead of guessing. Keep language beginner-friendly.'
      ].join('\n')
    },
    {
      id: 'quiz',
      name: 'Quiz Generator',
      purpose: 'Create a practice quiz locked to your own study notes.',
      inputs: ['Study notes', 'Number of questions', 'Difficulty', 'Question type'],
      expected: 'Numbered questions, a separate answer key with explanations, and a source line for each question.',
      example: '10 mixed questions from a page of notes on operating systems, with answers.',
      prompt: [
        'You are an ICT examiner. Use ONLY the notes below as your source of facts.',
        '',
        'NOTES:',
        '"""',
        '[PASTE YOUR NOTES HERE]',
        '"""',
        '',
        'Write [NUMBER] questions at [EASY / MEDIUM / HARD] level.',
        'Question type: [MULTIPLE CHOICE / TRUE OR FALSE / SHORT ANSWER / MIXED].',
        '',
        'Rules:',
        '- Every answer must be findable in the notes.',
        '- Do not add outside facts, names or numbers.',
        '- If the notes cannot support that many questions, write fewer and say so.',
        '- Put the answer key in a separate section, with a one-sentence explanation per answer.',
        '- After each question add: "Source: <the line from the notes>".',
        '',
        'Do not use "all of the above" or "none of the above".'
      ].join('\n')
    },
    {
      id: 'planner',
      name: 'Study Planner',
      purpose: 'Turn topics and available time into a realistic revision schedule.',
      inputs: ['Topics', 'Minutes per day', 'Number of days', 'Exam date (optional)'],
      expected: 'A day-by-day plan with sessions, breaks, revision and self-assessment questions — never exceeding the available time.',
      example: 'Four ICT topics, 60 minutes a day, five days before a test.',
      prompt: [
        'You are a study coach for an ICT student. Build a realistic plan.',
        '',
        'Topics: [TOPIC 1, TOPIC 2, TOPIC 3]',
        'Time available per day: [MINUTES] minutes',
        'Days available: [NUMBER]',
        'Exam date: [DATE OR "none"]',
        '',
        'For each day give:',
        '- Learning objective',
        '- Study sessions with exact minutes',
        '- Short breaks (5 minutes) between longer blocks',
        '- A revision slot for earlier topics',
        '- A practice activity',
        '- 2 self-assessment questions',
        '',
        'Hard rules:',
        '- Never schedule more than [MINUTES] minutes of study in a day.',
        '- Total planned study must not exceed [MINUTES × DAYS].',
        '- Keep breaks as breaks.',
        '- Do not invent resources or page numbers.'
      ].join('\n')
    },
    {
      id: 'programming-tutor',
      name: 'Programming Tutor',
      purpose: 'Learn a programming concept step by step without being handed a full solution.',
      inputs: ['Language', 'Concept', 'Your current understanding'],
      expected: 'A plain explanation, a tiny worked example, a broken example to fix, and practice tasks with hints (not full answers).',
      example: 'Python loops for a beginner — worked example, one bug to fix, three practice tasks.',
      prompt: [
        'Act as a patient programming tutor for a beginner learning [LANGUAGE].',
        '',
        'Concept: [CONCEPT, e.g. for-loops, functions, arrays]',
        'What I already understand: [YOUR CURRENT UNDERSTANDING]',
        '',
        'Teach me in this order:',
        '1. One-sentence explanation of the concept.',
        '2. A tiny working example (max 10 lines) with a line-by-line comment.',
        '3. A deliberately broken example and the error message — ask me to fix it before showing the fix.',
        '4. Three practice tasks, easiest first. Give hints only, not complete solutions.',
        '5. One common beginner mistake and how to recognise it.',
        '',
        'Rules: no invented library functions; if you are unsure whether a function exists in the version I use, say so. Do not write my assignment for me — teach the step I am stuck on.'
      ].join('\n')
    },
    {
      id: 'error-troubleshooter',
      name: 'Programming Error Troubleshooter',
      purpose: 'Diagnose an error message with a structured hypothesis list instead of random guesses.',
      inputs: ['Language and version', 'The code', 'The exact error message', 'What you expected'],
      expected: 'Ranked likely causes, the quickest test for each, a minimal fix, and how to avoid it next time.',
      example: 'Python IndexError when looping through a list — cause, one-line fix, prevention tip.',
      prompt: [
        'You are a debugging tutor. Do not guess wildly — reason from the evidence.',
        '',
        'Language: [LANGUAGE AND VERSION]',
        'Error message: [PASTE THE EXACT ERROR]',
        'Code:',
        '"""',
        '[PASTE THE RELEVANT CODE]',
        '"""',
        'What I expected to happen: [EXPECTED BEHAVIOUR]',
        '',
        'Respond with:',
        '1. What the error message actually means, in plain language.',
        '2. The three most likely causes, ranked, with one quick test for each.',
        '3. The smallest fix for the most likely cause, with a short explanation.',
        '4. How to prevent this mistake next time.',
        '',
        'If the pasted code is not enough to diagnose the problem, ask for the specific missing piece instead of guessing.'
      ].join('\n')
    },
    {
      id: 'summariser',
      name: 'Notes Summariser',
      purpose: 'Compress long notes into an exam-ready summary without losing definitions.',
      inputs: ['Notes or chapter text', 'Target length', 'Exam focus'],
      expected: 'Key terms list, a short summary, a bullet outline and five likely exam questions.',
      example: 'A chapter on memory types condensed to one page plus exam questions.',
      prompt: [
        'Summarise the notes below for an ICT student revising for an exam.',
        '',
        'NOTES:',
        '"""',
        '[PASTE NOTES]',
        '"""',
        '',
        'Target length: [ONE PAGE / 10 BULLETS / 200 WORDS]',
        'Exam focus: [WHAT THE EXAM WILL TEST, IF KNOWN]',
        '',
        'Produce:',
        '1. Key terms (max 8) with a one-line definition each — definitions must come from the notes.',
        '2. A summary of the notes in the target length.',
        '3. A bullet outline showing how the ideas connect.',
        '4. Five questions likely to appear in an exam, with short answers.',
        '',
        'Rules: keep the notes\' meaning; do not add facts that are not present; mark anything you infer as "Inference:". If the notes are too short to summarise, say so.'
      ].join('\n')
    },
    {
      id: 'glossary-maker',
      name: 'ICT Glossary Creator',
      purpose: 'Turn a chapter or topic list into a personalised glossary.',
      inputs: ['Chapter, topic list or notes', 'Learner level'],
      expected: 'A table of terms, plain definitions, examples and a "commonly confused with" column.',
      example: 'Memory and storage chapter → 12-term glossary for a beginner.',
      prompt: [
        'Create a beginner-friendly ICT glossary from the material below.',
        '',
        'MATERIAL:',
        '"""',
        '[PASTE CHAPTER, TOPIC LIST OR NOTES]',
        '"""',
        'Learner level: [LEVEL]',
        '',
        'For each term give a table row with:',
        '| Term | Plain definition (max 25 words) | Practical example | Commonly confused with |',
        '',
        'Rules:',
        '- Only include terms that appear in the material, unless you clearly mark an added term as "added for context".',
        '- Definitions must be understandable to someone with no ICT background.',
        '- Do not invent acronym expansions; if unsure what an acronym stands for, write "expansion uncertain".',
        '- After the table, list the five terms a beginner is most likely to mix up.'
      ].join('\n')
    }
  ];

  SM.prompts = {
    FALLBACK: FALLBACK,
    SAFETY: SAFETY,
    explainer: explainer,
    quiz: quiz,
    planner: plannerPrompt,
    grounded: grounded,
    library: library
  };
})();
