/**
 * Rule Evaluation & Application Engine
 *
 * Supported condition fields:
 *   deal_size_usd, health_score, stage, account_name, prospect_role,
 *   rep_assigned, raw_transcript, risks, region
 *
 * Supported operators:
 *   gt, gte, lt, lte, eq, neq, contains, not_contains, in, regex, is_empty, is_not_empty
 *
 * Supported actions:
 *   assign_rep, add_risk, remove_risk, set_stage, set_health_score, flag_urgent
 */

// ─── Field Resolver ───────────────────────────────────────────────────────────
function resolveField(field, record, reps = []) {
  const norm = field.toLowerCase().replace(/[\s-]/g, '_');
  switch (norm) {
    case 'deal_size_usd':
    case 'deal_size':
    case 'amount':
      return record.dealSize ?? 0;

    case 'health_score':
    case 'score':
      return record.healthScore ?? 0;

    case 'stage':
    case 'pipeline_stage':
      return record.stage ?? '';

    case 'account_name':
    case 'company':
      return record.company ?? record.accountName ?? '';

    case 'deal_name':
      return record.dealName ?? '';

    case 'prospect_role':
    case 'contact_role':
      return record.prospectRole ?? record.contact ?? '';

    case 'rep_assigned':
    case 'assigned_rep': {
      const rep = reps.find(r => r.id === record.assignedRep || r.name === record.assignedRep);
      return rep?.name ?? record.assignedRep ?? '';
    }

    case 'region': {
      const rep = reps.find(r => r.id === record.assignedRep || r.name === record.assignedRep);
      return rep?.region ?? '';
    }

    case 'raw_transcript':
    case 'transcript': {
      // Search across all text fields
      return [
        record.rawTranscript,
        record.transcript,
        record.aiSummary,
        record.dealName,
        record.company,
      ].filter(Boolean).join(' ');
    }

    case 'risks':
      return (record.risks ?? []).join(';');

    case 'duration':
      return record.duration ?? '';

    case 'call_type':
    case 'type':
      return record.type ?? '';

    default:
      // Fallback: check record directly
      return record[field] ?? record[norm] ?? '';
  }
}

// ─── Single Condition Evaluator ───────────────────────────────────────────────
function evalCondition(condition, record, reps) {
  // Compound (AND / OR)
  if (condition.logic && Array.isArray(condition.conditions)) {
    const results = condition.conditions.map(c => evalCondition(c, record, reps));
    return condition.logic.toUpperCase() === 'AND'
      ? results.every(Boolean)
      : results.some(Boolean);
  }

  const { field, operator, value } = condition;
  if (!field || !operator) return false;

  const raw = resolveField(field, record, reps);
  const op  = operator.toLowerCase().replace(/[- ]/g, '_');

  switch (op) {
    case 'gt':          return Number(raw) >  Number(value);
    case 'gte':
    case 'gt_eq':       return Number(raw) >= Number(value);
    case 'lt':          return Number(raw) <  Number(value);
    case 'lte':
    case 'lt_eq':       return Number(raw) <= Number(value);
    case 'eq':
    case 'equals':      return String(raw).toLowerCase() === String(value ?? '').toLowerCase();
    case 'neq':
    case 'not_eq':
    case 'not_equals':  return String(raw).toLowerCase() !== String(value ?? '').toLowerCase();
    case 'contains':    return String(raw).toLowerCase().includes(String(value ?? '').toLowerCase());
    case 'not_contains':return !String(raw).toLowerCase().includes(String(value ?? '').toLowerCase());
    case 'in':          return (Array.isArray(value) ? value : [value]).some(
                          v => String(raw).toLowerCase() === String(v ?? '').toLowerCase()
                        );
    case 'not_in':      return !(Array.isArray(value) ? value : [value]).some(
                          v => String(raw).toLowerCase() === String(v ?? '').toLowerCase()
                        );
    case 'regex':       try { return new RegExp(value, 'i').test(String(raw)); } catch { return false; }
    case 'is_empty':    return !raw || String(raw).trim() === '' || raw === 0;
    case 'is_not_empty':return !!raw && String(raw).trim() !== '' && raw !== 0;
    default:            return false;
  }
}

// ─── Action Applicator ────────────────────────────────────────────────────────
function applyAction(action, record, reps) {
  const updates = {};

  if (action.assign_rep) {
    const rep = reps.find(r =>
      r.name.toLowerCase() === String(action.assign_rep).toLowerCase() ||
      r.id === action.assign_rep ||
      r.name.toLowerCase().includes(String(action.assign_rep).toLowerCase())
    );
    updates.assignedRep = rep ? rep.id : action.assign_rep;
  }

  if (action.add_risk) {
    const flag = String(action.add_risk).toUpperCase().replace(/\s+/g, '_');
    if (!(record.risks ?? []).includes(flag)) {
      updates.risks = [...(record.risks ?? []), flag];
    }
  }

  if (action.remove_risk) {
    const flag = String(action.remove_risk).toUpperCase().replace(/\s+/g, '_');
    updates.risks = (record.risks ?? []).filter(r => r !== flag);
  }

  if (action.set_stage) {
    updates.stage = action.set_stage;
  }

  if (action.set_health_score != null) {
    updates.healthScore = Math.min(100, Math.max(0, Number(action.set_health_score)));
  }

  if (action.flag_urgent) {
    const flag = 'NO_NEXT_STEP';
    if (!(record.risks ?? []).includes(flag)) {
      updates.risks = [...(updates.risks ?? record.risks ?? []), flag];
    }
  }

  return updates;
}

// ─── Run All Rules Against All Records ───────────────────────────────────────
export function runRules(rules, calls, reps) {
  const enabledRules = rules.filter(r => r.enabled !== false);
  const log = [];

  const updatedCalls = calls.map(call => {
    let updated = { ...call };
    const matched = [];

    for (const rule of enabledRules) {
      try {
        if (evalCondition(rule.condition, updated, reps)) {
          const before = { ...updated };
          const changes = applyAction(rule.action, updated, reps);
          updated = { ...updated, ...changes };

          // Compute human-readable diff
          const diff = Object.entries(changes)
            .filter(([k, v]) => {
              const prev = before[k];
              return JSON.stringify(prev) !== JSON.stringify(v);
            })
            .map(([k, v]) => {
              const prevRep = reps.find(r => r.id === before.assignedRep);
              const newRep  = reps.find(r => r.id === v);
              if (k === 'assignedRep') {
                return `assignedRep: "${prevRep?.name ?? before[k]}" → "${newRep?.name ?? v}"`;
              }
              return `${k}: ${JSON.stringify(before[k])} → ${JSON.stringify(v)}`;
            });

          matched.push({ ruleName: rule.name, ruleId: rule.id, diff });
        }
      } catch (e) {
        matched.push({ ruleName: rule.name, ruleId: rule.id, error: e.message, diff: [] });
      }
    }

    if (matched.length > 0) {
      log.push({
        callId:  call.id,
        company: call.company ?? call.accountName ?? call.id,
        dealName: call.dealName,
        matched,
      });
    }

    return updated;
  });

  return { updatedCalls, log };
}

// ─── Validate a Rule Object ───────────────────────────────────────────────────
export function validateRule(rule) {
  const errors = [];
  if (!rule.name?.trim())      errors.push('Rule must have a name.');
  if (!rule.condition)         errors.push('Rule must have a condition.');
  if (!rule.action)            errors.push('Rule must have an action.');
  if (rule.condition && !rule.condition.logic && !rule.condition.field)
    errors.push('Condition must have a "field" or a "logic" group.');
  if (rule.action && !Object.keys(rule.action).length)
    errors.push('Action must have at least one key (assign_rep, add_risk, etc.).');
  return errors;
}

// ─── Parse config object → normalised rules array ────────────────────────────
export function extractRules(parsed) {
  if (!parsed) throw new Error('Empty config — nothing parsed.');
  if (Array.isArray(parsed)) return parsed;   // bare array
  if (Array.isArray(parsed.rules)) return parsed.rules;
  throw new Error('Config must be an array of rules or an object with a "rules" key.');
}

// ─── Supported field / operator reference for UI ──────────────────────────────
export const CONDITION_FIELDS = [
  { value: 'deal_size_usd',   label: 'Deal Size (USD)',        type: 'number'  },
  { value: 'health_score',    label: 'Health Score (0-100)',   type: 'number'  },
  { value: 'stage',           label: 'Pipeline Stage',         type: 'string'  },
  { value: 'raw_transcript',  label: 'Transcript / Summary',   type: 'text'    },
  { value: 'account_name',    label: 'Account Name',           type: 'string'  },
  { value: 'deal_name',       label: 'Deal Name',              type: 'string'  },
  { value: 'prospect_role',   label: 'Prospect Role',          type: 'string'  },
  { value: 'rep_assigned',    label: 'Assigned Rep',           type: 'string'  },
  { value: 'region',          label: 'Rep Region',             type: 'string'  },
  { value: 'risks',           label: 'Risk Flags',             type: 'string'  },
  { value: 'call_type',       label: 'Call Type',              type: 'string'  },
];

export const OPERATORS_BY_TYPE = {
  number: [
    { value: 'gt',   label: '> greater than' },
    { value: 'gte',  label: '≥ at least'      },
    { value: 'lt',   label: '< less than'     },
    { value: 'lte',  label: '≤ at most'       },
    { value: 'eq',   label: '= equals'        },
    { value: 'neq',  label: '≠ not equals'    },
  ],
  string: [
    { value: 'eq',           label: '= equals'            },
    { value: 'neq',          label: '≠ not equals'        },
    { value: 'contains',     label: '⊃ contains'          },
    { value: 'not_contains', label: '⊅ does not contain'  },
    { value: 'in',           label: '∈ is one of'         },
    { value: 'is_empty',     label: '∅ is empty'          },
    { value: 'is_not_empty', label: '✓ is not empty'      },
  ],
  text: [
    { value: 'contains',     label: '⊃ contains keyword'      },
    { value: 'not_contains', label: '⊅ does not contain'      },
    { value: 'regex',        label: '∼ matches regex'         },
  ],
};
