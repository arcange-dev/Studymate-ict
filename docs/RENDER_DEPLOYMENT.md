# Deploying StudyMate ICT to Render

This project is **one Web Service**, not a Static Site and not two services. The Node server serves the built static app and exposes the AI endpoint that keeps the provider key off the client. A Static Site cannot hold that key, so it would force the app back into prompt mode.

> **Status:** the configuration below is committed and was tested locally (`node server/node-server.js`, health check, static serving, AI proxy against a stub provider). **No Render deployment has been performed** — this environment had no Render account or credentials. The public demo currently runs on Freebuff Sites; see the root README.

---

## 1. What Render needs

| Setting | Value |
|---|---|
| Service type | **Web Service** |
| Repository | your GitHub repo (`arcange-dev/Studymate-ict`) |
| Branch | `main` |
| Root directory | *(empty — repository root)* |
| Runtime | Node |
| Node version | 22 (`NODE_VERSION=22`) |
| Build command | `./build.sh` |
| Start command | `node server/node-server.js` |
| Health check path | `/api/health` |
| Instance | Free is enough for a demo (spins down when idle) |

`./build.sh` only copies static files into `dist/`; there is nothing to compile and no npm dependencies to install.

## 2. Blueprint (recommended)

`render.yaml` at the repository root defines the service. In Render:

1. **New → Blueprint**, connect the repository, choose `main`.
2. Render reads `render.yaml`. It will ask for `AI_API_KEY` because the file marks it `sync: false` — this is deliberate: **no secret is stored in the repository**.
3. Paste the provider key when prompted (starts with `sk-` for OpenAI-style keys), then **Apply**.

Without a key the service still deploys and runs in prompt mode. You can add the key later under **Environment** and redeploy.

## 3. Manual service (if you skip the Blueprint)

1. **New → Web Service**, connect the repo, branch `main`.
2. Runtime **Node**, build `./build.sh`, start `node server/node-server.js`.
3. Environment → add:

```
AI_API_KEY=<your provider key>        # secret, required for live AI
AI_BASE_URL=https://api.openai.com/v1 # any OpenAI-compatible endpoint
AI_MODEL=gpt-4o-mini
AI_PROVIDER=OpenAI-compatible
AI_RATE_LIMIT=20
AI_RATE_WINDOW_MS=600000
AI_DAILY_CAP=300
AI_TIMEOUT_MS=30000
NODE_VERSION=22
```

4. Health check path `/api/health`.

## 4. Verify the deployment

```bash
BASE=https://<your-service>.onrender.com
curl -s $BASE/api/health          # {"ok":true,...,"ai":{"configured":true,...}}
curl -si -X POST $BASE/api/ai \
  -H 'content-type: application/json' \
  -d '{"op":"explain","topic":"RAM","level":"beginner","length":"short"}'
```

- `configured:false` or a `503 ai-not-configured` answer means the key is missing on the service — the app is fine, the environment is not.
- A `500 unauthorized` means the provider rejected the key.
- Then open `$BASE/` and check that the status chip reads **AI live** only after you press an AI button.

## 5. Operational notes

- **Free plan sleeps.** The first request after idle takes ~30–60 s; Render's health check may mark the service briefly unavailable. Upgrade or keep it warm for a demo.
- **Rate limits are per instance and reset on restart** (`AI_RATE_LIMIT`, `AI_RATE_WINDOW_MS`, `AI_DAILY_CAP`). Tighten them for a public demo; see `StudyMate-ICT/LIMITATIONS_AND_FUTURE_WORK.md` §1.5.
- **`AI_ALLOWED_ORIGINS`** exists for split deployments. For this single-service setup leave it empty: same-origin is always allowed and a foreign `Origin` gets 403.
- **Logs:** service → Logs. The server logs only startup lines (port, directory, AI mode). It never logs keys, prompts or notes.
- **Rollback:** Render → Deploys → pick a previous deploy → *Redeploy*.
- **Custom domain:** Settings → Custom Domain, then add the domain to `AI_ALLOWED_ORIGINS` only if you also call the API from another origin.

## 6. Why not a Static Site?

A Static Site would serve `dist/` correctly and everything except live AI would work, because prompt mode needs no server. The moment a provider key is added, the browser would have to hold it — which the brief forbids. One Web Service avoids that trade-off and costs the same on the free plan.
