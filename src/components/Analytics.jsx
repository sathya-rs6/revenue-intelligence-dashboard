import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
} from 'recharts';
import {
  BarChart2,
  TrendingUp,
  Target,
  Shield,
  Users,
  Zap,
  AlertCircle,
} from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────

const STAGE_ORDER = [
  'Prospecting',
  'Qualification',
  'Evaluation',
  'Proposal',
  'Negotiation',
  'Closing',
];

const STAGE_PROBABILITIES = {
  Prospecting: 0.10,
  Qualification: 0.25,
  Evaluation: 0.40,
  Proposal: 0.60,
  Negotiation: 0.80,
  Closing: 0.90,
};

const COMPETITOR_KEYWORDS = [
  'Salesforce',
  'Gong',
  'Clari',
  'People.ai',
  'HubSpot',
  'Chorus',
  'Outreach',
  'Gainsight',
  'ZoomInfo',
  'Drift',
];

const RISK_TYPES = [
  'BUDGET_BLOCKER',
  'COMPETITOR_THREAT',
  'NO_NEXT_STEP',
  'CHAMPION_LEFT',
  'STALLED',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(value) {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${Math.round(value / 1_000)}K`;
  return `$${value}`;
}

function parseDurationMinutes(durationStr) {
  if (!durationStr) return null;
  const match = String(durationStr).match(/(\d+(\.\d+)?)/);
  return match ? parseFloat(match[1]) : null;
}

function findRep(reps, assignedRep) {
  return reps.find(
    (r) => r.id === assignedRep || r.name === assignedRep
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KPICard({ icon: Icon, iconBg, iconColor, label, value, sub, subColor }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex items-start gap-4">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${iconBg}`}>
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">{label}</p>
        <p className="text-2xl font-bold text-gray-900 leading-tight">{value}</p>
        {sub && (
          <p className={`text-xs mt-0.5 font-medium ${subColor || 'text-gray-400'}`}>{sub}</p>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Analytics({ calls = [], reps = [] }) {
  // ── Empty State ────────────────────────────────────────────────────────────
  if (calls.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
          <BarChart2 className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">No analytics data</h3>
        <p className="text-sm text-gray-500 mb-6 max-w-xs">
          Import call records to populate analytics.
        </p>
        <button
          disabled
          className="px-4 py-2 rounded-lg bg-gray-100 text-gray-400 text-sm font-medium cursor-not-allowed border border-gray-200"
        >
          Import Calls
        </button>
      </div>
    );
  }

  // ── KPI Computations ───────────────────────────────────────────────────────

  // 1. Weighted Forecast
  const weightedForecast = calls.reduce((sum, c) => {
    const prob = STAGE_PROBABILITIES[c.stage] ?? 0.10;
    return sum + (c.dealSize || 0) * prob;
  }, 0);

  // 2. Pipeline Coverage Ratio
  const totalPipeline = calls.reduce((sum, c) => sum + (c.dealSize || 0), 0);
  const totalQuota = reps.reduce((sum, r) => sum + (r.quota || 0), 0);
  const coverageRatio = totalQuota > 0 ? totalPipeline / totalQuota : 0;
  const coverageColor =
    coverageRatio >= 3
      ? 'text-green-600'
      : coverageRatio >= 1.5
      ? 'text-amber-600'
      : 'text-red-600';

  // 3. Avg Deal Velocity (avg duration in minutes)
  const durations = calls
    .map((c) => parseDurationMinutes(c.duration))
    .filter((d) => d !== null);
  const avgVelocity =
    durations.length > 0
      ? durations.reduce((a, b) => a + b, 0) / durations.length
      : 0;

  // 4. Stage Conversion Rate
  const closingOrNeg = calls.filter(
    (c) => c.stage === 'Closing' || c.stage === 'Negotiation'
  ).length;
  const conversionRate = calls.length > 0 ? (closingOrNeg / calls.length) * 100 : 0;

  // 5. Deals At Risk
  const dealsAtRisk = calls.filter(
    (c) => (c.healthScore ?? 100) < 40 && Array.isArray(c.risks) && c.risks.length > 0
  ).length;

  // ── Funnel Data ────────────────────────────────────────────────────────────

  const stageCounts = STAGE_ORDER.map((stage) => ({
    stage,
    count: calls.filter((c) => c.stage === stage).length,
  }));

  // ── Competitor Landscape ───────────────────────────────────────────────────

  const competitorCounts = COMPETITOR_KEYWORDS.map((kw) => {
    let count = 0;
    calls.forEach((c) => {
      const text = [
        c.rawTranscript || '',
        typeof c.transcript === 'string' ? c.transcript : JSON.stringify(c.transcript || ''),
        c.aiSummary || '',
      ]
        .join(' ')
        .toLowerCase();
      const regex = new RegExp(kw.toLowerCase().replace('.', '\\.'), 'g');
      const matches = text.match(regex);
      if (matches) count += matches.length;
    });
    return { name: kw, mentions: count };
  }).filter((d) => d.mentions > 0);

  // ── Risk Matrix ────────────────────────────────────────────────────────────

  const riskMatrix = reps.map((rep) => {
    const repCalls = calls.filter((c) => {
      const matched = findRep(reps, c.assignedRep);
      return matched && matched.id === rep.id;
    });
    const risks = {};
    RISK_TYPES.forEach((rt) => {
      risks[rt] = repCalls.filter(
        (c) => Array.isArray(c.risks) && c.risks.includes(rt)
      ).length;
    });
    return { rep, risks };
  });

  // ── Rep Performance ────────────────────────────────────────────────────────

  const repPerformance = reps
    .map((rep) => {
      const repCalls = calls.filter((c) => {
        const matched = findRep(reps, c.assignedRep);
        return matched && matched.id === rep.id;
      });
      const dealsAssigned = repCalls.length;
      const totalPipelineVal = repCalls.reduce((sum, c) => sum + (c.dealSize || 0), 0);
      const avgHealth =
        dealsAssigned > 0
          ? repCalls.reduce((sum, c) => sum + (c.healthScore || 0), 0) / dealsAssigned
          : 0;
      const quota = rep.quota || 0;
      const attainment = quota > 0 ? (totalPipelineVal / quota) * 100 : 0;
      return { rep, dealsAssigned, totalPipelineVal, avgHealth, quota, attainment };
    })
    .sort((a, b) => b.totalPipelineVal - a.totalPipelineVal);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* ── 1. KPI Row ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <KPICard
          icon={TrendingUp}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
          label="Weighted Forecast"
          value={formatCurrency(weightedForecast)}
          sub="Probability-weighted pipeline"
        />
        <KPICard
          icon={Target}
          iconBg="bg-purple-50"
          iconColor="text-purple-600"
          label="Pipeline Coverage"
          value={`${coverageRatio.toFixed(1)}x`}
          sub={
            coverageRatio >= 3
              ? 'Healthy coverage'
              : coverageRatio >= 1.5
              ? 'Moderate coverage'
              : 'Low coverage'
          }
          subColor={coverageColor}
        />
        <KPICard
          icon={Zap}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
          label="Avg Deal Velocity"
          value={`${Math.round(avgVelocity)} min avg`}
          sub="Mean call duration"
        />
        <KPICard
          icon={Users}
          iconBg="bg-green-50"
          iconColor="text-green-600"
          label="Stage Conversion"
          value={`${conversionRate.toFixed(1)}%`}
          sub="Negotiation + Closing"
        />
        <KPICard
          icon={AlertCircle}
          iconBg="bg-red-50"
          iconColor="text-red-600"
          label="Deals At Risk"
          value={dealsAtRisk}
          sub="Health < 40 with risks"
          subColor={dealsAtRisk > 0 ? 'text-red-500' : 'text-gray-400'}
        />
      </div>

      {/* ── 2. Stage Funnel ── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-gray-900">Pipeline Stage Funnel</h2>
          <p className="text-xs text-gray-500 mt-0.5">Deal count by stage (funnel view)</p>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart
            data={stageCounts}
            layout="vertical"
            margin={{ top: 4, right: 48, left: 8, bottom: 4 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
            <XAxis
              type="number"
              allowDecimals={false}
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="stage"
              width={100}
              tick={{ fontSize: 12, fill: '#4b5563' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              cursor={{ fill: '#eff6ff' }}
              contentStyle={{
                borderRadius: 8,
                border: '1px solid #e5e7eb',
                fontSize: 12,
              }}
              formatter={(value) => [value, 'Deals']}
            />
            <Bar dataKey="count" fill="#2563eb" radius={[0, 4, 4, 0]}>
              <LabelList
                dataKey="count"
                position="right"
                style={{ fontSize: 11, fill: '#6b7280', fontWeight: 600 }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── 3. Two-column Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Left: Competitor Landscape */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-gray-900">Competitor Landscape</h2>
            <p className="text-xs text-gray-500 mt-0.5">Mentions across all call transcripts</p>
          </div>
          {competitorCounts.length === 0 ? (
            <div className="flex items-center justify-center h-40">
              <p className="text-sm text-gray-400">No competitor mentions detected in transcripts.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(180, competitorCounts.length * 36)}>
              <BarChart
                data={competitorCounts}
                layout="vertical"
                margin={{ top: 4, right: 48, left: 8, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                <XAxis
                  type="number"
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={84}
                  tick={{ fontSize: 11, fill: '#4b5563' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: '#fff1f2' }}
                  contentStyle={{
                    borderRadius: 8,
                    border: '1px solid #e5e7eb',
                    fontSize: 12,
                  }}
                  formatter={(value) => [value, 'Mentions']}
                />
                <Bar dataKey="mentions" fill="#dc2626" radius={[0, 4, 4, 0]}>
                  <LabelList
                    dataKey="mentions"
                    position="right"
                    style={{ fontSize: 11, fill: '#6b7280', fontWeight: 600 }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Right: Risk Matrix Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 overflow-auto">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-gray-900">Risk Matrix</h2>
            <p className="text-xs text-gray-500 mt-0.5">Risk exposure by rep</p>
          </div>
          {reps.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No rep data available.</p>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left text-xs text-gray-500 uppercase tracking-wide font-medium px-3 py-2 border-b border-gray-100">
                    Rep
                  </th>
                  {RISK_TYPES.map((rt) => (
                    <th
                      key={rt}
                      className="text-center text-xs text-gray-500 uppercase tracking-wide font-medium px-2 py-2 border-b border-gray-100 whitespace-nowrap"
                      title={rt}
                    >
                      {rt.replace(/_/g, ' ')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {riskMatrix.map(({ rep, risks }) => (
                  <tr key={rep.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2.5 font-medium text-gray-800 whitespace-nowrap">
                      {rep.name}
                    </td>
                    {RISK_TYPES.map((rt) => {
                      const count = risks[rt] || 0;
                      const cellClass =
                        count === 0
                          ? 'bg-gray-50 text-gray-400'
                          : count === 1
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-red-50 text-red-700 font-bold';
                      return (
                        <td
                          key={rt}
                          className={`text-center px-2 py-2.5 text-sm ${cellClass}`}
                        >
                          {count}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── 4. Rep Performance Table ── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Rep Performance</h2>
          <p className="text-xs text-gray-500 mt-0.5">Pipeline and health metrics by sales rep</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {[
                  'Rep Name',
                  'Region',
                  'Deals Assigned',
                  'Total Pipeline',
                  'Avg Health',
                  'Quota',
                  'Attainment %',
                ].map((col) => (
                  <th
                    key={col}
                    className="text-left text-xs text-gray-500 uppercase tracking-wide font-medium px-5 py-3 whitespace-nowrap"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {repPerformance.map(
                ({ rep, dealsAssigned, totalPipelineVal, avgHealth, quota, attainment }) => {
                  const healthColor =
                    avgHealth >= 70
                      ? 'text-green-600'
                      : avgHealth >= 40
                      ? 'text-amber-600'
                      : 'text-red-600';
                  const attainColor =
                    attainment >= 80
                      ? 'text-green-600'
                      : attainment >= 50
                      ? 'text-amber-600'
                      : 'text-red-600';
                  return (
                    <tr key={rep.id} className="hover:bg-gray-50">
                      <td className="px-5 py-3.5 font-medium text-gray-900">{rep.name}</td>
                      <td className="px-5 py-3.5 text-gray-600">{rep.region || '—'}</td>
                      <td className="px-5 py-3.5 text-gray-700">{dealsAssigned}</td>
                      <td className="px-5 py-3.5 font-medium text-gray-900">
                        {formatCurrency(totalPipelineVal)}
                      </td>
                      <td className={`px-5 py-3.5 font-semibold ${healthColor}`}>
                        {dealsAssigned > 0 ? `${Math.round(avgHealth)}` : '—'}
                      </td>
                      <td className="px-5 py-3.5 text-gray-600">{formatCurrency(quota)}</td>
                      <td className={`px-5 py-3.5 font-semibold ${attainColor}`}>
                        {quota > 0 ? `${attainment.toFixed(1)}%` : '—'}
                      </td>
                    </tr>
                  );
                }
              )}
              {repPerformance.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-gray-400 text-sm">
                    No rep data available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
