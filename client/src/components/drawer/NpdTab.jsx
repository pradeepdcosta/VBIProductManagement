const STAGES = [
  { key: 'concept', label: 'Concept' },
  { key: 'bizCase', label: 'Biz Case' },
  { key: 'design', label: 'Design' },
  { key: 'gtm', label: 'GTM' },
  { key: 'salesEnable', label: 'Sales Enable' },
  { key: 'distribution', label: 'Distrib.' },
  { key: 'slaDefinition', label: 'SLA' },
  { key: 'launch', label: 'Launch' },
];

function StageDot({ value }) {
  const cls = value === 1 ? 'stage-done' : value === 2 ? 'stage-active' : 'stage-todo';
  const label = value === 1 ? '✓' : value === 2 ? '●' : '—';
  return (
    <div className={`${cls} w-[28px] h-[28px] rounded-full flex items-center justify-center text-[10px] font-bold`}>
      {label}
    </div>
  );
}

export default function NpdTab({ npd }) {
  if (!npd) {
    return (
      <div className="text-center py-8 text-vf-muted text-sm">
        <p className="mb-2">No NPD data available</p>
        <p className="text-xs">Upload NPD pipeline data to populate</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        {STAGES.map((stage) => (
          <div key={stage.key} className="flex flex-col items-center gap-1.5 flex-1">
            <StageDot value={npd[stage.key]} />
            <span className="text-[9px] text-vf-muted text-center leading-tight">{stage.label}</span>
          </div>
        ))}
      </div>

      {npd.owner && (
        <div className="bg-vf-surface border border-vf-border rounded-lg p-3 mt-4">
          <div className="text-[11px] text-vf-muted mb-1">Owner</div>
          <div className="text-xs font-medium">{npd.owner}</div>
        </div>
      )}

      <div className="flex gap-4 mt-4 text-[11px] text-vf-muted items-center">
        <span><span className="inline-block w-3 h-3 rounded-full bg-vf-success mr-1 align-middle" />Complete</span>
        <span><span className="inline-block w-3 h-3 rounded-full bg-vf-red mr-1 align-middle" />In progress</span>
        <span><span className="inline-block w-3 h-3 rounded-full bg-[#e8e6e1] mr-1 align-middle" />Not started</span>
      </div>
    </div>
  );
}
