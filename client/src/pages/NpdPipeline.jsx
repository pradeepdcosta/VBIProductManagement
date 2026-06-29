import { useEffect, useState, useMemo } from 'react';
import useProductStore from '../store/useProductStore.js';

const STATUS_COLORS = {
  'On Track': { bg: 'bg-green-100', text: 'text-green-800', dot: 'bg-green-500' },
  'Done': { bg: 'bg-green-100', text: 'text-green-800', dot: 'bg-green-500' },
  'In Progress': { bg: 'bg-blue-100', text: 'text-blue-800', dot: 'bg-blue-500' },
  'Mobilise': { bg: 'bg-blue-100', text: 'text-blue-800', dot: 'bg-blue-500' },
  'DB Approved': { bg: 'bg-purple-100', text: 'text-purple-800', dot: 'bg-purple-500' },
  'Not Started': { bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400' },
  'At Risk': { bg: 'bg-yellow-100', text: 'text-yellow-800', dot: 'bg-yellow-500' },
  'Off-Track': { bg: 'bg-red-100', text: 'text-red-800', dot: 'bg-red-500' },
};

const CATEGORY_COLORS = {
  'Product Launch': '#E60000',
  'Feature Release': '#0066CC',
  'Product Rationalization': '#FF9900',
  'Technical Enabler': '#6B6A66',
  'Service Launch': '#00857C',
  'Aspirational': '#9B59B6',
};

const PORTFOLIO_ICONS = {
  'Cybersecurity': '🛡️',
  'Fixed Connectivity': '🔌',
  'Mobility': '📱',
  'Unified Communications': '📞',
  'Cloud & Edge Computing': '☁️',
};

const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'];
const STAGE_KEYS = ['concept', 'bizCase', 'design', 'gtm', 'salesEnable', 'distribution', 'slaDefinition', 'launch'];
const STAGE_LABELS = ['Concept', 'Business Case', 'Design', 'GTM', 'Sales Enablement', 'Distribution', 'SLA Definition', 'Launch'];

function StatusBadge({ status }) {
  const c = STATUS_COLORS[status] || STATUS_COLORS['Not Started'];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {status}
    </span>
  );
}

function CategoryTag({ category }) {
  const color = CATEGORY_COLORS[category] || '#6B6A66';
  return (
    <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium text-white" style={{ backgroundColor: color }}>
      {category}
    </span>
  );
}

function fmt(v) {
  if (v == null) return '—';
  return `€${v.toFixed(1)}M`;
}

/* ─── Stage Gate Flow ─── */
function StageGateFlow({ stages }) {
  if (!stages) return null;
  return (
    <div className="flex items-start gap-0 w-full">
      {STAGE_KEYS.map((key, i) => {
        const s = stages[key] || { status: 'not-started', date: null };
        const isLast = i === STAGE_KEYS.length - 1;

        let dotColor, dotBorder, icon;
        switch (s.status) {
          case 'complete':
            dotColor = 'bg-green-500'; dotBorder = 'border-green-500'; icon = '✓'; break;
          case 'in-progress':
            dotColor = 'bg-blue-500'; dotBorder = 'border-blue-500'; icon = '●'; break;
          case 'at-risk':
            dotColor = 'bg-red-500'; dotBorder = 'border-red-500'; icon = '!'; break;
          case 'planned':
            dotColor = 'bg-amber-400'; dotBorder = 'border-amber-400'; icon = '○'; break;
          default:
            dotColor = 'bg-gray-200'; dotBorder = 'border-gray-300'; icon = ''; break;
        }

        return (
          <div key={key} className="flex-1 flex flex-col items-center relative">
            {/* Connector line */}
            {i > 0 && (
              <div className={`absolute top-[14px] right-1/2 w-full h-0.5 ${s.status === 'complete' || stages[STAGE_KEYS[i - 1]]?.status === 'complete' ? 'bg-green-400' : 'bg-gray-200'}`} style={{ zIndex: 0 }} />
            )}
            {/* Dot */}
            <div className={`relative z-10 w-7 h-7 rounded-full ${dotColor} border-2 ${dotBorder} flex items-center justify-center text-white text-xs font-bold shadow-sm`}>
              {icon}
            </div>
            {/* Label */}
            <div className="text-[10px] font-semibold text-vf-dark mt-1.5 text-center leading-tight">{STAGE_LABELS[i]}</div>
            {/* Date */}
            <div className="text-[10px] text-vf-muted mt-0.5 text-center font-mono">
              {s.date ? new Date(s.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) : 'TBC'}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Detail View ─── */
function InitiativeDetail({ item, onBack }) {
  return (
    <div>
      {/* Back button */}
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-vf-red hover:underline mb-4 font-medium">
        ← Back to Pipeline
      </button>

      {/* Header card */}
      <div className="bg-vf-dark text-white rounded-t-[10px] px-6 py-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-xl font-bold">{item.initiativeName}</h3>
            <div className="text-sm text-gray-300 mt-1">
              {PORTFOLIO_ICONS[item.portfolio] || '📦'} {item.portfolio} › {item.productFamily} › {item.productLine}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={item.status} />
            <CategoryTag category={item.roadmapCategory} />
          </div>
        </div>
      </div>

      {/* Stage Gate */}
      <div className="bg-white border-x border-vf-border px-6 py-5">
        <div className="text-xs font-semibold text-vf-muted uppercase tracking-wide mb-4">Development Stage Gate</div>
        <StageGateFlow stages={item.stages} />
      </div>

      {/* Info Grid */}
      <div className="bg-white border-x border-b border-vf-border rounded-b-[10px] px-6 py-5">
        <div className="grid grid-cols-3 gap-5 mb-5">
          {/* Meta info */}
          <div className="space-y-3">
            <div className="text-xs font-semibold text-vf-muted uppercase tracking-wide mb-2">Initiative Details</div>
            <div className="text-sm"><span className="text-vf-muted">Year / Quarter:</span> <span className="font-semibold">{item.fy} {item.quarter}</span></div>
            <div className="text-sm"><span className="text-vf-muted">Market:</span> <span className="font-semibold">{item.market}</span></div>
            {item.roadmapHorizon && <div className="text-sm"><span className="text-vf-muted">Horizon:</span> <span className="font-semibold">{item.roadmapHorizon}</span></div>}
            {item.primaryInvestmentDriver && <div className="text-sm"><span className="text-vf-muted">Investment Driver:</span> <span className="font-semibold">{item.primaryInvestmentDriver}</span></div>}
            {item.investmentCanvas && <div className="text-sm"><span className="text-vf-muted">Investment Canvas:</span> <span className="font-semibold">{item.investmentCanvas}</span></div>}
          </div>

          {/* CapEx / OpEx */}
          <div>
            <div className="text-xs font-semibold text-vf-muted uppercase tracking-wide mb-2">Investment</div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-vf-surface rounded-lg p-4 text-center">
                <div className="text-xs text-vf-muted font-medium mb-1">CapEx</div>
                <div className="text-2xl font-bold text-vf-dark font-mono">{fmt(item.capex)}</div>
              </div>
              <div className="bg-vf-surface rounded-lg p-4 text-center">
                <div className="text-xs text-vf-muted font-medium mb-1">OpEx</div>
                <div className="text-2xl font-bold text-vf-dark font-mono">{fmt(item.opex)}</div>
              </div>
            </div>
            <div className="bg-vf-surface rounded-lg p-3 mt-3 text-center">
              <div className="text-xs text-vf-muted font-medium mb-1">Total Investment</div>
              <div className="text-xl font-bold text-vf-red font-mono">{fmt((item.capex || 0) + (item.opex || 0))}</div>
            </div>
          </div>

          {/* Description */}
          <div>
            <div className="text-xs font-semibold text-vf-muted uppercase tracking-wide mb-2">Description & Objectives</div>
            <div className="bg-vf-surface rounded-lg p-4 text-sm text-vf-dark leading-relaxed h-[160px] overflow-y-auto">
              {item.description || 'No description available.'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Page ─── */
export default function NpdPipeline() {
  const filters = useProductStore((s) => s.filters);
  const [data, setData] = useState({ initiatives: [], summary: { total: 0, statusCounts: {}, categoryCounts: {}, portfolioCounts: {}, quarterCounts: {} } });
  const [loading, setLoading] = useState(true);
  const [fyFilter, setFyFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [viewMode, setViewMode] = useState('timeline');
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
        // fyFilter applied client-side after FY26 removal + FY28 generation
        if (statusFilter) params.set('status', statusFilter);
        if (categoryFilter) params.set('roadmapCategory', categoryFilter);
        const qs = params.toString();
        const res = await fetch(`/api/products/npd-initiatives${qs ? '?' + qs : ''}`);
        const json = await res.json();
        setData(json);
      } catch {}
      setLoading(false);
    })();
  }, [filters.category, filters.family, filters.productLine, filters.q, fyFilter, statusFilter, categoryFilter]);

  // Strip FY26, clone FY27 as FY28 dummy
  const initiatives = useMemo(() => {
    const fy27 = data.initiatives.filter((i) => i.fy === 'FY27');
    const fy28 = fy27.map((i) => ({ ...i, id: `fy28-${i.id}`, fy: 'FY28' }));
    const base = [...fy27, ...fy28];
    if (fyFilter) return base.filter((i) => i.fy === fyFilter);
    return base;
  }, [data.initiatives, fyFilter]);

  // Recompute summary from filtered initiatives
  const summary = useMemo(() => {
    const statusCounts = {};
    const categoryCounts = {};
    const portfolioCounts = {};
    const quarterCounts = {};
    for (const i of initiatives) {
      statusCounts[i.status] = (statusCounts[i.status] || 0) + 1;
      categoryCounts[i.roadmapCategory] = (categoryCounts[i.roadmapCategory] || 0) + 1;
      portfolioCounts[i.portfolio] = (portfolioCounts[i.portfolio] || 0) + 1;
      const key = `${i.fy} ${i.quarter}`;
      quarterCounts[key] = (quarterCounts[key] || 0) + 1;
    }
    return { total: initiatives.length, statusCounts, categoryCounts, portfolioCounts, quarterCounts };
  }, [initiatives]);

  // Build year/quarter matrix for the tile
  const matrix = useMemo(() => {
    const counts = summary.quarterCounts || {};
    const years = [...new Set(Object.keys(counts).map((k) => k.split(' ')[0]))].sort();
    const grid = {};
    for (const q of QUARTERS) {
      grid[q] = {};
      for (const y of years) {
        grid[q][y] = counts[`${y} ${q}`] || 0;
      }
    }
    // Row totals
    for (const q of QUARTERS) {
      grid[q]._total = Object.values(grid[q]).reduce((a, b) => a + b, 0);
    }
    // Column totals
    const colTotals = {};
    for (const y of years) {
      colTotals[y] = QUARTERS.reduce((a, q) => a + (grid[q][y] || 0), 0);
    }
    colTotals._total = summary.total;
    return { years, grid, colTotals };
  }, [summary]);

  // Timeline grouping
  const timelineData = useMemo(() => {
    const grouped = {};
    for (const i of initiatives) {
      if (!grouped[i.fy]) grouped[i.fy] = {};
      if (!grouped[i.fy][i.quarter]) grouped[i.fy][i.quarter] = [];
      grouped[i.fy][i.quarter].push(i);
    }
    return grouped;
  }, [initiatives]);

  const fys = Object.keys(timelineData).sort();

  // If detail view
  if (selectedItem) {
    return (
      <div className="p-5">
        <InitiativeDetail item={selectedItem} onBack={() => setSelectedItem(null)} />
      </div>
    );
  }

  return (
    <div className="p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">NPD Roadmap Pipeline</h2>
        <div className="flex border border-vf-border rounded-md overflow-hidden">
          <button onClick={() => setViewMode('timeline')} className={`px-3 py-1.5 text-sm font-medium ${viewMode === 'timeline' ? 'bg-vf-dark text-white' : 'bg-white text-vf-dark hover:bg-gray-50'}`}>Timeline</button>
          <button onClick={() => setViewMode('list')} className={`px-3 py-1.5 text-sm font-medium ${viewMode === 'list' ? 'bg-vf-dark text-white' : 'bg-white text-vf-dark hover:bg-gray-50'}`}>List</button>
        </div>
      </div>

      {/* Local Filters */}
      <div className="flex items-center gap-2 mb-4">
        <select className="border border-vf-border rounded-md px-2.5 py-1.5 text-sm bg-white cursor-pointer focus:outline-none focus:border-vf-red" value={fyFilter} onChange={(e) => setFyFilter(e.target.value)}>
          <option value="">All Years</option>
          <option value="FY27">FY27</option>
          <option value="FY28">FY28</option>
        </select>
        <select className="border border-vf-border rounded-md px-2.5 py-1.5 text-sm bg-white cursor-pointer focus:outline-none focus:border-vf-red" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All Statuses</option>
          {Object.keys(STATUS_COLORS).map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="border border-vf-border rounded-md px-2.5 py-1.5 text-sm bg-white cursor-pointer focus:outline-none focus:border-vf-red" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="">All Categories</option>
          {Object.keys(CATEGORY_COLORS).map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        {(fyFilter || statusFilter || categoryFilter) && (
          <button onClick={() => { setFyFilter(''); setStatusFilter(''); setCategoryFilter(''); }} className="text-xs text-vf-red hover:underline ml-1">Clear filters</button>
        )}
      </div>

      {/* Summary Tiles */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        {/* Matrix tile: Years as columns, Quarters as rows */}
        <div className="bg-white border border-vf-border rounded-[10px] px-4 py-4">
          <div className="text-xs font-semibold text-vf-muted uppercase tracking-wide mb-2">Initiatives by Quarter</div>
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left text-xs text-vf-muted font-medium pb-1.5"></th>
                {matrix.years.map((y) => (
                  <th key={y} className="text-center text-xs text-vf-muted font-semibold pb-1.5 px-1">{y}</th>
                ))}
                <th className="text-center text-xs text-vf-dark font-bold pb-1.5 px-1 border-l border-[#e8e6e1]">Total</th>
              </tr>
            </thead>
            <tbody>
              {QUARTERS.map((q) => (
                <tr key={q} className="border-t border-[#f0eeea]">
                  <td className="py-1.5 text-xs font-semibold text-vf-dark">{q}</td>
                  {matrix.years.map((y) => (
                    <td key={y} className="py-1.5 text-center font-mono font-bold text-vf-dark">{matrix.grid[q][y] || <span className="text-gray-300">—</span>}</td>
                  ))}
                  <td className="py-1.5 text-center font-mono font-bold text-vf-dark border-l border-[#e8e6e1]">{matrix.grid[q]._total}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-vf-dark">
                <td className="py-1.5 text-xs font-bold text-vf-dark">Total</td>
                {matrix.years.map((y) => (
                  <td key={y} className="py-1.5 text-center font-mono font-bold text-vf-red text-base">{matrix.colTotals[y]}</td>
                ))}
                <td className="py-1.5 text-center font-mono font-bold text-vf-red text-lg border-l border-[#e8e6e1]">{matrix.colTotals._total}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Status breakdown */}
        <div className="bg-white border border-vf-border rounded-[10px] px-5 py-4">
          <div className="text-xs font-semibold text-vf-muted uppercase tracking-wide mb-2">By Status</div>
          <div className="space-y-1.5">
            {Object.entries(summary.statusCounts || {}).sort((a, b) => b[1] - a[1]).map(([s, c]) => (
              <div key={s} className="flex items-center justify-between">
                <StatusBadge status={s} />
                <span className="font-mono font-bold text-vf-dark text-sm">{c}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Category breakdown */}
        <div className="bg-white border border-vf-border rounded-[10px] px-5 py-4">
          <div className="text-xs font-semibold text-vf-muted uppercase tracking-wide mb-2">By Category</div>
          <div className="space-y-1.5">
            {Object.entries(summary.categoryCounts || {}).sort((a, b) => b[1] - a[1]).map(([c, n]) => (
              <div key={c} className="flex items-center justify-between gap-2">
                <CategoryTag category={c} />
                <span className="font-mono font-bold text-vf-dark text-sm">{n}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Portfolio breakdown */}
        <div className="bg-white border border-vf-border rounded-[10px] px-5 py-4">
          <div className="text-xs font-semibold text-vf-muted uppercase tracking-wide mb-2">By Portfolio</div>
          <div className="space-y-1.5">
            {Object.entries(summary.portfolioCounts || {}).sort((a, b) => b[1] - a[1]).map(([p, n]) => (
              <div key={p} className="flex items-center justify-between gap-2">
                <span className="text-xs text-vf-dark font-medium truncate">{PORTFOLIO_ICONS[p] || '📦'} {p}</span>
                <span className="font-mono font-bold text-vf-dark text-sm">{n}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="bg-white border border-vf-border rounded-[10px] p-8 text-center text-vf-muted">Loading NPD pipeline...</div>
      ) : initiatives.length === 0 ? (
        <div className="bg-white border border-vf-border rounded-[10px] p-8 text-center text-vf-muted">No initiatives found. Upload NPD data via Import / Export.</div>
      ) : viewMode === 'timeline' ? (
        /* =========== TIMELINE VIEW =========== */
        <div className="space-y-4">
          {fys.map((fy) => (
            <div key={fy}>
              <div className="flex items-center gap-2 mb-3">
                <div className="text-base font-bold text-white bg-vf-dark px-3 py-1 rounded">{fy}</div>
                <div className="flex-1 h-px bg-vf-border" />
              </div>
              <div className="grid grid-cols-4 gap-3">
                {QUARTERS.map((q) => {
                  const items = timelineData[fy]?.[q] || [];
                  return (
                    <div key={q} className="min-h-[120px]">
                      <div className="text-sm font-semibold text-vf-muted mb-2 flex items-center justify-between">
                        <span>{q}</span>
                        {items.length > 0 && <span className="bg-vf-surface text-vf-muted text-xs px-1.5 py-0.5 rounded-full font-mono">{items.length}</span>}
                      </div>
                      <div className="space-y-2">
                        {items.map((item) => (
                          <div
                            key={item.id}
                            className="bg-white border border-vf-border rounded-lg p-3 cursor-pointer hover:shadow-md hover:border-vf-red transition-all"
                            onClick={() => setSelectedItem(item)}
                          >
                            <div className="text-sm font-semibold text-vf-dark leading-tight mb-1.5">{item.initiativeName}</div>
                            <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                              <StatusBadge status={item.status} />
                              <CategoryTag category={item.roadmapCategory} />
                            </div>
                            <div className="text-xs text-vf-muted">
                              {PORTFOLIO_ICONS[item.portfolio] || '📦'} {item.portfolio} › {item.productFamily}
                            </div>
                            {(item.capex != null || item.opex != null) && (
                              <div className="text-[10px] text-vf-muted mt-1 font-mono">
                                CapEx {fmt(item.capex)} · OpEx {fmt(item.opex)}
                              </div>
                            )}
                          </div>
                        ))}
                        {items.length === 0 && (
                          <div className="text-xs text-vf-muted italic p-2">No initiatives</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* =========== LIST VIEW =========== */
        <div className="bg-white border border-vf-border rounded-[10px] overflow-hidden">
          <div className="grid grid-cols-[1fr_130px_120px_110px_60px_50px] border-b border-vf-border bg-vf-surface">
            <div className="px-4 py-2.5 text-xs font-semibold text-vf-muted uppercase tracking-wide">Initiative</div>
            <div className="px-3 py-2.5 text-xs font-semibold text-vf-muted uppercase tracking-wide">Portfolio</div>
            <div className="px-3 py-2.5 text-xs font-semibold text-vf-muted uppercase tracking-wide">Category</div>
            <div className="px-3 py-2.5 text-xs font-semibold text-vf-muted uppercase tracking-wide">Status</div>
            <div className="px-3 py-2.5 text-xs font-semibold text-vf-muted uppercase tracking-wide">Year</div>
            <div className="px-3 py-2.5 text-xs font-semibold text-vf-muted uppercase tracking-wide">Qtr</div>
          </div>
          {initiatives.map((item) => (
            <div
              key={item.id}
              className="grid grid-cols-[1fr_130px_120px_110px_60px_50px] border-b border-[#f0eeea] last:border-b-0 items-center cursor-pointer hover:bg-[#fdf9f9] transition-colors"
              onClick={() => setSelectedItem(item)}
            >
              <div className="px-4 py-2.5">
                <div className="text-sm font-medium text-vf-dark truncate">{item.initiativeName}</div>
                <div className="text-xs text-vf-muted truncate">{item.productFamily} › {item.productLine}</div>
              </div>
              <div className="px-3 py-2.5 text-xs text-vf-dark truncate">{PORTFOLIO_ICONS[item.portfolio] || '📦'} {item.portfolio}</div>
              <div className="px-3 py-2.5"><CategoryTag category={item.roadmapCategory} /></div>
              <div className="px-3 py-2.5"><StatusBadge status={item.status} /></div>
              <div className="px-3 py-2.5 text-xs font-mono font-medium text-vf-dark">{item.fy}</div>
              <div className="px-3 py-2.5 text-xs font-mono font-medium text-vf-dark">{item.quarter}</div>
            </div>
          ))}
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-4 text-xs text-vf-muted items-center">
        {Object.entries(CATEGORY_COLORS).map(([cat, color]) => (
          <span key={cat} className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded" style={{ backgroundColor: color }} />
            {cat}
          </span>
        ))}
        <span className="ml-auto">Click any initiative to view details →</span>
      </div>
    </div>
  );
}
