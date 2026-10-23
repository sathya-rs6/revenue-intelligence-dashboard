import { useState } from 'react';
import { RISK_TYPES } from '../data/mockData.js';
import {
  User, Clock, Phone, ChevronRight, AlertTriangle, CheckCircle2,
  UserCheck, Activity, MessageSquare, ListChecks, Trash2,
  InboxIcon, Edit2, Save, X, Star, StickyNote, History, Send,
} from 'lucide-react';

// ─── Risk Badge ───────────────────────────────────────────────────────────────
function RiskBadge({ type }) {
  const info = RISK_TYPES[type] ?? { label: type.replace(/_/g,' '), color: 'gray' };
  const styles = {
    rose:   'bg-red-50    text-red-700    border-red-200',
    amber:  'bg-amber-50  text-amber-700  border-amber-200',
    slate:  'bg-gray-100  text-gray-600   border-gray-300',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    orange: 'bg-orange-50 text-orange-700 border-orange-200',
    gray:   'bg-gray-100  text-gray-600   border-gray-300',
  };
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${styles[info.color] ?? styles.gray}`}>
      <AlertTriangle size={9} strokeWidth={2} />
      {info.label}
    </span>
  );
}

// ─── Health Bar ───────────────────────────────────────────────────────────────
function HealthBar({ score }) {
  const bar   = score >= 70 ? 'bg-emerald-500' : score >= 40 ? 'bg-amber-500' : 'bg-red-500';
  const pill  = score >= 70
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : score >= 40
    ? 'bg-amber-50   text-amber-700   border-amber-200'
    : 'bg-red-50     text-red-700     border-red-200';
  const label = score >= 70 ? 'Healthy' : score >= 40 ? 'At Risk' : 'Critical';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-200 rounded-full h-2">
        <div className={`h-2 rounded-full ${bar} transition-all duration-500`} style={{ width: `${Math.min(score, 100)}%` }} />
      </div>
      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${pill}`}>{score} · {label}</span>
    </div>
  );
}

// ─── Health Dimension Breakdown ───────────────────────────────────────────────
function HealthBreakdown({ breakdown }) {
  const dims = [
    { key: 'engagement',          label: 'Engagement'     },
    { key: 'decisionMaker',       label: 'Decision-Maker' },
    { key: 'timeline',            label: 'Timeline'       },
    { key: 'budget',              label: 'Budget'         },
    { key: 'competitivePosition', label: 'Competitive'    },
  ];
  const hasDims = dims.some(d => breakdown?.[d.key] != null);
  if (!hasDims) return <p className="text-xs text-gray-400 italic">No sub-score data in this record.</p>;
  return (
    <div className="space-y-2">
      {dims.map(({ key, label }) => {
        const v = breakdown?.[key] ?? 0;
        const c = v >= 70 ? 'bg-emerald-500' : v >= 40 ? 'bg-amber-500' : 'bg-red-500';
        return (
          <div key={key} className="flex items-center gap-3 text-xs">
            <span className="text-gray-500 w-28 shrink-0">{label}</span>
            <div className="flex-1 bg-gray-200 rounded-full h-1.5">
              <div className={`h-1.5 rounded-full ${c}`} style={{ width: `${Math.min(v,100)}%` }} />
            </div>
            <span className="text-gray-700 font-medium w-6 text-right font-mono">{v}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Call List Item ───────────────────────────────────────────────────────────
function CallItem({ call, repName, selected, onClick }) {
  const h = call.healthScore ?? 0;
  const leftBar = h >= 70 ? 'border-l-emerald-500' : h >= 40 ? 'border-l-amber-500' : 'border-l-red-500';
  const scorePill = h >= 70
    ? 'bg-emerald-50  text-emerald-700 border-emerald-200'
    : h >= 40
    ? 'bg-amber-50    text-amber-700   border-amber-200'
    : 'bg-red-50      text-red-700     border-red-200';

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3.5 border-l-2 transition-colors ${leftBar} ${
        selected ? 'bg-blue-50 border-l-blue-600' : 'hover:bg-gray-50 bg-white'
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="min-w-0">
          <p className="font-semibold text-gray-900 text-sm leading-snug truncate">{call.company}</p>
          <p className="text-xs text-gray-400 mt-0.5 truncate">{call.contact?.split(',')[0]}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span className={`text-xs font-semibold px-1.5 py-0.5 rounded border ${scorePill}`}>{h}</span>
          {selected && <ChevronRight size={12} className="text-blue-500" />}
        </div>
      </div>
      {(call.risks ?? []).length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {call.risks.map(r => <RiskBadge key={r} type={r} />)}
        </div>
      )}
      <div className="flex items-center gap-3 text-xs text-gray-400">
        {call.type     && <span className="flex items-center gap-1"><Phone size={10} />{call.type}</span>}
        {call.duration && <span className="flex items-center gap-1"><Clock size={10} />{call.duration}</span>}
        {repName       && <span className="flex items-center gap-1 text-blue-500"><User size={10} />{repName.split(' ')[0]}</span>}
      </div>
    </button>
  );
}

// ─── Section Card ─────────────────────────────────────────────────────────────
function Card({ title, icon: Icon, iconClass = 'text-blue-600', children }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
        <Icon size={14} className={iconClass} strokeWidth={1.8} />
        <h4 className="text-sm font-semibold text-gray-800">{title}</h4>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

// ─── Deal Notes Panel ─────────────────────────────────────────────────────────
function NotesPanel({ callId, notes, onAddNote }) {
  const [text, setText] = useState('');
  const noteList = notes[callId] ?? [];

  function submit() {
    const trimmed = text.trim();
    if (!trimmed) return;
    onAddNote(callId, trimmed);
    setText('');
  }

  function fmt(ts) {
    try { return new Date(ts).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); }
    catch { return ts; }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
        <StickyNote size={14} className="text-amber-600" strokeWidth={1.8} />
        <h4 className="text-sm font-semibold text-gray-800">Deal Notes</h4>
        {noteList.length > 0 && (
          <span className="ml-auto text-xs text-gray-400">{noteList.length} note{noteList.length !== 1 ? 's' : ''}</span>
        )}
      </div>
      <div className="p-4 space-y-3">
        {/* Input area */}
        <div className="flex gap-2">
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit(); }}
            placeholder="Add a note... (Ctrl+Enter to save)"
            rows={2}
            className="flex-1 text-sm bg-white border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-lg px-3 py-2 text-gray-800 placeholder-gray-400 resize-none focus:outline-none"
          />
          <button
            onClick={submit}
            disabled={!text.trim()}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 self-start mt-0.5"
          >
            <Send size={11} />Save
          </button>
        </div>
        {/* Note list */}
        {noteList.length === 0 ? (
          <p className="text-xs text-gray-400 italic">No notes yet. Add one above.</p>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {[...noteList].reverse().map((n, i) => (
              <div key={i} className="p-2.5 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-xs text-gray-500 mb-1 font-medium">{fmt(n.ts)}</p>
                <p className="text-sm text-gray-700 leading-relaxed">{n.text}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Activity Timeline ────────────────────────────────────────────────────────
function ActivityTimeline({ callId, activityLogs }) {
  const entries = activityLogs[callId] ?? [];

  function fmt(ts) {
    try { return new Date(ts).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); }
    catch { return ts; }
  }

  const actionColor = {
    'Rep Reassigned':       'bg-blue-500',
    'Health Score Updated': 'bg-amber-500',
    'Note Added':           'bg-emerald-500',
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
        <History size={14} className="text-blue-600" strokeWidth={1.8} />
        <h4 className="text-sm font-semibold text-gray-800">Activity Timeline</h4>
        {entries.length > 0 && (
          <span className="ml-auto text-xs text-gray-400">{entries.length} event{entries.length !== 1 ? 's' : ''}</span>
        )}
      </div>
      <div className="p-4">
        {entries.length === 0 ? (
          <p className="text-xs text-gray-400 italic">No activity recorded yet.</p>
        ) : (
          <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
            {entries.map((e, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${actionColor[e.action] ?? 'bg-gray-400'}`} />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-gray-700">{e.action}</p>
                  <p className="text-xs text-gray-500 truncate">{e.detail}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{fmt(e.ts)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Call Detail Pane ─────────────────────────────────────────────────────────
function CallDetail({ call, reps, onRepChange, onHealthChange, onDelete, notes, onAddNote, activityLogs, isWatched, onToggleWatchlist }) {
  const [repId, setRepId]   = useState(call.assignedRep ?? '');
  const [justChanged, setJC] = useState(false);
  const [editingScore, setES] = useState(false);
  const [scoreInput, setSI]  = useState(String(call.healthScore ?? 0));

  function handleRepSelect(e) {
    const v = e.target.value;
    setRepId(v);
    onRepChange(call.id, v);
    setJC(true);
    setTimeout(() => setJC(false), 2500);
  }

  function saveScore() {
    const n = Math.min(100, Math.max(0, parseInt(scoreInput, 10) || 0));
    onHealthChange(call.id, n);
    setSI(String(n));
    setES(false);
  }

  const currentRep = reps.find(r => r.id === repId || r.name === repId);

  return (
    <div className="h-full overflow-y-auto space-y-4 pr-1">

      {/* Header card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-gray-900">{call.company}</h2>
            {call.dealName && <p className="text-sm text-blue-600 font-medium mt-0.5">{call.dealName}</p>}
            <p className="text-sm text-gray-500 mt-0.5 truncate">{call.contact}</p>
            <p className="text-xs text-gray-400 mt-1">
              {[call.type, call.date ?? call.timestamp?.split(' ')?.[0], call.duration].filter(Boolean).join(' · ')}
            </p>
          </div>
          <div className="flex items-start gap-2 flex-wrap">
            {(call.risks ?? []).map(r => <RiskBadge key={r} type={r} />)}
            <button
              onClick={() => onToggleWatchlist(call.id)}
              className={`p-1.5 rounded-lg transition-colors ${isWatched ? 'text-amber-500 bg-amber-50 hover:bg-amber-100' : 'text-gray-400 hover:text-amber-500 hover:bg-amber-50'}`}
              title={isWatched ? 'Remove from watchlist' : 'Add to watchlist'}
            >
              <Star size={14} fill={isWatched ? 'currentColor' : 'none'} />
            </button>
            <button
              onClick={() => { if (window.confirm(`Remove ${call.company} from the inbox?`)) onDelete([call.id]); }}
              className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
              title="Remove record"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {/* Deal meta row */}
        {(call.prospectRole || call.dealSize) && (
          <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap gap-4 text-xs text-gray-500">
            {call.prospectRole && <span><span className="font-medium text-gray-700">Role:</span> {call.prospectRole}</span>}
            {call.dealSize     && <span><span className="font-medium text-gray-700">Deal Size:</span> ${(call.dealSize/1000).toFixed(0)}K</span>}
            {call.stage        && <span><span className="font-medium text-gray-700">Stage:</span> {call.stage}</span>}
          </div>
        )}

        {/* Health Score */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500 font-medium">Health Score</span>
            <button onClick={() => { setES(true); setSI(String(call.healthScore ?? 0)); }}
              className="p-1 rounded text-gray-400 hover:text-blue-600 transition-colors">
              <Edit2 size={11} />
            </button>
          </div>
          {editingScore ? (
            <div className="flex items-center gap-2 mt-1">
              <input type="number" min={0} max={100} value={scoreInput}
                onChange={e => setSI(e.target.value)}
                className="w-20 bg-white border border-gray-300 focus:border-blue-500 text-gray-900 text-sm rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-200" />
              <button onClick={saveScore} className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors">
                <Save size={11} />Save
              </button>
              <button onClick={() => setES(false)} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
            </div>
          ) : (
            <HealthBar score={call.healthScore ?? 0} />
          )}
        </div>
      </div>

      {/* Health Breakdown */}
      {call.healthBreakdown && (
        <Card title="Health Score Breakdown" icon={Activity}>
          <HealthBreakdown breakdown={call.healthBreakdown} />
        </Card>
      )}

      {/* AI Summary */}
      {call.aiSummary && (
        <Card title="AI Summary" icon={MessageSquare}>
          <p className="text-sm text-gray-600 leading-relaxed">{call.aiSummary}</p>
          {(call.rawTranscript || call.transcript) && (
            <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-xs text-gray-400 font-medium mb-1.5">Transcript excerpt</p>
              <p className="text-xs text-gray-500 font-mono whitespace-pre-wrap leading-relaxed">
                {call.rawTranscript ?? call.transcript}
              </p>
            </div>
          )}
        </Card>
      )}

      {/* Raw transcript (when no summary) */}
      {!call.aiSummary && (call.rawTranscript || call.transcript) && (
        <Card title="Transcript" icon={MessageSquare}>
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-xs text-gray-500 font-mono whitespace-pre-wrap leading-relaxed">
              {call.rawTranscript ?? call.transcript}
            </p>
          </div>
        </Card>
      )}

      {/* Action Items */}
      {(call.actionItems ?? []).length > 0 && (
        <Card title="Action Items" icon={ListChecks} iconClass="text-emerald-600">
          <ul className="space-y-2">
            {call.actionItems.map((item, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-gray-600">
                <CheckCircle2 size={14} className="text-emerald-500 mt-0.5 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Participants */}
      {(call.participants ?? []).length > 0 && (
        <Card title="Participants" icon={User}>
          <div className="flex flex-wrap gap-2">
            {call.participants.map((p, i) => (
              <span key={i} className="px-2.5 py-1 bg-gray-100 border border-gray-200 rounded-lg text-xs text-gray-700">{p}</span>
            ))}
          </div>
        </Card>
      )}

      {/* Routing Control */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <UserCheck size={14} className="text-blue-600" strokeWidth={1.8} />
          <h4 className="text-sm font-semibold text-gray-800">Lead Routing</h4>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="flex-1">
            <p className="text-xs text-gray-500 mb-1.5">Assigned representative</p>
            <select value={repId} onChange={handleRepSelect}
              className="w-full bg-white border border-gray-300 focus:border-blue-500 text-gray-800 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200 cursor-pointer">
              <option value="">— Unassigned —</option>
              {reps.map(r => (
                <option key={r.id} value={r.id}>{r.name}{r.region ? ` (${r.region})` : ''}</option>
              ))}
            </select>
          </div>
          <div className="shrink-0 text-right min-w-[100px]">
            {justChanged ? (
              <div className="flex items-center gap-1.5 text-emerald-600 text-sm font-semibold">
                <CheckCircle2 size={14} />Reassigned
              </div>
            ) : currentRep ? (
              <div className="text-xs text-gray-500">
                {currentRep.quota  && <p>Quota: ${(currentRep.quota/1000).toFixed(0)}K</p>}
                {currentRep.region && <p className="mt-0.5">Region: {currentRep.region}</p>}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Deal Notes */}
      <NotesPanel callId={call.id} notes={notes} onAddNote={onAddNote} />

      {/* Activity Timeline */}
      <ActivityTimeline callId={call.id} activityLogs={activityLogs} />
    </div>
  );
}

// ─── Main Inbox ───────────────────────────────────────────────────────────────
export default function Inbox({ calls, reps, onRepChange, onHealthChange, onDelete, onNavigate, notes, onAddNote, activityLogs, watchlist, onToggleWatchlist }) {
  const [selectedId, setSelectedId] = useState(calls[0]?.id ?? null);
  const [filter, setFilter]         = useState('all');
  const [search, setSearch]         = useState('');

  const selected = calls.find(c => c.id === selectedId) ?? calls[0] ?? null;

  if (!calls.length) {
    return (
      <div className="flex flex-col items-center justify-center py-28 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-5">
          <InboxIcon size={28} className="text-gray-400" strokeWidth={1.5} />
        </div>
        <h3 className="text-lg font-semibold text-gray-700 mb-2">Inbox is empty</h3>
        <p className="text-sm text-gray-400 mb-6 max-w-sm">Import call records to begin reviewing and routing deals.</p>
        <button onClick={() => onNavigate('import')}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm">
          Go to Import
        </button>
      </div>
    );
  }

  const FILTERS = [
    { id: 'all',      label: 'All'       },
    { id: 'critical', label: 'Critical'  },
    { id: 'at-risk',  label: 'At Risk'   },
    { id: 'healthy',  label: 'Healthy'   },
    { id: 'flagged',  label: 'Flagged'   },
  ];

  const filtered = calls.filter(c => {
    const h = c.healthScore ?? 0;
    const matchFilter =
      filter === 'critical' ? h < 40 :
      filter === 'at-risk'  ? h >= 40 && h < 70 :
      filter === 'healthy'  ? h >= 70 :
      filter === 'flagged'  ? (c.risks?.length > 0) : true;
    const q = search.trim().toLowerCase();
    const matchSearch = !q || [c.company, c.contact, c.stage, c.type].some(f => f?.toLowerCase().includes(q));
    return matchFilter && matchSearch;
  });

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 9rem)' }}>

      {/* Filter bar */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search company, contact, stage..."
          className="bg-white border border-gray-300 focus:border-blue-500 text-gray-800 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200 w-56 placeholder-gray-400 shadow-sm"
        />
        <div className="h-5 w-px bg-gray-200 mx-1" />
        {FILTERS.map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              filter === f.id
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}>
            {f.label}
          </button>
        ))}
        <span className="ml-auto text-xs text-gray-400">{filtered.length} record{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Split view */}
      <div className="flex flex-1 gap-4 min-h-0">

        {/* Left list */}
        <div className="w-80 xl:w-96 shrink-0 bg-white border border-gray-200 rounded-xl shadow-sm overflow-y-auto">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 rounded-t-xl sticky top-0">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Call Records</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {filtered.map(c => {
              const rep = reps.find(r => r.id === c.assignedRep || r.name === c.assignedRep);
              return (
                <CallItem
                  key={c.id}
                  call={c}
                  repName={rep?.name}
                  selected={c.id === selected?.id}
                  onClick={() => setSelectedId(c.id)}
                />
              );
            })}
            {filtered.length === 0 && (
              <p className="text-center text-gray-400 text-sm py-10">No records match the current filter.</p>
            )}
          </div>
        </div>

        {/* Right detail */}
        <div className="flex-1 min-w-0 overflow-hidden">
          {selected
            ? <CallDetail key={selected.id} call={selected} reps={reps}
                onRepChange={onRepChange} onHealthChange={onHealthChange} onDelete={onDelete}
                notes={notes} onAddNote={onAddNote}
                activityLogs={activityLogs}
                isWatched={watchlist?.has(selected.id)}
                onToggleWatchlist={onToggleWatchlist}
              />
            : <p className="text-center text-gray-400 mt-20">Select a record to view details.</p>
          }
        </div>
      </div>
    </div>
  );
}
