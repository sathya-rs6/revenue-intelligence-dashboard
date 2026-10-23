import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { DollarSign, AlertTriangle, Cpu, Bell, TrendingUp, TrendingDown, InboxIcon } from 'lucide-react';

const fmt = (n) =>
  n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(2)}M` : `$${(n / 1000).toFixed(0)}K`;

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KPICard({ icon: Icon, label, value, sub, accent }) {
  const styles = {
    blue:    { wrap: 'border-blue-200',    icon: 'bg-blue-50    text-blue-600',    bar: 'bg-blue-600'    },
    red:     { wrap: 'border-red-200',     icon: 'bg-red-50     text-red-600',     bar: 'bg-red-500'     },
    emerald: { wrap: 'border-emerald-200', icon: 'bg-emerald-50 text-emerald-600', bar: 'bg-emerald-500' },
    amber:   { wrap: 'border-amber-200',   icon: 'bg-amber-50   text-amber-600',   bar: 'bg-amber-500'   },
  };
  const s = styles[accent];
  return (
    <div className={`bg-white rounded-xl border ${s.wrap} p-5 shadow-sm`}>
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${s.icon}`}>
          <Icon size={18} strokeWidth={1.8} />
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500 mt-1">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState({ onNavigate }) {
  return (
    <div className="flex flex-col items-center justify-center py-28 text-center">
      <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-5">
        <InboxIcon size={28} className="text-gray-400" strokeWidth={1.5} />
      </div>
      <h3 className="text-lg font-semibold text-gray-700 mb-2">No data loaded</h3>
      <p className="text-sm text-gray-400 mb-6 max-w-sm">
        Import a CSV or JSON file on the Import tab to populate your dashboard.
      </p>
      <button
        onClick={() => onNavigate('import')}
        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"
      >
        Go to Import
      </button>
    </div>
  );
}

// ─── Chart Tooltips ───────────────────────────────────────────────────────────
const PieTip = ({ active, payload }) => active && payload?.length ? (
  <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs shadow-lg">
    <p className="font-semibold text-gray-800">{payload[0].name}</p>
    <p className="text-gray-600 mt-0.5">{payload[0].value} deal{payload[0].value !== 1 ? 's' : ''}</p>
  </div>
) : null;

const BarTip = ({ active, payload, label }) => active && payload?.length ? (
  <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs shadow-lg">
    <p className="font-semibold text-gray-800">{label}</p>
    <p className="text-blue-600 mt-0.5">${(payload[0].value / 1000).toFixed(0)}K</p>
  </div>
) : null;

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionHeader({ title, subtitle }) {
  return (
    <div className="mb-4">
      <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
export default function Dashboard({ calls, reps, onNavigate, watchlist }) {
  if (!calls.length) return <EmptyState onNavigate={onNavigate} />;

  const STAGE_PROBS = {
    Prospecting: 0.10, Qualification: 0.25, Evaluation: 0.40,
    Proposal: 0.60, Negotiation: 0.80, Closing: 0.90,
  };

  const totalPipeline    = calls.reduce((a, c) => a + (c.dealSize || 0), 0);
  const weightedForecast = calls.reduce((a, c) => a + (c.dealSize || 0) * (STAGE_PROBS[c.stage] ?? 0.10), 0);
  const totalQuota       = reps.reduce((a, r) => a + (r.quota || 0), 0);
  const coverageRatio    = totalQuota > 0 ? (totalPipeline / totalQuota) : 0;
  const highRisk         = calls.filter(c => (c.healthScore ?? 0) < 40).length;
  const urgentFollowup   = calls.filter(c => c.risks?.length > 0).length;
  const avgHealth        = Math.round(calls.reduce((a, c) => a + (c.healthScore || 0), 0) / calls.length);
  const routed           = calls.filter(c => reps.some(r => r.id === c.assignedRep || r.name === c.assignedRep)).length;
  const routingAccuracy  = calls.length ? ((routed / calls.length) * 100).toFixed(1) : '0.0';
  const watchedCount     = watchlist?.size ?? 0;

  const coverageColor = coverageRatio >= 3 ? 'emerald' : coverageRatio >= 1.5 ? 'amber' : 'red';

  const healthDist = [
    { name: 'Healthy (70-100)', value: calls.filter(c => (c.healthScore ?? 0) >= 70).length,                                fill: '#059669' },
    { name: 'At Risk (40-69)',  value: calls.filter(c => { const h = c.healthScore ?? 0; return h >= 40 && h < 70; }).length, fill: '#d97706' },
    { name: 'Critical (0-39)', value: calls.filter(c => (c.healthScore ?? 0) < 40).length,                                fill: '#dc2626' },
  ].filter(d => d.value > 0);

  const STAGE_ORDER = ['Prospecting','Qualification','Evaluation','Proposal','Negotiation','Closing'];
  const stageMap = {};
  calls.forEach(c => { const s = c.stage || 'Unknown'; stageMap[s] = (stageMap[s] || 0) + (c.dealSize || 0); });
  const revenueByStage = Object.entries(stageMap)
    .sort((a, b) => {
      const ai = STAGE_ORDER.indexOf(a[0]), bi = STAGE_ORDER.indexOf(b[0]);
      return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
    })
    .map(([stage, value]) => ({ stage, value }));

  return (
    <div className="space-y-6">

      {/* KPI Cards — row 1 */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KPICard icon={DollarSign}    label="Total Revenue Pipeline"  value={fmt(totalPipeline)}        accent="blue"    sub={`${calls.length} active deals`} />
        <KPICard icon={AlertTriangle} label="High-Risk Deals"         value={highRisk}                  accent="red"     sub="Health score below 40" />
        <KPICard icon={Cpu}           label="Auto-Routing Accuracy"   value={`${routingAccuracy}%`}     accent="emerald" sub={`${routed} of ${calls.length} assigned`} />
        <KPICard icon={Bell}          label="Flagged Follow-ups"      value={urgentFollowup}            accent="amber"   sub="Records with active risk flags" />
      </div>

      {/* KPI Cards — row 2 */}
      <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
        <KPICard icon={TrendingUp}    label="Weighted Forecast"       value={fmt(weightedForecast)}     accent="blue"    sub="Probability-adjusted pipeline" />
        <KPICard
          icon={coverageRatio >= 3 ? TrendingUp : TrendingDown}
          label="Pipeline Coverage Ratio"
          value={`${coverageRatio.toFixed(1)}x`}
          accent={coverageColor}
          sub={`vs. ${fmt(totalQuota)} total quota`}
        />
        {watchedCount > 0 && (
          <KPICard icon={Bell} label="Watchlisted Deals" value={watchedCount} accent="amber" sub="Deals marked for close monitoring" />
        )}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Donut */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <SectionHeader title="Deal Health Distribution" subtitle="Across all active opportunities" />
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={healthDist} cx="50%" cy="50%" innerRadius={62} outerRadius={98} paddingAngle={2} dataKey="value">
                {healthDist.map((e, i) => <Cell key={i} fill={e.fill} stroke="white" strokeWidth={2} />)}
              </Pie>
              <Tooltip content={<PieTip />} />
              <Legend iconType="circle" iconSize={8} formatter={v => <span className="text-xs text-gray-500">{v}</span>} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center -mt-2">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">{avgHealth}</p>
              <p className="text-xs text-gray-400">Avg. Health Score</p>
            </div>
          </div>
        </div>

        {/* Bar */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <SectionHeader title="Revenue by Deal Stage" subtitle="Total pipeline value per stage" />
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={revenueByStage} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="stage" tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={v => `$${v / 1000}K`} tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} width={44} />
              <Tooltip content={<BarTip />} cursor={{ fill: 'rgba(37,99,235,0.05)' }} />
              <Bar dataKey="value" fill="#2563eb" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Pipeline Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900">Active Deals Pipeline</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500 font-medium">
                {['Company','Contact','Stage','Deal Size','Health Score','Assigned Rep','Risk Flags'].map(h => (
                  <th key={h} className="text-left px-5 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {calls.map(c => {
                const h = c.healthScore ?? 0;
                const hTxt  = h >= 70 ? 'text-emerald-700' : h >= 40 ? 'text-amber-700' : 'text-red-700';
                const hBg   = h >= 70 ? 'bg-emerald-500'   : h >= 40 ? 'bg-amber-500'   : 'bg-red-500';
                const hPill = h >= 70 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : h >= 40 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-red-50 text-red-700 border-red-200';
                const rep = reps.find(r => r.id === c.assignedRep || r.name === c.assignedRep);
                return (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-gray-900">{c.company}</td>
                    <td className="px-5 py-3.5 text-gray-500 text-xs max-w-[180px] truncate">{c.contact}</td>
                    <td className="px-5 py-3.5 text-gray-600">{c.stage || '—'}</td>
                    <td className="px-5 py-3.5 font-medium text-gray-800">{c.dealSize ? `$${(c.dealSize/1000).toFixed(0)}K` : '—'}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-gray-200 rounded-full h-1.5">
                          <div className={`h-1.5 rounded-full ${hBg}`} style={{ width: `${h}%` }} />
                        </div>
                        <span className={`text-xs font-semibold px-1.5 py-0.5 rounded border ${hPill}`}>{h}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-gray-600 text-xs">{rep?.name ?? c.assignedRep ?? '—'}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex flex-wrap gap-1">
                        {(c.risks ?? []).slice(0,2).map(r => (
                          <span key={r} className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">{r.replace(/_/g,' ')}</span>
                        ))}
                        {(c.risks ?? []).length > 2 && <span className="text-xs text-gray-400">+{c.risks.length-2}</span>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
