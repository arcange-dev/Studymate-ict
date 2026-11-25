# Testing Report — StudyMate ICT

**Version tested:** 2.4.0 (automated suite, all twelve routes on both live addresses, and the API Reference page); the deeper visual and tool checks in §4–§7 were executed on the 2.2.0 build. Later releases changed the provider panel and added the Home button (2.3.x) and added the API Reference page plus a request-size limit (2.4.0); the 2.4.0 live audit in §7 re-checks every route at both widths on both hosts.
**Test date:** 24 November 2026 (2.2.0 pass); re-run 25 November 2026 for 2.4.0
**Method:** the automated Node suite (`npm test`) plus a scripted Chromium (Playwright) pass over the real interface served by `node server/node-server.js` on port 3000, through the deployment preview origin the app is signed in to.

> Everything below was executed in this release. Where a check could not be run (a real AI provider, a screen reader, Safari/Firefox), it is listed as **not tested** rather than assumed. The demo data used for screenshots and data checks was saved through the app's own LocalStorage schema.

---

## 1. Environment

| Item | Detail |
|---|---|
| Application | StudyMate ICT 2.4.0, `dist/` served by `server/node-server.js` (prompt mode, no server AI key) |
| Browser | Chromium via Playwright, desktop 1440×1000, tablet 820×1180, mobile 430/390/375/320 |
| Service worker | Unregistered and caches cleared before visual checks, so no stale shell could mask a change; re-registered for the offline test |
| Storage | LocalStorage; both zero state and a demo state (3 saved topics, 2 prompts, 4 marked quizzes, 2 plans, 1 personal term, display name "Amina") |
| AI path | A stubbed OpenAI-compatible `/chat/completions` endpoint, with a learner key saved through the app's own key panel |
| Console capture | `page.on('pageerror')` and `page.on('console')` for the whole run |

---

## 2. Automated suite — **PASS**

```
npm test → tests 54 · pass 54 · fail 0
./build.sh → Built dist/ (30 files)
```

Coverage: AI request validation, schema enforcement, provider failures and error mapping, rate limiting, key non-disclosure, HTTP headers, path-traversal protection, the SPA fallback, quiz marking, settings normalisation, the learner-key path (base-URL validation, provider called with the learner's own key, rejected keys, malformed model output), the 47-provider catalogue, the OpenAI/Anthropic/Gemini request protocols and URL probe, and the app shell navigation (every entry has a view; Home is reachable from the topbar and the sidebar).

---

## 3. Entry, routing and navigation

| Check | Expected | Result |
|---|---|---|
| Open the app with no hash | Dashboard is the first screen | **PASS** — redirected to `#/dashboard`, welcome panel rendered |
| Login, registration, email or account screen | None exists | **PASS** — no auth UI or credential request anywhere; only optional "Display name" |
| Every sidebar route | View renders, breadcrumb and title update | **PASS** — dashboard, explain, quiz, planner, source, glossary, library, saved, settings, about, home, and api (added in 2.4.0) |
| Home button in the topbar | Opens `#/home` from any route on desktop and on a phone, and is marked current while the landing page is open; the sidebar entry and global search reach it too | **PASS** — button, sidebar entry and search result all opened the landing page; no layout change at 390px; re-verified on 2.4.0 on both live addresses at 1440px and 390px, marked current only on Home |
| Old links (`#/home`, etc.) | Still work | **PASS** |
| Collapse sidebar | Shrinks 272→84px, labels stay for screen readers, tooltip on hover, choice persists after reload | **PASS** |
| Mobile drawer (390px) | `☰` opens, route tap closes, `Escape` closes, focus returns to the button | **PASS** |
| Active states | Current route highlighted in the sidebar and breadcrumb | **PASS** |

---

## 4. Dashboard data

| Check | Expected | Result |
|---|---|---|
| Empty browser | Zero states, no invented counts, no chart | **PASS** |
| Demo data | 3 saved topics / 2 prompts / 4 quizzes / 85% average / 11% plan / 4 terms | **PASS** — computed from LocalStorage |
| Mark another quiz | Metrics, chart and activity update immediately | **PASS** — 4 quizzes, 85%, new bar and activity row |
| Plan tick | "1 of 9 activities done · 11%" on dashboard and planner | **PASS** |
| Greeting | Uses the optional display name only | **PASS** — "Welcome back, Amina"; neutral greeting when empty |

---

## 5. Tools

| Check | Steps | Result |
|---|---|---|
| Explain prompt | Topic + level → **Build copy-paste prompt** | **PASS** — nine-part prompt, copy and save enabled |
| Quiz generation (own key) | Save learner key → stub provider → paste notes → 5 questions → generate | **PASS** — 5 questions, status chip "AI live · stub-model (your key)" only after a real success |
| Quiz marking | Answer all 5 → submit | **PASS** — 100%, "5 of 5 correctly", stored as the 4th quiz, dashboard best score 100% |
| Quiz validation | Submit with unanswered questions | **PASS** — inline `role="alert"` error, nothing stored |
| Planner build | 3 topics, 60 min/day, 3 days | **PASS** — 3 day cards, 9 activities, 180 min total |
| Planner persistence | Save, tick the first activity, reload | **PASS** — tick and 11% progress survive the reload |
| Glossary | 41 terms, category filter, navigate to a term from search | **PASS** — target card scrolled into view and focused |
| Prompt library | Filter templates, expand a full prompt, copy, save | **PASS** |
| Source-grounded learning | Paste source text → prompt with citations | **PASS** |
| Saved learning | Search "ram", filter to prompts, clear | **PASS** — 4 of 9 matched, filters hid the other sections, reset restored 9 |
| Settings | Name, theme, level, subjects, accessibility toggles, backup/restore | **PASS** — saved and persisted; backups exclude the AI key |

---

## 6. Search

| Check | Result |
|---|---|
| `/` and `Ctrl/Cmd + K` open the dialog; `Escape` closes | **PASS** |
| "ram" ranks `RAM — Random Access Memory` first and groups Glossary before Saved topics | **PASS** |
| Whole-word matching (no "program" for "ram") | **PASS** — 5 relevant results instead of every definition containing "ram" as a substring |
| `↑`/`↓` and `Enter` open a result | **PASS** — glossary result focused its card; saved result pre-filled the Saved search box |
| Empty query | Shows destinations and saved items, no error | **PASS** |

---

## 7. Responsive, theme, offline and accessibility

| Check | Result |
|---|---|
| Horizontal overflow at 320 / 375 / 390 / 430 / 768 / 1024 / 1280 / 1440 / 1920 on all 11 routes (2.2.0 pass) | **PASS** — zero overflow in every combination |
| Topbar at 390px | Home icon, search icon, AI chip and theme fit; primary action and hint hidden; no wrap | **PASS** |
| Dashboard at 390px | Single column, two-column stats, readable type, 48px targets | **PASS** |
| Theme toggle | Switches tokens immediately, persists across reload, no mixed-theme text | **PASS** |
| Offline reload | With the worker registered: reload with the network off restored the dashboard, styles, 10 nav links and 6 stat cards (2.2.0 shell) | **PASS** |
| Keyboard | First `Tab` shows a visible focus ring; all controls reachable; modal traps focus | **PASS** |
| Screen-reader structure | One `h1` per view, no heading-level jumps, no duplicate IDs, no unlabelled field, no unnamed button, no image without `alt`, no broken icon symbol | **PASS** |
| Contrast of secondary text | Measured 3.09:1 before the fix, 4.65:1 after | **FIXED** (see §8) |
| API Reference page (2.4.0) | `#/api` is reachable from the sidebar and the global search, renders its 7 tables and 6 code blocks at 1440px and 390px with no horizontal overflow, and fills its status card from this deployment's own `/api/health` | **PASS** — live values read on preview and production (`Prompt mode`, `openai-compatible`, no model, 20 requests / 10 min, 300 / day); no console or page errors |
| Live deployment audit (2.4.0) | All twelve routes at 1440px and 390px on the preview and production addresses: the right view rendered with its own single `h1`, its sidebar entry marked current, the Home button present (and marked current only on Home), zero horizontal overflow, no console or page errors, and the deployed files byte-identical between the two hosts | **PASS** — 48 route/viewport checks (12 routes × 2 widths × 2 hosts), zero overflow and zero errors everywhere, identical `h1` text and identical `/api/health` payload on both hosts, and 30/30 deployed files byte-identical |

---

## 8. Defects found and fixed during this release

1. **Stale service-worker cache** served the previous CSS/JS after a rebuild, which made fixes look broken. `build.sh` now stamps the cache name with a hash of the built shell, and the test procedure clears the worker before visual checks.
2. **Search matched substrings**, so "ram" returned every definition containing "program". Matching is now whole-word prefix.
3. **Duplicate close affordances** in the search field (native search clear plus the dialog's close button). The input is a plain text field with the dialog's own close button.
4. **Mobile breadcrumb** showed a leading separator once the root crumb was hidden. The separator is removed at that breakpoint.
5. **Low-contrast secondary text** (3.09:1 on stat captions and the topbar hint). The muted token was darkened to 4.65:1.
6. **Backdrop-filter artefact** tiled the page behind the search dialog in captures; the overlay now uses a flat scrim.
7. **Glossary cards stretched** to the tallest card in the row, leaving large empty areas on short terms; grid items now align to the start.
8. **Dark theme text** kept navy heading colours on dark surfaces; text colours now follow the theme tokens.

---

## 9. Not tested (honest gaps)

- **A real AI provider.** Only a stubbed OpenAI-compatible endpoint was used; provider-specific CORS behaviour, model quality and rate limits were not exercised. Server-side live AI was not available in this environment.
- **Screen readers.** Structure and labels were checked programmatically, not with NVDA, JAWS or VoiceOver.
- **Safari, Firefox and real mobile devices.** Chromium emulation only.
- **Deployment.** §4–§8 cover the local/preview origin from the 2.2.0 pass. The 2.4.0 build is deployed to both the preview and production demo environments; all twelve routes were re-checked at 1440px and 390px on both addresses (§7) and all 30 deployed files are byte-identical between the hosts. The AI path against a real provider remains untested on that deployment.
- **Performance budgets.** No Lighthouse run was performed; the app ships no third-party runtime dependencies.

---

## 10. Reproduce

```bash
npm test
./build.sh
node server/node-server.js    # http://localhost:3000
```

Then open the app and follow §3–§7. For the AI-path checks, save a key for any OpenAI-compatible provider in **Settings**, or point the base URL at a stub that answers `/chat/completions` with the quiz schema in `js/ai-contract.js`.
