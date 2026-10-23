// ─── Default Representatives ─────────────────────────────────────────────────
export const DEFAULT_REPS = [
  { id: 'rep-1', name: 'Sarah Chen',    avatar: 'SC', region: 'APAC',  quota: 850000 },
  { id: 'rep-2', name: 'Marcus Rivera', avatar: 'MR', region: 'EMEA',  quota: 720000 },
  { id: 'rep-3', name: 'Priya Nair',    avatar: 'PN', region: 'North', quota: 930000 },
  { id: 'rep-4', name: 'Jake Thompson', avatar: 'JT', region: 'South', quota: 680000 },
];

// ─── Risk Badge Types ─────────────────────────────────────────────────────────
export const RISK_TYPES = {
  BUDGET_BLOCKER:    { label: 'Budget Blocker',    color: 'rose'   },
  COMPETITOR_THREAT: { label: 'Competitor Threat',  color: 'amber'  },
  NO_NEXT_STEP:      { label: 'No Next Step',       color: 'slate'  },
  CHAMPION_LEFT:     { label: 'Champion Left',      color: 'purple' },
  STALLED:           { label: 'Stalled Deal',       color: 'orange' },
};

// ─── Pipeline Stages ──────────────────────────────────────────────────────────
export const PIPELINE_STAGES = [
  'Prospecting', 'Qualification', 'Evaluation',
  'Proposal', 'Negotiation', 'Closing',
];

// ─── Primary CSV Schema (transcript-first) ───────────────────────────────────
// Required: call_id, deal_name, account_name, timestamp, rep_assigned, prospect_role, raw_transcript
// Optional: duration, deal_size_usd, stage, health_score, risks, participants,
//           ai_summary, action_items, engagement, decision_maker, timeline, budget,
//           competitive_position
export const CSV_TEMPLATE_HEADERS = [
  'call_id', 'deal_name', 'account_name', 'timestamp', 'duration',
  'rep_assigned', 'prospect_role', 'deal_size_usd', 'stage', 'health_score',
  'risks', 'participants', 'raw_transcript', 'ai_summary', 'action_items',
  'engagement', 'decision_maker', 'timeline', 'budget', 'competitive_position',
].join(',');

export const CSV_TEMPLATE_EXAMPLE =
  CSV_TEMPLATE_HEADERS + '\n' +
  'CALL-1042,"Acme Corp — Enterprise License",Acme Corp,2026-10-22 14:30:00,42 min,' +
  'Sarah Chen,"VP of Engineering",95000,Qualification,42,' +
  'BUDGET_BLOCKER;NO_NEXT_STEP,' +
  '"Sarah Chen (AE);Lisa Park (VP Eng);Tom Blake (CFO)",' +
  '"Sarah: Thanks for joining today Lisa. Can you walk me through your main challenges?|' +
  'Lisa: Sure — we are still doing forecasting in spreadsheets.|' +
  'Tom Blake: I need to understand pricing before we go further.|' +
  'Sarah: Absolutely. Our pricing is seat-based plus data volume...",' +
  '"Budget constraints flagged by CFO mid-call. Evaluating Clari as alternative. No next steps set.",' +
  '"Send ROI calculator by Oct 24|Schedule exec alignment with CFO|Prepare Clari battlecard",' +
  '55,30,40,20,65';
