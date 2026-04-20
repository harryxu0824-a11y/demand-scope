import type {
  DemandReport,
  PlatformAdequacy,
  Reframe,
  TraceStep,
} from "./types";

export type MockScenario =
  | "normal"
  | "empty_no_discussion"
  | "empty_search_mismatch_high"
  | "empty_search_mismatch_medium"
  | "empty_signal_too_weak"
  | "low_adequacy_continue";

const ALLOWED: MockScenario[] = [
  "normal",
  "empty_no_discussion",
  "empty_search_mismatch_high",
  "empty_search_mismatch_medium",
  "empty_signal_too_weak",
  "low_adequacy_continue",
];

export function readMockScenario(): MockScenario | null {
  if (typeof window === "undefined") return null;
  const v = new URLSearchParams(window.location.search).get("mock");
  if (!v) return null;
  return (ALLOWED as string[]).includes(v) ? (v as MockScenario) : null;
}

const DEFAULT_REFRAME: Reframe = {
  job_to_be_done:
    "Cut the phone-call load on clinic front-desk staff so appointment booking doesn't collapse.",
  user_language_rephrase:
    "Our front desk is drowning in calls — we need something to pick up, route, or answer the routine ones.",
  pain_hypotheses: [
    "Front-desk staff lose hours per day to repetitive call triage.",
    "Clinic managers fear missed appointments from abandoned calls.",
    "Existing phone systems lack any routing intelligence for medical context.",
  ],
};

const HIGH_ADEQUACY: PlatformAdequacy = {
  level: "high",
  headline_summary:
    "Reddit is a strong listening post for this audience — front-desk staff, receptionists, and clinic ops chat openly about these pains.",
  target_audience:
    "Front-desk staff, medical receptionists, and clinic operations leads.",
  where_audience_actually_is: [
    "r/receptionists",
    "r/medicalassistant",
    "r/medicine (ops threads)",
  ],
  reddit_fit_rationale:
    "Reddit hosts the daily-grind conversations of this role directly; vocabulary and lived-experience posts are abundant.",
  recommended_alternative_sources: [],
  wrong_platform_hypothesis: null,
  no_demand_hypothesis: null,
};

const MEDIUM_ADEQUACY: PlatformAdequacy = {
  level: "medium",
  headline_summary:
    "Clinic managers discuss operational pains on Reddit, but it's not their main hub; expect a partial signal from staff, not buyers.",
  target_audience:
    "Practice managers, clinic administrators, and front-desk supervisors at small to medium-sized medical clinics.",
  where_audience_actually_is: [
    "LinkedIn Groups (MGMA, Practice Managers Network)",
    "Professional association forums (MGMA, AAFP)",
    "Industry-specific publications (Fierce Healthcare, Becker's Hospital Review)",
    "Niche Facebook Groups for medical office staff",
  ],
  reddit_fit_rationale:
    "Front-desk staff complain about phone volume in subreddits like r/receptionists, but buyers (clinic managers) are a niche professional audience more active in industry-specific forums.",
  recommended_alternative_sources: [
    "LinkedIn Group discussions on practice management",
    "MGMA professional forums",
    "Comment sections of healthcare admin trade journals",
    "Job postings listing 'high call volume' as a stressor",
  ],
  wrong_platform_hypothesis: null,
  no_demand_hypothesis: null,
};

const LOW_ADEQUACY: PlatformAdequacy = {
  ...MEDIUM_ADEQUACY,
  level: "low",
  headline_summary:
    "Reddit is the wrong place to read this audience — front-desk staff vent here but buyers don't.",
  wrong_platform_hypothesis:
    "The economic buyer (clinic manager) does their purchasing research on LinkedIn and at industry conferences, not Reddit.",
  no_demand_hypothesis:
    "Demand could also simply be weak: existing phone systems may be 'good enough' for most clinics.",
};

function trace(
  steps: {
    step: string;
    phase: string;
    model?: string | null;
    elapsed_ms: number;
    input: string;
    output: string;
    metadata?: Record<string, unknown>;
  }[],
): TraceStep[] {
  const now = Date.now() / 1000;
  return steps.map((s, i) => ({
    step: s.step,
    phase: s.phase,
    model: s.model ?? null,
    started_at: now - (steps.length - i) * 10,
    elapsed_ms: s.elapsed_ms,
    input_preview: s.input,
    output_preview: s.output,
    metadata: s.metadata ?? {},
  }));
}

// ---- Trace fixtures per scenario ----

const TRACE_NO_DISCUSSION = trace([
  {
    step: "query_planner",
    phase: "understanding_market",
    model: "gemini-2.5-pro",
    elapsed_ms: 4200,
    input:
      "Job-to-be-done: Cut phone-call load on clinic front-desk staff\nPain hypotheses: 3",
    output:
      "Positive keywords: phone volume, call triage, routing\nPain keywords: drowning in calls, missed appointments\nSubreddits: r/medicine, r/clinic, r/receptionists, r/medicaladministration",
  },
  {
    step: "harvester",
    phase: "gathering_signal",
    model: null,
    elapsed_ms: 2100,
    input:
      "Source: mock_reddit\nKeywords (5): phone volume, call triage, routing, drowning in calls, missed appointments\nSubreddits: r/medicine, r/clinic, r/receptionists, r/medicaladministration",
    output:
      "Items: 0 (0 posts, 0 comments)\nSubreddits represented: <none>",
    metadata: {
      item_count: 0,
      post_count: 0,
      subreddits: [],
    },
  },
]);

const TRACE_SEARCH_MISMATCH_HIGH = trace([
  {
    step: "query_planner",
    phase: "understanding_market",
    model: "gemini-2.5-pro",
    elapsed_ms: 4900,
    input: "Job-to-be-done: Cut phone-call load on clinic front-desk staff",
    output:
      "Positive keywords: call triage, IVR, receptionist\nPain keywords: drowning in calls, interruptions\nSubreddits: r/receptionists, r/medicalassistant, r/medicine, r/healthcare, r/clinic",
  },
  {
    step: "harvester",
    phase: "gathering_signal",
    model: null,
    elapsed_ms: 3400,
    input:
      "Source: mock_reddit\nKeywords (5): call triage, IVR, receptionist, drowning in calls, interruptions\nSubreddits: r/receptionists, r/medicalassistant, r/medicine, r/healthcare, r/clinic",
    output:
      "Items: 22 (14 posts, 8 comments)\nSubreddits represented: r/receptionists, r/medicalassistant, r/medicine, r/healthcare, r/clinic",
    metadata: {
      item_count: 22,
      post_count: 14,
      subreddits: [
        "r/receptionists",
        "r/medicalassistant",
        "r/medicine",
        "r/healthcare",
        "r/clinic",
      ],
    },
  },
  {
    step: "analyzer",
    phase: "analyzing_demand",
    model: "gemini-2.5-pro",
    elapsed_ms: 58300,
    input:
      "Reframe (user-language): Our front desk is drowning in calls…\nCorpus: 22 items",
    output:
      "demand_level=low, demand_type=unknown, confidence=null\nGaps (0): — (no matching quotes found)",
    metadata: { gap_count: 0, evidence_count: 0 },
  },
]);

const TRACE_SEARCH_MISMATCH_MEDIUM = trace([
  {
    step: "query_planner",
    phase: "understanding_market",
    model: "gemini-2.5-pro",
    elapsed_ms: 4100,
    input: "Job-to-be-done: Cut phone-call load on clinic front-desk staff",
    output:
      "Positive keywords: practice management, clinic operations\nPain keywords: phone chaos, appointment drops\nSubreddits: r/medicine, r/nursing, r/receptionists",
  },
  {
    step: "harvester",
    phase: "gathering_signal",
    model: null,
    elapsed_ms: 3100,
    input:
      "Source: mock_reddit\nKeywords (4): practice management, clinic operations, phone chaos, appointment drops\nSubreddits: r/medicine, r/nursing, r/receptionists",
    output:
      "Items: 47 (31 posts, 16 comments)\nSubreddits represented: r/medicine, r/nursing, r/receptionists",
    metadata: {
      item_count: 47,
      post_count: 31,
      subreddits: ["r/medicine", "r/nursing", "r/receptionists"],
    },
  },
  {
    step: "analyzer",
    phase: "analyzing_demand",
    model: "gemini-2.5-pro",
    elapsed_ms: 61200,
    input: "Reframe (user-language): …\nCorpus: 47 items",
    output:
      "demand_level=low, demand_type=unknown, confidence=null\nGaps (0): — (vocabulary mismatch with reframe)",
    metadata: { gap_count: 0, evidence_count: 0 },
  },
]);

const TRACE_SIGNAL_TOO_WEAK = trace([
  {
    step: "query_planner",
    phase: "understanding_market",
    model: "gemini-2.5-pro",
    elapsed_ms: 4400,
    input: "Job-to-be-done: Cut phone-call load on clinic front-desk staff",
    output:
      "Positive keywords: phone system, call routing\nPain keywords: burnout, missed calls\nSubreddits: r/medicine, r/receptionists, r/nursing",
  },
  {
    step: "harvester",
    phase: "gathering_signal",
    model: null,
    elapsed_ms: 2900,
    input:
      "Source: mock_reddit\nKeywords (4): phone system, call routing, burnout, missed calls\nSubreddits: r/medicine, r/receptionists, r/nursing",
    output:
      "Items: 8 (5 posts, 3 comments)\nSubreddits represented: r/medicine, r/receptionists, r/nursing",
    metadata: {
      item_count: 8,
      post_count: 5,
      subreddits: ["r/medicine", "r/receptionists", "r/nursing"],
    },
  },
  {
    step: "analyzer",
    phase: "analyzing_demand",
    model: "gemini-2.5-pro",
    elapsed_ms: 54100,
    input: "Reframe: …\nCorpus: 8 items",
    output:
      "demand_level=moderate, demand_type=unknown, confidence=low\nGaps (3): Staff burnout from interruptions; Missed appointments from dropped calls; Clinic managers frustrated with phone systems",
    metadata: { gap_count: 3, evidence_count: 8 },
  },
  {
    step: "critic",
    phase: "analyzing_demand",
    model: "gemini-2.5-pro",
    elapsed_ms: 18500,
    input: "Reviewing 3 gaps with 8 evidence items. Adversarial review.",
    output:
      "Verdicts after critic: flagged=2, anecdotal=1. All evidence missing attempted-solution or willingness-to-pay signal.",
    metadata: { verdict_counts: { flagged: 2, anecdotal: 1 } },
  },
  {
    step: "validator",
    phase: "verifying_evidence",
    model: null,
    elapsed_ms: 300,
    input: "Input: 3 gaps, 8 evidence items.",
    output: "Kept 0/3 gaps and 0/8 evidence items",
    metadata: { gaps_in: 3, gaps_kept: 0, evidence_in: 8, evidence_kept: 0 },
  },
]);

const TRACE_NORMAL = trace([
  {
    step: "query_planner",
    phase: "understanding_market",
    model: "gemini-2.5-pro",
    elapsed_ms: 4600,
    input: "Job-to-be-done: Cut phone-call load on clinic front-desk staff",
    output:
      "Positive keywords: practice management, call volume\nPain keywords: drowning in calls\nSubreddits: r/medicine, r/receptionists, r/medicaladministration",
  },
  {
    step: "harvester",
    phase: "gathering_signal",
    model: null,
    elapsed_ms: 3400,
    input: "Source: mock_reddit",
    output:
      "Items: 31 (19 posts, 12 comments)\nSubreddits represented: r/medicine, r/receptionists, r/medicaladministration",
    metadata: {
      item_count: 31,
      post_count: 19,
      subreddits: [
        "r/medicine",
        "r/receptionists",
        "r/medicaladministration",
      ],
    },
  },
  {
    step: "analyzer",
    phase: "analyzing_demand",
    model: "gemini-2.5-pro",
    elapsed_ms: 62800,
    input: "Reframe (user-language): …\nCorpus: 31 items",
    output:
      "demand_level=moderate, demand_type=unmet-supply, confidence=medium\nGaps (2): Routine call triage eats front-desk time; Generic IVR lacks medical context",
    metadata: { gap_count: 2, evidence_count: 5 },
  },
  {
    step: "critic",
    phase: "analyzing_demand",
    model: "gemini-2.5-pro",
    elapsed_ms: 17900,
    input: "Reviewing 2 gaps with 5 evidence items.",
    output: "Verdicts after critic: strong=1, weak=1",
    metadata: { verdict_counts: { strong: 1, weak: 1 } },
  },
  {
    step: "validator",
    phase: "verifying_evidence",
    model: null,
    elapsed_ms: 250,
    input: "Input: 2 gaps, 5 evidence items.",
    output: "Kept 1/2 gaps and 2/5 evidence items",
    metadata: { gaps_kept: 1, evidence_kept: 2 },
  },
]);

const BASE_REPORT: Omit<
  DemandReport,
  | "adequacy"
  | "empty_reason"
  | "empty_reason_details"
  | "low_adequacy_override"
  | "trace"
> = {
  reframe: DEFAULT_REFRAME,
  demand_level: "low",
  demand_level_rationale: "",
  demand_type: "unknown",
  demand_type_rationale: "",
  gaps: [],
  confidence: null,
};

export function mockReport(scenario: MockScenario): DemandReport {
  switch (scenario) {
    case "empty_no_discussion":
      return {
        ...BASE_REPORT,
        adequacy: MEDIUM_ADEQUACY,
        low_adequacy_override: false,
        empty_reason: "no_discussion",
        empty_reason_details: {
          subreddits_searched: [
            "r/medicine",
            "r/clinic",
            "r/receptionists",
            "r/medicaladministration",
          ],
          keywords_tried: [
            "phone volume",
            "front desk calls",
            "clinic phone routing",
          ],
          posts_found: 0,
        },
        trace: TRACE_NO_DISCUSSION,
      };

    case "empty_search_mismatch_high":
      return {
        ...BASE_REPORT,
        adequacy: HIGH_ADEQUACY,
        low_adequacy_override: false,
        empty_reason: "search_mismatch",
        empty_reason_details: {
          subreddits_searched: [
            "r/receptionists",
            "r/medicalassistant",
            "r/medicine",
            "r/healthcare",
            "r/clinic",
          ],
          posts_found: 22,
          user_language_rephrase: DEFAULT_REFRAME.user_language_rephrase,
          pain_hypotheses: DEFAULT_REFRAME.pain_hypotheses,
        },
        trace: TRACE_SEARCH_MISMATCH_HIGH,
      };

    case "empty_search_mismatch_medium":
      return {
        ...BASE_REPORT,
        adequacy: MEDIUM_ADEQUACY,
        low_adequacy_override: false,
        empty_reason: "search_mismatch",
        empty_reason_details: {
          subreddits_searched: [
            "r/medicine",
            "r/nursing",
            "r/receptionists",
          ],
          posts_found: 47,
          user_language_rephrase: DEFAULT_REFRAME.user_language_rephrase,
          pain_hypotheses: DEFAULT_REFRAME.pain_hypotheses,
        },
        trace: TRACE_SEARCH_MISMATCH_MEDIUM,
      };

    case "empty_signal_too_weak":
      return {
        ...BASE_REPORT,
        adequacy: MEDIUM_ADEQUACY,
        low_adequacy_override: false,
        empty_reason: "signal_too_weak",
        empty_reason_details: {
          rejected_quotes: [
            {
              gap: "Staff burnout from constant interruptions",
              quotes: [
                "honestly the phones are just background noise now, i've learned to tune it out",
                "we hired a second receptionist and it's slightly better i guess",
              ],
              rejection_reason:
                "Anecdotal mention without attempted solution or switching intent.",
            },
            {
              gap: "Missed appointments from dropped calls",
              quotes: [
                "patients complain sometimes but most just call back, it's not a huge deal",
              ],
              rejection_reason:
                "Casual complaint; no willingness-to-pay signal.",
            },
            {
              gap: "Clinic managers frustrated with existing phone systems",
              quotes: ["our IVR is fine, i don't think about it much"],
              rejection_reason: "Off-topic — contradicts pain hypothesis.",
            },
          ],
          analyzer_evidence_count: 8,
        },
        trace: TRACE_SIGNAL_TOO_WEAK,
      };

    case "low_adequacy_continue":
      return {
        ...BASE_REPORT,
        adequacy: LOW_ADEQUACY,
        low_adequacy_override: true,
        empty_reason: null,
        empty_reason_details: {},
        demand_level: "moderate",
        demand_level_rationale:
          "Partial signal from front-desk staff; economic buyer voice absent so this is directional.",
        demand_type: "unmet-supply",
        demand_type_rationale:
          "Staff describe the pain but no good solution they use today — suggestive of unmet supply, not conclusive.",
        confidence: "low",
        gaps: [
          {
            description:
              "Front-desk staff have no reliable way to silence routine phone interruptions.",
            verdict: "weak",
            critic_notes:
              "Only 2 independent sources; all from staff, not decision-makers.",
            evidence: [
              {
                evidence_id: "post_1",
                quote:
                  "I'd pay out of pocket for something that just answered 'what are your hours' so I could focus",
                permalink: "https://reddit.com/r/receptionists/comments/xyz/1",
                score: 42,
                author: "front_desk_sara",
              },
              {
                evidence_id: "comment_2",
                quote:
                  "The phones never stop and half the questions are the same three things",
                permalink: "https://reddit.com/r/medicine/comments/abc/2",
                score: 18,
                author: "nursepractitioner22",
              },
            ],
          },
        ],
        trace: TRACE_NORMAL,
      };

    case "normal":
    default:
      return {
        ...BASE_REPORT,
        adequacy: MEDIUM_ADEQUACY,
        low_adequacy_override: false,
        empty_reason: null,
        empty_reason_details: {},
        demand_level: "moderate",
        demand_level_rationale:
          "Clear pattern of pain across multiple subreddits; staff describe the same routine-call overload repeatedly.",
        demand_type: "unmet-supply",
        demand_type_rationale:
          "No user in the corpus mentions a product that satisfies this; several mention DIY coping (spreadsheets, handwritten triage).",
        confidence: "medium",
        gaps: [
          {
            description:
              "Routine call triage eats most of front-desk time; no purpose-built tool in evidence.",
            verdict: "strong",
            critic_notes: null,
            evidence: [
              {
                evidence_id: "post_1",
                quote:
                  "80% of our calls are 'what are your hours' or 'are you in network' — I'd pay to never hear those again",
                permalink: "https://reddit.com/r/medicine/comments/aaa/1",
                score: 127,
                author: "clinic_manager_dan",
              },
              {
                evidence_id: "post_2",
                quote:
                  "We tried a generic IVR and patients hated it. Need something that actually understands medical context",
                permalink:
                  "https://reddit.com/r/medicaladministration/comments/bbb/2",
                score: 54,
                author: "pm_jenna",
              },
            ],
          },
          {
            description:
              "AI call-triage tools ship B2B to hospital systems but are blocked from reaching independent clinics.",
            verdict: "structural",
            critic_notes:
              "Only 3 quotes, but each independently describes the same structural observation: a category of product exists in B2B but is blocked from reaching individual clinics. Pattern repetition across independent users signals a real gap, not noise.",
            evidence: [
              {
                evidence_id: "post_3",
                quote:
                  "Hospitals are rolling out AI receptionists (multiple vendors) but those are enterprise contracts. Independent clinics have literally nothing equivalent. MASSIVE unaddressed market here.",
                permalink: "https://reddit.com/r/medicine/comments/ccc/3",
                score: 2104,
                author: "md_hospitalist",
              },
              {
                evidence_id: "comment_4",
                quote:
                  "These tools exist but they're sold to hospital systems, independent clinics can't buy them. That's the whole issue — every tool in this space targets enterprise, not solo practice.",
                permalink:
                  "https://reddit.com/r/medicaladministration/comments/ddd/4",
                score: 356,
                author: "solo_practice_md",
              },
              {
                evidence_id: "comment_5",
                quote:
                  "I asked our EHR vendor if there was an add-on for call triage and they said yes but the minimum is 20-seat enterprise. We have 3 staff. Bizarre.",
                permalink: "https://reddit.com/r/medicine/comments/eee/5",
                score: 289,
                author: "small_clinic_pm",
              },
            ],
          },
        ],
        trace: TRACE_NORMAL,
      };
  }
}
