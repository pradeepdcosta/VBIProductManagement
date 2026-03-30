const COUNTRIES = ['UK', 'DE', 'IT', 'ES', 'NL', 'PT', 'US', 'ZA', 'IN', 'AU', 'JP', 'SG', 'AE', 'NG'];

const statusIcon = {
  available: '🟢',
  partial: '🟡',
  unavailable: '🔴',
  na: '⚪',
};

export default function CoverageTab({ coverage }) {
  if (!coverage || coverage.length === 0) {
    return (
      <div className="text-center py-8 text-vf-muted text-sm">
        <p className="mb-2">No coverage data available</p>
        <p className="text-xs">Upload coverage matrix to populate</p>
      </div>
    );
  }

  const coverageMap = {};
  coverage.forEach((c) => {
    coverageMap[c.countryCode] = c.status;
  });

  return (
    <div>
      <div className="grid grid-cols-7 gap-2">
        {COUNTRIES.map((cc) => {
          const status = coverageMap[cc] || 'na';
          return (
            <div key={cc} className="flex flex-col items-center gap-1 p-2 bg-vf-surface rounded-lg border border-vf-border">
              <span className="text-lg">{statusIcon[status] || '⚪'}</span>
              <span className="text-[10px] font-semibold text-vf-muted">{cc}</span>
            </div>
          );
        })}
      </div>
      <div className="mt-3 text-[11px] text-vf-muted">
        🟢 Available &nbsp;🟡 Partial &nbsp;🔴 Not available &nbsp;⚪ N/A
      </div>
    </div>
  );
}
