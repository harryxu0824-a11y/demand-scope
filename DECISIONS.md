# Design decisions

This file captures non-obvious design choices whose rationale lives outside the code. Each entry: Decision / Context / Trade-off acknowledged / Alternative considered and rejected.

## 1. Analyzer outputs only `strong` or `weak`. Structural elevation happens in the critic.

**Decision.** The analyzer layer in our pipeline is permitted to output only two gap verdicts: `strong` or `weak`. The third verdict, `structural`, can only be assigned by the critic layer downstream.

**Context.** Early versions had a single evaluation layer that attempted to do both signal discovery and strategic quality judgment in one LLM call. The result was that most gaps received default `strong`/`weak` labels based on quote volume, and the rare market-structure observations that deserved elevated treatment were lost in the noise.

**Trade-off acknowledged.** Splitting the evaluation across layers means the analyzer's first pass will never surface a structural gap, even when the evidence is visibly structural to a human reader. A critic call is always required for elevation. This adds latency and cost.

**Alternative considered and rejected.** We considered narrowing the analyzer's Pydantic schema to `Literal["strong", "weak"]` to enforce the constraint at the type system level. We rejected this because it creates internal schema contradiction — `Gap.verdict` at the top level allows `structural`, while `AnalyzerOutput.gaps[].verdict` would not. We preferred a prompt-level guardrail plus a regression test (`test_analyzer_never_outputs_structural`) over a typing inconsistency that would confuse future contributors.

## 2. The validator exempts `structural` gaps from the anecdotal downgrade rule.

**Decision.** The validator's standard rule downgrades any gap to `anecdotal` when it has fewer than 2 distinct `(parent_id, author)` pairs in its evidence. This rule is waived for gaps labeled `structural` by the critic — structural gaps retain their label regardless of evidence count.

**Context.** The anecdotal downgrade exists to prevent overconfident conclusions from single-source signal. But structural gaps by definition carry qualitative weight that is orthogonal to evidence volume. A single Reddit user articulating "every tool in this space is sold to hospitals but individual users have nothing equivalent" is a more actionable signal than ten users venting the same personal pain.

**Trade-off acknowledged.** This exemption creates a potential gaming surface: the critic could escape the anecdotal downgrade by inflating gaps to `structural`. We accept this risk in exchange for preserving sparse-but-strategic signals.

**Alternative considered and rejected.** We considered allowing `structural` labels only when evidence count ≥ 2 distinct authors, matching the validator's standard rule. This was rejected because it would subject qualitative judgment to quantitative gates, directly contradicting our product stance that signal strength is not signal volume. Instead, we enforce a content-based minimum bar in the critic prompt: a gap may be labeled `structural` only if at least one quote explicitly addresses market-structure dimensions (distribution, pricing model, segment access, supply-side structure). The check is qualitative, not count-based.

## 3. Zero validated quotes short-circuits the demand diagnostic entirely.

**Decision.** When `validated_quotes.length === 0`, the UI does not render the Demand diagnostic card, the Gaps section, or the top-level DEMAND LEVEL / DEMAND TYPE pill group. Instead, a `ZeroSignalCard` replaces the main output area. The Platform adequacy card remains visible (adequacy does not depend on quotes).

**Context.** An earlier version continued to render the Demand diagnostic even with zero quotes, filling it with LOW demand / UNKNOWN type / low confidence placeholders. This produced a UI that looked like analysis but contained no analysis. Users would see a high-confidence-looking diagnostic card based on nothing.

**Trade-off acknowledged.** Users lose the appearance of a completed analysis in zero-signal cases. Some may initially feel the product failed to produce anything. We chose to accept this perception cost because any alternative would mean the product misrepresents the nature of what it found.

**Alternative considered and rejected.** We considered keeping the Demand diagnostic visible but dimmed, with a warning banner. This was rejected because a dimmed diagnostic is still a diagnostic — users read it, weight it, and anchor on it. "Low confidence" does not neutralize a stated conclusion in practice. The only honest UI response to zero signal is to produce no stated conclusion.

## 4. The three empty-reason types map to three distinct UI branches.

**Decision.** When the pipeline returns zero validated quotes, the backend emits one of three `empty_reason` values: `no_discussion` (harvester returned zero posts), `search_mismatch` (harvester returned posts but analyzer matched none), or `signal_too_weak` (analyzer matched candidates but critic/validator rejected all). The frontend renders a different `ZeroSignalCard` variant for each, with different copy and different next-action buttons.

**Context.** Early versions treated all zero-signal cases identically with a single "no signal found" message. This lost information the pipeline already knew — why the signal was absent. For the user, the next action depends entirely on the reason. If Reddit has no discussion, the action is to look elsewhere. If we searched with the wrong words, the action is to refine the reframe. If the signal was filtered out, the action is to inspect what was rejected.

**Trade-off acknowledged.** Three branches require three sets of copy, three action layouts, and additional frontend complexity. Maintenance cost is higher than a single empty state.

**Alternative considered and rejected.** We considered a unified empty state with a small dropdown showing the reason. This was rejected because the reason determines the user's next action so directly that burying it in a collapsed disclosure would defeat the point. If our pipeline knows why it failed, that knowledge should be a first-class part of the UI, not a footnote.
