import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList } from 'recharts';
import useProductStore from '../store/useProductStore.js';

const REGIONS = ['Americas', 'APAC & ME', 'Europe International'];

function fmt(v) {
  if (v == null) return '—';
  return `€${(Math.round(v * 10) / 10).toFixed(1)}M`;
}

function pct(a, b) {
  if (!b) return 0;
  return Math.round((a / b) * 100);
}

function BarLabel({ x, y, width, value }) {
  if (!value) return null;
  return (
    <text x={x + width / 2} y={y - 6} fill="#222" fontSize={13} fontWeight={700} textAnchor="middle">
      {value}
    </text>
  );
}

export default function TradingPerformance() {
  const { tradingSummary, fetchTradingSummary, filters } = useProductStore();
  const [fy, setFy] = useState('FY26');

  useEffect(() => {
    fetchTradingSummary(fy);
  }, [fy, filters.category, filters.family, filters.productLine, filters.q]);

  const s = tradingSummary;

  const aovAttainment = pct(s?.aovWonYtd, s?.aovTarget);
  const revenueAttainment = pct(s?.revenueYtd, s?.revenueTarget);
  const pipelineCover = s?.aovTargetToGo > 0
    ? (Math.round((s.aovPipelineOpen / s.aovTargetToGo) * 10) / 10).toFixed(1)
    : '—';

  const regionData = s?.byRegion
    ? REGIONS.map((region) => {
        const r = s.byRegion[region] || {};
        const aovWon = Math.round((r.aovWonYtd || 0) * 10) / 10;
        const aovTgt = Math.round((r.aovTarget || 0) * 10) / 10;
        const ttg = Math.round((aovTgt - aovWon) * 10) / 10;
        const pipeline = Math.round((r.aovPipelineOpen || 0) * 10) / 10;
        const revYtd = Math.round((r.revenueYtd || 0) * 10) / 10;
        const revTgt = Math.round((r.revenueTarget || 0) * 10) / 10;
        return {
          region,
          aovWonYtd: aovWon,
          aovWonLabel: `${pct(aovWon, aovTgt)}%`,
          aovPipelineOpen: pipeline,
          pipelineCoverLabel: ttg > 0 ? `${(Math.round((pipeline / ttg) * 10) / 10).toFixed(1)}x` : '—',
          targetToGo: ttg,
          targetToGoLabel: `€${ttg.toFixed(1)}M`,
          aovPipelineOpenedYtd: Math.round((r.aovPipelineOpenedYtd || 0) * 10) / 10,
          revenueYtd: revYtd,
          revenueTarget: revTgt,
          revenueAttLabel: `${pct(revYtd, revTgt)}%`,
        };
      })
    : [];

  return (
    <div className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Trading Performance</h2>
        <select
          className="border border-vf-border rounded-md px-3 py-1.5 text-sm bg-white font-sans cursor-pointer min-w-[100px] focus:outline-none focus:border-vf-red"
          value={fy}
          onChange={(e) => setFy(e.target.value)}
        >
          <option>FY26</option>
          <option>FY25</option>
          <option>FY24</option>
        </select>
      </div>

      {/* KPI Tiles — 4 tiles */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        {/* Tile 1: AOV Won YTD + Attainment */}
        <div className="bg-white border border-vf-border rounded-[10px] px-5 py-5">
          <div className="text-sm font-semibold text-vf-muted uppercase tracking-wide mb-2">AOV Won YTD</div>
          <div className="text-4xl font-bold text-vf-dark font-mono leading-tight">{fmt(s?.aovWonYtd)}</div>
          <div className="text-base text-vf-red font-semibold mt-2">Target: {fmt(s?.aovTarget)}</div>
          <div className="mt-3 flex items-center gap-3">
            <div className="flex-1 h-2.5 bg-[#f0eeea] rounded overflow-hidden">
              <div className={`h-full rounded ${aovAttainment >= 100 ? 'bg-vf-success' : aovAttainment >= 70 ? 'bg-vf-warn' : 'bg-vf-red'}`} style={{ width: `${Math.min(aovAttainment, 100)}%` }} />
            </div>
            <span className="text-lg font-bold font-mono text-vf-dark">{aovAttainment}%</span>
          </div>
          <div className="text-xs text-vf-muted mt-1">AOV Attainment</div>
        </div>

        {/* Tile 2: Pipeline Open / Target to Go / Pipeline Cover */}
        <div className="bg-white border border-vf-border rounded-[10px] px-5 py-5">
          <div className="text-sm font-semibold text-vf-muted uppercase tracking-wide mb-3">AOV Pipeline</div>
          <table className="w-full">
            <tbody>
              <tr className="border-b border-[#f0eeea]">
                <td className="py-2 text-sm text-vf-muted">Pipeline Open</td>
                <td className="py-2 text-right font-mono font-bold text-vf-dark text-lg">{fmt(s?.aovPipelineOpen)}</td>
              </tr>
              <tr className="border-b border-[#f0eeea]">
                <td className="py-2 text-sm text-vf-muted">Target to Go</td>
                <td className="py-2 text-right font-mono font-bold text-vf-dark text-lg">{fmt(s?.aovTargetToGo)}</td>
              </tr>
              <tr>
                <td className="py-2 text-sm text-vf-muted font-semibold">Pipeline Cover</td>
                <td className="py-2 text-right font-mono font-bold text-vf-dark text-2xl">{pipelineCover}x</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Tile 3: AOV Pipeline Opened YTD */}
        <div className="bg-white border border-vf-border rounded-[10px] px-5 py-5">
          <div className="text-sm font-semibold text-vf-muted uppercase tracking-wide mb-2">AOV Pipeline Opened YTD</div>
          <div className="text-4xl font-bold text-vf-dark font-mono leading-tight">{fmt(s?.aovPipelineOpenedYtd)}</div>
          <div className="text-sm text-vf-muted mt-3">New pipeline created in {fy}</div>
        </div>

        {/* Tile 4: Revenue YTD + Attainment */}
        <div className="bg-white border border-vf-border rounded-[10px] px-5 py-5">
          <div className="text-sm font-semibold text-vf-muted uppercase tracking-wide mb-2">Revenue YTD</div>
          <div className="text-4xl font-bold text-vf-dark font-mono leading-tight">{fmt(s?.revenueYtd)}</div>
          <div className="text-base text-vf-red font-semibold mt-2">Target: {fmt(s?.revenueTarget)}</div>
          <div className="mt-3 flex items-center gap-3">
            <div className="flex-1 h-2.5 bg-[#f0eeea] rounded overflow-hidden">
              <div className={`h-full rounded ${revenueAttainment >= 100 ? 'bg-vf-success' : revenueAttainment >= 70 ? 'bg-vf-warn' : 'bg-vf-red'}`} style={{ width: `${Math.min(revenueAttainment, 100)}%` }} />
            </div>
            <span className="text-lg font-bold font-mono text-vf-dark">{revenueAttainment}%</span>
          </div>
          <div className="text-xs text-vf-muted mt-1">Revenue Attainment</div>
        </div>
      </div>

      {/* 4 Regional Charts */}
      {regionData.length > 0 ? (
        <div className="grid grid-cols-2 gap-3">
          {/* AOV Won YTD — with attainment % labels */}
          <div className="bg-white border border-vf-border rounded-[10px] p-5">
            <div className="text-sm font-semibold mb-4">AOV Won YTD by Region</div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={regionData} barCategoryGap="25%" margin={{ top: 25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0eeea" />
                <XAxis dataKey="region" tick={{ fontSize: 13, fill: '#333', fontWeight: 500 }} interval={0} />
                <YAxis tick={{ fontSize: 12, fill: '#6B6A66' }} />
                <Tooltip formatter={(v) => `€${v.toFixed(1)}M`} />
                <Bar dataKey="aovWonYtd" fill="#E60000" name="AOV Won YTD" radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="aovWonLabel" content={BarLabel} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* AOV Pipeline Open — with pipeline cover labels */}
          <div className="bg-white border border-vf-border rounded-[10px] p-5">
            <div className="text-sm font-semibold mb-4">AOV Pipeline Open by Region</div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={regionData} barCategoryGap="25%" margin={{ top: 25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0eeea" />
                <XAxis dataKey="region" tick={{ fontSize: 13, fill: '#333', fontWeight: 500 }} interval={0} />
                <YAxis tick={{ fontSize: 12, fill: '#6B6A66' }} />
                <Tooltip formatter={(v) => `€${v.toFixed(1)}M`} />
                <Bar dataKey="aovPipelineOpen" fill="#0066CC" name="Pipeline Open" radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="pipelineCoverLabel" content={BarLabel} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Target to Go — with value labels */}
          <div className="bg-white border border-vf-border rounded-[10px] p-5">
            <div className="text-sm font-semibold mb-4">Target to Go by Region</div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={regionData} barCategoryGap="25%" margin={{ top: 25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0eeea" />
                <XAxis dataKey="region" tick={{ fontSize: 13, fill: '#333', fontWeight: 500 }} interval={0} />
                <YAxis tick={{ fontSize: 12, fill: '#6B6A66' }} />
                <Tooltip formatter={(v) => `€${v.toFixed(1)}M`} />
                <Bar dataKey="targetToGo" fill="#FF9900" name="Target to Go" radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="targetToGoLabel" content={BarLabel} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Revenue YTD vs Target — with attainment labels */}
          <div className="bg-white border border-vf-border rounded-[10px] p-5">
            <div className="text-sm font-semibold mb-4">Revenue YTD vs Target</div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={regionData} barGap={2} barCategoryGap="25%" margin={{ top: 25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0eeea" />
                <XAxis dataKey="region" tick={{ fontSize: 13, fill: '#333', fontWeight: 500 }} interval={0} />
                <YAxis tick={{ fontSize: 12, fill: '#6B6A66' }} />
                <Tooltip formatter={(v) => `€${v.toFixed(1)}M`} />
                <Legend wrapperStyle={{ fontSize: 13 }} />
                <Bar dataKey="revenueYtd" fill="#E60000" name="Revenue YTD" radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="revenueAttLabel" content={BarLabel} />
                </Bar>
                <Bar dataKey="revenueTarget" fill="#bbb" name="Target" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-vf-border rounded-[10px] p-4 text-center py-8 text-vf-muted text-sm">
          No trading data. Upload via Import / Export tab.
        </div>
      )}
    </div>
  );
}
