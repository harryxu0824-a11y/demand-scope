# Deploying demand-scope

**Topology:** frontend on Vercel (free), backend on AI Builders Space (free 12 months via Koyeb + Nginx automation).

## Prerequisites

- GitHub account + a repo to push this code to
- AI Builders Space account with an API key (the `sk_…` you already have in `backend/.env`)
- Vercel account (sign up with GitHub — free tier covers this)
- `git` installed locally

## 0. Push to GitHub

From the project root:

```bash
cd /Users/harryxu/demand-scope
git init
git add .
git commit -m "initial demand-scope MVP"
# Create an empty repo on github.com first, then:
git remote add origin https://github.com/<your-user>/demand-scope.git
git branch -M main
git push -u origin main
```

`.gitignore` already excludes `backend/.env`, `backend/cache/*.json`, `frontend/node_modules`, and `frontend/.env.local`. Double-check with `git status` that none of those appear before pushing — if they do, stop and fix `.gitignore` first.

## 1. Deploy backend to AI Builders Space

AI Builders Space deploys any FastAPI repo through their `/v1/deployments` endpoint (Koyeb under the hood). The `AI_BUILDER_TOKEN` is auto-injected on the deployed container.

Trigger the deployment:

```bash
AI_BUILDER_TOKEN=$(grep AI_BUILDER_TOKEN /Users/harryxu/demand-scope/backend/.env | cut -d= -f2)

curl -X POST "https://space.ai-builders.com/backend/v1/deployments" \
  -H "Authorization: Bearer $AI_BUILDER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "repo_url": "https://github.com/<your-user>/demand-scope",
    "service_name": "demand-scope-api",
    "branch": "main",
    "port": 8000
  }'
```

Response includes a deployment URL like `https://demand-scope-api-<random>.ai-builders.space`. Note it — this is your backend public URL.

Monitor status:

```bash
curl "https://space.ai-builders.com/backend/v1/deployments/demand-scope-api" \
  -H "Authorization: Bearer $AI_BUILDER_TOKEN"
```

Or use the **Deployments** tab in the AI Builders Space web UI.

### Set production env vars

The deployment needs several env vars set on the server. Set them via the AI Builders Space Deployments dashboard (or their env-var API if exposed):

| Variable | Value | Notes |
|---|---|---|
| `AI_BUILDER_TOKEN` | auto-injected | do not set manually |
| `AI_BUILDER_BASE_URL` | `https://space.ai-builders.com/backend` | same as dev |
| `APP_ACCESS_TOKENS` | `token_harry_xxx,token_friend1_yyy` | one per friend |
| `APP_ALLOWED_ORIGINS` | `https://<your-vercel-url>.vercel.app` | fill in after frontend deploys |
| `DAILY_QUOTA_PER_TOKEN` | `20` | production-sensible, bump later if needed |
| `REDDIT_SOURCE` | `mock` | until PRAW creds arrive |
| `MODEL_REFRAMER` | `gemini-2.5-pro` | |
| `MODEL_ADEQUACY` | `gemini-2.5-pro` | |
| `MODEL_QUERY_PLANNER` | `gemini-3-flash-preview` | |
| `MODEL_SIGNAL_FILTER` | `deepseek` | unused in MVP |
| `MODEL_ANALYZER` | `gemini-2.5-pro` | |
| `MODEL_CRITIC` | `gpt-5` | |

Smoke-test the deployment:

```bash
curl https://<your-backend-url>/api/health
# expect {"status":"ok"}

SMOKE_BASE=https://<your-backend-url> \
SMOKE_TOKEN=token_harry_xxx \
SMOKE_LLM=1 \
  python /Users/harryxu/demand-scope/backend/scripts/smoke.py
# expect all 8 checks green
```

## 2. Deploy frontend to Vercel

Option A — Vercel web UI (easiest):

1. Log in to https://vercel.com with GitHub
2. **Add New Project** → pick your `demand-scope` repo
3. **Root Directory** → set to `frontend`
4. **Framework Preset** → Next.js (auto-detected)
5. **Environment Variables** → add `NEXT_PUBLIC_API_BASE` = `https://<your-backend-url>` (from step 1)
6. Click **Deploy**

Vercel builds and gives you `https://demand-scope-<hash>.vercel.app`.

Option B — Vercel CLI:

```bash
cd /Users/harryxu/demand-scope/frontend
npx vercel --prod
# answer the prompts, link to your GitHub repo
# set NEXT_PUBLIC_API_BASE when prompted
```

## 3. Close the loop

Now go back to AI Builders Space and set `APP_ALLOWED_ORIGINS` to your Vercel URL:

```
APP_ALLOWED_ORIGINS=https://demand-scope-<hash>.vercel.app
```

Restart the deployment (via dashboard or redeploy API call). Without this, the browser will CORS-block frontend→backend calls.

## 4. Share with a friend

Send them:

- URL: `https://demand-scope-<hash>.vercel.app`
- Their personal access token: `token_friend1_yyy` (one of the values you set in `APP_ACCESS_TOKENS`)

On first visit they paste the token in the Access Token gate, then use the tool. Each friend's token has its own daily quota and shows up separately in the quota file on the server.

## Troubleshooting

| Symptom | Fix |
|---|---|
| Frontend loads but "401 Invalid token" on every action | Token isn't in `APP_ACCESS_TOKENS`. Add it and redeploy. |
| Frontend loads, clicking Analyze shows CORS error in DevTools | `APP_ALLOWED_ORIGINS` doesn't include your Vercel URL (or is missing `https://`). |
| 502 on `/api/reframe` | Backend can't reach AI Builders gateway. Check `AI_BUILDER_TOKEN` is present and valid. |
| All quotas hit 429 | Raise `DAILY_QUOTA_PER_TOKEN` or reset the quota file on the container. |
| Backend fails to start (Koyeb) | Check Procfile is present (`backend/Procfile`). Koyeb auto-detects Python via `requirements.txt`. |

## Operations

**Rotate a friend's token** — remove from `APP_ACCESS_TOKENS`, issue them a new one, redeploy.

**Check usage** — quota files are persisted in `backend/cache/quota_<date>.json` on the container. SSH or use the platform's log viewer.

**Update the app** — push to GitHub main, then call the deployments POST again to redeploy (Koyeb may also auto-redeploy on push if configured).

## Known limits

- Max 2 services per AI Builders Space user (your free tier) — backend counts as 1
- Free for 12 months from first deploy
- No HTTPS cert management needed — AI Builders + Vercel both terminate TLS for you
