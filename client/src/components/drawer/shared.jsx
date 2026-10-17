// Small building blocks shared by the product drawer tabs

export async function getJson(url) {
  const res = await fetch(url);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Could not load');
  return data;
}

// € amounts. `unit` is what the number is in: 'eur' (whole euros) or 'm' (€ millions)
export function fmtMoney(v, unit = 'eur') {
  if (v == null) return '—';
  const eur = unit === 'm' ? v * 1e6 : v;
  if (Math.abs(eur) >= 1e9) return `€${(eur / 1e9).toFixed(2)}B`;
  if (Math.abs(eur) >= 1e6) return `€${(eur / 1e6).toFixed(1)}M`;
  if (Math.abs(eur) >= 1e3) return `€${(eur / 1e3).toFixed(0)}K`;
  return `€${Math.round(eur)}`;
}

export function SectionTitle({ children, right }) {
  return (
    <div className="flex items-center justify-between mb-2">
      <h4 className="text-[11px] font-semibold text-vf-muted uppercase tracking-wide">{children}</h4>
      {right}
    </div>
  );
}

export function Stat({ label, value, sub, tone }) {
  return (
    <div className="bg-vf-surface border border-vf-border rounded-lg p-3">
      <div className="text-[10px] text-vf-muted uppercase tracking-wide font-semibold">{label}</div>
      <div className={`text-lg font-semibold font-mono mt-0.5 ${tone === 'red' ? 'text-vf-red' : 'text-vf-dark'}`}>{value}</div>
      {sub && <div className="text-[10px] text-vf-muted mt-0.5">{sub}</div>}
    </div>
  );
}

export function PlaceholderNote({ children }) {
  return (
    <div className="bg-amber-50 border border-amber-200 text-amber-900 text-[11px] px-3 py-2 rounded-lg mb-4">
      <span className="font-semibold">Placeholder figures</span> — {children}
    </div>
  );
}

// The products that share a product line, as small tiles (current product highlighted)
export function LineProducts({ productLine, products, currentId, note }) {
  return (
    <div className="mt-5">
      <SectionTitle>Products in {productLine} ({products.length})</SectionTitle>
      {note && <p className="text-[11px] text-vf-muted mb-2">{note}</p>}
      <div className="flex flex-wrap gap-1.5">
        {products.map((p) => (
          <span
            key={p.id}
            className={`px-2.5 py-1 rounded-md text-[11px] border ${p.id === currentId ? 'bg-red-50 border-red-200 text-vf-red font-semibold' : 'bg-white border-vf-border text-vf-text'}`}
          >
            {p.name}
          </span>
        ))}
        {products.length === 0 && <span className="text-[11px] text-vf-muted">—</span>}
      </div>
    </div>
  );
}

export function Loading() {
  return <div className="text-center py-8 text-vf-muted text-sm">Loading…</div>;
}

export function ErrorNote({ message }) {
  return <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 rounded-lg">{message}</div>;
}
