# Demand Scope

> We'd rather disappoint you than deceive you.

A Reddit-based demand validation tool that tells you when Reddit isn't the right place to ask.

Most demand validation tools confidently hallucinate. They output 5 gaps and 3 personas for any input you give them. This one refuses to do that. When our pipeline can't find signal, the UI short-circuits and shows you why—not a placeholder diagnostic with low confidence.

The reasoning behind every design decision is public in [DECISIONS.md](./DECISIONS.md).

## What it does

Drop in a business description. Demand Scope runs a multi-agent pipeline:

1. **Reframe** your marketing language into the words users actually use on Reddit
2. **Scope** whether Reddit is even the right platform for this audience
3. **Harvest & Analyze** posts via Reddit API, with a 5-step pipeline: query planner → harvester → signal filter → analyzer → critic → evidence validator
4. **Judge** gaps by signal strength, not signal volume—a single market-structure observation outweighs ten pain complaints

Every model call is visible in a live reasoning log, streamed via Server-Sent Events. Every gap label carries a critic rationale. Every empty result explains *why* it's empty. The full reasoning exports as a markdown document you can paste back into Claude as context for your next question.

## Design philosophy

Two ideas drive this project:

**Reasoning should be a document, not ephemeral state.** The same typed payloads that flow between agents also render to the UI and export to markdown. Context stops being session-scoped.

**Typed schemas over natural language summaries.** Downstream agents consume upstream output as structured input—no re-packaging, no summary loss. The analyzer's schema allows `strong` or `weak`; `structural` elevation lives only in the critic's schema. Invariants are enforced at the schema boundary, not by hope.

The rationale behind every non-obvious choice (why the analyzer doesn't label structural gaps, why zero signal short-circuits the diagnostic, why the validator exempts structural gaps from downgrade, etc.) lives in [DECISIONS.md](./DECISIONS.md).

## Project layout

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

Cross-family model selection is deliberate: using a different model family for the critic than the analyzer produces more meaningful disagreement than same-family self-critique.

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

## Credentials

- **AI Builder Space token** — get from https://space.ai-builders.com → API Explorer
- **Reddit PRAW** — create a `script` app at https://www.reddit.com/prefs/apps (pending platform approval)
- **App access tokens** — you define these in `.env`. Give each friend a unique one so quotas/logs are separable.

## Deployment

For deploying to AI Builders Space + Vercel so friends can use it, see [DEPLOY.md](./DEPLOY.md).

## Status

Pre-launch. Actively under development. Reddit PRAW credentials pending approval.

Open an issue if something looks wrong or if you spot a bug in the critic.

## Stack

Next.js 14 · React · Tailwind CSS · FastAPI · Pydantic · Server-Sent Events · Gemini 2.5 Pro · GPT-5 · DeepSeek · Reddit API (PRAW) · Claude Code (as primary implementation driver)

## License

MIT

---

Built by [Harry Xu](https://www.linkedin.com/in/chiheng-xu). Demo at AI Tinkerers Toronto, April 29, 2026.

