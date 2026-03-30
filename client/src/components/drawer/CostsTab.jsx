export default function CostsTab({ costs }) {
  if (!costs || costs.length === 0) {
    return (
      <div className="text-center py-8 text-vf-muted text-sm">
        <p className="mb-2">No cost data available</p>
        <p className="text-xs">Upload P&L data via Import tab to populate</p>
      </div>
    );
  }

  const total = costs.reduce((s, c) => s + c.amountEur, 0);

  return (
    <div className="bg-white border border-vf-border rounded-[10px] p-4">
      <h4 className="text-[11px] font-semibold text-vf-muted uppercase tracking-wide mb-2.5">
        Cost Breakdown — {costs[0]?.fy || 'FY26'}
      </h4>
      {costs.map((c) => (
        <div key={c.id} className="flex justify-between items-center py-1.5 border-b border-[#f0eeea] last:border-b-0">
          <span className="text-xs text-vf-text">{c.component}</span>
          <span className="text-xs font-medium font-mono">€{c.amountEur.toFixed(1)}M</span>
        </div>
      ))}
      <div className="flex justify-between items-center pt-2 mt-1 border-t border-vf-border font-semibold">
        <span className="text-xs">Total Cost to Serve</span>
        <span className="text-xs font-mono text-vf-red">€{total.toFixed(1)}M</span>
      </div>
    </div>
  );
}
