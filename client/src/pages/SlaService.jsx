import { useEffect, useState } from 'react';
import useProductStore from '../store/useProductStore.js';

export default function SlaService() {
  const { openDrawer, showToast, filters, getFilterParams } = useProductStore();
  const [slaProducts, setSlaProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const qs = getFilterParams();
        const res = await fetch(`/api/products/sla${qs ? '?' + qs : ''}`);
        const allSla = await res.json();
        setSlaProducts(allSla.map((s) => ({ product: s.product, sla: s })));
      } catch {}
      setLoading(false);
    })();
  }, [filters.category, filters.family, filters.productLine, filters.q]);

  return (
    <div className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold">SLA & Service Aspects</h2>
        <button
          className="border border-vf-border bg-white rounded-md px-3 py-1.5 text-xs cursor-pointer font-sans text-vf-muted hover:bg-vf-surface"
          onClick={() => showToast('Upload SLA data via Import tab', 'info')}
        >
          Upload →
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-vf-muted text-sm">Loading SLA data...</div>
      ) : slaProducts.length === 0 ? (
        <div className="text-center py-8 text-vf-muted text-sm">No SLA data. Upload via Import tab.</div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {slaProducts.map(({ product, sla }) => (
            <div
              key={product.id}
              className="bg-white border border-vf-border rounded-[10px] p-4 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => openDrawer(product.id)}
            >
              <h4 className="text-[13px] font-semibold mb-3 text-vf-dark">{product.name}</h4>
              {[
                ['Availability', sla.availability],
                ['MTTR', sla.mttr],
                ['Response Time', sla.responseTime],
                ['Support Hours', sla.supportHours],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between items-center py-1.5 border-b border-[#f0eeea] last:border-b-0">
                  <span className="text-[11px] text-vf-muted">{label}</span>
                  <span className="text-[11px] font-medium font-mono">{value}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
