# AI provider integration

StudyMate ICT talks to **one OpenAI-compatible Chat Completions endpoint**. There is no vendor SDK, no browser key and no second network dependency. This document is the contract: what the app sends, what it accepts back, and how to point it at a different provider.

---

## 1. Where the code lives

| File | Runs in | Responsibility |
|---|---|---|
| `sites/ai-core.js` | Node server **and** Cloudflare Worker | Validation, prompt building, provider adapter, JSON parsing, schema checking, rate limiting, error mapping |
| `server/node-server.js` | Node 22 (Render, local) | HTTP server: static files, `POST /api/ai`, `GET /api/health`, security headers |
| `sites/worker.js` | Freebuff Sites (public demo) | The same two routes in front of `env.ASSETS` |
| `StudyMate-ICT/js/ai.js` | Browser | Health check, request, timeout/retry, error messages, status chip |

Both server targets import the same module, so a fix in `ai-core.js` applies to both.

## 2. Configuration

| Variable | Default | Meaning |
|---|---|---|
| `AI_API_KEY` (or `OPENAI_API_KEY`) | — | Server-side key. Its presence alone switches the app to live mode. |
| `AI_BASE_URL` | `https://api.openai.com/v1` | Any endpoint with `POST {base}/chat/completions`. |
| `AI_MODEL` | `gpt-4o-mini` | Model identifier sent upstream; also shown in the status chip. |
| `AI_PROVIDER` | `openai-compatible` | Label only. |
| `AI_JSON_MODE` | `on` | Sends `response_format: {type:"json_object"}`. Set `off` for providers that reject it. |
| `AI_TIMEOUT_MS` | `30000` | Per-request upstream timeout (8 s–60 s). |
| `AI_RATE_LIMIT` | `20` | Requests per client per window. |
| `AI_RATE_WINDOW_MS` | `600000` | Window length (10 minutes). |
| `AI_DAILY_CAP` | `300` | Total requests per instance per UTC day; `0` disables. |

`resolveConfig()` clamps every number, so a typo cannot disable validation. `.env.example` lists all of them with comments.

## 3. Request contract

`POST /api/ai`, `content-type: application/json`, body ≤ 24 000 characters.

```json
{ "op": "explain", "topic": "RAM", "level": "beginner", "prior": "", "length": "short" }
```

| Field | Rules |
|---|---|
| `op` | `explain` or `quiz` |
| `topic` | 2–120 characters after whitespace normalisation |
| `level` | `beginner`, `intermediate`, `advanced` |
| `length` | `short`, `medium`, `long` |
| `prior` | Optional, ≤ 200 characters |
| `notes` | 50–12 000 characters (quiz only) |
| `count` | Integer 3–20 (quiz only) |
| `difficulty` | `easy`, `medium`, `hard` (quiz only) |
| `type` | `mixed`, `mcq`, `truefalse`, `short` (quiz only) |

An unknown enum value is a 400, never a silent fallback — a typo should not quietly change what the learner asked for.

## 4. Response contract

```json
{ "ok": true, "op": "explain", "model": "gpt-4o-mini", "data": { ... }, "usage": { "promptTokens": 320, "completionTokens": 540 } }
```

The server never returns raw model text. It parses the JSON, validates the schema, clamps every string, then returns the normalised object:

**explain** — `definition`, `whyItMatters`, `steps[3-7]`, `example`, `realWorld`, `misconceptions[{belief,correction}]`, `vocabulary[{term,meaning}]`, `summary`, `questions[{q,a}]` (exactly 5).

**quiz** — `questions[]` where each item is `mcq` (exactly four distinct options + `answerIndex` 0–3), `truefalse` (boolean `answer`) or `short` (model answer + derived keywords), plus `explanation` and `source` quoted from the notes.

Malformed output is a **502** with a plain message ("The AI service returned malformed JSON."), never a half-rendered screen. The browser shows the message and a Retry button.

### Error map

| Code | HTTP | Meaning |
|---|---|---|
| `ai-not-configured` | 503 | No key on this deployment; prompt mode |
| `invalid-request` / `invalid-json` | 400 | Validation failed |
| `local-rate-limit` | 429 + `retry-after` | This deployment's own limit |
| `rate-limited` | 429 | Upstream provider throttled us |
| `unauthorized` | 500 | Provider rejected the key (details withheld) |
| `timeout` | 504 | Upstream exceeded `AI_TIMEOUT_MS` |
| `network` / `provider` | 502 | Unreachable or non-2xx |
| `not-json` / `schema` / `empty` | 502 | Model answered, but not with a usable object |

## 5. Switching provider

1. Set `AI_BASE_URL` to a compatible base (examples: `https://api.openai.com/v1`, `https://openrouter.ai/api/v1`, a self-hosted gateway).
2. Set `AI_MODEL` to a model that provider serves.
3. Set `AI_API_KEY` in the server environment.
4. If the provider rejects `response_format`, set `AI_JSON_MODE=off` — the prompt still demands a JSON object and `parseModelJson` strips fences.
5. Deploy and check `GET /api/health`: `configured:true` and the expected model.
6. Press **Explain with AI** once. The chip only says "AI live" after that succeeds.

Supporting a provider with a *different* protocol means writing one function: replace `callProvider()` in `sites/ai-core.js`. Everything else — validation, schema checks, rate limits, UI states — is provider-agnostic.

## 6. Privacy

- Notes and topics are sent to the provider only when the learner presses an AI button.
- The UI shows a disclosure next to the button whenever live AI is enabled, explaining that notes are sent to the provider.
- The app stores the generated result locally only if the learner presses Save; prompts and notes are never stored server-side.
- The server logs no request bodies, no notes and no keys.

## 7. Learner-supplied key in the browser (no server)

`StudyMate-ICT/js/local-ai.js` implements a second, independent path: the learner pastes their own key, base URL and model on the **Home** page or in **Settings**. It is stored under the LocalStorage key `studymate.ict.localai.v1` and read at call time.

Both paths use the same contract. Prompts, request validation, JSON parsing and the explanation/quiz schemas live once in `StudyMate-ICT/js/ai-contract.js`. It is a classic script (so the app still runs from `file://`) that publishes itself as `SMAiContract`; `sites/ai-core.js` imports it for that side effect and re-exports what the server needs. `local-ai.js` only adds key storage and the direct provider call.

| Aspect | Server key (`/api/ai`) | Learner key (`local-ai.js`) |
|---|---|---|
| Where the key lives | Hosting environment | That browser's LocalStorage |
| Who sees it | The server | Only the device (sent to the provider as `Authorization: Bearer …`) |
| Request path | Browser → this app → provider | Browser → provider directly |
| Validation | `js/ai-contract.js` via `sites/ai-core.js` | The same shared `js/ai-contract.js` |
| Rate limiting | Server-side per client and per day | None — the learner's own provider quota applies |
| Works on static hosting | No | Yes |
| Works when the provider blocks CORS | Yes | No |

Both paths produce the identical normalised object, so the UI cannot tell them apart. The status chip distinguishes them: `AI live · <model> (your key)` for the browser path.

Security notes for this mode:

- The key is never rendered back into the DOM; the field shows a placeholder once a key is saved.
- **Remove saved key** and **Delete all local data** both erase it.
- It is excluded from JSON backups, so exporting/importing study data never copies a secret.
- LocalStorage is readable by anything running on the same origin and by anyone with access to the browser profile, so the UI warns against using it on shared computers.
- The Node server's CSP now allows `connect-src https:` for this path; the Sites Worker sets no CSP, so the browser path works there too.

## 8. Cost control

`AI_DAILY_CAP` (per instance, per UTC day) and `AI_RATE_LIMIT` (per client) are the two brakes. For a classroom demo, `AI_RATE_LIMIT=5` and `AI_DAILY_CAP=50` are reasonable. Because counts are in memory they reset on restart — for hard guarantees use a shared store (see limitations §1.5).
