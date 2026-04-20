# demand-scope

Reddit-based demand diagnostic. Enter a business description → get a report headed by **Platform Adequacy** (is Reddit even the right place to look?), followed by demand level, demand type, and gaps backed by Reddit evidence.

Design philosophy: honest about limits > pretending omniscience. Low adequacy stops the pipeline and forces an explicit override.

## Project layout

```
backend/   FastAPI + OpenAI-compatible LLM client (AI Builder Space gateway)
frontend/  Next.js 14 + Tailwind
```

## Deployment

For deploying to AI Builders Space + Vercel so friends can use it, see [DEPLOY.md](./DEPLOY.md).

## Local setup

### 1. Backend

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# edit .env: set AI_BUILDER_TOKEN and APP_ACCESS_TOKENS
uvicorn app.main:app --reload --port 8000
```

Sanity check:

```bash
curl http://localhost:8000/api/health
# {"status":"ok"}

curl -H "Authorization: Bearer <one of APP_ACCESS_TOKENS>" http://localhost:8000/api/me
```

### 2. Frontend

```bash
cd frontend
cp .env.local.example .env.local  # default points at localhost:8000
npm install
npm run dev
# open http://localhost:3000, paste an APP_ACCESS_TOKEN
```

## Pipeline

| Step | Name | Needs Reddit? |
|---|---|---|
| 0 | Reframer (de-marketing) | no |
| 1 | Platform Adequacy | no |
| 2 | Query Planner | yes |
| 3 | Reddit Harvester | yes |
| 3.5 | Signal Filter | yes |
| 4 | Analyzer | yes (or mock) |
| 4.5 | Critic (cross-model) | yes (or mock) |
| 5 | Evidence Validator (hard rules) | yes (or mock) |

Until PRAW credentials arrive, `REDDIT_SOURCE=mock` serves fixtures so Steps 4–5 can be developed end-to-end.

## Credentials

- **AI Builder Space token** — get from https://space.ai-builders.com → API Explorer
- **Reddit PRAW** — create a `script` app at https://www.reddit.com/prefs/apps (pending platform approval)
- **App access tokens** — you define these in `.env`. Give each friend a unique one so quotas/logs are separable.

## Model allocation

All model names are env-configurable. Defaults:

| Step | Model | Why |
|---|---|---|
| Reframer | gemini-2.5-pro | temp=0, strong language understanding |
| Adequacy | gemini-2.5-pro | world-knowledge reasoning |
| Query Planner | gemini-3-flash-preview | cheap, simple task |
| Signal Filter | deepseek | cheap relevance rating |
| Analyzer | gemini-2.5-pro | long-context corpus digestion |
| Critic | gpt-5 | cross-family disagreement > same-family self-critique |
