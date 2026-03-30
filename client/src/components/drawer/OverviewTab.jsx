import CategoryBadge from '../CategoryBadge.jsx';

export default function OverviewTab({ product }) {
  const p = product;
  const totalCost = p.costs?.reduce((s, c) => s + c.amountEur, 0) || 0;
  const npdProgress = p.npd
    ? ['concept', 'bizCase', 'design', 'gtm', 'salesEnable', 'distribution', 'slaDefinition', 'launch']
        .filter((k) => p.npd[k] === 1).length
    : 0;

  return (
    <div>
      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-2.5 mb-5">
        <div className="bg-vf-surface border border-vf-border rounded-lg p-3">
          <div className="text-lg font-semibold font-mono">{totalCost > 0 ? `€${totalCost.toFixed(1)}M` : '—'}</div>
          <div className="text-[11px] text-vf-muted">Cost to Serve</div>
        </div>
        <div className="bg-vf-surface border border-vf-border rounded-lg p-3">
          <div className="text-lg font-semibold font-mono">{p.trading?.length > 0 ? `${p.trading.length} regions` : '—'}</div>
          <div className="text-[11px] text-vf-muted">Trading Data</div>
        </div>
        <div className="bg-vf-surface border border-vf-border rounded-lg p-3">
          <div className="text-lg font-semibold font-mono">{p.npd ? `${npdProgress}/8` : '—'}</div>
          <div className="text-[11px] text-vf-muted">NPD Stages Done</div>
        </div>
        <div className="bg-vf-surface border border-vf-border rounded-lg p-3">
          <div className="text-lg font-semibold font-mono">{p.coverage?.filter((c) => c.status === 'available').length || 0}</div>
          <div className="text-[11px] text-vf-muted">Countries Available</div>
        </div>
      </div>

      {/* Key attributes */}
      <div className="bg-white border border-vf-border rounded-lg overflow-hidden">
        <div className="px-4 py-2.5 border-b border-vf-border bg-vf-surface text-[11px] font-semibold text-vf-muted uppercase tracking-wide">
          Key Attributes
        </div>
        {[
          ['Category', <CategoryBadge key="cat" category={p.category} />],
          ['Family', p.family],
          ['Product Line', p.productLine],
          ['Status', p.status],
          ['Revenue Model', p.revenueModel],
          ['Owner', p.owner],
        ].map(([label, value]) => (
          <div key={label} className="flex justify-between items-center px-4 py-2 border-b border-[#f0eeea] last:border-b-0">
            <span className="text-xs text-vf-muted">{label}</span>
            <span className="text-xs font-medium">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
