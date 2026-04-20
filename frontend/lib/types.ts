export type AdequacyLevel = "high" | "medium" | "low";
export type DemandLevel = "peak" | "moderate" | "low";
export type DemandType = "unmet-supply" | "unknown" | "satisfied";
export type Verdict =
  | "strong"
  | "structural"
  | "weak"
  | "flagged"
  | "anecdotal";

export interface Evidence {
  evidence_id: string;
  quote: string;
  permalink: string;
  score: number;
  author: string;
}

export interface Gap {
  description: string;
  evidence: Evidence[];
  verdict: Verdict;
  critic_notes: string | null;
}

export interface Reframe {
  job_to_be_done: string;
  user_language_rephrase: string;
  pain_hypotheses: string[];
}

export interface PlatformAdequacy {
  level: AdequacyLevel;
  headline_summary?: string;
  target_audience: string;
  where_audience_actually_is: string[];
  reddit_fit_rationale: string;
  recommended_alternative_sources: string[];
  wrong_platform_hypothesis: string | null;
  no_demand_hypothesis: string | null;
}

export type PipelinePhase =
  | "understanding_market"
  | "gathering_signal"
  | "analyzing_demand"
  | "verifying_evidence";

export interface TraceStep {
  step: string;
  phase: PipelinePhase | string;
  model: string | null;
  started_at: number;
  elapsed_ms: number;
  input_preview: string;
  output_preview: string;
  metadata: Record<string, unknown>;
}

export type StreamEvent =
  | { type: "phase"; phase: PipelinePhase; status: "start" }
  | { type: "phase"; phase: PipelinePhase; status: "done"; elapsed_ms: number }
  | { type: "complete"; report: DemandReport }
  | { type: "error"; message: string; step?: string };

export type EmptyReason =
  | "no_discussion"
  | "search_mismatch"
  | "signal_too_weak";

export interface DemandReport {
  adequacy: PlatformAdequacy;
  reframe: Reframe;
  demand_level: DemandLevel;
  demand_level_rationale: string;
  demand_type: DemandType;
  demand_type_rationale: string;
  gaps: Gap[];
  confidence: "high" | "medium" | "low" | null;
  low_adequacy_override: boolean;
  empty_reason?: EmptyReason | null;
  empty_reason_details?: Record<string, unknown>;
  trace: TraceStep[];
}
