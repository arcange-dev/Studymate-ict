# STUDYMATE ICT
## AI-Powered ICT Learning Assistant
### Final Capstone Project & Internship Submission Report

**Internship:** AI & Prompt Engineering Internship
**Organization:** Ishvexa Hub
**Project:** StudyMate ICT — version 2.4.0
**Developer:** Mukamyi Izere Arcange
**Project Category:** AI-Assisted Educational Technology
**Submission:** Final Capstone Project
**Report date:** 25 November 2026

---

# 1. Executive Summary

StudyMate ICT is a working educational web application that helps beginner and intermediate ICT students understand terminology, practise what they have learned, plan study time and ground answers in their own notes. It ships as an installable, offline-capable PWA built from HTML, CSS and 22 vanilla JavaScript modules — no framework, no build step and no accounts.

The project was developed as the capstone of the AI & Prompt Engineering internship at Ishvexa Hub. Its central question was narrower than "can AI write a study app": it was *where does prompt engineering actually belong in a study tool?* The answer the prototype commits to is that the prompt is a first-class deliverable, not a hidden side effect. Every AI feature composes a numbered, inspectable prompt with an explicit output contract, the learner can copy it into any assistant, and with no API key the app sends nothing to any model at all.

The application is deployed on two addresses that serve a byte-identical build, is covered by 54 automated tests and 16 documented manual test cases, and was audited across all twelve routes at desktop and phone widths. It was built with AI assistance (Freebuff) and the assistance is acknowledged in the repository and in the app's own About page.

# 2. Project Links

**GitHub Repository:**
https://github.com/arcange-dev/Studymate-ict

**Application (production):**
https://studymate-ict-04s0d8.freebuff.site/

**Development preview (same build):**
https://studymate-ict-04s0d8-preview.freebuff.site/

# 3. Problem Statement

ICT students at the start of their studies face four recurring problems:

1. **Vocabulary before understanding.** Terms such as *cache memory*, *subnetting* or *RAM* are defined in language that assumes the concept they are defining. A learner who cannot restate a definition cannot answer an exam question about it.
2. **Reading without retrieval.** Re-reading notes feels productive and is weak practice. Learners rarely have a fast way to turn material into questions and mark their own answers.
3. **Planning that ignores real time.** A plan built for "three hours a night" collapses on the first busy evening. Most planning advice does not start from the minutes a learner actually has.
4. **Unverified AI answers.** General-purpose assistants answer ICT questions confidently and sometimes incorrectly, and a learner with no reference material cannot tell which answer is wrong.

StudyMate ICT addresses these four problems directly instead of adding another chat box: a glossary with worked examples, a quiz generator with in-browser marking, a planner that never books more minutes than the learner states, and a source-grounded mode that must refuse when the supplied notes do not support an answer.

# 4. Project Objectives

- Build a digital ICT learning assistant that works with no account and no server key.
- Help learners understand technical concepts through structured, levelled explanations.
- Support self-study and revision with questions the learner marks himself or herself.
- Turn available study minutes into a realistic, day-by-day plan.
- Provide an organised, searchable ICT glossary with practical examples.
- Explore prompt engineering as a design discipline inside an educational application.
- Keep every AI prompt inspectable, copyable and honest about its limits.
- Use AI-assisted development tools transparently and acknowledge that assistance.
- Publish a reproducible prototype with documentation and evidence.

# 5. Project Features

The application has twelve routes: Home, Dashboard, ICT Concept Explainer, Quiz Generator, Study Planner, ICT Glossary, Source-Grounded Learning, Prompt Library, Saved Learning, Settings, About and API Reference.

## 5.1 Dashboard

The first screen after the landing page. Six metrics are computed from the learner's own saved data — saved topics, saved prompts, quizzes marked, average score, plan progress and glossary terms — beside continue-learning rows, plan progress, six tool cards, a quiz-score chart and recent activity. A new learner sees honest zero states, never invented streaks.

## 5.2 ICT Concept Explainer

Builds a levelled explanation prompt (beginner, intermediate or advanced) for a topic, with a numbered structure, a required example and an explicit "state what you are unsure about" instruction. With a key configured the answer is returned by the provider; without one the prompt is produced for copying.

## 5.3 Quiz Generator

Generates multiple-choice questions with marked correct answers, then marks the learner's choices in the browser, explains each answer and records the score. Scores feed the dashboard's average and chart.

## 5.4 Smart Study Planner

A deterministic scheduling algorithm, not an AI call. It takes the topics, the minutes available per day, the number of days and a difficulty level, and produces study blocks, a real break, a second block and a self-assessment quiz per day. It never books more minutes than the learner stated, and it shortens the plan when an examination date is closer than the day count.

## 5.5 Source-Grounded Learning

The learner pastes notes and a question. The generated prompt restricts the assistant to those notes, requires it to name the section it used, forbids invented policies, dates, prices and contact details, and mandates a refusal sentence when the notes cannot support an answer. Instructions inside the notes are treated as content, not commands.

## 5.6 ICT Glossary

41 ICT terms with plain-language definitions, a practical example each, category filters and search. Terms can be saved and personal terms added; the glossary is also indexed by the global search.

## 5.7 Prompt Library

Eight reusable study templates — explaining a concept, generating quiz questions, building a study plan, summarising notes, revising a weak topic, comparing two concepts, preparing for a practical and checking an answer — each with its purpose, inputs, output format, a completed example and a responsible-use note.

## 5.8 Saved Learning, Settings and API Reference

Saved Learning collects the learner's topics, prompts, terms and activity in one filterable list. Settings holds the theme, data export/import, the optional provider key and the data-reset control. The API Reference documents the two HTTP endpoints from the deployment's own live health check.

## 5.9 Offline and installation

A service worker precaches the complete app shell (31 URLs, including the self-hosted font), navigations are network-first so a new deployment replaces the cached shell on the next load, and static assets are cache-first. The app installs from the browser and reloads with the network switched off. API routes are never cached, so a cached health check cannot misreport the deployment.

# 6. Development Process

1. Identified the learning problem from the four difficulties in section 3.
2. Defined scope: study tools first, AI optional, no accounts, no backend database.
3. Planned twelve routes, a token-driven design system and a LocalStorage data model.
4. Used AI-assisted development (Freebuff) for implementation and review.
5. Built the interface, the twelve views and the 22 JavaScript modules.
6. Reviewed every screen at desktop and phone width, then fixed the layout and contrast defects found.
7. Wrote 54 automated tests and 16 documented manual test cases.
8. Iterated through 2.x releases, each recorded in `docs/CHANGELOG.md`.
9. Published to preview and production, verifying both serve the same build.
10. Produced this report, the user guide, the presentation script and thirteen screenshots from the live build.

# 7. Technologies and Development Tools

- **HTML5** — a single semantic document shell with an inline SVG icon sprite.
- **CSS3** — one design system in `css/styles.css`: tokens for colour, spacing, radius, shadow and type, a token-level dark theme, responsive layout down to 320 px, and no framework.
- **JavaScript (ES2019+, no framework)** — 22 classic scripts loaded in dependency order, covering routing, storage, prompt composition, provider calls, the planner algorithm and the views.
- **Service Worker and Web App Manifest** — offline caching and installation.
- **Playfair Display (self-hosted)** — two woff2 subsets in `assets/fonts/`, served from the app's own origin and precached, so typography adds no third-party request.
- **Node.js** — the test runner (`node --test`) and the small serverless handler that exposes `/api/health` and `/api/chat`.
- **GitHub** — source control, history and public repository.
- **Freebuff** — AI-assisted development and the hosting platform used for both deployments.

# 8. AI and Prompt Engineering

Prompt engineering in this project means five concrete decisions, each visible in the code and in `PROMPTS_USED.md`:

1. **Role and audience.** Every prompt names the audience (beginner, intermediate, advanced) and the assistant's role, so tone and depth are constrained before content is produced.
2. **Numbered output contract.** Prompts specify the exact sections to return, in order, with headings. The UI renders those sections; a free-form answer breaks the layout.
3. **Evidence and refusal.** The grounded prompt requires the supporting section to be named and requires the exact refusal sentence when the notes are insufficient. Refusal is a required output, not a failure.
4. **Instruction-injection rule.** Text inside reference material is declared to be content to analyse, never a command to follow.
5. **Inspectability.** The composed prompt is shown in full and can be copied. Without a key the app never contacts a model — the prompt *is* the product, and the AI is optional.

The development work also applied prompt engineering to the build itself: scoped instructions, explicit acceptance criteria, review of generated code, and tests as the check on AI output.

# 9. Week 4 — Source-Grounded Assistant

The Week 4 task was to build an assistant that answers only from supplied material and recognises when an answer is unavailable.

What was implemented:

- A source document field and a question field, with both marked required.
- Assistant instructions that restrict the answer to the supplied notes, name the supporting section, forbid invented policies, dates, prices and contact details, and mandate the refusal sentence: *"The supplied notes do not provide enough information to answer that reliably."*
- A rule that instructions inside the notes are content to analyse rather than commands to follow.
- A visible "required fallback in every answer" panel, so the learner can see the refusal contract before generating.
- The same behaviour in the grounded prompt used by the app and in the manual workflow described in the user guide.

**The ten recorded tests were run on 26 November 2026:** six answerable cases, two cases whose answer is absent from the notes, and two instruction-override attempts, executed against the production demo and recorded case by case in [`WEEK4_GROUNDED_TEST_SET.md`](WEEK4_GROUNDED_TEST_SET.md).

Results, stated at the layer the live demo can actually be observed at:

- **Prompt composition — 60/60 checks, 10/10 cases.** Every case produced a prompt that carries the notes verbatim inside the `<<<NOTES … NOTES>>>` fence, forbids outside knowledge, contains the exact refusal sentence, labels inference, and carries the injection rule. The notes were accepted in every case with no false rejection.
- **Coverage heuristic — 5 exact, 1 partial, 4 false alarms, 0 dangerous false "supported".** It caught the absent case (G07) and erred towards caution on answerable questions; the partial case (G08) shows the documented weakness, where a topic the notes merely mention gets a mild warning instead of a refusal prediction.
- **The first baseline run found a real defect.** The injection rule this section describes was missing from the shipped grounded prompt (0/10) although it was claimed here. The prompt engine was corrected, the suite re-run (54/54), and both hosts redeployed; the unchanged ten cases then passed 10/10, so the claim above is accurate for the current build. `PROMPTS_USED.md` was corrected to match.
- **Replies were not scored.** The public demo runs in prompt mode with no key, so no model answer exists to score; refusal on G07 and G08, premise correction on G06 and override resistance on G09 and G10 are recorded as *expected* reply behaviour, explicitly not as observed passes. A reply-level score needs a key and is listed as further work.

# 10. Week 5 — Capstone Development

StudyMate ICT is the capstone: a study assistant that explains supplied material and creates questions with checked answers, which is one of the handbook's listed capstone options.

Delivered for this stage:

- Working prototype, reachable at both deployed addresses, installable and usable offline.
- One routing decision per feature: deterministic tools (planner, marking, glossary) never call a model; AI-optional tools compose prompts.
- Prompts and reference material recorded in `PROMPTS_USED.md`.
- Evidence: 54 automated tests, 16 documented manual cases, and a live audit of all twelve routes at 1440 px and 390 px on both hosts (48 checks).
- Usage guide (`USER_GUIDE.md`), limitations (`LIMITATIONS_AND_FUTURE_WORK.md`) and a three-minute demonstration sequence (section 15, and `PRESENTATION_GUIDE.md`).
- Submission screenshots captured from the live build, thirteen images at desktop and phone width.

# 11. Week 6 — Final Evaluation and Improvement

Completed in this stage:

- Reviewed all twelve routes for version consistency after the 2.4.0 release, correcting every document that still described an older build.
- Recaptured all thirteen screenshots from production after the typography change so the submission images match the deployed build.
- Verified both hosts serve a byte-identical `index.html` and identical `/api/health` output.
- Ran the automated suite after each change (54 passing) and rebuilt the deploy bundle from source each time.

Not completed: **user testing with two external participants, anonymised feedback, and a change log of improvements derived from that feedback.** No testers were recruited, so no feedback is reported. This remains the largest gap against the handbook's Week 6 requirement and is stated rather than simulated. The session materials are prepared and ready to run in [`WEEK6_USER_TESTING_KIT.md`](WEEK6_USER_TESTING_KIT.md) — consent note, five rehearsed tasks with success signals, a feedback form and a change-log template — and every field in them is intentionally empty until two real sessions have taken place.

# 12. Testing and Quality Evaluation

Results below are actual outcomes, recorded in `TESTING_REPORT.md`.

| Test Area | Result |
|---|---|
| Navigation | All twelve routes render and link correctly; unknown hashes fall back to a not-found view rather than a blank page. |
| Interface | Reviewed at 1440 px and 390 px; horizontal overflow measured as 0 px on every audited route. |
| Responsiveness | Sidebar becomes an off-canvas drawer below 900 px; grids collapse to one column on phones. |
| Concept learning | Explainer composes a levelled, numbered prompt; empty input is rejected with a message rather than a request. |
| Quiz generation | Questions render, choices are marked, explanations and score are recorded and shown on the dashboard. |
| Study planning | Planner splits stated minutes into blocks and breaks, never exceeds the stated daily total, and shortens for a nearer examination date. |
| Glossary | 41 terms, category filter, search, save and personal terms all work; global search covers every term. |
| Prompt resources | Eight templates render with purpose, inputs, output format, example and responsible-use note; copy works. |
| Error handling | No key: `/api/chat` returns 503 `ai-not-configured` and the UI stays in prompt mode. Oversized bodies are rejected at 64 KiB. Rate limits are 20 requests per 10 minutes and 300 per day. |
| Offline | App shell reloads and navigates with the network off; API routes are never served from cache. |
| Automated suite | 54 tests, 54 passing, 0 failing. |
| Live audit | 48 checks (12 routes × 2 widths × 2 hosts), all passing. |
| Limitations | No paid provider was called end to end; no screen-reader, Safari, Firefox or real-device pass was carried out. |

# 13. Responsible AI and Project Limitations

StudyMate ICT is an educational prototype, not a source of truth. AI-generated educational content can be incomplete, outdated or simply wrong, and the app says so in the interface, in the About page and in every generated prompt. Learners should check important claims against textbooks, official documentation or an instructor.

Known limitations:

- **No server key by default.** The deployed build runs in prompt-only mode; `/api/chat` refuses with 503 until a provider key is configured. The app is therefore not presented as a live chatbot.
- **Local-only data.** Everything is stored in the browser's LocalStorage. Clearing site data, switching browsers or changing device loses it; there is no account and no sync.
- **Prompt quality is not answer quality.** The app controls the instruction, not the model. A provider can still ignore a section or overstate confidence.
- **Limited scope.** 41 glossary terms and eight templates cover introductory ICT, not a full syllabus.
- **Testing gaps.** No paid-provider run, no screen-reader audit, no Safari, Firefox or physical-device testing, and no external user testing.
- **Prototype-level.** No analytics, no teacher view, no classroom management and no accessibility certification.

# 14. Project Contribution and Reflection

My contribution covers the concept, scope, prompt design, interface, implementation review, testing, documentation, deployment and the thirteen submission screenshots. AI assistance (Freebuff) was used for code generation and review; every generated change was read, tested and either accepted or corrected, and that assistance is acknowledged in the repository.

What the project demonstrated:

- A problem must be split before it is solved — the planner and the marker needed no AI at all, and forcing a model into them would have made the app worse.
- Prompt structure is a design artefact: numbered sections, a refusal sentence and an injection rule are decisions a reviewer can inspect.
- Documentation is part of the product; several defects were found by writing down what the app was supposed to do.
- Honest reporting is harder than optimistic reporting. The gaps in sections 9 and 11 are recorded because they were not done.

# 15. Project Demonstration

**Three-minute sequence (Week 5):**

1. Introduce StudyMate ICT and the four learner problems.
2. Open the deployed application and the dashboard.
3. Explain a concept and show the composed prompt.
4. Generate and mark a short quiz.
5. Build a study plan from stated minutes.
6. Show the glossary, then the source-grounded refusal rule.
7. Close with limitations: prompt-only mode, local data, human verification.

**Five-minute sequence (Week 6)** — the detailed script, timings and likely questions are in `PRESENTATION_GUIDE.md`:

1. Problem and user (0:00–0:45).
2. Explainer, quiz and planner (0:45–3:00).
3. Source-grounded learning and prompt engineering (3:00–4:30).
4. Limitations, lessons and next steps (4:30–5:00).

# 16. Conclusion

StudyMate ICT explores where prompt engineering genuinely helps an educational tool and where deterministic software does the job better. The result is an offline-first study assistant with twelve routes, six study tools, an inspectable prompt library, honest refusal behaviour and a documented evidence base.

Further work would follow the gaps recorded above: a reply-level score for the ten grounded-assistant cases (the prompt layer is now recorded in `WEEK4_GROUNDED_TEST_SET.md`), two consenting testers with an anonymised feedback and change log, a paid-provider end-to-end run, accessibility and cross-browser testing, and a provider-backed live mode that keeps the key server-side.

# 17. References and Resources

## Project References

**StudyMate ICT GitHub Repository**
https://github.com/arcange-dev/Studymate-ict

**StudyMate ICT Application**
https://studymate-ict-04s0d8.freebuff.site/

**StudyMate ICT Development Preview**
https://studymate-ict-04s0d8-preview.freebuff.site/

**Freebuff Platform**
https://freebuff.com/

## AI and Prompt Engineering References

**OpenAI Prompt Engineering Guide**
https://platform.openai.com/docs/guides/prompt-engineering

**Google AI — Prompting Strategies**
https://ai.google.dev/gemini-api/docs/prompting-strategies

**Microsoft Learn — Introduction to Generative AI**
https://learn.microsoft.com/en-us/training/paths/introduction-generative-ai/

## Software Development References

**GitHub Documentation**
https://docs.github.com/

**MDN Web Docs**
https://developer.mozilla.org/

**Node.js Documentation**
https://nodejs.org/docs/

## Internship Reference

**Ishvexa Hub — AI & Prompt Engineering Internship Handbook and Internship Activities** (2 November – 11 December 2026)

---

## Appendix — Submission Screenshots

Captured from the production build (2.4.0) on 25 November 2026. Desktop images are 1440 × 1000; phone images are 390 × 844.

| File | Screen |
|---|---|
| `01-dashboard-desktop.png` | Dashboard |
| `02-ict-explainer.png` | ICT Concept Explainer |
| `03-study-planner.png` | Study Planner with a saved plan |
| `04-prompt-library.png` | Prompt Library |
| `05-source-grounded.png` | Source-Grounded Learning |
| `06-glossary-mobile.png` | ICT Glossary (phone) |
| `07-planner-mobile.png` | Study Planner (phone) |
| `08-saved-learning.png` | Saved Learning |
| `09-dashboard-mobile.png` | Dashboard (phone) |
| `10-api-reference-desktop.png` | API Reference |
| `11-api-reference-mobile.png` | API Reference (phone) |
| `12-about-desktop.png` | About — author credit |
| `13-about-mobile.png` | About (phone) |

---

# END OF FINAL CAPSTONE SUBMISSION REPORT
