# Limitations and Future Work — StudyMate ICT

This document states plainly what the project does not do, so the demonstration and the written report stay honest.

---

## 1. Current limitations

### 1.1 No AI model is connected
This is a deliberate design decision, not an unfinished feature. The application builds prompts and stops there. It cannot produce an explanation, quiz or answer by itself.

**Consequences**
- The learner must copy each prompt into an external AI assistant.
- Answer quality, refusal compliance and hallucination behaviour are outside the project's control and were not measured.
- The app can be demonstrated with no internet, no API key and no cost — which is why the choice was made.

### 1.2 Prompt quality depends on user input
A vague topic produces a vague prompt. Very short notes limit the quiz. Grounded mode cannot answer what the notes do not contain — that is the intended behaviour, but it can feel unhelpful to a student who expected an answer.

### 1.3 The planner is a simple scheduler
- One uniform time budget per day; it cannot vary Monday from Saturday.
- Fixed block lengths by difficulty (40/30/25 minutes) rather than adapting to the learner.
- Round-robin topic allocation, not spaced repetition or prerequisite ordering.
- No tracking of whether a session was actually completed.
- The displayed clock starts at 09:00 as a sequence indicator, not a real timetable.

### 1.4 LocalStorage only
- Per-browser and per-device; nothing syncs.
- Roughly 5 MB total, and saved prompts can be long.
- Clearing browser data deletes everything irreversibly.
- Not a backup; no export or import yet.
- Private-browsing modes may block it; the app falls back to session-only memory with a warning.

### 1.5 Glossary is a curated starter set
41 terms covering the most common beginner topics. It is not a complete ICT dictionary, has no pronunciation, no synonyms and no images, and its definitions are original plain-language explanations rather than sourced quotations.

### 1.6 Coverage indicator is a heuristic
The grounded mode's coverage panel compares stop-word-filtered keywords. It can be wrong in both directions: a synonym may exist in the notes without a shared word ("cache" vs "temporary store"), and a shared word may not mean the notes answer the question. The interface labels it as a heuristic and not an AI judgement.

### 1.7 Accessibility and browser coverage
- Structurally accessible (landmarks, labels, `aria-*` state, focus rings, Skip link, `role="alert"`), but not audited with real screen readers.
- Automated testing was Chromium only; Firefox and Safari were not exercised.
- Clipboard access can be blocked by browser policy; a manual-copy fallback is provided.

### 1.8 Content and language
- Interface and prompts are English only.
- The prompts assume an AI assistant that follows long instructions reasonably well; small or heavily filtered models may ignore the output contract.

### 1.9 Not an assessment or management system
No accounts, classes, grades, attendance, submissions, teacher dashboards or analytics. This scope was excluded intentionally to keep the project demonstrable and beginner-readable.

### 1.10 Storage robustness
Corrupted or partial LocalStorage is normalised to defaults, but quota-exhaustion handling was not simulated. If a write fails, the app keeps working in memory for that session and shows the storage warning.

---

## 2. Future work

Ordered by value against effort.

### 2.1 High value, moderate effort

1. **Bring-your-own-key AI integration through a server proxy.**
   A small server-side function holds the key, enforces a model allowlist and a per-user daily limit, and returns the model's answer. The frontend never sees a credential. This would be the single biggest improvement and must not be done by putting a key in JavaScript.

2. **Export and import the workspace as JSON.**
   A download/upload pair gives learners a real backup and moves data between devices.

3. ~~**Installable offline PWA.**~~ **Delivered.** `manifest.webmanifest` and `sw.js` precache the 20 application files, so the app installs from the browser and reloads with the network off. Verified with the origin server stopped — see §7 of [`TESTING_REPORT.md`](TESTING_REPORT.md).

4. **Quiz results and spaced repetition.**
   Let the learner record answers, store results locally, and schedule weak topics using simple spaced-repetition intervals. This turns the planner from a one-off schedule into an adaptive one.

### 2.2 High value, higher effort

5. **Multi-day availability profiles.** Different minutes for weekdays and weekends, plus blocked days.
6. **Prerequisite-aware topic ordering.** Let a learner state "RAM before virtual memory" and respect that order in the plan.
7. **Answer evaluation mode.** Add a prompt that marks a student's written answer against the notes and returns a rubric-based score — a natural extension of the existing evaluation theme.
8. **Localised prompts.** Swahili (and other) interface strings and prompt templates, with bilingual glossary entries.
9. **Printable worksheets.** Turn a quiz prompt or plan into a clean printable page with an answer sheet.
10. **Teacher mode.** Share a prompt set or a note pack as a file, without accounts.

### 2.3 Smaller improvements

11. "Commonly confused with" field in the glossary, plus related-term links.
12. Saved-prompt search, tags and renaming.
13. Drag-to-reorder sessions in the planner and manual topic pinning to a day.
14. A theme preference (light/dark) stored locally.
15. Import notes from a `.txt` file instead of pasting.
16. Confidence and completeness checklist shown after copying a prompt.
17. Automated accessibility test suite (axe) and cross-browser CI.

---

## 3. What would make this production-ready

For classroom deployment, the project would need at minimum:

- A reviewed AI integration with server-side keys, rate limits and logging of failures (not of student content).
- A privacy notice and a data-retention policy.
- Export/backup and storage-quota handling.
- Screen-reader auditing and cross-browser testing.
- Curriculum review of glossary definitions and prompt wording by an ICT lecturer.

None of these are required for the capstone demonstration, and none are claimed to exist today.
