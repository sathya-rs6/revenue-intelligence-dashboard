import { useState, useRef, useCallback } from 'react';
import { RISK_TYPES, CSV_TEMPLATE_HEADERS, CSV_TEMPLATE_EXAMPLE } from '../data/mockData.js';
import {
  Upload, AlertCircle, CheckCircle2, GitMerge, Eye, EyeOff,
  FileText, FileJson, X, RefreshCw, Download,
} from 'lucide-react';

// ─── CSV Parser ───────────────────────────────────────────────────────────────
function parseCSVLine(line) {
  const result = []; let current = ''; let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) { result.push(current.trim()); current = ''; }
    else current += ch;
  }
  result.push(current.trim());
  return result;
}

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) throw new Error('CSV must have a header row and at least one data row.');
  const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().replace(/[\s-]/g, '_').replace(/^"|"$/g,''));
  return lines.slice(1).filter(l => l.trim()).map(line => {
    const values = parseCSVLine(line);
    return headers.reduce((obj, h, i) => { obj[h] = (values[i] ?? '').replace(/^"|"$/g,''); return obj; }, {});
  });
}

function parseJSON(text) {
  const data = JSON.parse(text);
  if (!Array.isArray(data)) throw new Error('JSON must be an array of objects.');
  return data;
}

// ─── Row → Call record ────────────────────────────────────────────────────────
function rowToCall(raw) {
  const get = (...keys) => {
    for (const k of keys) {
      const v = raw[k] ?? raw[k.replace(/_/g,'')] ?? raw[k.replace(/_/g,' ')];
      if (v != null && String(v).trim() !== '') return String(v).trim();
    }
    return '';
  };
  const getNum = (...keys) => {
    for (const k of keys) {
      const v = raw[k];
      if (v != null && v !== '') { const n = parseInt(String(v).replace(/[^0-9.-]/g,''),10); if (!isNaN(n)) return n; }
    }
    return 0;
  };
  const parseSemi = (...keys) => { const v = get(...keys); return v ? v.split(';').map(s=>s.trim()).filter(Boolean) : []; };
  const parsePipe = (...keys) => { const v = get(...keys); return v ? v.split('|').map(s=>s.trim()).filter(Boolean) : []; };

  const id = get('call_id','id','callid') || `call-${Date.now()}-${Math.random().toString(36).slice(2,6)}`;
  const timestamp = get('timestamp','date','call_date','meeting_date');

  return {
    id,
    dealName:     get('deal_name','dealname','deal'),
    company:      get('account_name','accountname','account','company','company_name'),
    contact:      get('contact','contact_name'),
    prospectRole: get('prospect_role','prospectrole','role','contact_role'),
    timestamp,
    date:         timestamp ? timestamp.split(' ')[0] : '',
    type:         get('type','call_type','meeting_type'),
    duration:     get('duration','call_duration'),
    dealSize:     getNum('deal_size_usd','deal_size','dealsize','amount','value'),
    stage:        get('stage','deal_stage','pipeline_stage'),
    healthScore:  getNum('health_score','healthscore','score'),
    assignedRep:  get('rep_assigned','assigned_rep','rep','sales_rep'),
    risks:        parseSemi('risks','risk_flags','riskflags'),
    participants: parseSemi('participants'),
    aiSummary:    get('ai_summary','summary','notes'),
    actionItems:  parsePipe('action_items','actions','next_steps'),
    rawTranscript:get('raw_transcript','rawtranscript','transcript'),
    transcript:   get('raw_transcript','rawtranscript','transcript'),
    healthBreakdown: {
      engagement:          getNum('engagement'),
      decisionMaker:       getNum('decision_maker','decisionmaker'),
      timeline:            getNum('timeline'),
      budget:              getNum('budget'),
      competitivePosition: getNum('competitive_position','competitive'),
    },
    _importedAt: new Date().toISOString(),
  };
}

// ─── Diff ─────────────────────────────────────────────────────────────────────
function diffRecords(existing, incoming) {
  return ['company','contact','dealSize','stage','healthScore','assignedRep','risks'].map(f => {
    const ov = f === 'risks' ? (existing[f]||[]).join(';') : existing[f];
    const nv = f === 'risks' ? (incoming[f]||[]).join(';') : incoming[f];
    return { field: f, old: ov, updated: nv, changed: String(ov) !== String(nv) };
  });
}

// ─── Diff Row ─────────────────────────────────────────────────────────────────
function DiffRow({ field, old: oldVal, updated, changed }) {
  const labels = { dealSize:'Deal Size (USD)', healthScore:'Health Score', assignedRep:'Assigned Rep' };
  const label  = labels[field] ?? field.replace(/([A-Z])/g,' $1').replace(/^./,s=>s.toUpperCase());
  if (!changed) {
    return (
      <tr className="border-b border-gray-100">
        <td className="py-2 px-3 text-xs text-gray-400 w-32">{label}</td>
        <td className="py-2 px-3 text-xs text-gray-500 font-mono">{String(oldVal||'—')}</td>
        <td className="py-2 px-3 text-xs text-gray-500 font-mono">{String(updated||'—')}</td>
        <td className="py-2 px-3"><span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">unchanged</span></td>
      </tr>
    );
  }
  return (
    <tr className="border-b border-gray-100 bg-amber-50">
      <td className="py-2 px-3 text-xs text-amber-700 font-semibold w-32">{label}</td>
      <td className="py-2 px-3 text-xs text-red-600 line-through font-mono">{String(oldVal||'—')}</td>
      <td className="py-2 px-3 text-xs text-emerald-700 font-semibold font-mono">{String(updated||'—')}</td>
      <td className="py-2 px-3"><span className="text-xs text-amber-700 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded">modified</span></td>
    </tr>
  );
}

// ─── Conflict Card ────────────────────────────────────────────────────────────
function ConflictCard({ conflict, merged, onMerge, onDismiss }) {
  const [expanded, setExpanded] = useState(true);
  const { existing, incoming, diff } = conflict;
  const changedCount = diff.filter(d => d.changed).length;

  return (
    <div className={`border rounded-xl overflow-hidden ${merged ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${merged ? 'bg-emerald-100' : 'bg-amber-100'}`}>
            {merged
              ? <CheckCircle2 size={16} className="text-emerald-600" />
              : <GitMerge size={16} className="text-amber-600" />}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">{existing.company || incoming.id}</p>
            <p className="text-xs text-gray-500">
              ID: <span className="font-mono text-blue-600">{incoming.id}</span>
              {' · '}{changedCount} field{changedCount !== 1?'s':''} changed
              {merged && <span className="text-emerald-600 ml-2 font-medium">· Merged {new Date().toLocaleTimeString()}</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setExpanded(e=>!e)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-white transition-colors">
            {expanded ? <EyeOff size={13} /> : <Eye size={13} />}
          </button>
          {!merged && (
            <button onClick={() => onDismiss(incoming.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-white transition-colors">
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4">
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 text-xs text-gray-500 border-b border-gray-200">
                  <th className="text-left px-3 py-2 font-medium w-32">Field</th>
                  <th className="text-left px-3 py-2 font-medium">Current Value</th>
                  <th className="text-left px-3 py-2 font-medium">Incoming Value</th>
                  <th className="text-left px-3 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {diff.map(d => <DiffRow key={d.field} {...d} />)}
              </tbody>
            </table>
          </div>
          {!merged && (
            <button onClick={() => onMerge(incoming.id)}
              className="mt-3 flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm">
              <GitMerge size={14} />Accept and Merge
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main ImportEngine ────────────────────────────────────────────────────────
export default function ImportEngine({ existingCalls, reps, onImport }) {
  const [phase, setPhase]         = useState('idle');
  const [error, setError]         = useState('');
  const [dragOver, setDragOver]   = useState(false);
  const [newRecords, setNewRecords] = useState([]);
  const [conflicts, setConflicts]  = useState([]);
  const [mergedIds, setMergedIds]  = useState([]);
  const [dismissedIds, setDismissed] = useState([]);
  const [fileName, setFileName]    = useState('');
  const fileRef = useRef(null);

  const existingMap = new Map(existingCalls.map(c => [c.id, c]));

  function processRawRows(rows) {
    const newR = [], confls = [];
    rows.forEach(raw => {
      const record = rowToCall(raw);
      if (!record.company && !record.id.startsWith('call-')) return;
      const existing = existingMap.get(record.id);
      if (existing) {
        const diff = diffRecords(existing, record);
        if (diff.some(d => d.changed)) confls.push({ existing, incoming: record, diff });
        else newR.push(record);
      } else {
        newR.push(record);
      }
    });
    return { newR, confls };
  }

  async function handleFile(file) {
    if (!file) return;
    setError(''); setPhase('parsing'); setFileName(file.name);
    setMergedIds([]); setDismissed([]);
    try {
      const text = await file.text();
      const rows = file.name.endsWith('.json') ? parseJSON(text) : parseCSV(text);
      if (!rows.length) throw new Error('No data rows found in file.');
      const { newR, confls } = processRawRows(rows);
      setNewRecords(newR); setConflicts(confls);
      if (newR.length) onImport(newR);
      setPhase('review');
    } catch (e) {
      setError(e.message || 'Failed to parse file.');
      setPhase('idle');
    }
  }

  function handleMerge(id) {
    const conflict = conflicts.find(c => c.incoming.id === id);
    if (conflict) { onImport([conflict.incoming]); setMergedIds(prev => [...prev, id]); }
  }

  function handleMergeAll() {
    const toMerge = conflicts.filter(c => !mergedIds.includes(c.incoming.id) && !dismissedIds.includes(c.incoming.id));
    onImport(toMerge.map(c => c.incoming));
    setMergedIds(prev => [...prev, ...toMerge.map(c => c.incoming.id)]);
  }

  function reset() {
    setPhase('idle'); setError(''); setNewRecords([]); setConflicts([]);
    setMergedIds([]); setDismissed([]); setFileName('');
  }

  function downloadTemplate() {
    const blob = new Blob([CSV_TEMPLATE_EXAMPLE], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'call_records_template.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  const visibleConflicts  = conflicts.filter(c => !dismissedIds.includes(c.incoming.id));
  const unresolvedCount   = visibleConflicts.filter(c => !mergedIds.includes(c.incoming.id)).length;

  return (
    <div className="space-y-6">

      {/* Page header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Import &amp; Conflict Resolution</h2>
          <p className="text-sm text-gray-500 mt-1">
            Upload CSV or JSON call records. Duplicate Call IDs trigger a visual diff review before merging.
          </p>
        </div>
        <button onClick={downloadTemplate}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg transition-colors shadow-sm">
          <Download size={14} className="text-gray-500" />Download CSV Template
        </button>
      </div>

      {/* Field Reference */}
      <details className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <summary className="px-5 py-3.5 text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-50 select-none border-b border-gray-100">
          Supported field reference — CSV / JSON schema
        </summary>
        <div className="px-5 pb-5 pt-3 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-500 border-b border-gray-100">
                <th className="text-left py-1.5 pr-4 font-medium">Field</th>
                <th className="text-left py-1.5 pr-4 font-medium">Type</th>
                <th className="text-left py-1.5 font-medium">Description</th>
              </tr>
            </thead>
            <tbody className="text-gray-600">
              {[
                ['call_id',              'string',  'Unique identifier. Duplicates trigger conflict resolution.'],
                ['deal_name',            'string',  'Deal name, e.g. "Acme Corp — Enterprise License"'],
                ['account_name',         'string',  'Company / account name'],
                ['timestamp',            'string',  'Date and time: "2026-10-22 14:30:00"'],
                ['duration',             'string',  'e.g. "42 min"'],
                ['rep_assigned',         'string',  'Sales rep name (matched against rep list)'],
                ['prospect_role',        'string',  'e.g. "VP of Engineering", "CFO"'],
                ['deal_size_usd',        'number',  'Deal value in USD'],
                ['stage',               'string',  'Pipeline stage (Prospecting, Qualification, Evaluation, Proposal, Negotiation, Closing)'],
                ['health_score',         'number',  '0-100 overall deal health score'],
                ['risks',               'string',  'Semicolon-separated flags: BUDGET_BLOCKER;NO_NEXT_STEP;COMPETITOR_THREAT;CHAMPION_LEFT;STALLED'],
                ['participants',         'string',  'Semicolon-separated attendees'],
                ['raw_transcript',       'string',  'Full conversation text (pipe-separate speaker turns if needed)'],
                ['ai_summary',           'string',  'Summary of the call'],
                ['action_items',         'string',  'Pipe-separated action items: "Send proposal|Book follow-up"'],
                ['engagement',           'number',  '0-100 sub-score'],
                ['decision_maker',       'number',  '0-100 sub-score'],
                ['timeline',            'number',  '0-100 sub-score'],
                ['budget',              'number',  '0-100 sub-score'],
                ['competitive_position', 'number',  '0-100 sub-score'],
              ].map(([f, t, d]) => (
                <tr key={f} className="border-b border-gray-50">
                  <td className="py-1.5 pr-4 font-mono text-blue-600">{f}</td>
                  <td className="py-1.5 pr-4 text-gray-400">{t}</td>
                  <td className="py-1.5 text-gray-500">{d}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      {/* Drop Zone */}
      {phase === 'idle' && (
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
          onClick={() => fileRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-14 text-center cursor-pointer transition-colors ${
            dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50 bg-white'
          }`}
        >
          <input ref={fileRef} type="file" className="hidden" accept=".csv,.json" onChange={e => handleFile(e.target.files[0])} />
          <Upload size={32} className={`mx-auto mb-3 ${dragOver ? 'text-blue-500' : 'text-gray-400'}`} strokeWidth={1.5} />
          <p className="text-gray-700 font-semibold mb-1">Drop a CSV or JSON file here</p>
          <p className="text-gray-400 text-sm mb-4">or click to browse your file system</p>
          <div className="flex gap-2 justify-center text-xs text-gray-400">
            <span className="flex items-center gap-1 px-2.5 py-1 bg-gray-100 rounded-md border border-gray-200">
              <FileText size={11} /> .csv
            </span>
            <span className="flex items-center gap-1 px-2.5 py-1 bg-gray-100 rounded-md border border-gray-200">
              <FileJson size={11} /> .json
            </span>
          </div>
        </div>
      )}

      {/* Parsing */}
      {phase === 'parsing' && (
        <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-xl p-4 shadow-sm">
          <RefreshCw size={16} className="text-blue-600 animate-spin" />
          <p className="text-sm text-blue-700 font-medium">Parsing {fileName} and scanning for duplicate records...</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4 shadow-sm">
          <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-red-700 font-semibold">Parse Error</p>
            <p className="text-xs text-red-600 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Review Phase */}
      {phase === 'review' && (
        <div className="space-y-5">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl shadow-sm">
              <CheckCircle2 size={15} className="text-emerald-600" />
              <span className="text-sm text-emerald-700 font-medium">
                <strong>{newRecords.length}</strong> new record{newRecords.length !== 1?'s':''} imported
              </span>
            </div>
            {conflicts.length > 0 && (
              <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-xl shadow-sm">
                <AlertCircle size={15} className="text-amber-600" />
                <span className="text-sm text-amber-700 font-medium">
                  <strong>{conflicts.length}</strong> conflict{conflicts.length !== 1?'s':''} detected
                  {unresolvedCount > 0 && ` · ${unresolvedCount} unresolved`}
                </span>
              </div>
            )}
            <button onClick={reset}
              className="ml-auto flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 text-sm font-medium rounded-xl transition-colors shadow-sm">
              <Upload size={13} />Import Another File
            </button>
          </div>

          {/* Conflict Log */}
          {visibleConflicts.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                  <GitMerge size={16} className="text-amber-600" />
                  Conflict / Diff Log
                  <span className="ml-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200 text-xs font-semibold">
                    {visibleConflicts.length}
                  </span>
                </h3>
                {unresolvedCount > 1 && (
                  <button onClick={handleMergeAll}
                    className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm">
                    <CheckCircle2 size={12} />Merge All ({unresolvedCount})
                  </button>
                )}
              </div>
              {visibleConflicts.map(c => (
                <ConflictCard key={c.incoming.id} conflict={c}
                  merged={mergedIds.includes(c.incoming.id)}
                  onMerge={handleMerge} onDismiss={id => setDismissed(p=>[...p,id])} />
              ))}
              {unresolvedCount === 0 && (
                <div className="flex items-center gap-2 text-emerald-700 text-sm font-semibold px-1">
                  <CheckCircle2 size={15} className="text-emerald-600" />All conflicts resolved.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* How-it-works info (idle) */}
      {phase === 'idle' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { title: 'Duplicate Detection',  desc: 'Incoming records are matched by Call ID against existing data. Identical IDs with changed fields trigger conflict review.' },
            { title: 'Field-Level Diff',     desc: 'Every field is compared independently. Only changed fields are highlighted, making it easy to see exactly what changed.' },
            { title: 'Selective Merge',      desc: 'Accept individual conflicts with one click, or merge all at once. Dismissed conflicts are skipped without modifying existing data.' },
          ].map(item => (
            <div key={item.title} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <h4 className="text-sm font-semibold text-gray-800 mb-1.5">{item.title}</h4>
              <p className="text-xs text-gray-500 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
