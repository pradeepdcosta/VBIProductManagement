import { fmtMoney, SectionTitle, PlaceholderNote } from './shared.jsx';

function Attainment({ label, target, achieved }) {
  const pct = target ? Math.round((achieved / target) * 100) : 0;
  const bar = pct >= 100 ? 'bg-vf-success' : pct >= 70 ? 'bg-vf-warn' : 'bg-vf-red';
  return (
    <div className="bg-vf-surface border border-vf-border rounded-lg p-4">
      <div className="text-[11px] font-semibold text-vf-muted uppercase tracking-wide mb-3">{label}</div>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <div className="text-[10px] text-vf-muted">Target this year</div>
          <div className="text-lg font-semibold font-mono text-vf-dark">{fmtMoney(target, 'm')}</div>
        </div>
        <div>
          <div className="text-[10px] text-vf-muted">Achieved so far</div>
          <div className="text-lg font-semibold font-mono text-vf-dark">{fmtMoney(achieved, 'm')}</div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 bg-[#e8e6e1] rounded overflow-hidden">
          <div className={`h-full rounded ${bar}`} style={{ width: `${Math.min(pct, 100)}%` }} />
        </div>
        <span className="text-sm font-bold font-mono text-vf-dark">{pct}%</span>
      </div>
    </div>
  );
}

// This year's AOV and revenue target vs achieved, summed across the three regions (€M)
export default function PerformanceTab({ trading }) {
  const rows = trading || [];
  if (rows.length === 0) {
    return <div className="text-center py-8 text-vf-muted text-sm">No business performance data for this product.</div>;
  }
  const sum = (k) => rows.reduce((s, t) => s + (t[k] || 0), 0);
  const fy = rows[0].fy;

  return (
    <div>
      {rows.some((t) => t.placeholder) && <PlaceholderNote>the same dummy trading profile is shown for every product until real trading data is uploaded.</PlaceholderNote>}
      <SectionTitle right={<span className="text-[10px] text-vf-muted">{fy} · all regions</span>}>Business Performance</SectionTitle>
      <div className="space-y-3">
        <Attainment label="AOV" target={sum('aovTarget')} achieved={sum('aovWonYtd')} />
        <Attainment label="Revenue" target={sum('targetEur')} achieved={sum('actualEur')} />
      </div>
    </div>
  );
}
