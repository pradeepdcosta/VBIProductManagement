import { useEffect, useState } from 'react';
import { getJson, fmtMoney, Stat, SectionTitle, PlaceholderNote, LineProducts, Loading, ErrorNote } from './shared.jsx';

// Costs are held per product line, so this shows the line's cost for every product on it
export default function CostsTab({ product, lineProducts }) {
  const [row, setRow] = useState(null);
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const line = new URLSearchParams({ family: product.family, productLine: product.productLine });
        const act = new URLSearchParams({ productFamily: product.family, productLine: product.productLine });
        const [costs, acts] = await Promise.all([getJson(`/api/costs?${line}`), getJson(`/api/costs/actions?${act}`)]);
        setRow(costs.rows.find((r) => r.productFamily === product.family && r.productLine === product.productLine) || null);
        setActions(acts);
      } catch (err) { setError(err.message); }
      setLoading(false);
    })();
  }, [product.id]);

  if (loading) return <Loading />;
  if (error) return <ErrorNote message={error} />;
  if (!row) return <div className="text-center py-8 text-vf-muted text-sm">No cost data for this product line.</div>;

  const open = actions.filter((a) => a.status !== 'Completed' && a.status !== 'Cancelled');

  return (
    <div>
      {row.placeholder && <PlaceholderNote>this product line shows the dummy cost profile until real costs are entered in Cost Management.</PlaceholderNote>}

      <SectionTitle right={<span className="text-[0.625rem] text-vf-muted">{row.fy} · product line level</span>}>Cost to Serve</SectionTitle>
      <div className="grid grid-cols-3 gap-2.5">
        <Stat label="Opex" value={fmtMoney(row.opex)} />
        <Stat label="Depreciation" value={fmtMoney(row.dep)} />
        <Stat label="Total Cost" value={fmtMoney(row.grandTotal)} tone="red" sub={`Direct ${fmtMoney(row.direct)} · Allocations ${fmtMoney(row.allocations)}`} />
      </div>

      <LineProducts
        productLine={product.productLine}
        products={lineProducts}
        currentId={product.id}
        note="Cost is tracked for the whole product line and shared by these products."
      />

      <div className="mt-5">
        <SectionTitle>Open cost reduction actions ({open.length})</SectionTitle>
        {open.length === 0 ? (
          <p className="text-[0.6875rem] text-vf-muted italic">None planned.</p>
        ) : (
          <ul className="space-y-1.5">
            {open.map((a) => (
              <li key={a.id} className="text-xs text-vf-text border border-vf-border rounded-md px-3 py-2 bg-white">{a.action}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
