export default function BusinessCaseTab({ bizCase }) {
  if (!bizCase) {
    return (
      <div className="text-center py-8 text-vf-muted text-sm">
        <p className="mb-2">No business case available</p>
        <p className="text-xs">Create a business case for this product</p>
      </div>
    );
  }

  const statusCls =
    bizCase.status === 'Approved' ? 'status-approved' :
    bizCase.status === 'In Review' ? 'status-review' :
    bizCase.status === 'Rejected' ? 'status-rejected' : 'status-draft';

  return (
    <div className="bg-white border border-vf-border rounded-[10px] p-4">
      <div className="flex items-center gap-2 mb-4">
        <h4 className="text-sm font-semibold flex-1">Business Case</h4>
        <span className={`${statusCls} px-2 py-0.5 rounded-full text-[10px] font-semibold`}>
          {bizCase.status}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-vf-surface rounded-lg p-3 text-center">
          <div className="text-lg font-semibold font-mono">
            {bizCase.npv != null ? `€${bizCase.npv.toFixed(1)}M` : '—'}
          </div>
          <div className="text-[10px] text-vf-muted mt-0.5">NPV</div>
        </div>
        <div className="bg-vf-surface rounded-lg p-3 text-center">
          <div className="text-lg font-semibold font-mono">
            {bizCase.irr != null ? `${bizCase.irr.toFixed(1)}%` : '—'}
          </div>
          <div className="text-[10px] text-vf-muted mt-0.5">IRR</div>
        </div>
        <div className="bg-vf-surface rounded-lg p-3 text-center">
          <div className="text-lg font-semibold font-mono">
            {bizCase.paybackMonths != null ? `${bizCase.paybackMonths}mo` : '—'}
          </div>
          <div className="text-[10px] text-vf-muted mt-0.5">Payback</div>
        </div>
      </div>

      {bizCase.summary && (
        <div>
          <div className="text-[11px] font-semibold text-vf-muted uppercase tracking-wide mb-1">Summary</div>
          <p className="text-xs text-vf-text leading-relaxed">{bizCase.summary}</p>
        </div>
      )}
    </div>
  );
}
