import CategoryBadge from '../CategoryBadge.jsx';

export default function OverviewTab({ product }) {
  const p = product;
  const rows = [
    ['Category', <CategoryBadge key="cat" category={p.category} />],
    ['Family', p.family],
    ['Product Line', p.productLine],
    ['Status', p.status],
    ['Owner', p.owner],
  ];

  return (
    <div className="bg-white border border-vf-border rounded-lg overflow-hidden">
      <div className="px-4 py-2.5 border-b border-vf-border bg-vf-surface text-[0.6875rem] font-semibold text-vf-muted uppercase tracking-wide">
        Key Attributes
      </div>
      {rows.map(([label, value]) => (
        <div key={label} className="flex justify-between items-center gap-4 px-4 py-2 border-b border-[#f0eeea] last:border-b-0">
          <span className="text-xs text-vf-muted">{label}</span>
          <span className="text-xs font-medium text-right break-all">{value || '—'}</span>
        </div>
      ))}
    </div>
  );
}
