import { useState } from 'react';
import Dashboard from './components/Dashboard.jsx';
import Inbox from './components/Inbox.jsx';
import ImportEngine from './components/ImportEngine.jsx';
import ExportPanel from './components/ExportPanel.jsx';
import RoutingRules from './components/RoutingRules.jsx';
import Analytics from './components/Analytics.jsx';
import ActionBoard from './components/ActionBoard.jsx';
import {
  BarChart2, Inbox as InboxIcon, Upload, Download,
  GitBranch, Layers, TrendingUp, LayoutGrid,
} from 'lucide-react';
import { DEFAULT_REPS } from './data/mockData.js';

const TABS = [
  { id: 'dashboard', label: 'Dashboard',    Icon: BarChart2   },
  { id: 'inbox',     label: 'Inbox',        Icon: InboxIcon   },
  { id: 'analytics', label: 'Analytics',    Icon: TrendingUp  },
  { id: 'board',     label: 'Action Board', Icon: LayoutGrid  },
  { id: 'import',    label: 'Import',       Icon: Upload      },
  { id: 'routing',   label: 'Routing',      Icon: GitBranch   },
  { id: 'export',    label: 'Export',       Icon: Download    },
];

export default function App() {
  const [activeTab, setActiveTab]         = useState('import');
  const [calls, setCalls]                 = useState([]);
  const [reps, setReps]                   = useState(DEFAULT_REPS);
  const [notes, setNotes]                 = useState({});         // { callId: [{text, ts}] }
  const [activityLogs, setActivityLogs]   = useState({});         // { callId: [{action, detail, ts}] }
  const [boardItems, setBoardItems]       = useState([]);         // cross-deal action items
  const [watchlist, setWatchlist]         = useState(new Set());  // starred call ids

  // ── Activity log helper ──────────────────────────────────────────────────────
  function logActivity(callId, action, detail) {
    const entry = { action, detail, ts: new Date().toISOString() };
    setActivityLogs(prev => ({
      ...prev,
      [callId]: [entry, ...(prev[callId] ?? [])].slice(0, 50),
    }));
  }

  // ── Import handler ───────────────────────────────────────────────────────────
  function handleImport(newRecords, extraReps = []) {
    setCalls(prev => {
      const map = new Map(prev.map(c => [c.id, c]));
      newRecords.forEach(r => map.set(r.id, r));
      return Array.from(map.values());
    });
    if (extraReps.length) {
      setReps(prev => {
        const map = new Map(prev.map(r => [r.id, r]));
        extraReps.forEach(r => map.set(r.id, r));
        return Array.from(map.values());
      });
    }

    // Extract action items into board
    newRecords.forEach(record => {
      if (record.actionItems?.length) {
        const priority =
          (record.healthScore ?? 100) < 40 ? 'high'
          : (record.healthScore ?? 100) < 70 ? 'medium'
          : 'low';
        record.actionItems.forEach(text => {
          const item = {
            id: `action-${record.id}-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
            text,
            company: record.company,
            dealName: record.dealName,
            repId: record.assignedRep,
            priority,
            status: 'open',
            date: record.date ?? record.timestamp?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
            sourceCallId: record.id,
          };
          setBoardItems(prev => {
            // dedup by text+company
            const exists = prev.some(b => b.text === text && b.company === record.company);
            return exists ? prev : [...prev, item];
          });
        });
      }
    });
  }

  function handleApplyRules(updatedCalls) {
    setCalls(updatedCalls);
  }

  function handleDelete(ids) {
    setCalls(prev => prev.filter(c => !ids.includes(c.id)));
  }

  function handleRepChange(callId, repId) {
    setCalls(prev => prev.map(c => c.id === callId ? { ...c, assignedRep: repId } : c));
    const rep = reps.find(r => r.id === repId);
    logActivity(callId, 'Rep Reassigned', rep ? `Assigned to ${rep.name}` : 'Unassigned');
  }

  function handleHealthChange(callId, score) {
    setCalls(prev => prev.map(c => c.id === callId ? { ...c, healthScore: Number(score) } : c));
    logActivity(callId, 'Health Score Updated', `Score set to ${score}`);
  }

  function handleAddNote(callId, text) {
    const entry = { text, ts: new Date().toISOString() };
    setNotes(prev => ({
      ...prev,
      [callId]: [...(prev[callId] ?? []), entry],
    }));
    logActivity(callId, 'Note Added', text.length > 60 ? text.slice(0, 60) + '…' : text);
  }

  function handleToggleWatchlist(callId) {
    setWatchlist(prev => {
      const next = new Set(prev);
      if (next.has(callId)) next.delete(callId);
      else next.add(callId);
      return next;
    });
  }

  // ── Board callbacks ──────────────────────────────────────────────────────────
  function handleUpdateBoardItem(id, patch) {
    setBoardItems(prev => prev.map(item => item.id === id ? { ...item, ...patch } : item));
  }

  function handleAddBoardItem(item) {
    setBoardItems(prev => [...prev, item]);
  }

  const flaggedCount  = calls.filter(c => c.risks?.length > 0).length;
  const watchlistCount = watchlist.size;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* ── Header ── */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md bg-blue-600 flex items-center justify-center">
              <Layers size={16} className="text-white" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-semibold text-gray-900 text-sm tracking-tight">Revenue Intelligence</span>
              <span className="text-blue-600 font-semibold text-sm tracking-tight">Inbox</span>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 ml-1 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-emerald-700 text-xs font-medium">Live</span>
            </div>
          </div>

          {/* Right meta */}
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span className="hidden md:block">
              {calls.length > 0
                ? <><span className="font-semibold text-gray-900">{calls.length}</span> records loaded</>
                : 'No data — import to begin'}
            </span>
            {watchlistCount > 0 && (
              <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700">
                <span className="font-semibold">{watchlistCount}</span> watching
              </span>
            )}
            <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-xs font-semibold text-white">
              SM
            </div>
          </div>
        </div>

        {/* ── Tab Navigation ── */}
        <nav className="max-w-screen-2xl mx-auto px-4 sm:px-6 flex overflow-x-auto">
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Icon size={14} />
              {label}
              {id === 'inbox' && flaggedCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-red-500 text-white text-xs font-semibold leading-none">
                  {flaggedCount}
                </span>
              )}
              {id === 'board' && boardItems.filter(b => b.status !== 'done').length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold leading-none">
                  {boardItems.filter(b => b.status !== 'done').length}
                </span>
              )}
            </button>
          ))}
        </nav>
      </header>

      {/* ── Page Content ── */}
      <main className="flex-1 max-w-screen-2xl mx-auto w-full px-4 sm:px-6 py-6">
        {activeTab === 'dashboard' && (
          <Dashboard calls={calls} reps={reps} onNavigate={setActiveTab} watchlist={watchlist} />
        )}
        {activeTab === 'inbox' && (
          <Inbox
            calls={calls} reps={reps}
            onRepChange={handleRepChange}
            onHealthChange={handleHealthChange}
            onDelete={handleDelete}
            onNavigate={setActiveTab}
            notes={notes}
            onAddNote={handleAddNote}
            activityLogs={activityLogs}
            watchlist={watchlist}
            onToggleWatchlist={handleToggleWatchlist}
          />
        )}
        {activeTab === 'analytics' && <Analytics calls={calls} reps={reps} />}
        {activeTab === 'board' && (
          <ActionBoard
            boardItems={boardItems}
            reps={reps}
            onUpdateItem={handleUpdateBoardItem}
            onAddItem={handleAddBoardItem}
          />
        )}
        {activeTab === 'import'  && <ImportEngine existingCalls={calls} reps={reps} onImport={handleImport} />}
        {activeTab === 'routing' && <RoutingRules calls={calls} reps={reps} onApplyRules={handleApplyRules} />}
        {activeTab === 'export'  && <ExportPanel calls={calls} reps={reps} />}
      </main>

      <footer className="border-t border-gray-200 bg-white py-3 px-6 text-center text-xs text-gray-400">
        Revenue Intelligence Inbox &middot; B2B Sales Manager Platform &middot; {new Date().getFullYear()}
      </footer>
    </div>
  );
}
