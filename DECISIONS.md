# Design decisions

This file captures non-obvious design choices whose rationale lives outside the code. Each entry: Decision / Context / Trade-off acknowledged / Alternative considered and rejected.

## 1. Analyzer outputs only `strong` or `weak`. Structural elevation happens in the critic.

**Decision.** The analyzer layer in our pipeline is permitted to output only two gap verdicts: `strong` or `weak`. The third verdict, `structural`, can only be assigned by the critic layer downstream.

**Context.** Early versions had a single evaluation layer that attempted to do both signal discovery and strategic quality judgment in one LLM call. The result was that most gaps received default `strong`/`weak` labels based on quote volume, and the rare market-structure observations that deserved elevated treatment were lost in the noise.

**Trade-off acknowledged.** Splitting the evaluation across layers means the analyzer's first pass will never surface a structural gap, even when the evidence is visibly structural to a human reader. A critic call is always required for elevation. This adds latency and cost.

**Alternative considered and rejected.** We considered narrowing the analyzer's Pydantic schema to `Literal["strong", "weak"]` to enforce the constraint at the type system level. We rejected this because it creates internal schema contradiction — `Gap.verdict` at the top level allows `structural`, while `AnalyzerOutput.gaps[].verdict` would not. We preferred a prompt-level guardrail plus an assertive comment at the schema boundary over a typing inconsistency that would confuse future contributors.

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

## 5. No verdict block. The verdict is already distributed across components.

**Decision.** The final results page does not include a summary verdict block. There is no single sentence labeling the overall analysis as "strong signal", "mixed signal", or "weak signal".

**Context.** Early UI reviews flagged the absence of closure on the results page — after reading through adequacy, diagnostic, and gaps, users were left without a clear synthesized answer. The initial plan was to add a top-of-page verdict block summarizing the analysis.

**Trade-off acknowledged.** Without a verdict block, users must synthesize the conclusion from multiple components (adequacy bar, diagnostic pills, summary lede, gap labels, critic rationales). This places cognitive load on the reader.

**Alternative considered and rejected.** We considered adding a conditional verdict block with three variants (Strong signal worth pursuing / Mixed signal needs more validation / Weak signal consider other sources). We rejected this for two reasons. First, every element that would populate the verdict block already exists on the page: the top pill group and the one-sentence summary below it already function as a lede. Second, a summary verdict would add a layer of product voice on top of the analysis — claiming a certainty we don't have. Our position is that verdict emerges from the evidence layout, not from a single interpretive sentence written on top of it. Instead of adding a verdict block, we increased the visual weight of the existing one-sentence summary to make its lede role explicit.

## 6. Mock fixtures preserve pipeline honesty. We do not forge synthetic trace steps.

**Decision.** Mock fixtures used during UI development reflect what the real pipeline would actually produce for each scenario. When a real `no_discussion` run produces a pipeline trace with certain stages reaching `done` status and others reaching `failed` or `empty`, the corresponding mock fixture carries the same stage shapes and statuses — not a homogenized "5 steps all done" template.

**Context.** It would be cleaner for frontend development to always render a uniform number of trace steps regardless of actual pipeline state. Uniform mock shape simplifies UI rendering.

**Trade-off acknowledged.** UI fixtures look "inconsistent" across mocks — a `no_discussion` mock's Reddit analysis stage carries empty children while a `signal_too_weak` mock's children carry rejection reasons. Developers have to handle these variations in rendering logic.

**Alternative considered and rejected.** Forging uniform mock traces regardless of real pipeline behavior (e.g., always showing 5 green dots). We rejected this because the product's core claim is that reasoning is visible and honest. If our mocks lie about pipeline behavior, our development culture quietly drifts away from the claim — engineers start treating "reasoning log" as a decorative UI element rather than a faithful projection of backend state. Better to have inconsistent-looking fixtures than dishonest ones. The mock shape is the contract between backend and frontend: if the real pipeline emits N stages with certain statuses for a given scenario, the mock must mirror that shape exactly.

## 7. Per-stage result caching with cascade invalidation.

**Decision.** Reframer, adequacy, and final report results are cached in `useRef` keyed by the input content itself (the raw description string for reframe; JSON-serialized upstream payloads for adequacy and report).

**Context.** The original implementation re-ran every stage on forward navigation, which burned API quota and made iteration painful. During demo prep especially, re-navigating to show a specific screen meant another 60+ seconds of pipeline execution. Users who went back to edit and then forward again would watch the same analysis run twice for no reason.

**Trade-off acknowledged.** Cache state lives only in component memory (`useRef`). Page refresh loses it. This is intentional — we didn't want to persist potentially stale pipeline state across sessions. It also means users can't share a cached result via URL; only their live session has it.

**Cascade invalidation.** If the reframe changes, adequacy and report caches are cleared. If adequacy changes, report cache is cleared. Users can never see stale output when an upstream input changed.

**Alternative considered and rejected.** We considered persisting the cache in `localStorage` or on the server. Rejected for two reasons. First, persistent storage raises the question of when cache expires — we'd need to invent TTL logic or risk showing stale analyses from days ago. Second, this is a demand validation tool, not a document editor; the analysis happens once per input, and that session's cache is enough. Keep it ephemeral; keep it simple.

**Why this matches the product stance.** Our thesis is that reasoning should be reusable. Re-running the same pipeline on the same input should be free — both economically (API cost) and in user time (no loading). The cache makes forward navigation feel instant when the work has already been done, and reveals loading only when real new work is required.