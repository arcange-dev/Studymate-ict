# Changelog — StudyMate ICT

All dates are 2026. The project follows a simple `MAJOR.MINOR.PATCH` scheme; the app version is shown in `package.json`.

## 2.4.0 — 25 November 2026

The reference page for the API the app already had.

### Added

- **API Reference page** (`#/api`, sidebar group *Developers*, and in global search). It documents `GET /api/health` and `POST /api/ai` — request fields and limits, successful response shapes for explanations and quizzes, the full error map with status codes, the environment variables for self-hosting on Node or Cloudflare, the `window.SM` browser API and the three bring-your-own-key protocols. Its status card is filled from this deployment's own `/api/health`, so the page reports the real mode, provider, model and rate limits instead of an example.
- The page is precached by the service worker with the rest of the shell, and falls back to the documented defaults when the health check cannot run.

### Fixed

- **The 64 KiB request limit now exists.** Both servers already answered `413` for oversized bodies, but the check compared against `LIMITS.bodyMax`, which was never defined — so nothing was actually limited. `bodyMax: 65536` is now part of the shared contract.
- **Code blocks on the new page no longer inherit the inline-code chip style** that `.prose code` applies; the environment-variable example had rendered as light text on a light background.

### Tests

- 54 Node tests pass (`npm test`); `./build.sh` writes 30 files.
- The page was checked at 1440px and 390px on the preview address and at 1440px on production: no horizontal overflow, live health values, no console errors. All 30 deployed files were byte-identical between the two hosts afterwards.

## 2.3.1 — 25 November 2026

The last navigation gap before submission.

### Added

- **A Home button in the top bar**, on every screen. The 3D landing page and its provider panel already existed, but only `#/home` in the address bar reached them; the button opens it in one click and is marked current while it is open, on desktop and on mobile (icon only below 760px).
- **A Home entry at the top of the sidebar's *Workspace* group**, so the landing page is reachable from the drawer and the collapsed icon rail too — the user guide already told learners to open Home in the sidebar.
- Global search now lists **Home** with the other pages instead of skipping it.
- On phones the AI-mode chip collapses to its status dot at 430px and below (its text stays in the DOM for screen readers and in the tooltip), so the extra button no longer squeezes the page title. The two longest breadcrumbs use shorter labels ("ICT Explainer", "Source-Grounded") so nothing ellipsizes at 375px or wider.

### Tests

- 54 Node tests pass (`npm test`), up from 51: new `tests/navigation.test.js` checks that every navigation entry has a matching view and that Home is reachable from the topbar and the sidebar.
- Version bumped to 2.3.1.

## 2.3.0 — 24 November 2026

The **Add an AI provider** panel: every provider, tested automatically.

### Added

- **A dedicated provider panel** on Home and in Settings (`js/key-panel.js` rewritten): searchable catalogue, provider picker grouped by region, model field with autocomplete, base-URL field with an inline test, **Test connection** and **Fetch models** buttons, protocol badge, per-provider notes and a documentation link.
- **A 47-entry provider catalogue** (`js/providers.js`): OpenAI, Anthropic, Google Gemini, OpenRouter (paid and free), Groq, Mistral, DeepSeek, Together, Fireworks, Perplexity, xAI, Cohere, Cerebras, SambaNova, DeepInfra, Novita, Hyperbolic, Nebius, NVIDIA NIM, AI21, Writer, Hugging Face, Scaleway, OVHcloud, GitHub Models, Moonshot (Kimi), Z.ai (GLM), Alibaba Qwen, SiliconFlow, 01.AI (Yi), Baichuan, StepFun, MiniMax, Tencent Hunyuan, ByteDance Doubao, Upstage, Sarvam, Azure OpenAI, Cloudflare Workers AI, Ollama, LM Studio, llama.cpp, vLLM, Jan, text-generation-webui and a custom gateway. Each entry knows its base URL, default model, protocol, CORS behaviour and docs URL.
- **Automatic URL testing.** As soon as a base URL is typed or a provider is chosen, the panel probes `{base}/models` (debounced, 12 s timeout) and reports reachability, latency and available models; a refused key still proves the URL is live, and a CORS or timeout failure is explained in plain language instead of surfacing a raw `TypeError`.
- **Native protocol adapters** in `js/local-ai.js`: OpenAI Chat Completions, Anthropic Messages (`x-api-key`, `anthropic-version`, browser-access header) and Gemini `generateContent` (`x-goog-api-key`, `responseMimeType`). Model lists are parsed per protocol, and the shared `js/ai-contract.js` still validates every answer.
- **Test before saving.** `testConnection()` accepts unsaved values and reports the model, protocol and round-trip time, so a key can be checked without overwriting a working one.
- Pasted base URLs are normalised (`/chat/completions`, `/messages`, `/models`, trailing slashes) and recognised as their provider.

### Tests

- 51 Node tests pass (`npm test`), up from 36: new `tests/providers.test.js` (catalogue integrity, grouping, normalisation, detection, search) and new protocol tests for OpenAI, Anthropic and Gemini, the URL probe, refused keys and CORS failures. Two real bugs were found by them and fixed: a stored default protocol overriding Claude/Gemini, and `models/` prefixes being double-encoded in Gemini URLs.
- Version bumped to 2.3.0.

## 2.2.1 — 24 November 2026

### Fixed

- **A deployment no longer hides behind the previous shell.** Navigations were served cache-first, so a browser that had visited an older build kept the old document (and its old sidebar and dashboard markup) until a second reload — which is why the production and preview addresses could look different even when they served identical files. Page loads are now network-first with the precached shell as the offline fallback; static assets stay cache-first with a background refresh.
- The service worker registration asks for `updateViaCache: 'none'` and reloads the page once when a newer worker takes control, but not on a first install.

## 2.2.0 — 24 November 2026

The dashboard-first redesign: one design system across every screen.

### Added

- **Workspace shell.** Sidebar with *Workspace* and *Your learning* groups, active states, a live saved-items badge, collapsible icon mode (state remembered, labels kept for screen readers, CSS tooltips) and an off-canvas drawer below 900px. Topbar with breadcrumbs that follow the route, a page hint, global search, the AI-status chip, theme toggle, primary action and a mobile menu button.
- **Real-data dashboard.** Six metrics (saved topics, saved prompts, quizzes marked, average score, plan progress, glossary terms), continue-learning rows, plan progress, tool cards, per-quiz score bars, recent activity and study focus — all derived from LocalStorage, with zero states instead of placeholder numbers. Optional display name (stored locally, used only for the greeting).
- **Global search** (`/` or `Ctrl/Cmd + K`): pages, all 41 glossary terms, saved topics and prompts, personal terms and the active plan; ranked and grouped results, arrow-key navigation, `Enter` to open, deep links that pre-fill the glossary or saved search box.
- **Saved Learning filters:** search across sections plus a category filter, live match count and a reset action.

### Changed

The default route is now `#/dashboard`; `#/home` still exists for the landing and key-setup page, and every existing route, saved link, form ID and LocalStorage key is unchanged.

- `css/styles.css` is a single design system built on tokens (colour, spacing, radius, shadow, type), with a token-level dark theme, system font stack, inline SVG sprite icons and no external assets. Legacy class names used by the JavaScript were preserved.
- All views were rebuilt on that system: explainer, quiz, planner, source-grounded learning, glossary, prompt library, saved learning, settings and about, including form layouts, empty states, callouts, tables of results and print styles.
- Accessibility: skip link, landmarks, one `h1` per view, labelled fields, visible focus rings, `aria-live` status text, `prefers-reduced-motion` and AA contrast for secondary text.
- The service worker's cache name is now stamped by `build.sh` from a hash of the built shell, so updates cannot be hidden behind a stale cache. `dist/` is still regenerated and committed.
- Version bumped to 2.2.0.

### Tests

- 36 Node tests pass (`npm test`) and `./build.sh` produces the same 28-file bundle.
- Browser QA (Chromium): 11 routes at 320, 375, 390, 430, 768, 1024, 1280, 1440 and 1920 px with no horizontal overflow; sidebar collapse/persistence; mobile drawer; search ranking and keyboard flow; saved search/filter; quiz generation against a stubbed OpenAI-compatible provider (5/5 marked, score and dashboard stats updated); plan build/save/tick persistence across reload; theme persistence; offline reload from the service worker. Details in `StudyMate-ICT/TESTING_REPORT.md`.

## 2.1.1 — 24 November 2026

One copy of the AI contract, used by both AI paths.

### Changed

- **Prompts and validation are no longer duplicated.** `js/ai-contract.js` now owns the explain/quiz prompts, request validation, JSON parsing and the explanation/quiz schema checks. The browser path (`js/local-ai.js`) and the server core (`sites/ai-core.js`) both use it, so their rules and wording cannot drift. It stays a classic script, so the app still works from `file://`.
- `js/local-ai.js` keeps only key storage, provider presets and the direct provider call; the key is still never rendered back into the page (only a "saved on this device" placeholder is shown).
- Service worker bumped to **v5** (26 precached files); `dist/` is now 28 files.

## 2.1.0 — 23 November 2026

Home-page entry point, and a second AI path that needs no server key.

### Added

- **3D landing page** (`#/home`, now the default view): animated CSS cube of ICT domains with orbiting rings, pointer parallax (skipped for reduced motion and touch), the key-connection card, a three-step "add key → study → plan" explainer, and direct links to the explainer and planner.
- **Learner-supplied AI key** (`js/local-ai.js`, `js/key-panel.js`): paste a key, base URL and model from any OpenAI-compatible provider (OpenAI, OpenRouter, Groq, Gemini, Mistral, DeepSeek, Together, Z.ai, or a custom base URL) on the Home page or in Settings. Stored in this browser's LocalStorage only, sent only to that provider, never to this app's server. Includes Save & test, Show/Hide, Remove, and a plain-language privacy warning.
- **Independent validation for the browser path**: request checks, JSON parsing, explanation/quiz schema checks, answer-key derivation and readable errors for 401/404/429/400 and network/CORS failure.
- **Prompt-mode fallback stays intact**: removing the key (or never adding one) returns the app to prompt mode with no reload.

### Changed

- The status chip now distinguishes the two paths: `AI live · <model> (your key)` versus `AI live · <model>`.
- **Delete all local data** also deletes the saved key, and JSON backups still exclude it.
- The Node server's Content-Security-Policy allows `connect-src https:` so the browser can reach the learner's provider; scripts, styles and frames remain same-origin.
- Service worker bumped to **v4** (26 precached files) to include the new modules.
- Root `wrangler.jsonc` and a committed `dist/` so the Publish button recognises the project as a Cloudflare Workers site.

### Tests

- 36 Node tests (up from 29): the learner-key path is covered by `tests/local-ai.test.js`.

## 2.0.0 — 20 November 2026

The release that turned a prompt-only study assistant into an application with a real AI path, without breaking the offline build.

### Added

- **AI endpoint** (`POST /api/ai`) with a provider adapter for any OpenAI-compatible endpoint, server-side key only, 24 000-character body cap, request schema validation, 30 s upstream timeout and an error map that never leaks provider detail. Implemented once in `sites/ai-core.js` and used by both the Node server and the Sites Worker.
- **Model-output validation**: explanations must contain nine usable sections and exactly five revision questions; quiz questions must be `mcq` with four distinct options and a valid answer index, `truefalse` with a boolean answer, or `short` with a model answer. Malformed output returns 502 instead of rendering.
- **Rate limiting** per client and per instance (`AI_RATE_LIMIT`, `AI_RATE_WINDOW_MS`, `AI_DAILY_CAP`) with `retry-after` on 429.
- **Health endpoint** (`GET /api/health`) reporting only whether AI is configured, never the key.
- **Live explanation UI**: "Explain with AI" renders the validated sections as accessible DOM (definition → revision questions, answers hidden behind `<details>`), with loading, error, retry and disabled states.
- **Practice quizzes**: "Generate & practise" builds a quiz from pasted notes, renders multiple choice / true-false / short-answer fields, blocks incomplete submission, marks answers in the browser, shows a score, and reviews every wrong or self-check answer with the correct answer, explanation and the quoted source line. Scores are saved to the dashboard.
- **Study-plan progress**: saved plans keep per-activity tick marks, show a progress bar and percentage, and restore on the next visit. The dashboard shows the active plan's progress.
- **Settings page** (10th view): theme (device/light/dark, applied before first paint), default explanation level, preferred subjects (pre-fills the planner), reduced motion, larger text, AI disclosure preference, JSON backup export/import and delete-all.
- **Node server** (`server/node-server.js`): zero-dependency static + API server with CSP, nosniff, frame denial, path-traversal protection, SPA fallback and graceful shutdown.
- **Render blueprint** (`render.yaml`) and deployment guide, with the API key marked `sync: false` so no secret enters the repository.
- **`.env.example`** documenting every variable name and default.
- **`build.sh`** regenerates `dist/` (the deploy bundle) with its exclusions in one place.
- **Automated tests**: 29 Node tests covering AI validation and schema enforcement, rate limiting, the HTTP surface, traversal protection, key non-disclosure, quiz marking and settings normalisation.
- **Docs**: `docs/RENDER_DEPLOYMENT.md`, `docs/AI_PROVIDER.md`, `docs/TROUBLESHOOTING.md`, this changelog, and new sections in the testing report, user guide and limitations.

### Changed

- **Quiz page** now offers two paths: live generation with marking, or the copy-paste prompt. The prompt path is unchanged and still works offline.
- **Explainer page** presents the AI explanation as the main output and keeps the prompt in a collapsible block.
- **Service worker v3**: precaches 23 files, caches each file independently instead of using all-or-nothing `addAll` (one stalled request used to leave install pending forever), and never intercepts `/api/*`.
- **Manifest description** now mentions AI explanations and in-browser marking.
- **Storage schema** gained `quizzes`, `plans` and `settings`; existing data normalises forward without migration steps.
- **Dashboard** gained recent quiz results and study-plan progress cards, both fed by real stored data.

### Fixed

- A cached health check could disable AI for a whole session; the client now sends `cache: 'no-store'` with a cache-busting query and re-checks when a tool that needs AI is opened.
- Review items showed the internal option index instead of the chosen option text.
- Prior-knowledge levels are mapped to the API's three-level contract instead of being sent as display labels.

### Security

- Server-side key only; `/api/health` and every error response are asserted key-free by tests.
- Foreign `Origin` requests to `/api/ai` are rejected with 403; same-origin is always allowed.
- All model text is inserted with `textContent`, so a malicious answer cannot inject HTML.
- CSP, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy: same-origin` and a minimal permissions policy on every response.

## 1.1.0 — 20 November 2026

- Installable PWA: `manifest.webmanifest`, three icons, `sw.js` shell precache, offline navigation fallback.
- Published to a permanent production URL; the preview environment was retired.
- `LICENSE` (MIT) and the GitHub repository.

## 1.0.0 — 20 November 2026

- Initial capstone: dashboard, ICT concept explainer, quiz-prompt generator, study planner, 41-term glossary, source-grounded learning, eight-template prompt library, saved learning and about page.
- Seven project documents, a 17-check testing report and a ZIP deliverable.
