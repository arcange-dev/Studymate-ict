# Limitations and Future Work — StudyMate ICT

This document states plainly what the project does not do, so the demonstration and the written report stay honest. It reflects the 2.4.0 build of 25 November 2026: a real AI endpoint, a browser-side provider panel with 47 presets, practice quizzes with in-browser marking, study-plan progress tracking, a settings page, a Home page reachable from the top bar and sidebar, and an API Reference page that documents the endpoints it actually ships.

---

## 1. Current limitations

### 1.1 Live AI needs a key that this deployment does not have
The application now has a genuine AI path: `POST /api/ai` on the server validates the request, calls one OpenAI-compatible provider with a server-side key, and validates the JSON that comes back. It is **not** switched on in the public demo, because no provider key has been supplied.

**Consequences**
- The public demo runs in **prompt mode** because it has no server-side key: every tool works, but it builds a prompt instead of contacting a model. The status chip says so.
- A learner can still switch AI on for themselves: the panel on **Home** (or **Settings**) accepts any of 47 provider presets or a custom base URL, tests the URL automatically, and stores the key in this browser only. Three protocols are native — OpenAI-compatible, Anthropic Messages and Gemini. A provider that blocks browser (CORS) requests needs the server option instead.
- "AI live" is only shown after a real request succeeds; a configured-but-unused key shows "AI ready".
- The AI path has been verified end to end against a **local stub provider** (a fake HTTP server implementing the same contract), not against a real model. Real-model behaviour — refusal quality, hallucination rate, latency — was therefore not measured. See `TESTING_REPORT.md` §8.
- Model choice, cost and data-processing terms are the deployment owner's decision.

### 1.2 AI output can be wrong even when the structure is valid
The server checks the *shape* of the model's JSON (fields present, four distinct options, valid answer index, exactly five revision questions) and rejects malformed answers with a clear error. It cannot check whether the content is true. Every AI screen carries a reminder to verify against notes, textbook or lecturer.

### 1.3 Short answers are marked heuristically
Multiple-choice and true/false answers are marked exactly. Short answers are marked by keyword coverage of the model answer: all keywords present → correct, at least 60% → flagged for self-check, otherwise incorrect. Wording that is correct but uses different vocabulary can be flagged or marked wrong. The interface labels flagged answers instead of silently failing them.

### 1.4 Prompt mode remains the only offline path
AI requests need a network connection and a configured key (in the browser or on the server). Offline, the app falls back to prompt mode and says so. The offline shell (`sw.js`) caches 29 application URLs; AI responses are never cached, and `/api/*` is excluded from the service worker so a cached health check can never misreport the deployment's mode.

### 1.5 Rate limits are per-instance and in memory
`AI_RATE_LIMIT`, `AI_RATE_WINDOW_MS` and `AI_DAILY_CAP` are enforced in the server process. They reset on restart and are counted separately on each instance, so a multi-instance deployment can allow more traffic than the configured cap. The client IP comes from `x-forwarded-for`, which is trustworthy only behind a proxy that sets it (Render does). A shared store (Redis, D1) would be needed for strict global limits.

### 1.6 The planner is a simple scheduler
- One uniform time budget per day; it cannot vary Monday from Saturday.
- Fixed block lengths by difficulty (40/30/25 minutes) rather than adapting to the learner.
- Round-robin topic allocation, not spaced repetition or prerequisite ordering.
- Progress tracking records which activities were ticked. It does not track time spent, streaks or missed days, and it is not synced anywhere.
- The displayed clock starts at 09:00 as a sequence indicator, not a real timetable.
- "Target completion date" is expressed as an examination date that shortens the plan; there is no separate deadline field.

### 1.7 LocalStorage only
- Per-browser and per-device; nothing syncs, and there is no account.
- Roughly 5 MB total; saved plans and prompts can be long.
- Clearing browser data deletes everything irreversibly — hence the JSON export/import in Settings.
- Private-browsing modes may block it; the app falls back to session-only memory with a warning.
- Import replaces the current data rather than merging.

### 1.8 Glossary is a curated starter set
41 terms covering the most common beginner topics. It is not a complete ICT dictionary, has no pronunciation, no synonyms and no images, and its definitions are original plain-language explanations rather than sourced quotations.

### 1.9 Coverage indicator is a heuristic
The grounded mode's coverage panel compares stop-word-filtered keywords. It can be wrong in both directions: a synonym may exist in the notes without a shared word ("cache" vs "temporary store"), and a shared word may not mean the notes answer the question. The interface labels it as a heuristic and not an AI judgement.

### 1.10 Accessibility and browser coverage
- Keyboard navigation, focus indicators, skip link, live regions and reduced-motion support were checked in Chromium. Screen-reader behaviour (NVDA, VoiceOver) was not tested.
- Safari, Firefox and older mobile browsers were not tested.
- The dark theme was checked visually in Chromium at desktop and mobile widths; contrast was not measured with an automated audit tool.

### 1.11 Deployment
- The public demo runs on Freebuff Sites (`sites/worker.js`). Render configuration (`render.yaml`, `server/node-server.js`, `docs/RENDER_DEPLOYMENT.md`) is prepared and tested locally, but no Render account or credentials were available, so **nothing has been deployed to Render**.
- Render's free plan spins down when idle, so the first request after a pause is slow.

---

## 2. Deliberate non-goals

- **No accounts.** The brief asked not to collect unnecessary personal information, and a single-learner local app does not need sign-in.
- **No database.** Nothing in the current feature set requires cloud sync or shared data; adding a database would add cost and attack surface for no user benefit.
- **No framework or build step for the frontend.** The static app stays readable, auditable and deployable anywhere; `build.sh` only copies files.
- **No fabricated AI.** Prompt mode is labelled as prompt mode; a stub is only used in tests, never in the app.

---

## 3. Future work, in priority order

1. **Supply a provider key and run the real-model tests** listed in `TESTING_REPORT.md` §8.4, then update the status text and this document.
2. **Move rate limiting to shared storage** so it holds across instances and restarts.
3. **Improve short-answer marking** with a normalised embedding or a second, cheaper model call marked as "advisory", never as a silent pass.
4. **Sync optional**: end-to-end-encrypted export file, or a small D1/IndexedDB-backed sync if accounts are ever added.
5. **Planner upgrades**: variable daily budgets, spaced repetition, and reminders.
6. **Accessibility audit** with a screen reader and an automated contrast pass on both themes.
7. **Streaming AI responses** so long explanations appear progressively instead of after a spinner.
