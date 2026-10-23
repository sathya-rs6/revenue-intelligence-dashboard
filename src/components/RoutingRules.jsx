import { useState, useRef } from 'react';
import {
  runRules, validateRule, extractRules,
  CONDITION_FIELDS, OPERATORS_BY_TYPE,
} from '../utils/ruleEngine.js';
import { parseYAML } from '../utils/yamlParser.js';
import { RISK_TYPES, PIPELINE_STAGES } from '../data/mockData.js';
import {
  Upload, Play, AlertCircle, CheckCircle2, Plus, Trash2,
  Code2, Wand2, Download, ChevronDown, ChevronRight,
  GitMerge, Zap, InboxIcon, ArrowRight, RefreshCw,
  ToggleLeft, ToggleRight,
} from 'lucide-react';

// ─── Bundled templates ────────────────────────────────────────────────────────
const TEMPLATE_JSON = JSON.stringify({
  version: '1.0',
  description: 'Revenue Intelligence routing rules',
  rules: [
    { id:'rule-001', name:'Enterprise Deal — Senior AE', priority:1, enabled:true,
      condition:{ field:'deal_size_usd', operator:'gt', value:100000 },
      action:{ assign_rep:'Priya Nair' } },
    { id:'rule-002', name:'Security / Compliance Keywords — Solutions Engineer', priority:2, enabled:true,
      condition:{ logic:'OR', conditions:[
        { field:'raw_transcript', operator:'contains', value:'security compliance' },
        { field:'raw_transcript', operator:'contains', value:'HIPAA' },
        { field:'raw_transcript', operator:'contains', value:'SOC 2' },
      ]},
      action:{ assign_rep:'Marcus Rivera', add_risk:'COMPETITOR_THREAT' } },
    { id:'rule-003', name:'APAC Region — Regional Lead', priority:3, enabled:true,
      condition:{ field:'region', operator:'eq', value:'APAC' },
      action:{ assign_rep:'Sarah Chen' } },
    { id:'rule-004', name:'Stalled Low-Health Deal', priority:4, enabled:true,
      condition:{ logic:'AND', conditions:[
        { field:'health_score', operator:'lt', value:40 },
        { field:'stage', operator:'neq', value:'Closing' },
      ]},
      action:{ add_risk:'STALLED', flag_urgent:true } },
    { id:'rule-005', name:'Competitor Mention — Flag Threat', priority:5, enabled:true,
      condition:{ logic:'OR', conditions:[
        { field:'raw_transcript', operator:'contains', value:'Salesforce' },
        { field:'raw_transcript', operator:'contains', value:'Gong' },
        { field:'raw_transcript', operator:'contains', value:'Clari' },
      ]},
      action:{ add_risk:'COMPETITOR_THREAT' } },
  ],
}, null, 2);

const TEMPLATE_YAML = `version: "1.0"
description: Revenue Intelligence routing rules

rules:
  - id: rule-001
    name: Enterprise Deal — Senior AE
    priority: 1
    enabled: true
    condition:
      field: deal_size_usd
      operator: gt
      value: 100000
    action:
      assign_rep: Priya Nair

  - id: rule-002
    name: Security Compliance Keywords
    priority: 2
    enabled: true
    condition:
      logic: OR
      conditions:
        - field: raw_transcript
          operator: contains
          value: security compliance
        - field: raw_transcript
          operator: contains
          value: HIPAA
    action:
      assign_rep: Marcus Rivera
      add_risk: COMPETITOR_THREAT

  - id: rule-003
    name: APAC Region — Regional Lead
    priority: 3
    enabled: true
    condition:
      field: region
      operator: eq
      value: APAC
    action:
      assign_rep: Sarah Chen

  - id: rule-004
    name: Stalled Low-Health Deal
    priority: 4
    enabled: true
    condition:
      logic: AND
      conditions:
        - field: health_score
          operator: lt
          value: 40
        - field: stage
          operator: neq
          value: Closing
    action:
      add_risk: STALLED
      flag_urgent: true`;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function condSummary(c) {
  if (!c) return '—';
  if (c.logic) return `${c.logic} of ${c.conditions?.length ?? 0} conditions`;
  return `${c.field} ${c.operator} ${c.value ?? ''}`;
}
function actSummary(a) {
  if (!a) return '—';
  const parts = [];
  if (a.assign_rep)      parts.push(`Assign: ${a.assign_rep}`);
  if (a.add_risk)        parts.push(`Add flag: ${a.add_risk}`);
  if (a.remove_risk)     parts.push(`Remove flag: ${a.remove_risk}`);
  if (a.set_stage)       parts.push(`Stage: ${a.set_stage}`);
  if (a.set_health_score != null) parts.push(`Score: ${a.set_health_score}`);
  if (a.flag_urgent)     parts.push('Flag urgent');
  return parts.join(' · ') || '—';
}

// ─── Rule Card ────────────────────────────────────────────────────────────────
function RuleCard({ rule, index, onToggle, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const enabled = rule.enabled !== false;

  return (
    <div className={`border rounded-xl overflow-hidden transition-colors ${
      enabled ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50 opacity-60'
    } shadow-sm`}>
      <div className="flex items-center gap-3 px-4 py-3.5">
        <span className="w-6 h-6 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold flex items-center justify-center shrink-0">
          {rule.priority ?? index + 1}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{rule.name}</p>
          <p className="text-xs text-gray-400 truncate mt-0.5">
            <span className="text-amber-600 font-medium">IF</span> {condSummary(rule.condition)}
            <span className="mx-1 text-gray-300">|</span>
            <span className="text-emerald-600 font-medium">THEN</span> {actSummary(rule.action)}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => setExpanded(e=>!e)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          </button>
          <button onClick={() => onToggle(rule.id)}
            className={`transition-colors ${enabled ? 'text-emerald-500 hover:text-emerald-600' : 'text-gray-400 hover:text-gray-600'}`}>
            {enabled ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
          </button>
          <button onClick={() => onDelete(rule.id)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 px-4 py-3 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs bg-gray-50">
          <div>
            <p className="text-amber-600 font-semibold mb-1.5">Condition</p>
            <pre className="bg-white text-gray-600 rounded-lg p-3 border border-gray-200 overflow-x-auto font-mono text-xs leading-relaxed">
              {JSON.stringify(rule.condition, null, 2)}
            </pre>
          </div>
          <div>
            <p className="text-emerald-600 font-semibold mb-1.5">Action</p>
            <pre className="bg-white text-gray-600 rounded-lg p-3 border border-gray-200 overflow-x-auto font-mono text-xs leading-relaxed">
              {JSON.stringify(rule.action, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Visual Builder ───────────────────────────────────────────────────────────
const BLANK_COND = { field:'deal_size_usd', operator:'gt', value:'' };
const BLANK_RULE = { id:'', name:'', priority:1, enabled:true, condition:{...BLANK_COND}, action:{ assign_rep:'' } };

function VisualBuilder({ reps, onAdd }) {
  const [rule, setRule]         = useState({ ...BLANK_RULE, id:`rule-${Date.now()}` });
  const [compound, setCompound] = useState(false);
  const [subConds, setSubConds] = useState([{ ...BLANK_COND }]);
  const [logic, setLogic]       = useState('AND');
  const [errors, setErrors]     = useState([]);

  const fieldType = f => CONDITION_FIELDS.find(c => c.value === f)?.type ?? 'string';
  const ops       = f => OPERATORS_BY_TYPE[fieldType(f)] ?? OPERATORS_BY_TYPE.string;

  function setAction(k, v) { setRule(r => ({ ...r, action: { ...r.action, [k]: v||undefined } })); }

  function handleAdd() {
    const built = {
      ...rule, id: rule.id || `rule-${Date.now()}`,
      condition: compound ? { logic, conditions: subConds } : rule.condition,
      action: Object.fromEntries(Object.entries(rule.action).filter(([,v]) => v !== '' && v != null)),
    };
    const errs = validateRule(built);
    if (errs.length) { setErrors(errs); return; }
    setErrors([]);
    onAdd(built);
    setRule({ ...BLANK_RULE, id:`rule-${Date.now()}`, priority: rule.priority+1 });
    setSubConds([{ ...BLANK_COND }]); setCompound(false);
  }

  return (
    <div className="space-y-4 bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
      <h4 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
        <Wand2 size={14} className="text-blue-600" strokeWidth={1.8} />Visual Rule Builder
      </h4>

      {/* Name & Priority */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2">
          <label className="text-xs text-gray-500 mb-1 block font-medium">Rule Name</label>
          <input value={rule.name} onChange={e => setRule(r=>({...r,name:e.target.value}))}
            placeholder="e.g. Enterprise Deal Routing"
            className="w-full bg-white border border-gray-300 focus:border-blue-500 text-gray-900 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200 placeholder-gray-400" />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block font-medium">Priority</label>
          <input type="number" min={1} value={rule.priority}
            onChange={e => setRule(r=>({...r,priority:Number(e.target.value)}))}
            className="w-full bg-white border border-gray-300 focus:border-blue-500 text-gray-900 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200" />
        </div>
      </div>

      {/* Condition type */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500 font-medium">Condition type:</span>
        {[['Simple','false'],['Compound (AND / OR)','true']].map(([label, val]) => (
          <button key={val} onClick={() => setCompound(val==='true')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              String(compound) === val ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* Simple condition */}
      {!compound && (
        <div className="flex flex-wrap gap-2 items-center p-3.5 bg-amber-50 border border-amber-200 rounded-lg">
          <span className="text-xs text-amber-700 font-semibold">IF</span>
          <select value={rule.condition.field}
            onChange={e => setRule(r=>({...r,condition:{...r.condition,field:e.target.value,operator:ops(e.target.value)[0].value}}))}
            className="bg-white border border-gray-300 text-gray-700 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-200">
            {CONDITION_FIELDS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
          <select value={rule.condition.operator}
            onChange={e => setRule(r=>({...r,condition:{...r.condition,operator:e.target.value}}))}
            className="bg-white border border-gray-300 text-gray-700 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-200">
            {ops(rule.condition.field).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          {!['is_empty','is_not_empty'].includes(rule.condition.operator) && (
            <input value={rule.condition.value??''}
              onChange={e => setRule(r=>({...r,condition:{...r.condition,value:e.target.value}}))}
              placeholder="value..."
              className="bg-white border border-gray-300 text-gray-700 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-200 w-28" />
          )}
        </div>
      )}

      {/* Compound conditions */}
      {compound && (
        <div className="space-y-2 p-3.5 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-amber-700 font-semibold">IF (</span>
            {['AND','OR'].map(l => (
              <button key={l} onClick={() => setLogic(l)}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors ${
                  logic===l ? 'bg-amber-600 text-white' : 'bg-white text-gray-600 border border-gray-300'
                }`}>{l}</button>
            ))}
            <span className="text-xs text-amber-700 font-semibold">of these conditions)</span>
          </div>
          {subConds.map((sc, i) => (
            <div key={i} className="flex flex-wrap gap-2 items-center">
              <span className="text-xs text-gray-400 w-5">{i+1}.</span>
              <select value={sc.field}
                onChange={e => setSubConds(p=>p.map((c,j)=>j===i?{field:e.target.value,operator:ops(e.target.value)[0].value,value:''}:c))}
                className="bg-white border border-gray-300 text-gray-700 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-200">
                {CONDITION_FIELDS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
              <select value={sc.operator}
                onChange={e => setSubConds(p=>p.map((c,j)=>j===i?{...c,operator:e.target.value}:c))}
                className="bg-white border border-gray-300 text-gray-700 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-200">
                {ops(sc.field).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              {!['is_empty','is_not_empty'].includes(sc.operator) && (
                <input value={sc.value??''} onChange={e=>setSubConds(p=>p.map((c,j)=>j===i?{...c,value:e.target.value}:c))}
                  placeholder="value..." className="bg-white border border-gray-300 text-gray-700 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-200 w-24" />
              )}
              {subConds.length > 1 && (
                <button onClick={()=>setSubConds(p=>p.filter((_,j)=>j!==i))} className="text-gray-400 hover:text-red-500 transition-colors">
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          ))}
          <button onClick={()=>setSubConds(p=>[...p,{...BLANK_COND}])}
            className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 mt-1 font-medium transition-colors">
            <Plus size={11} />Add condition
          </button>
        </div>
      )}

      {/* Action */}
      <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg space-y-3">
        <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1.5">
          <Zap size={11} />THEN (apply these actions)
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { label:'Assign Rep', key:'assign_rep', type:'rep' },
            { label:'Add Risk Flag', key:'add_risk', type:'risk' },
            { label:'Set Pipeline Stage', key:'set_stage', type:'stage' },
          ].map(({ label, key, type }) => (
            <div key={key}>
              <label className="text-xs text-gray-500 mb-1 block font-medium">{label}</label>
              {type === 'rep' && (
                <select value={rule.action.assign_rep??''} onChange={e=>setAction('assign_rep',e.target.value)}
                  className="w-full bg-white border border-gray-300 text-gray-700 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-200">
                  <option value="">No change</option>
                  {reps.map(r => <option key={r.id} value={r.name}>{r.name}{r.region?` (${r.region})`:''}</option>)}
                </select>
              )}
              {type === 'risk' && (
                <select value={rule.action.add_risk??''} onChange={e=>setAction('add_risk',e.target.value)}
                  className="w-full bg-white border border-gray-300 text-gray-700 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-200">
                  <option value="">None</option>
                  {Object.entries(RISK_TYPES).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              )}
              {type === 'stage' && (
                <select value={rule.action.set_stage??''} onChange={e=>setAction('set_stage',e.target.value)}
                  className="w-full bg-white border border-gray-300 text-gray-700 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-200">
                  <option value="">No change</option>
                  {PIPELINE_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              )}
            </div>
          ))}
          <div>
            <label className="text-xs text-gray-500 mb-1 block font-medium">Set Health Score</label>
            <input type="number" min={0} max={100} value={rule.action.set_health_score??''}
              onChange={e=>setAction('set_health_score',e.target.value?Number(e.target.value):undefined)}
              placeholder="0-100 (optional)"
              className="w-full bg-white border border-gray-300 text-gray-700 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-200" />
          </div>
        </div>
        <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer select-none">
          <input type="checkbox" checked={!!rule.action.flag_urgent}
            onChange={e=>setAction('flag_urgent',e.target.checked||undefined)} className="accent-blue-600" />
          Flag as urgent follow-up
        </label>
      </div>

      {errors.length > 0 && (
        <div className="flex items-start gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
          <AlertCircle size={13} className="shrink-0 mt-0.5 text-red-500" />
          <ul className="space-y-0.5">{errors.map((e,i)=><li key={i}>{e}</li>)}</ul>
        </div>
      )}

      <button onClick={handleAdd}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm">
        <Plus size={14} />Add Rule to List
      </button>
    </div>
  );
}

// ─── Run Log ──────────────────────────────────────────────────────────────────
function RunLog({ log }) {
  if (!log.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Play size={13} className="text-emerald-600" />
          <span className="text-sm font-semibold text-gray-800">Routing Run Log</span>
        </div>
        <span className="text-xs text-gray-400">{log.length} record{log.length!==1?'s':''} affected</span>
      </div>
      <div className="divide-y divide-gray-100 max-h-72 overflow-y-auto">
        {log.map((entry, i) => (
          <div key={i} className="px-4 py-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-semibold text-gray-900">{entry.company}</span>
              {entry.dealName && <span className="text-xs text-gray-400">· {entry.dealName}</span>}
              <span className="ml-auto font-mono text-xs text-gray-400">{entry.callId}</span>
            </div>
            {entry.matched.map((m, j) => (
              <div key={j} className="ml-2 mb-1.5 text-xs">
                <span className="text-emerald-600 font-semibold flex items-center gap-1 mb-1">
                  <CheckCircle2 size={10} />Rule matched: "{m.ruleName}"
                </span>
                {m.error && <span className="text-red-500 ml-4">Error: {m.error}</span>}
                {m.diff.map((d, k) => (
                  <div key={k} className="ml-4 text-gray-500 flex items-center gap-1">
                    <ArrowRight size={9} className="text-gray-400 shrink-0" />
                    <span className="font-mono">{d}</span>
                  </div>
                ))}
                {!m.diff.length && !m.error && (
                  <span className="ml-4 text-gray-400 italic">Condition matched — no field changes needed</span>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function RoutingRules({ calls, reps, onApplyRules }) {
  const [rules, setRules]       = useState([]);
  const [tab, setTab]           = useState('paste');
  const [format, setFormat]     = useState('json');
  const [configText, setConfig] = useState('');
  const [parseError, setPError] = useState('');
  const [runLog, setRunLog]     = useState([]);
  const [running, setRunning]   = useState(false);
  const fileRef = useRef(null);

  function loadTemplate(fmt) {
    setFormat(fmt); setConfig(fmt==='yaml'?TEMPLATE_YAML:TEMPLATE_JSON); setTab('paste'); setPError('');
  }

  function parseConfig() {
    setPError('');
    try {
      const parsed = format==='yaml' ? parseYAML(configText) : JSON.parse(configText);
      setRules(extractRules(parsed));
    } catch(e) { setPError(e.message); }
  }

  async function handleFile(file) {
    if (!file) return;
    setPError('');
    const text = await file.text();
    const isYAML = file.name.endsWith('.yaml') || file.name.endsWith('.yml');
    setFormat(isYAML?'yaml':'json'); setConfig(text); setTab('paste');
    try {
      const parsed = isYAML ? parseYAML(text) : JSON.parse(text);
      setRules(extractRules(parsed));
    } catch(e) { setPError(e.message); }
  }

  function toggleRule(id) { setRules(r=>r.map(rule=>rule.id===id?{...rule,enabled:rule.enabled===false}:rule)); }
  function deleteRule(id) { setRules(r=>r.filter(rule=>rule.id!==id)); }
  function addRule(rule)  { setRules(r=>[...r,rule]); }

  function handleRun() {
    if (!calls.length) return;
    setRunning(true); setRunLog([]);
    setTimeout(() => {
      const { updatedCalls, log } = runRules(rules, calls, reps);
      onApplyRules(updatedCalls); setRunLog(log); setRunning(false);
    }, 300);
  }

  function exportRules() {
    const content = JSON.stringify({ version:'1.0', rules }, null, 2);
    const blob = new Blob([content],{type:'application/json'});
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href=url; a.download='routing_rules.json'; a.click();
    URL.revokeObjectURL(url);
  }

  const enabledCount = rules.filter(r=>r.enabled!==false).length;

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Custom Routing Rule Engine</h2>
          <p className="text-sm text-gray-500 mt-1">
            Define rules in JSON or YAML. Conditions evaluate call fields, transcripts, and deal metadata to auto-route and flag records.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={()=>loadTemplate('json')}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-medium rounded-lg transition-colors shadow-sm">
            <Code2 size={12} />Load JSON Template
          </button>
          <button onClick={()=>loadTemplate('yaml')}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-medium rounded-lg transition-colors shadow-sm">
            <Code2 size={12} />Load YAML Template
          </button>
          {rules.length > 0 && (
            <button onClick={exportRules}
              className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-medium rounded-lg transition-colors shadow-sm">
              <Download size={12} />Export Rules
            </button>
          )}
        </div>
      </div>

      {/* Example patterns */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { cond:'Deal Size > $100K', action:'Assign Senior AE', color:'blue' },
          { cond:'Transcript contains "HIPAA"', action:'Assign Solutions Engineer', color:'amber' },
          { cond:'Region = "APAC"', action:'Assign Regional Lead', color:'emerald' },
        ].map(({ cond, action, color }) => {
          const s = {
            blue:    'border-blue-200    bg-blue-50    text-blue-700',
            amber:   'border-amber-200   bg-amber-50   text-amber-700',
            emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
          }[color];
          return (
            <div key={cond} className={`border rounded-xl p-3.5 shadow-sm ${s}`}>
              <p className="text-xs font-medium mb-0.5">IF {cond}</p>
              <p className="text-xs">THEN {action}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* LEFT — Config Input */}
        <div className="space-y-4">
          {/* Tabs */}
          <div className="flex border-b border-gray-200">
            {[
              { id:'paste',   label:'Paste Config',   Icon:Code2  },
              { id:'upload',  label:'Upload File',    Icon:Upload },
              { id:'builder', label:'Visual Builder', Icon:Wand2  },
            ].map(({id,label,Icon}) => (
              <button key={id} onClick={()=>setTab(id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 -mb-px transition-colors ${
                  tab===id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}>
                <Icon size={12} strokeWidth={1.8} />{label}
              </button>
            ))}
          </div>

          {/* Paste */}
          {tab==='paste' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 font-medium">Format:</span>
                {['json','yaml'].map(f => (
                  <button key={f} onClick={()=>setFormat(f)}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg uppercase transition-colors ${
                      format===f ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
                    }`}>{f}</button>
                ))}
              </div>
              <textarea value={configText} onChange={e=>{setConfig(e.target.value);setPError('');}}
                placeholder={format==='yaml'
                  ? 'version: "1.0"\nrules:\n  - id: rule-001\n    name: My Rule\n    ...'
                  : '{\n  "version": "1.0",\n  "rules": [...]\n}'}
                rows={16} spellCheck={false}
                className="w-full bg-gray-50 border border-gray-300 focus:border-blue-500 text-gray-700 text-xs rounded-xl px-4 py-3 font-mono focus:outline-none focus:ring-2 focus:ring-blue-200 resize-y" />
              {parseError && (
                <div className="flex items-start gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
                  <AlertCircle size={13} className="text-red-500 shrink-0 mt-0.5" />{parseError}
                </div>
              )}
              <button onClick={parseConfig} disabled={!configText.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm">
                <GitMerge size={14} />Parse and Load Rules
              </button>
            </div>
          )}

          {/* Upload */}
          {tab==='upload' && (
            <div onClick={()=>fileRef.current?.click()} onDragOver={e=>e.preventDefault()}
              onDrop={e=>{e.preventDefault();handleFile(e.dataTransfer.files[0]);}}
              className="border-2 border-dashed border-gray-300 hover:border-blue-400 rounded-xl p-12 text-center cursor-pointer transition-colors bg-white">
              <input ref={fileRef} type="file" accept=".json,.yaml,.yml" className="hidden"
                onChange={e=>handleFile(e.target.files[0])} />
              <Upload size={28} className="mx-auto text-gray-400 mb-3" strokeWidth={1.5} />
              <p className="text-gray-700 font-semibold text-sm mb-1">Drop .json, .yaml, or .yml file</p>
              <p className="text-gray-400 text-xs">File is parsed automatically on drop</p>
            </div>
          )}

          {/* Builder */}
          {tab==='builder' && <VisualBuilder reps={reps} onAdd={addRule} />}

          {/* Field reference */}
          <details className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <summary className="px-4 py-3.5 text-xs font-medium text-gray-600 cursor-pointer hover:bg-gray-50 select-none border-b border-gray-100">
              Condition fields and operators reference
            </summary>
            <div className="px-4 pb-4 pt-2 overflow-x-auto">
              <table className="w-full text-xs mt-1">
                <thead>
                  <tr className="text-gray-400 border-b border-gray-100">
                    <th className="text-left py-1 pr-3 font-medium">Field</th>
                    <th className="text-left py-1 pr-3 font-medium">Type</th>
                    <th className="text-left py-1 font-medium">Valid Operators</th>
                  </tr>
                </thead>
                <tbody>
                  {CONDITION_FIELDS.map(f => (
                    <tr key={f.value} className="border-b border-gray-50">
                      <td className="py-1.5 pr-3 font-mono text-blue-600">{f.value}</td>
                      <td className="py-1.5 pr-3 text-gray-400">{f.type}</td>
                      <td className="py-1.5 text-gray-400 text-xs">{(OPERATORS_BY_TYPE[f.type]??[]).map(o=>o.value).join(', ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </div>

        {/* RIGHT — Active rules + run */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
              <Zap size={14} className="text-amber-600" strokeWidth={1.8} />
              Active Rules
              {rules.length > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold">
                  {enabledCount}/{rules.length} enabled
                </span>
              )}
            </h3>
            {rules.length > 0 && (
              <button onClick={()=>{setRules([]);setRunLog([]);}} className="text-xs text-gray-400 hover:text-red-500 transition-colors">
                Clear all
              </button>
            )}
          </div>

          {/* Rule cards */}
          {rules.length === 0 ? (
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-12 text-center bg-white">
              <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
                <InboxIcon size={20} className="text-gray-400" strokeWidth={1.5} />
              </div>
              <p className="text-gray-500 text-sm font-medium">No rules loaded</p>
              <p className="text-gray-400 text-xs mt-1">Paste a config, upload a file, or use the Visual Builder</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[440px] overflow-y-auto pr-1">
              {[...rules].sort((a,b)=>(a.priority??99)-(b.priority??99)).map((rule,i)=>(
                <RuleCard key={rule.id??i} rule={rule} index={i} onToggle={toggleRule} onDelete={deleteRule} />
              ))}
            </div>
          )}

          {/* Run */}
          <div className={`rounded-xl p-4 border shadow-sm ${!calls.length?'border-gray-200 bg-gray-50':'border-blue-200 bg-blue-50'}`}>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="text-sm font-semibold text-gray-800">Run Rules Against Records</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {calls.length
                    ? `Evaluates ${enabledCount} enabled rule${enabledCount!==1?'s':''} against ${calls.length} loaded record${calls.length!==1?'s':''}`
                    : 'Import call records first to run rules against them'}
                </p>
              </div>
              <button onClick={handleRun} disabled={!calls.length||!enabledCount||running}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors shadow-sm">
                {running
                  ? <><RefreshCw size={14} className="animate-spin" />Running...</>
                  : <><Play size={14} />Run Rules</>}
              </button>
            </div>
            {runLog.length > 0 && !running && (
              <p className="text-xs text-emerald-600 font-medium mt-2 flex items-center gap-1">
                <CheckCircle2 size={12} />
                {runLog.length} record{runLog.length!==1?'s':''} updated — changes reflected in Inbox and Dashboard
              </p>
            )}
          </div>

          <RunLog log={runLog} />
        </div>
      </div>
    </div>
  );
}
