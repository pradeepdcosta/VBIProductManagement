import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getJson, fmtMoney, Stat, SectionTitle, LineProducts, Loading, ErrorNote } from './shared.jsx';

const STATUS_STYLE = {
  Approved: 'bg-green-600 text-white',
  'In Review': 'bg-yellow-400 text-black',
  Draft: 'bg-gray-500 text-white',
};

const FY = ['fy27', 'fy28', 'fy29', 'fy30', 'fy31'];
const fiveYear = (calc, item) => {
  const cells = FY.map((fy) => calc?.[item]?.[fy]).filter((v) => v != null);
  return cells.length ? cells.reduce((s, v) => s + v, 0) : null;
};

// Business cases are held per product line; shows the line's case for every product on it
export default function BusinessCaseTab({ product, lineProducts, onOpenCase }) {
  const navigate = useNavigate();
  const [bc, setBc] = useState(undefined);
  const [error, setError] = useState(null);

  useEffect(() => {
    setBc(undefined);
    const params = new URLSearchParams({ productFamily: product.family, productLine: product.productLine });
    getJson(`/api/business-cases/line?${params}`).then((j) => setBc(j.case)).catch((err) => setError(err.message));
  }, [product.id]);

  if (error) return <ErrorNote message={error} />;
  if (bc === undefined) return <Loading />;

  const openCase = () => {
    onOpenCase?.();
    navigate(`/business-case?line=${encodeURIComponent(`${product.family}|${product.productLine}`)}`);
  };

  const products = (
    <LineProducts
      productLine={product.productLine}
      products={lineProducts}
      currentId={product.id}
      note="The business case covers the whole product line and these products."
    />
  );

  if (!bc) {
    return (
      <div>
        <div className="text-center py-6 border border-dashed border-vf-border rounded-lg">
          <p className="text-sm text-vf-muted mb-3">No business case for {product.productLine} yet.</p>
          <button onClick={openCase} className="text-xs font-semibold text-vf-red hover:underline">Create it in Business Case →</button>
        </div>
        {products}
      </div>
    );
  }

  const k = bc.calculated;
  const revenue = fiveYear(k, 'Total Revenue');
  const margin = fiveYear(k, 'Total Sales variable margin');

  return (
    <div>
      <SectionTitle right={<span className={`px-2 py-0.5 rounded-full text-[0.625rem] font-semibold ${STATUS_STYLE[bc.status] || 'bg-gray-500 text-white'}`}>{bc.status}</span>}>
        Business Case · FY27–FY31
      </SectionTitle>
      <div className="grid grid-cols-2 gap-2.5">
        <Stat label="Total Revenue" value={fmtMoney(revenue, 'm')} />
        <Stat label="Sales Variable Margin" value={fmtMoney(margin, 'm')} sub={revenue ? `${Math.round((margin / revenue) * 100)}% of revenue` : null} />
        <Stat label="EBITDA" value={fmtMoney(fiveYear(k, 'EBITDA'), 'm')} />
        <Stat label="Incremental Cash Flow" value={fmtMoney(fiveYear(k, 'Incremental Cash flow'), 'm')} />
      </div>
      <div className="grid grid-cols-3 gap-2.5 mt-2.5">
        <Stat label="NPV" value={bc.npv != null ? fmtMoney(bc.npv, 'm') : '—'} />
        <Stat label="IRR" value={bc.irr != null ? `${bc.irr.toFixed(1)}%` : '—'} />
        <Stat label="Payback" value={bc.paybackYears != null ? `${bc.paybackYears} yrs` : '—'} />
      </div>
      <button onClick={openCase} className="mt-3 text-xs font-semibold text-vf-red hover:underline">Open full business case →</button>
      {products}
    </div>
  );
}
