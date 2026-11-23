# StudyMate ICT

An ICT study assistant for beginner and intermediate students: AI-generated concept explanations, practice quizzes marked in the browser, a study planner that tracks what you actually finish, a 41-term glossary, source-grounded learning and a prompt library — installable as a PWA and fully usable offline.

**Live demo:** <https://studymate-ict-04s0d8.freebuff.site/>

The public demo has no AI key configured, so it runs in **prompt mode** and says so in the status chip. Every tool works; the AI buttons are disabled until a key is added. See [AI setup](#ai-setup).

---

## What is here

| Path | What it is |
|---|---|
| `StudyMate-ICT/` | The application: `index.html`, `css/`, `js/`, `sw.js`, `manifest.webmanifest`, icons, screenshots and the seven project documents |
| `sites/` | Deployment for the public demo: `worker.js` (static assets + `/api/*`) and `ai-core.js` (the shared AI logic) |
| `server/` | Zero-dependency Node server for Render and local development: `node-server.js` |
| `tests/` | 29 automated tests: AI validation, HTTP surface, security, quiz marking, settings |
| `docs/` | Deployment, provider, troubleshooting and changelog documents |
| `build.sh` | Regenerates `dist/`, the deploy bundle |
| `dist/` | The committed deploy bundle (24 files) that both hosting configs serve |
| `wrangler.jsonc` | Root Workers config (`sites/worker.js` + `./dist` assets) — what Freebuff **Publish** detects |
| `render.yaml` | Render Blueprint (one Web Service) |

## Stack

HTML5, modern CSS and vanilla JavaScript for the app — no framework, no bundler, no runtime dependency in the browser. One optional Node service (Node 22, no npm packages) provides the AI endpoint and serves the static build. Data lives in LocalStorage.

## Architecture

```
Browser (static app, offline-capable)
   │  POST /api/ai        (JSON in → validated JSON out)
   ▼
Server (server/node-server.js  |  sites/worker.js)
   │  shared logic: sites/ai-core.js
   ▼
OpenAI-compatible provider  ←  AI_API_KEY (server env only)
```

- The **key never reaches the browser**. `/api/health` reports only whether one is configured.
- The server validates the request, applies timeouts and per-client/daily limits, then validates the model's JSON against a strict schema. Malformed output is a 502, not a half-drawn screen.
- Without a key the endpoint answers `503 ai-not-configured` and the app stays in prompt mode, which needs no network at all.
- The service worker (`studymate-ict-v3`) precaches 23 files and never intercepts `/api/*`, so a cached health check cannot misreport the deployment.

## Quick start

```bash
git clone <this repo>
cd <repo>
./build.sh                  # writes dist/ (24 files)
node server/node-server.js  # http://localhost:3000
```

No install step: the server has no dependencies. Open <http://localhost:3000>. For live AI:

```bash
cp .env.example .env        # then put your key in AI_API_KEY
node --env-file=.env server/node-server.js
```

The static app also runs offline straight from disk by opening `StudyMate-ICT/index.html` — the service worker is skipped on `file://`.

## AI setup

1. Get a key for any OpenAI-compatible provider (OpenAI, OpenRouter, a self-hosted gateway).
2. Set `AI_API_KEY` in the **server** environment — `.env` locally, Environment → `AI_API_KEY` on Render. Never put it in the frontend.
3. Optionally set `AI_BASE_URL`, `AI_MODEL`, `AI_JSON_MODE`, `AI_RATE_LIMIT`, `AI_RATE_WINDOW_MS`, `AI_DAILY_CAP`, `AI_TIMEOUT_MS` (all documented in `.env.example`).
4. Restart, check `GET /api/health` → `configured: true`, then press **Explain with AI** once. The chip only reads “AI live” after a real request succeeds.

The contract, error map and how to add another provider: [`docs/AI_PROVIDER.md`](docs/AI_PROVIDER.md).

## Tests

```bash
npm test
```

29 tests, no dependencies, using Node's built-in runner. They cover request validation and schema enforcement, provider failures, rate limiting, key non-disclosure, HTTP headers, path-traversal protection, the SPA fallback, quiz marking and settings normalisation. Results and the full QA table are in [`StudyMate-ICT/TESTING_REPORT.md`](StudyMate-ICT/TESTING_REPORT.md) §8.

Manual browser checks (Chromium, Playwright) during this release: all 10 views, prompt mode, live AI against a local stub provider, quiz marking 3/5 = 60% with review, planner 2×45 min with persisted ticks, theme/subjects/plan persistence across reload, offline reload with 23 cached files, 390×844 mobile layout without horizontal overflow, keyboard focus and skip link. **A real AI provider was not tested — no key was available.**

## Deploy

- **Render** (prepared, not deployed here — no account was available): one Web Service, build `./build.sh`, start `node server/node-server.js`, health check `/api/health`. Step-by-step: [`docs/RENDER_DEPLOYMENT.md`](docs/RENDER_DEPLOYMENT.md).
- **Freebuff Sites** (the live demo): a Cloudflare Workers project — `wrangler.jsonc` at the root, `sites/worker.js` as `main`, assets from `dist/`, `/api/*` handled by the Worker. `sites/site.manifest.json` describes the same deployment for the Sites tools.

## Documentation

- [`StudyMate-ICT/README.md`](StudyMate-ICT/README.md) — project overview and how to run it
- [`StudyMate-ICT/PROJECT_DOCUMENTATION.md`](StudyMate-ICT/PROJECT_DOCUMENTATION.md) — architecture, features, data model, security
- [`StudyMate-ICT/USER_GUIDE.md`](StudyMate-ICT/USER_GUIDE.md) — student-facing guide
- [`StudyMate-ICT/TESTING_REPORT.md`](StudyMate-ICT/TESTING_REPORT.md) — test cases, results, what was not tested
- [`StudyMate-ICT/LIMITATIONS_AND_FUTURE_WORK.md`](StudyMate-ICT/LIMITATIONS_AND_FUTURE_WORK.md) — honest limitations
- [`StudyMate-ICT/PRESENTATION_GUIDE.md`](StudyMate-ICT/PRESENTATION_GUIDE.md) — three-minute demonstration script
- [`StudyMate-ICT/PROMPTS_USED.md`](StudyMate-ICT/PROMPTS_USED.md) — the prompt-engineering record
- [`docs/AI_PROVIDER.md`](docs/AI_PROVIDER.md) · [`docs/RENDER_DEPLOYMENT.md`](docs/RENDER_DEPLOYMENT.md) · [`docs/TROUBLESHOOTING.md`](docs/TROUBLESHOOTING.md) · [`docs/CHANGELOG.md`](docs/CHANGELOG.md)

## Licence

[MIT](LICENSE).

## Attribution

StudyMate ICT was developed with AI-assisted support using Freebuff. The project owner provided the project direction and requirements, reviewed the generated implementation, and carried out the documented testing and evaluation.

The test results in this repository were produced by the AI build agent in the development environment on 20 November 2026, and are reported exactly as they occurred; the owner's own review and evaluation are recorded separately.
