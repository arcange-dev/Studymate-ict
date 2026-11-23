# Testing Report — StudyMate ICT

**Version tested:** 1.0 (final build)
**Test date:** 19 November 2026
**Method:** automated browser testing with Playwright (Chromium, headless cloud browser), driving the real interface served over HTTP by `python3 -m http.server 3000`.

> All results below are from the final executed run. Nothing is estimated. Five defects were found during earlier runs, fixed, and re-tested; they are listed in §5.

---

## 1. Test environment

| Item | Detail |
|---|---|
| Application | StudyMate ICT 1.0, static files served from the project folder |
| Browser | Chromium (Playwright), desktop viewport 1440×1000, tablet 820×1180, mobile 375×812 / 390×844 |
| Server | `python3 -m http.server 3000 --bind 0.0.0.0` |
| Storage | Browser LocalStorage cleared before the run, then populated through the UI |
| Clipboard | `clipboard-read` / `clipboard-write` permissions granted to the test origin |
| Console capture | `page.on('console')` for errors and `page.on('pageerror')` for uncaught exceptions, active for the whole run |
| Result | **17 of 17 automated checks passed**, plus the offline/PWA checks in §7 |

---

## 2. Required test cases (from the project brief)

### TC-01 — Explain RAM for a beginner · **PASS**
- **Steps:** Open *Explain ICT* → topic `RAM` → level "Beginner (first ICT course)" → length "Short" → Generate prompt.
- **Expected:** a prompt containing all nine numbered sections, beginner context and the topic.
- **Actual:** the prompt was generated (2,163 characters) and contained "1. Simple definition" through "9. Answers", the mapped beginner context "a complete beginner on their first ICT course", and the topic.
- **Notes:** the prompt panel became visible and the copy/save actions were enabled.

### TC-02 — Explain the CPU · **PASS**
- **Steps:** topic `the CPU` → level "TVET Level 4 learner" → Generate.
- **Expected:** topic and learner level present in the prompt.
- **Actual:** both present ("the CPU", "TVET Level 4 learner"). The learner-level mapping produced "a TVET Level 4 learner studying computer systems".

### TC-03 — Generate a quiz from supplied notes · **PASS**
- **Steps:** Paste five sentences of RAM/ROM/cache notes → 5 questions → Mixed → Generate quiz prompt.
- **Expected:** notes embedded, question count instruction, notes-only rule, separate answer key.
- **Actual:** all four present: the note text appears inside the delimited source block, "Write exactly 5 questions", "SOURCE NOTES — THE ONLY PERMITTED SOURCE OF FACTS", and an "Answer key (separate section)" instruction.
- **Notes:** the word counter showed the pasted note length correctly.

### TC-04 — Attempt quiz generation with empty notes · **PASS**
- **Steps:** Clear the notes field after a successful generation → Generate.
- **Expected:** inline validation error, no new prompt, and no stale prompt left on screen.
- **Actual:** error shown — "Study notes are required. A quiz must be built from a real source, so empty notes are not allowed." The previous prompt was hidden, the empty state returned, and the field received `aria-invalid`.
- **Notes:** this test initially exposed a real defect (stale prompt stayed visible). Fixed — see §5, D4.

### TC-05 — Generate a one-hour study plan · **PASS**
- **Steps:** Topics `CPU architecture`, `RAM and ROM`, `Operating systems` → 60 minutes/day → 3 days → Standard → Build my study plan.
- **Expected:** three days, each scheduling exactly 60 minutes including breaks and self-assessment, with objectives, breaks, revision, practice activity and questions.
- **Actual:** 3 day cards rendered (411 px tall each). Every day read "60 / 60 min used"; session minutes summed to `[60, 60, 60]`. Each day contained a study block, a 5-minute break, a second study block, a 5-minute self-assessment quiz and 2 self-assessment questions. Revision sessions appeared (day 3 marked "Revision"). Practice activities differed per day.
- **Notes:** the plan is computed locally, so the "never schedule more time than available" rule is enforced by the algorithm, not by the AI.

### TC-06 — Attempt study planning without topics · **PASS**
- **Steps:** Clear the topics field → Build my study plan.
- **Expected:** validation error, no plan shown.
- **Actual:** error "Add at least one topic to study. Write one topic per line."; the previous plan was removed and the empty state restored.

### TC-07 — Ask a question using source-grounded mode · **PASS**
- **Steps:** Paste cache-memory notes → question "Why does the CPU need cache memory?" → Generate grounded prompt.
- **Expected:** notes pinned as the only source, evidence requirement, the exact fallback sentence, and an active coverage indicator.
- **Actual:** prompt contained the notes, the "only allowed source" rule, the evidence/labelling rules and the exact sentence "The supplied notes do not provide enough information to answer that reliably." Coverage read: "All 2 key words appear in your notes. That is a good sign, but you must still check the answer line by line."

### TC-08 — Ask a question not answered by the supplied notes · **PASS**
- **Steps:** Keep the cache notes → change the question to "How does quantum entanglement enable quantum computing?" → Generate.
- **Expected:** the interface warns that the notes probably cannot answer; the refusal rule stays in the prompt.
- **Actual:** coverage read: "None of the important words from your question appear in the notes. The notes probably cannot answer this — expect the refusal message." The prompt still contained the mandatory refusal sentence.
- **Notes:** the coverage check is a keyword heuristic and is labelled as such in the interface. It did not itself answer or refuse — the AI would.

### TC-09 — Search for a glossary term · **PASS**
- **Steps:** Open *ICT Glossary* → search `RAM`.
- **Expected:** matching term(s) displayed with a result count.
- **Actual:** "14 of 41 terms" (matches include RAM, ROM, cache, virtual memory), with RAM listed first among the top results. Searching `zzzz` showed the empty state with a clear-search action.

### TC-10 — Copy a generated prompt · **PASS**
- **Steps:** Generate a ROM explanation prompt → press "Copy prompt".
- **Expected:** clipboard contains the full generated prompt; visible confirmation.
- **Actual:** clipboard contained 2,166 characters beginning with "ROLE"; toast read "Prompt copied to clipboard". The button briefly changed to "Copied".

---

## 3. Additional tests

| ID | Test | Expected | Actual | Result |
|---|---|---|---|---|
| TC-11 | Navigation across all nine views | Each view opens, `aria-current="page"` set, correct breadcrumb | All nine views opened with correct breadcrumb and nav state | **PASS** |
| TC-12 | LocalStorage persistence | Saved topic and sidebar badge survive a page reload | Badge showed 1 after reload; "Motherboard" present in Saved Learning | **PASS** |
| TC-13 | Responsive layout | No horizontal overflow on any view at 1440, 820 and 375 px; hamburger hidden on desktop | 21 view/width combinations: all `ok`; menu button hidden at 1440 px, shown at 820/375 px | **PASS** |
| TC-14 | Mobile menu and keyboard | Menu opens with `aria-expanded="true"` and scrim; Escape closes it | Opens correctly; Escape closed the drawer | **PASS** |
| TC-15 | Dashboard empty state | Zero counts, guidance text, six tool cards | `{topics: 0, recent: "No activity yet…", tools: 6}` | **PASS** |
| TC-16 | Console and page errors | No console errors or uncaught exceptions during the whole run | `pageErrors=[]`, `consoleErrors=[]` | **PASS** |
| TC-17 | Duplicate element IDs | None | `duplicates=[]` | **PASS** |

Additional behaviours checked manually during development and screenshot review:

- Tablets at 820 px move the sidebar into the drawer and stack the workbench columns.
- The planner's print action opens the browser print dialog with the form and navigation hidden by the print stylesheet.
- Personal glossary terms can be added, appear immediately with a "Remove" action, and persist across reloads.
- Clearing saved data asks for confirmation; cancelling leaves data intact.
- Blocked LocalStorage shows a persistent warning toast and keeps the app usable for the session.

---

## 4. What was **not** tested

Honest limits of this test pass:

- **Real AI output quality.** The application generates prompts and never calls a model, so response accuracy, hallucination rate and refusal compliance were not measured. These depend on whichever assistant the learner uses.
- **Other browsers.** Only Chromium was exercised. Firefox and Safari were not run, although the code uses only widely supported APIs with a clipboard fallback.
- **Screen readers.** Accessibility was checked structurally (landmarks, labels, `aria-*` state, focus order, Escape handling), not with NVDA, JAWS or VoiceOver.
- **`file://` operation in every browser.** Running from the filesystem is supported by design (classic scripts, no fetch), but only a served origin was automated; some browsers restrict clipboard or LocalStorage on `file://`.
- **Storage quota exhaustion** (≈5 MB) and corrupted-storage recovery were not simulated, although the storage layer normalises unknown shapes.
- **Print/PDF output fidelity** across browsers.
- **Load/performance testing** — the app is a few hundred KB of static files with no network calls.

---

## 5. Defects found and fixed during testing

| ID | Defect | Cause | Fix | Re-tested |
|---|---|---|---|---|
| D1 | Study plan cards never appeared on screen | The output container and the "number of days" input shared `id="plan-days"`; plan cards were appended inside the `<input>` | Renamed the container to `plan-days-list` | Yes — 3 cards, 411 px each, 60/60 minutes |
| D2 | Panels marked `hidden` still occupied space | `.output-body { display: flex }` overrode the `hidden` attribute's default style | Added `[hidden] { display: none !important; }` | Yes — TC-04, TC-06 |
| D3 | Hamburger menu visible on desktop | `.icon-btn { display: grid }` was declared after `.menu-btn { display: none }` and won on specificity/order | Used `.icon-btn.menu-btn` for both states | Yes — TC-13 |
| D4 | A failed quiz submission left the previous prompt visible | Validation returned early without clearing the output panel | Added `invalidateOutput()` to the explainer, quiz, planner and grounded modules | Yes — TC-04, TC-06 |
| D5 | Hero note text split into broken columns | `<strong>` and bare text nodes became separate flex items | Wrapped the sentence in a `<span>` and set `flex: none` on the icon | Yes — visual re-capture |
| D6 | "Plan my study week" button nearly invisible | `.btn-outline` background stayed white inside the dark hero | Set a transparent background and light text/border inside `.hero` | Yes — visual re-capture |

Minor adjustments made from the same review: objective text no longer lowercases topic names, a second self-assessment question was added per day, and long learner-level select labels were shortened.

---

## 6. Conclusion

All 17 automated checks passed on the final build, with no console or page errors. The six defects found during testing were genuine and are fixed. The application meets every functional requirement in the brief: it produces structured prompts for all four prompt tools, computes a time-bounded study plan locally, searches a 41-term glossary, saves items locally, and reports honestly that no AI is connected.

The main untested risk is the external step — what an AI does with these prompts — which is outside the application's control by design. See [`LIMITATIONS_AND_FUTURE_WORK.md`](LIMITATIONS_AND_FUTURE_WORK.md).

### Reproducing this test run

1. Serve the folder: `python3 -m http.server 3000` inside `StudyMate-ICT/`.
2. Open <http://localhost:3000>.
3. Clear site data, then follow TC-01 to TC-17 in order.
4. For responsive checks, use browser device emulation at 1440, 820 and 375 px and confirm no horizontal scrollbar appears.

---

## 7. Offline, install and network-request audit (added 20 November 2026)

Added when the app was made installable. Every figure below was measured in the running browser, not estimated.

### 7.1 External-request audit

| Check | Method | Result |
|---|---|---|
| Third-party runtime requests | Read every shipped file; searched for `http://`, `https://`, `@import`, `@font-face`, `fetch(`, `XMLHttpRequest`, `WebSocket`, `EventSource` | **0 external requests.** The only absolute URLs are SVG XML namespaces (`http://www.w3.org/2000/svg`), which browsers never fetch, plus documentation examples |
| Fonts | Inspected the CSS font stack | System stack only (`Inter`, `Segoe UI`, system fonts); Inter is used if installed locally, otherwise the system sans-serif is used. Nothing is downloaded |
| Images | Inspected every `url(...)` and `src` | Local `assets/` files and inline `data:` URIs only |
| Analytics / telemetry | Full request log during the run | Only the app's own origin appeared |

### 7.2 Service worker and manifest

| Check | Result |
|---|---|
| Service worker registration | **PASS** — `sw.js` registers on `http(s)` and is deliberately skipped on `file://` |
| Activation and scope | **PASS** — state `activated`, scope `/` |
| Precached files | **PASS** — cache `studymate-ict-v1` holds **20 files**: `/`, stylesheet, 13 scripts, manifest, favicon, 3 icons |
| Manifest parsing | **PASS** — `manifest.webmanifest` served as `application/manifest+json`, parsed by the browser: name, `short_name` "StudyMate", `display: standalone`, 3 PNG icons (192, 512, 512 maskable) |
| Install paths | **PASS** — `start_url` and `scope` are relative (`./`), so the app installs and reopens correctly under any path; the three shortcuts point at the `#/explain`, `#/quiz` and `#/planner` routes |
| Manifest icons | **PASS** — `icon-192.png` (192×192), `icon-512.png` (512×512), `icon-512-maskable.png` (512×512, full-bleed) all resolve with `image/png` |

### 7.3 Offline run — origin server stopped

To prove the cache is doing the work, the local server process was **killed** (port 3000 closed) and the page reloaded. A page that must reach the server would have failed.

| Step | Result |
|---|---|
| Reload with no server | **PASS** — the app shell rendered from cache |
| Stylesheet applied | **PASS** — 277 CSS rules active, sidebar 300 px, page background `rgb(246, 249, 252)` |
| Scripts executed | **PASS** — router, badge and nine navigation links live |
| Navigation while offline | **PASS** — glossary view showed **41 terms**, library view showed **8 templates** |
| Feature work while offline | **PASS** — planner generated a 2-day, 45-minute-per-day plan with both sessions rendered |
| Console errors | **PASS** — none |
| Deployed origin, network disabled in the browser | **PASS** — reload, glossary navigation, all 8 library templates and a 2-day planner run worked from cache on the public URL |

### 7.4 Published deployment

Deployed to the production environment of the static **Freebuff Sites** deployment and published:

**<https://studymate-ict-04s0d8.freebuff.site/>**

`sites/worker.js` serves the built files from the site's asset store and marks HTML `no-cache`, so a redeploy is picked up immediately; offline caching is the service worker's job.

Checks on that origin, in the browser:

| Check | Result |
|---|---|
| `/` | **PASS** — 200, `text/html`, `cache-control: no-cache` |
| `/manifest.webmanifest` | **PASS** — 200, `application/manifest+json`, parsed with 3 icons |
| `/sw.js`, `/js/app.js`, icons | **PASS** — 200, correct content types |
| `/index.html` | **PASS** — 307 redirect to `/`, which is why the precache stores `/` only and never a redirected copy |
| Service worker | **PASS** — `activated`, scope `/`, 20 cached files, zero console errors |
| Offline run on the live URL | **PASS** — network disabled: reload, glossary (41 terms), library (8 templates) and planner (2 days × 45 min) all worked |
| Third-party requests on the live URL | **PASS** — the resource timing log contained no URL outside the app's own origin |

### 7.5 Not tested

- The browser **install prompt** itself: headless Chromium exposes no install UI, so installation was verified only through manifest parsing, icon availability and a working service worker. A human should confirm the "Install app" entry appears in Chrome or Edge.
- iOS Safari and Android Chrome installed-app behaviour (standalone window, splash screen).
- Service-worker **upgrade** behaviour after a future deployment (the cache name is versioned, so a new `VERSION` replaces the old cache).
- Maskable icon cropping on real launchers, other than confirming the glyph sits inside the 80% safe zone.

---

## 8. AI integration, practice quizzes and settings (20 November 2026)

This section records the tests run for the release that added a real AI endpoint, an interactive practice quiz, study-plan progress tracking and a settings page. Results below are what the commands actually printed in the build environment (Node 26.13.0, Chromium via Playwright, Ubuntu). Nothing in the table is inferred.

### 8.1 Requested QA table

| Test | Expected result | Actual result | Status |
|---|---|---|---|
| Application startup | App starts successfully | `node server/node-server.js` printed `listening on http://0.0.0.0:3000`; `GET /` → 200 `text/html`, `GET /planner` → 200 via the SPA fallback; 10 views and 10 nav links rendered in Chromium. | **Pass** |
| AI explanation | Genuine AI response | Not run against a real provider — no API key was supplied to this environment. The full server path was run against a local stub provider: `POST /api/ai` → 200, nine validated sections rendered ("1. Definition" … "9. Revision questions"), 4 steps, 5 revision Q&As, 2 vocabulary terms; status chip changed to "AI live · stub-model" only after success. | **Blocked** (no key) — stub-path verified |
| Quiz generation | Valid quiz generated | Stub-provider run: requested 5 questions from pasted notes → 5 rendered question fieldsets with prompts 1–5; malformed-model JSON returns 502 in the automated suite instead of rendering. | **Pass** (stub provider) |
| Quiz marking | Correct answers marked | Deliberately answered question 1 wrongly and question 4 wrongly → score `60%`, summary "You answered 3 of 5 correctly", 2 review items with the learner's answer, the correct answer, the explanation and the quoted source line. Unanswered submit blocked with "Answer all 5 questions first — 5 still blank." | **Pass** |
| Study planner | Valid plan generated | 2 topics, 45 minutes/day, 2 days → 2 day cards, each "45 / 45 min used" (no overbooking), 6 tickable activities; ticking one persisted and showed "1 of 6 activities done · 17%" after a reload. | **Pass** |
| Data persistence | Saved data remains available | After a full page reload: theme `dark` retained, preferred subjects `Hardware, Networking` retained, saved study plan restored with its tick marks, dashboard plan card showed "1 of 6 activities done · 17%", quiz result 60% listed. | **Pass** |
| Mobile layout | Interface adapts to mobile | At 390×844: sidebar translated off-canvas, no horizontal overflow (`scrollWidth === innerWidth`), menu button visible, `aria-expanded` toggled `true`, navigating closed the menu, quiz view usable. | **Pass** |
| Production build | Build completes successfully | `./build.sh` → "Built dist/ (24 files)"; Sites production deploy receipt `succeeded`; live URL returned 200 for `/`, `/api/health`, `/sw.js`, `/js/ai.js`, `/settings`. | **Pass** |

### 8.2 Automated tests

Command: `npm test` (Node's built-in runner, no dependencies).

```
ℹ tests 29
ℹ pass 29
ℹ fail 0
```

| Area | Tests | What they prove |
|---|---|---|
| `tests/ai-core.test.js` | 15 | Request validation rejects empty/oversized/unknown input; enum typos are errors, not silent fallbacks; notes-locked prompt contains the notes; code fences are stripped; explanation and quiz schemas are enforced (four distinct options, valid answer index, boolean true/false, five questions); provider auth failure, malformed JSON and timeouts map to safe messages; the API key never appears in any response; window and daily rate limits work. |
| `tests/server.test.js` | 6 | Static serving with CSP/nosniff/no-cache headers; SPA fallback; 404 for missing assets; path traversal in four encodings never reads a file outside `dist/`; health reports prompt mode without a key and never echoes it; `GET /api/ai` → 405, bad JSON → 400, foreign `Origin` → 403; configured run proxies to the provider with the key only in the upstream header. |
| `tests/client-core.test.js` | 8 | Multiple choice marked by index; true/false accepts booleans and words; short answers mark full, partial (review) and wrong; `markQuiz` score excludes review answers; `isAnswered` per type; `planProgress` counts non-break activities; settings are clamped and de-duplicated, booleans are not coerced from strings. |

### 8.3 Security checks performed

- **Secret exposure:** the key exists only in the server environment. `/api/health` returns `{configured, provider, model}` and no key; tests assert the key is absent from health, AI and error responses; `render.yaml` uses `sync: false`; `.env` is git-ignored and `.env.example` contains names only.
- **Input validation:** operation, topic length, note length, question count and enum values are validated server-side before any provider call; request body is capped at 24 000 characters on both targets.
- **Output handling:** model text is parsed as JSON, schema-checked, length-clamped and rendered with `textContent`; no model text is inserted as HTML, so a malicious model answer cannot inject markup.
- **Traversal:** `../`, `%2e%2e/`, nested `../` and `..%2f` all fail to read outside the served directory.
- **Origin:** cross-origin `POST /api/ai` is rejected with 403; CSP blocks third-party scripts and frames, and `object-src`/`base-uri` are `none`.
- **Dependency risk:** zero runtime npm dependencies on the server, so the supply chain is limited to Node itself.

### 8.4 Not tested

- **A real AI provider.** No credential was available. The stub proves the plumbing; it does not prove model behaviour, refusal quality or latency. Run these once a key exists: one explanation at each level, one quiz with 5/10/20 questions on real notes, one deliberately unsupported quiz request, one provider outage (wrong key), one rate-limit trip, and a 12 000-character notes request for timing.
- **Render.** No account or credentials. The Node server and `render.yaml` were exercised locally only; see `docs/RENDER_DEPLOYMENT.md`.
- Screen readers, Safari/Firefox, iOS install, and automated contrast audits.
- Long-running multi-instance rate limiting (in-memory limits are per instance).

## 9. Local-key mode and the 3D landing page (23 November 2026)

Added when a learner asked to connect their own provider key inside the app and to start from a landing page.

### 9.1 Automated

`npm test` → **36 tests, 36 pass, 0 fail** (`tests/local-ai.test.js` adds 7). The new tests cover:

| Test | Expected | Actual | Status |
|---|---|---|---|
| Key validation | A blank key, a non-https base URL and a missing model are refused with readable errors | Refused: “Paste your API key first.”, “The base URL must start with https://…”, “Enter the model name…” | Pass |
| Storage | The key is written to `studymate.ict.localai.v1` and removed by `clear()` | Written and removed; `isEnabled()` returns false afterwards | Pass |
| Provider call | `run({op:'explain'})` posts to `<base>/chat/completions` with `Authorization: Bearer <learner key>`, `response_format: json_object`, and the topic in the user message | Exactly that URL, header and body | Pass |
| Rejected key | 401 becomes a clear message, not raw provider output | “Your provider rejected the key…” with code `unauthorized` | Pass |
| Malformed output | Non-JSON, missing fields, an mcq without four distinct options are refused | All refused with schema errors | Pass |
| Quiz normalisation | ids renumbered, mcq answer derived from the index, true/false kept boolean, short answers get keywords | As expected | Pass |

### 9.2 Browser (Chromium, Playwright, against the local server)

A stubbed provider endpoint (`**/chat/completions`) was used so the real request path could be exercised without a real key; no claim is made about real model quality here.

| Test | Expected | Actual | Status |
|---|---|---|---|
| Landing page | `#/home` is the default view with the 3D cube, 11 nav links, key panel and CTAs | hash `#/home`, 6 cube faces, 11 nav links, 2 key panels, CTA “Add my API key” | Pass |
| Save & test | Key saved, test request sent with the learner key, status “Connected” | `Connected. stub-model answered successfully — AI is ready.`; request `https://api.example.com/v1/chat/completions`, `Bearer sk-te…`, model `stub-model`, `json_object` | Pass |
| The key works end to end | Explain with AI renders the validated explanation | 9 sections rendered; chip `AI live · stub-model (your key)`; panel mode `live`; key present in LocalStorage | Pass |
| Key removal | Removing the key returns to prompt mode | chip `Prompt mode · no API key`, LocalStorage entry gone, prompt output still built | Pass |
| Mobile layout | No horizontal overflow at 390×844, cube scaled down, floating chips hidden | overflow 0 px, stage 299×280, chips hidden, key fields usable | Pass |

### 9.3 Still not tested

- **A real provider with a real key.** The browser path was proven against a stub; only a live key can confirm provider-specific CORS behaviour, model JSON discipline and real latency.
- Safari/Firefox and screen readers.
