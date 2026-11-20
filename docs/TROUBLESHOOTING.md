# Troubleshooting — StudyMate ICT

Find the symptom, apply the check, read the cause. Every message quoted here is one the app actually shows.

---

## 1. The status chip says “Prompt mode”

**Prompt mode · no API key** — the deployment has no `AI_API_KEY` (or `OPENAI_API_KEY`). Everything except live AI works. Add the key to the server environment and redeploy; `GET /api/health` should then show `"configured": true`.

**Prompt mode · offline** — the browser is offline, or the page was opened from `file://`. Live AI needs a connection; prompt mode and the glossary still work.

**Still prompt mode after adding the key**
1. `curl $BASE/api/health` — if it says `configured:false`, the service did not receive the variable (check the Render environment, not `.env`, which Render ignores).
2. If it says `configured:true` but the chip does not update, reload the page: the client re-checks when you open the explainer or quiz.
3. A proxy that caches `/api/health` can delay the change; the client already sends `no-store` plus a cache-buster, so a reload fixes it.

## 2. “The AI service rejected the server API key.”

The provider answered 401/403. The key is wrong, expired, lacks credit, or belongs to a different base URL than `AI_BASE_URL`. The message is deliberately vague in the browser; the exact status is not exposed. Check the provider dashboard and the Render logs.

## 3. “The AI service is rate limiting requests — retry in Ns.”

The *provider* throttled us (`AI_RATE_LIMIT` is our own limit, which shows “You have made too many AI requests”). Wait for the window, lower `AI_RATE_LIMIT`, or check the provider's quota page.

## 4. “The AI service returned malformed JSON.” / “The AI response did not contain questions.”

The model answered, but not with the required object. Causes: the model is too small to follow the schema, `AI_JSON_MODE` is on but the provider ignores `response_format`, or the notes are too short to support the requested number of questions. Try a stronger `AI_MODEL`, set `AI_JSON_MODE=off` (the prompt still requests JSON, and code fences are stripped), or ask for fewer questions. The app never renders a partial answer — Retry is safe.

## 5. “The AI took too long to answer.”

Upstream exceeded `AI_TIMEOUT_MS` (default 30 s). Retry once; for long notes choose fewer questions or raise the timeout to 45 000. Render's free plan cold start can add 30–60 s to the first request.

## 6. “Could not reach the StudyMate server.”

The browser could not reach `/api/ai`. On a static-only host there is no such route — that host must run the Node server (see `docs/RENDER_DEPLOYMENT.md`). Locally, check the server is running (`curl localhost:3000/api/health`).

## 7. Everything looks like an older version after deploying

The service worker serves the cached shell first. Reload once; the new worker installs in the background, activates and deletes the old cache. To force it: DevTools → Application → Service Workers → Unregister, then Application → Storage → Clear site data, then reload. Check `caches.keys()` in the console — the current version is `studymate-ict-v3`.

## 8. Offline load shows the browser's “no internet” page

The service worker was never installed for that origin. It requires a secure origin (`https://` or `localhost`) and is skipped on `file://` by design. Load the app once while online, wait a moment, reload, then test offline. Confirm in DevTools → Application → Cache Storage that `studymate-ict-v3` holds 23 files.

## 9. Saved data disappeared

LocalStorage is per browser, per device and per origin:
- `http://localhost:3000` and `https://your-site` are different origins — data does not carry over.
- Private browsing may discard it at the end of the session.
- Clearing site data or “Delete all local data” in Settings removes it permanently.

Restore from a Settings backup export if you have one, or use the export regularly. The app warns in the sidebar that saved items live in this browser only.

## 10. Marks look unfair on a short answer

Short answers are keyword-marked. All expected keywords present → correct; at least 60% → “Marked for self-check”; otherwise incorrect. If your wording is right but the vocabulary differs, the answer is flagged rather than failed — check the model answer shown in the review. This is a known limitation (`StudyMate-ICT/LIMITATIONS_AND_FUTURE_WORK.md` §1.3).

## 11. The planner “lost” my plan

The planner restores the most recently saved plan. If you build a new plan and do not press **Save plan**, the old saved plan is still the one restored on reload — press Save to replace it. Plans are capped at the ten most recent.

## 12. Build or deploy fails

- `./build.sh: Permission denied` → `chmod +x build.sh` (it is committed executable; a ZIP on Windows may drop the bit).
- `rsync: command not found` → install rsync, or run the two commands manually (`rm -rf dist && mkdir -p dist && cp -r StudyMate-ICT/. dist/` then delete the docs and screenshots).
- Render build fails at `./build.sh` → check the start command is `node server/node-server.js` and `NODE_VERSION=22`.
- Site deploys but `/api/health` 404s → the host is serving `dist/` as static files only; the Worker or Node server must handle `/api/*`.

## 13. Tests fail

`npm test` needs Node 22 or newer (`node --version`). It uses only the built-in runner, so there is nothing to install. A failure in `tests/server.test.js` usually means a port or permission problem in the sandbox; the server binds an ephemeral port on `127.0.0.1` by itself.
