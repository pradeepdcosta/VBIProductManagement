export default function TradingTab({ trading }) {
  if (!trading || trading.length === 0) {
    return (
      <div className="text-center py-8 text-vf-muted text-sm">
        <p className="mb-2">No trading data available</p>
        <p className="text-xs">Upload trading data to populate</p>
      </div>
    );
  }

  const maxVal = Math.max(...trading.map((t) => Math.max(t.actualEur, t.targetEur)));

  return (
    <div>
      {trading.map((t) => {
        const pct = maxVal > 0 ? (t.actualEur / t.targetEur) * 100 : 0;
        const barWidth = maxVal > 0 ? (t.actualEur / maxVal) * 100 : 0;
        const targetWidth = maxVal > 0 ? (t.targetEur / maxVal) * 100 : 0;

        return (
          <div key={t.id} className="mb-4">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-medium">{t.region}</span>
              <span className="text-xs text-vf-muted font-mono">
                €{t.actualEur.toFixed(1)}M / €{t.targetEur.toFixed(1)}M ({Math.round(pct)}%)
              </span>
            </div>
            <div className="relative h-2 bg-[#f0eeea] rounded">
              <div
                className="absolute h-full rounded opacity-30 bg-[#bbb]"
                style={{ width: `${targetWidth}%` }}
              />
              <div
                className={`absolute h-full rounded ${pct >= 100 ? 'bg-vf-success' : pct >= 80 ? 'bg-vf-warn' : 'bg-vf-red'}`}
                style={{ width: `${barWidth}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
