import { useEffect, useState } from 'react';
import useProductStore from '../store/useProductStore.js';

function fmtK(v) {
  if (v == null || v === 0) return '—';
  if (Math.abs(v) >= 1000000) return `€${(v / 1000000).toFixed(1)}M`;
  return `€${(v / 1000).toFixed(0)}K`;
}

function fmtCell(v) {
  if (v == null || v === 0) return '-';
  return Math.round(v).toLocaleString();
}

const ACTION_STATUSES = {
  'Planned': 'bg-gray-100 text-gray-700',
  'In Progress': 'bg-blue-100 text-blue-800',
  'On Track': 'bg-green-100 text-green-800',
  'At Risk': 'bg-yellow-100 text-yellow-800',
  'Completed': 'bg-green-200 text-green-900',
};

/* ─── Cost Detail View ─── */
function CostDetail({ item, actions, onBack }) {
  const fteBreakdown = item.fteBreakdown || [];

  // Build rows matching the Excel layout exactly
  const ROWS = [
    // P&S Section
    { label: 'Direct FTE (P&S)', opex: item.psOpex, dep: null, total: item.psOpex, belowEbit: null, grandTotal: item.psOpex, bold: false, section: 'ps' },
    { label: 'VOIS FTE (P&S)', opex: 0, dep: null, total: 0, belowEbit: null, grandTotal: 0, bold: false, section: 'ps' },
    { label: 'External', opex: 0, dep: null, total: 0, belowEbit: null, grandTotal: 0, bold: false, section: 'ps' },
    { label: 'Depreciation', opex: null, dep: item.psDep, total: item.psDep, belowEbit: null, grandTotal: item.psDep, bold: false, section: 'ps' },
    { label: 'Manual Adjs (Accounting)', opex: 0, dep: null, total: 0, belowEbit: null, grandTotal: 0, bold: false, section: 'ps' },
    { label: 'Total P&S Direct', opex: item.psOpex, dep: item.psDep, total: item.psTotal, belowEbit: 0, grandTotal: item.psTotal, bold: true, topBorder: true, section: 'ps' },
    { label: 'Cross Portfolio Allocations', opex: 0, dep: 0, total: 0, belowEbit: null, grandTotal: 0, bold: false, section: 'ps' },
    { label: 'P&S Indirect Allocations', opex: 0, dep: 0, total: 0, belowEbit: null, grandTotal: 0, bold: false, section: 'ps' },
    { label: 'Total P&S Cost', opex: item.psOpex, dep: item.psDep, total: item.psTotal, belowEbit: 0, grandTotal: item.psTotal, bold: true, topBorder: true, section: 'ps', highlight: true },
    // Spacer
    { spacer: true },
    // PPE Section
    { label: 'Direct FTE (PPE)', opex: item.ppeOpex, dep: null, total: item.ppeOpex, belowEbit: null, grandTotal: item.ppeOpex, bold: false, section: 'ppe' },
    { label: 'VOIS FTE (PPE)', opex: 0, dep: null, total: 0, belowEbit: null, grandTotal: 0, bold: false, section: 'ppe' },
    { label: 'External', opex: 0, dep: null, total: 0, belowEbit: null, grandTotal: 0, bold: false, section: 'ppe' },
    { label: 'Depreciation', opex: null, dep: item.ppeDep, total: item.ppeDep, belowEbit: null, grandTotal: item.ppeDep, bold: false, section: 'ppe' },
    { label: 'Manual Adjs (Accounting)', opex: 0, dep: null, total: 0, belowEbit: null, grandTotal: 0, bold: false, section: 'ppe' },
    { label: 'Total PPE Direct', opex: item.ppeOpex, dep: item.ppeDep, total: item.ppeTotal, belowEbit: 0, grandTotal: item.ppeTotal, bold: true, topBorder: true, section: 'ppe' },
    { label: 'Cross Portfolio Allocations', opex: 0, dep: 0, total: 0, belowEbit: null, grandTotal: 0, bold: false, section: 'ppe' },
    { label: 'PPE Indirect Allocations', opex: 0, dep: 0, total: 0, belowEbit: null, grandTotal: 0, bold: false, section: 'ppe' },
    { label: 'Total PPE Cost', opex: item.ppeOpex, dep: item.ppeDep, total: item.ppeTotal, belowEbit: 0, grandTotal: item.ppeTotal, bold: true, topBorder: true, section: 'ppe', highlight: true },
    // Spacer
    { spacer: true },
    // Other Allocations
    { label: 'Other Allocations', sectionHeader: true },
    { label: 'Commercial', opex: item.commercial, dep: 0, total: item.commercial, belowEbit: null, grandTotal: item.commercial, bold: false, section: 'alloc' },
    { label: 'Directorate (SAMs Allocation)', opex: item.directorate, dep: 0, total: item.directorate, belowEbit: null, grandTotal: item.directorate, bold: false, section: 'alloc' },
    { label: 'VSOL', opex: item.vsol, dep: 0, total: item.vsol, belowEbit: 0, grandTotal: item.vsol, bold: false, section: 'alloc' },
    { label: 'Networks', opex: item.networks, dep: 0, total: item.networks, belowEbit: 0, grandTotal: item.networks, bold: false, section: 'alloc' },
    { label: 'Total Allocations', opex: item.commercial + item.directorate + item.vsol + item.networks, dep: 0, total: item.commercial + item.directorate + item.vsol + item.networks, belowEbit: 0, grandTotal: item.commercial + item.directorate + item.vsol + item.networks, bold: true, topBorder: true, section: 'alloc' },
    // Spacer
    { spacer: true },
    // Grand Total
    { label: 'Grand Total', opex: item.grandTotal, dep: (item.psDep || 0) + (item.ppeDep || 0), total: item.grandTotal, belowEbit: 0, grandTotal: item.grandTotal, bold: true, topBorder: true, isGrand: true },
  ];

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-vf-red hover:underline mb-4 font-medium">
        ← Back to Cost Overview
      </button>

      {/* Header */}
      <div className="bg-vf-dark text-white rounded-t-[10px] px-6 py-4 flex items-center justify-between">
        <div>
          <div className="text-xs text-gray-400 mb-0.5">Select Service Catalogue Item</div>
          <h3 className="text-xl font-bold">{item.serviceOffering}</h3>
          <div className="text-sm text-gray-300 mt-0.5">{item.serviceTower} · {item.fy}</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-400">Grand Total</div>
          <div className="text-3xl font-bold font-mono">{fmtK(item.grandTotal)}</div>
          <div className="text-xs text-gray-400 mt-1">FTE: {item.fteCount}</div>
        </div>
      </div>

      <div className="flex gap-0">
        {/* Left: Cost Table */}
        <div className="flex-1 bg-white border-l border-b border-vf-border rounded-bl-[10px] overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            {/* Column headers matching Excel */}
            <thead>
              <tr className="bg-yellow-300">
                <th className="text-left py-2 px-3 font-semibold border-b-2 border-vf-dark w-[220px]"></th>
                <th className="text-right py-2 px-2 font-semibold border-b-2 border-vf-dark w-[90px]">Opex</th>
                <th className="text-right py-2 px-2 font-semibold border-b-2 border-vf-dark w-[90px]">Dep</th>
                <th className="text-right py-2 px-2 font-semibold border-b-2 border-vf-dark w-[90px]">Total</th>
                <th className="text-right py-2 px-2 font-semibold border-b-2 border-vf-dark w-[90px]">Below EBIT</th>
                <th className="text-right py-2 px-2 font-bold border-b-2 border-vf-dark w-[100px]">Total</th>
                <th className="text-right py-2 px-2 font-semibold border-b-2 border-vf-dark w-[70px]">No of FTE</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((r, i) => {
                if (r.spacer) return <tr key={i}><td colSpan={7} className="py-2" /></tr>;
                if (r.sectionHeader) return (
                  <tr key={i}><td colSpan={7} className="py-2 px-3 font-bold text-sm text-vf-dark">{r.label}</td></tr>
                );

                const showFte = (r.label === 'Direct FTE (P&S)' || r.label === 'Direct FTE (PPE)');

                return (
                  <tr key={i} className={`
                    ${r.topBorder ? 'border-t-2 border-vf-dark' : 'border-t border-[#e8e6e1]'}
                    ${r.bold ? 'font-bold' : ''}
                    ${r.isGrand ? 'bg-vf-dark text-white text-sm' : ''}
                    ${r.highlight ? 'bg-blue-50' : ''}
                  `}>
                    <td className={`py-1.5 px-3 ${r.bold ? 'font-bold' : ''}`}>{r.label}</td>
                    <td className="py-1.5 px-2 text-right font-mono">{r.opex !== null ? fmtCell(r.opex) : ''}</td>
                    <td className="py-1.5 px-2 text-right font-mono">{r.dep !== null ? fmtCell(r.dep) : ''}</td>
                    <td className="py-1.5 px-2 text-right font-mono">{fmtCell(r.total)}</td>
                    <td className="py-1.5 px-2 text-right font-mono">{r.belowEbit !== null ? fmtCell(r.belowEbit) : ''}</td>
                    <td className={`py-1.5 px-2 text-right font-mono ${r.bold || r.isGrand ? 'font-bold' : ''}`}>{fmtCell(r.grandTotal)}</td>
                    <td className="py-1.5 px-2 text-right font-mono">
                      {showFte ? (r.label.includes('P&S') ? item.fteCount : '0.0') : ''}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* FTE Breakdown below the table */}
          {fteBreakdown.length > 0 && (
            <div className="px-4 py-4 border-t border-vf-border">
              <div className="text-xs font-bold text-vf-dark uppercase tracking-wide mb-2">P&S FTE Breakdown</div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-vf-border">
                    <th className="text-left py-1.5 text-vf-muted font-semibold">Employee Name</th>
                    <th className="text-left py-1.5 text-vf-muted font-semibold">Direct / VOIS</th>
                    <th className="text-right py-1.5 text-vf-muted font-semibold">FTE Allocation</th>
                  </tr>
                </thead>
                <tbody>
                  {fteBreakdown.map((f, i) => (
                    <tr key={i} className="border-t border-[#f0eeea]">
                      <td className="py-1.5 font-medium">{f.name}</td>
                      <td className="py-1.5">{f.type}</td>
                      <td className="py-1.5 text-right font-mono font-semibold">{f.allocation}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right: Cost Reduction Actions */}
        <div className="w-[340px] shrink-0 bg-white border-x border-b border-vf-border rounded-br-[10px]">
          <div className="px-4 py-4">
            <div className="text-xs font-bold text-vf-dark uppercase tracking-wide mb-1">Cost Reduction Actions</div>
            {actions.length > 0 && (
              <div className="text-sm font-bold text-green-700 font-mono mb-3">
                Total Potential Savings: {fmtK(actions.reduce((a, c) => a + c.savings, 0))}
              </div>
            )}
            {actions.length === 0 ? (
              <div className="text-sm text-vf-muted italic py-4">No actions planned yet.</div>
            ) : (
              <div className="space-y-2.5">
                {actions.map((a) => (
                  <div key={a.id} className="border border-[#e8e6e1] rounded-lg p-3 hover:shadow-sm transition-shadow">
                    <div className="text-xs font-medium text-vf-dark leading-snug mb-2">{a.action}</div>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${ACTION_STATUSES[a.status] || 'bg-gray-100 text-gray-600'}`}>{a.status}</span>
                      <span className="text-sm font-bold font-mono text-green-700">{fmtK(a.savings)}</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-vf-muted">
                      <span>{a.owner || '—'}</span>
                      <span>{a.targetDate ? new Date(a.targetDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) : 'TBC'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Cost Overview ─── */
export default function CostManagement() {
  const filters = useProductStore((s) => s.filters);
  const [data, setData] = useState({ allocations: [], summary: {} });
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (filters.category) params.set('category', filters.category);
        if (filters.family) params.set('family', filters.family);
        if (filters.productLine) params.set('productLine', filters.productLine);
        if (filters.q) params.set('q', filters.q);
        const qs = params.toString();
        const res = await fetch(`/api/products/cost-allocations${qs ? '?' + qs : ''}`);
        setData(await res.json());
      } catch {}
      setLoading(false);
    })();
  }, [filters.category, filters.family, filters.productLine, filters.q]);

  useEffect(() => {
    if (!selectedItem) return;
    (async () => {
      try {
        const res = await fetch(`/api/products/cost-actions?serviceOffering=${encodeURIComponent(selectedItem.serviceOffering)}`);
        setActions(await res.json());
      } catch {}
    })();
  }, [selectedItem]);

  const { allocations, summary } = data;

  // Compute aggregate when multiple products shown
  const totalGrand = allocations.reduce((a, c) => a + c.grandTotal, 0);
  const totalProduct = allocations.reduce((a, c) => a + c.totalProduct, 0);
  const totalAllocations = totalGrand - totalProduct;

  if (selectedItem) {
    return (
      <div className="p-5">
        <CostDetail item={selectedItem} actions={actions} onBack={() => { setSelectedItem(null); setActions([]); }} />
      </div>
    );
  }

  return (
    <div className="p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">Cost Management</h2>
      </div>

      {/* Summary Row */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        <div className="bg-white border border-vf-border rounded-[10px] px-5 py-4">
          <div className="text-xs font-semibold text-vf-muted uppercase tracking-wide mb-1">Products</div>
          <div className="text-4xl font-bold text-vf-dark font-mono">{summary.total || 0}</div>
        </div>
        <div className="bg-white border border-vf-border rounded-[10px] px-5 py-4">
          <div className="text-xs font-semibold text-vf-muted uppercase tracking-wide mb-1">Grand Total Cost</div>
          <div className="text-4xl font-bold text-vf-red font-mono">{fmtK(totalGrand)}</div>
        </div>
        <div className="bg-white border border-vf-border rounded-[10px] px-5 py-4">
          <div className="text-xs font-semibold text-vf-muted uppercase tracking-wide mb-1">Product Direct</div>
          <div className="text-4xl font-bold text-vf-dark font-mono">{fmtK(totalProduct)}</div>
          <div className="text-xs text-vf-muted mt-1">P&S + PPE</div>
        </div>
        <div className="bg-white border border-vf-border rounded-[10px] px-5 py-4">
          <div className="text-xs font-semibold text-vf-muted uppercase tracking-wide mb-1">Total Allocations</div>
          <div className="text-4xl font-bold text-vf-dark font-mono">{fmtK(totalAllocations)}</div>
          <div className="text-xs text-vf-muted mt-1">Commercial, VBTS, VSOL etc.</div>
        </div>
      </div>

      {/* Products Table */}
      {loading ? (
        <div className="bg-white border border-vf-border rounded-[10px] p-8 text-center text-vf-muted">Loading cost data...</div>
      ) : allocations.length === 0 ? (
        <div className="bg-white border border-vf-border rounded-[10px] p-8 text-center text-vf-muted">No cost data found.</div>
      ) : (
        <div className="bg-white border border-vf-border rounded-[10px] overflow-hidden">
          {/* Table header */}
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-yellow-300 border-b-2 border-vf-dark">
                <th className="text-left py-2 px-4 font-semibold w-[220px]">Service Offering</th>
                <th className="text-left py-2 px-2 font-semibold w-[120px]">Service Tower</th>
                <th className="text-right py-2 px-2 font-semibold w-[90px]">P&S Total</th>
                <th className="text-right py-2 px-2 font-semibold w-[90px]">PPE Total</th>
                <th className="text-right py-2 px-2 font-bold w-[100px]">Product Total</th>
                <th className="text-right py-2 px-2 font-semibold w-[90px]">Allocations</th>
                <th className="text-right py-2 px-2 font-bold w-[100px]">Grand Total</th>
                <th className="text-right py-2 px-2 font-semibold w-[60px]">FTE</th>
              </tr>
            </thead>
            <tbody>
              {allocations.map((a) => {
                const allocTotal = a.grandTotal - a.totalProduct;
                return (
                  <tr
                    key={a.id}
                    className="border-t border-[#e8e6e1] cursor-pointer hover:bg-[#fdf9f9] transition-colors"
                    onClick={() => setSelectedItem(a)}
                  >
                    <td className="py-2 px-4 font-medium text-vf-dark">{a.serviceOffering}</td>
                    <td className="py-2 px-2 text-vf-muted truncate" title={a.serviceTower}>{a.serviceTower.replace('P&S - ', '')}</td>
                    <td className="py-2 px-2 text-right font-mono">{fmtCell(a.psTotal)}</td>
                    <td className="py-2 px-2 text-right font-mono">{fmtCell(a.ppeTotal)}</td>
                    <td className="py-2 px-2 text-right font-mono font-bold">{fmtCell(a.totalProduct)}</td>
                    <td className="py-2 px-2 text-right font-mono text-vf-muted">{fmtCell(allocTotal)}</td>
                    <td className="py-2 px-2 text-right font-mono font-bold text-vf-red">{fmtCell(a.grandTotal)}</td>
                    <td className="py-2 px-2 text-right font-mono">{a.fteCount > 0 ? a.fteCount.toFixed(1) : '-'}</td>
                  </tr>
                );
              })}
              {/* Totals row */}
              <tr className="border-t-2 border-vf-dark bg-vf-dark text-white font-bold text-sm">
                <td className="py-2.5 px-4">Grand Total</td>
                <td className="py-2.5 px-2"></td>
                <td className="py-2.5 px-2 text-right font-mono">{fmtCell(allocations.reduce((a, c) => a + c.psTotal, 0))}</td>
                <td className="py-2.5 px-2 text-right font-mono">{fmtCell(allocations.reduce((a, c) => a + c.ppeTotal, 0))}</td>
                <td className="py-2.5 px-2 text-right font-mono">{fmtCell(totalProduct)}</td>
                <td className="py-2.5 px-2 text-right font-mono">{fmtCell(totalAllocations)}</td>
                <td className="py-2.5 px-2 text-right font-mono">{fmtCell(totalGrand)}</td>
                <td className="py-2.5 px-2 text-right font-mono">{(summary.totalFte || 0).toFixed(1)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <div className="text-xs text-vf-muted mt-3">Click any row to view detailed cost breakdown and reduction actions →</div>
    </div>
  );
}
