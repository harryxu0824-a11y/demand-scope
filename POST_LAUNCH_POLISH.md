# Post-launch polish list

Things to iterate on after initial launch, not blocking current ship.

## Demo prep notes

### Demo Case 1: AI scribe for patients
- Adequacy: HIGH
- Demand: PEAK + UNMET-SUPPLY
- Gaps: 3 (strong / structural / strong)
- KEY MOMENT: Gap 2 structural elevation with B2B distribution observation
- Demo emphasis: show structural label on Gap 2, point at critic rationale mentioning "distribution observation"
- Reasoning log: 3 entries (Reframe ~13s / Adequacy ~14s / Reddit analysis ~75s)
- Total time: ~100 seconds

### Demo Case 2: Cannabis dispensary (post bug-fix)
- Adequacy: medium
- Demand: no signal (no_discussion branch)
- Purpose: demonstrates honest refusal. Real cannabis subreddits (weedbiz, cannabisindustry, Dispensary) displayed correctly via planner output after bug fix.
- Alternative sources surfaced: Capterra, G2, MJBizDaily, trade shows
- Counterpart to Case 1: shows product's "honest about limits" stance

## Pre-launch TODO

- [ ] Deploy frontend to Vercel + backend to Railway/Fly/Render. Required for launch post live URL. Est 3-4 hours.
- [ ] Record 60s demo video (no voiceover, text overlay). Use AI scribe case. Record after deploy. Est 60-90 min.

## Post-launch iteration

- Switch to live Reddit data once PRAW credentials approved. Currently mock mode.
- Subreddit mentions (r/xxx) inline in text should render as pill chips. Appears in PlatformAdequacyCard, DemandDiagnostic summary, Gap evidence. Est 2-3 hours.
- "Start over" button should explicitly clear per-stage cache on restart.
- Extract DemandDiagnosticCard / GapCard / PlatformAdequacyCard into shared components.
- Reasoning log JSON payload: wrap styling for readability.
- Critic rationale cleanup: remove meta-commentary like "Only 3 quotes are provided" when anecdotal rule is overridden.
