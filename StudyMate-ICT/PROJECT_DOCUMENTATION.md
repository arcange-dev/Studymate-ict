# Project Documentation — StudyMate ICT

**Project:** StudyMate ICT — AI-assisted ICT learning and study assistant
**Type:** Final capstone project, AI and Prompt Engineering internship, Ishvexa Hub
**Version:** 1.0
**Date:** November 2026
**Stack:** HTML5, CSS3, vanilla JavaScript, LocalStorage. No backend, no build step, no AI API.

---

## 1. Problem statement

Beginner ICT students — especially TVET Level 4 learners and first-year computer-systems students — face three connected problems:

1. **Language barrier.** Technical material assumes vocabulary the learner does not yet have ("volatile", "bus", "kernel", "UEFI"). Students memorise definitions without understanding them.
2. **Poor questions, poor answers.** Generative AI can explain a topic well, but only if the prompt supplies context, structure and constraints. Beginners typically type "explain RAM", receive an unsorted wall of text, and cannot tell whether it is correct or complete.
3. **Unverifiable answers.** AI assistants happily invent details. Without a grounding rule, a student cannot tell which parts came from their notes and which were guessed.
4. **Unrealistic planning.** Students plan "study everything tonight" instead of fitting topics into the hours they actually have.

**StudyMate ICT** addresses these problems by owning the prompt layer: it converts a learner's inputs into explicit, structured, constraint-heavy prompts, and it provides offline tools (glossary, planner) for the parts that do not need AI at all.

## 2. Project objectives

| # | Objective | How it is met |
|---|-----------|---------------|
| O1 | Demonstrate practical prompt engineering | Four prompt builders with role, context, task, output contract and constraints; eight reusable templates |
| O2 | Support beginner-friendly explanations | Learner level, prior knowledge and length are embedded in every explanation prompt |
| O3 | Ground quizzes in the student's own notes | Notes embedded in the prompt; explicit "only permitted source" rule; per-question source line; answer key |
| O4 | Produce a realistic, time-bounded study plan | Deterministic scheduling algorithm in the browser, with an enforced minutes invariant |
| O5 | Handle incomplete information honestly | Required validation, empty states, coverage indicator and a mandatory refusal sentence |
| O6 | Build a lightweight, offline application | Static files only; no network calls; LocalStorage persistence |
| O7 | Be demonstrable in five minutes | Single-page app, clear navigation, one action per tool |
| O8 | Document and test professionally | Seven documents plus a 16-case browser test report |

### Non-goals

- Not a school management system, LMS, grade book or attendance tool.
- Not an AI chatbot and does not store or transmit conversations.
- No accounts, no cloud sync, no analytics.

## 3. Target audience

- Beginner ICT students on their first computing course.
- Computer Systems and Architecture students needing revision material.
- TVET Level 4 learners preparing for examinations.
- Students who need simple, structured explanations of technical topics.
- Teachers and trainers who want reusable prompt templates for class.

Assumed context: a shared or personal computer with a modern browser, often limited or metered internet, and no budget for paid AI tools.

## 4. System design

### 4.1 Architecture

The application is a **client-side single-page application** with a hash router. There is no server component.

```
┌──────────────────────────────────────────────────────────────┐
│                        Browser (no network)                  │
│                                                              │
│  index.html                                                  │
│    ├── css/styles.css        design system + responsive       │
│    └── js/                                                    │
│         storage.js  ──────► LocalStorage (studymate.ict.v1)   │
│         ui.js        helpers: DOM, toast, clipboard           │
│         prompts.js   prompt engine + 8 templates              │
│         glossary-data.js  41 curated terms                    │
│         feature modules: explainer, quiz, planner,            │
│                          glossary, source, library            │
│         dashboard.js, saved.js                                │
│         app.js       hash router + navigation                 │
│                                                              │
│  Output: prompt text  ──► clipboard  ──► external AI (user)   │
└──────────────────────────────────────────────────────────────┘
```

### 4.2 Prompt pipeline

```
User input ─► validation ─► prompt builder (prompts.js) ─► formatted prompt
                                   │
                                   ├─ role + learner context
                                   ├─ task + numbered output contract
                                   ├─ constraints (grounding, length, budget)
                                   ├─ refusal rule (grounded mode)
                                   └─ responsible-use footer
                                        │
                                        ▼
                              Copy ─► user runs it externally
                                        │
                                        ▼
                              Save ─► LocalStorage ─► Saved Learning
```

The application deliberately stops before "AI answer". This keeps it free, offline-capable, safe to demonstrate and impossible to mistake for an oracle.

### 4.3 Routing and views

Hash-based routes, mapped in `js/app.js`:

| Route | View | Purpose |
|---|---|---|
| `#/dashboard` | view-dashboard | Overview, stats, recent activity, study focus |
| `#/explain` | view-explain | ICT concept explainer |
| `#/quiz` | view-quiz | Quiz generator |
| `#/planner` | view-planner | Study planner |
| `#/glossary` | view-glossary | ICT glossary |
| `#/source` | view-source | Source-grounded learning |
| `#/library` | view-library | Prompt library |
| `#/saved` | view-saved | Saved learning and activity |
| `#/about` | view-about | Project information |

Unknown routes fall back to the dashboard. The router updates the document title, the breadcrumb, `aria-current="page"` on navigation, keyboard focus and scroll position.

### 4.4 Data model (LocalStorage key `studymate.ict.v1`)

```js
{
  topics: [        // saved explanations and plans
    { id, title, tool, detail, prompt, createdAt }
  ],
  prompts: [       // saved generated prompts and templates
    { id, title, tool, text, createdAt }
  ],
  glossSaved: ["ram", "cpu"],          // ids of saved built-in terms
  personalTerms: [
    { id, term, cat, def, example, createdAt }
  ],
  activity: [      // newest first, capped at 60
    { id, tool, label, at }
  ],
  counts: { explain: 0, quiz: 0, planner: 0, glossary: 0, source: 0, library: 0 }
}
```

The storage layer tolerates corrupt or missing data by normalising to defaults, and falls back to an in-memory store (with a user-visible warning) if LocalStorage is blocked.

### 4.5 Scheduling algorithm (Study Planner)

Inputs: topics, minutes per day, number of days, difficulty, optional exam date.

1. **Topic parsing** — split on new lines, commas and semicolons; trim, de-duplicate (case-insensitive), cap at 12 topics.
2. **Validation** — at least one topic; minutes 15–480; days 1–30; a valid, non-past exam date.
3. **Exam reconciliation** — if the exam is sooner than the requested number of days, the plan is shortened and the user is told why.
4. **Budget split** — for each day:
   - self-assessment reserve: 5 minutes when the day is at least 25 minutes;
   - remaining "usable" minutes are split into study blocks (maximum 40 min light, 30 min standard, 25 min intensive);
   - a real break (5–8 min) is inserted between blocks, never inside a block.
5. **Topic allocation** — topics are distributed round-robin across days so order is preserved.
6. **Revision** — on day 3, 6, 9… and on the final day, the last study block becomes a revision session covering earlier topics.
7. **Guarantee** — every day's session minutes + break minutes + self-assessment equals the available minutes exactly. A safety net trims a block if rounding ever overshoots. The invariant is displayed as "60 / 60 min used".
8. **Optional AI layer** — a second prompt asks an AI to add micro-tasks and active-recall activities *without changing any minutes*.

### 4.6 Grounding and refusal

The grounded prompt:

- places the notes in an explicit delimited block labelled as the only allowed source;
- forbids outside knowledge even when the model is confident;
- requires a quote or close paraphrase as evidence for each point;
- labels inference explicitly as `Inference (not stated in the notes):`;
- requires correcting a false assumption in the question using the notes;
- caps the answer at 150 words, beginner level;
- mandates this exact sentence when the notes are insufficient:

> "The supplied notes do not provide enough information to answer that reliably."

The interface's coverage panel is a *keyword* heuristic (stop-word filtered term overlap) that is explicitly labelled "not an AI judgement". It warns the student before they spend time on a question the notes probably cannot answer.

## 5. Feature descriptions

### 5.1 ICT Concept Explainer
Inputs: topic, learner level, prior knowledge, preferred length. Output: a prompt that returns exactly nine numbered sections and five practice questions with a separate answer section. Validation rejects empty or single-character topics. Saving stores the topic and prompt.

### 5.2 Quiz Generator
Inputs: notes, question count (5/10/15/20), difficulty, question type. Output: a prompt requiring notes-only questions, a "Source:" line per question, and a separate answer key with explanations. Empty or very short notes are rejected, and any previously generated prompt is hidden so a stale result cannot be mistaken for a new one.

### 5.3 Smart Study Planner
Produces the plan itself (not just a prompt), with a day header, minutes used, learning objective, timed sessions, breaks, revision, practice activity and self-assessment questions. Includes copy-as-text, print/PDF and save. See §4.5.

### 5.4 ICT Glossary
41 curated terms across hardware, software, networking and programming, each with a plain definition and a practical example. Search covers term, acronym expansion, definition, example and category. Users can copy a definition, save a term, and add/delete personal terms. An empty state suggests adding the missing term.

### 5.5 Source-Grounded Learning
Inputs: notes and a question. Output: the strict grounded prompt described in §4.6, plus a live coverage indicator. The exact fallback sentence is displayed on the form so the learner knows what a correct refusal looks like.

### 5.6 Prompt Library
Eight templates: ICT concept explainer, hardware comparison, quiz generator, study planner, programming tutor, programming error troubleshooter, notes summariser, ICT glossary creator. Each shows purpose, required inputs, expected output, example use, the full prompt, and a responsible-use reminder. Templates are filterable, copyable and savable.

### 5.7 Learning Dashboard
Stat cards (saved topics, saved prompts, glossary terms, prompts generated), six tool cards, a recently used list and a study focus panel. Updates live through a store subscription.

### 5.8 Saved Learning
Grouped lists for saved topics, saved prompts, saved glossary terms and activity, each with copy and delete actions, plus per-section clearing and a full local-data reset with confirmation.

### 5.9 About the Project
Purpose, demonstrated skills, technology, AI status, responsible-use rules and honest limitations.

## 6. Technologies and design decisions

| Decision | Rationale |
|---|---|
| Vanilla JS, no framework | Fits the brief; zero tooling; beginner-readable; runs from a USB stick |
| Classic scripts, no ES modules | ES modules fail on `file://`; classic scripts keep double-click-to-run working |
| One LocalStorage key with a normaliser | Simple migration path and resilience to corrupted data |
| No AI API | No secret exposure, no cost, no network dependency, honest demonstration |
| Hash routing | Works from the filesystem without server rewrites |
| CSS custom properties + grid | Consistent theme and fast responsive changes |
| Planner computed locally | Deterministic, inspectable and guaranteed to respect the time budget |

**Design language:** dark navy sidebar and hero, light content surfaces, teal-to-blue gradients, 12–24 px radii, soft shadows, inline SVG icons, subtle transitions and `prefers-reduced-motion` support.

**Accessibility:** semantic landmarks, skip link, labelled inputs, `aria-current`, `aria-pressed` on save toggles, `aria-live` counters and toasts, `role="alert"` errors, `aria-invalid` on failing fields, visible focus rings, Escape-closes-menu behaviour, keyboard-focusable prompt panels.

## 7. Expected results

A learner should be able to:

1. Produce a complete, level-appropriate explanation prompt for any ICT topic in under 30 seconds.
2. Produce a notes-locked quiz prompt with an answer key, and be blocked from generating a quiz without a source.
3. Receive a study plan whose minutes never exceed the time they declared — verifiable on screen as "N / N min used".
4. Ask a question in grounded mode and know, before pasting, whether their notes likely support it.
5. Look up a term and copy a definition without internet access.
6. Keep their prompts, topics and terms across sessions on the same browser.
7. Present the whole project in five minutes.

## 8. Future improvements

- Optional bring-your-own-key integration through a **server-side proxy** (never in frontend code), with a documented model allowlist.
- Spaced-repetition scheduling using stored quiz results.
- Export/import of the whole workspace as JSON for backup and device transfer.
- Expand the glossary and add a "commonly confused with" field.
- Multi-day plans with varying daily availability.
- Offline PWA install with a service worker and an app manifest.
- Swahili and other local-language prompt variants.
- Printable worksheet generation from a quiz prompt.

Details and prioritisation: [`LIMITATIONS_AND_FUTURE_WORK.md`](LIMITATIONS_AND_FUTURE_WORK.md).

---

See [`README.md`](README.md) for setup, [`TESTING_REPORT.md`](TESTING_REPORT.md) for verification and [`PRESENTATION_GUIDE.md`](PRESENTATION_GUIDE.md) for the demo script.
