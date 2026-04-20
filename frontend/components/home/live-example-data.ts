import type { Evidence, Gap, PlatformAdequacy } from "@/lib/types";

export const LIVE_INPUT =
  "We build inventory forecasting software for independent cannabis dispensaries in legal US states, helping them predict demand spikes around 4/20 and holiday weekends without over-ordering perishable edibles.";

export const LIVE_ADEQUACY: PlatformAdequacy = {
  level: "medium",
  headline_summary:
    "Dispensary owners discuss inventory pains in niche subreddits, but primary buying decisions happen in private industry networks.",
  target_audience:
    "Owners and managers of independent cannabis dispensaries in legal US states.",
  where_audience_actually_is: [
    "MJBizDaily forums",
    "Private Slack groups for dispensary operators",
    "State-level cannabis trade associations",
    "In-person industry conferences",
  ],
  reddit_fit_rationale:
    "r/CannabisIndustry and r/microgrowery surface operational pain points, but strategic purchasing decisions happen off-platform.",
  recommended_alternative_sources: [
    "MJBizDaily forums",
    "Cannabis Business Times subscriber surveys",
    "NCIA trade association events",
    "Direct outreach to state-level dispensary owner groups",
  ],
  wrong_platform_hypothesis: null,
  no_demand_hypothesis: null,
};

export const LIVE_DIAGNOSTIC = {
  summary:
    "Multiple dispensary owners describe over-ordering perishables around holiday weekends as a recurring, costly mistake. Existing forecasting tools are either generic retail ERP or cannabis-specific but enterprise-priced — leaving independents without an accessible solution.",
  demand_level: "peak" as const,
  demand_type: "unmet-supply" as const,
  confidence: "high" as const,
};

const EVIDENCE: Evidence[] = [
  {
    evidence_id: "post_1",
    author: "u/dispensary_solo",
    score: 247,
    permalink: "https://reddit.com/r/CannabisIndustry/comments/x1/",
    quote:
      "Flowhub and Treez are great if you're running 5+ stores. I have one shop in Denver and the pricing doesn't work. Generic inventory tools don't understand edibles expire.",
  },
  {
    evidence_id: "post_2",
    author: "u/mj_owner_co",
    score: 189,
    permalink: "https://reddit.com/r/Microgrowery/comments/x2/",
    quote:
      "Every April I over-order concentrates because I'm panicking about 4/20. Then half of them sit through May. There's no software built for this specific problem at my scale.",
  },
  {
    evidence_id: "post_3",
    author: "u/greenroom_manager",
    score: 156,
    permalink: "https://reddit.com/r/CannabisIndustry/comments/x3/",
    quote:
      "I've tried building a spreadsheet model but I'm not a data person. Paying $500/mo for Flowhub analytics when I just need better purchasing signals feels insane.",
  },
];

export const LIVE_GAP: Gap = {
  description:
    "Forecasting tools either ignore cannabis perishability constraints or are priced for multi-store operators, leaving independent single-store dispensaries without a fit.",
  verdict: "structural",
  critic_notes:
    "Two users articulate the same distribution gap: enterprise tools exist (Treez, Flowhub) but lack SKU-level perishability forecasting; generic retail ERP (Shopify, Lightspeed) ignores cannabis-specific demand patterns. This is a category-level observation about product distribution, not a statistical pattern of pain complaints.",
  evidence: EVIDENCE,
};
