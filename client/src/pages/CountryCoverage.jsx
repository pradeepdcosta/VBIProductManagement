import { useEffect, useState } from 'react';
import useProductStore from '../store/useProductStore.js';

const COUNTRIES = ['UK', 'DE', 'IT', 'ES', 'NL', 'PT', 'US', 'ZA', 'IN', 'AU', 'JP', 'SG', 'AE', 'NG'];

const statusIcon = {
  available: '🟢',
  partial: '🟡',
  unavailable: '🔴',
  na: '⚪',
};

export default function CountryCoverage() {
  const { openDrawer, showToast, filters, getFilterParams } = useProductStore();
  const [coverageData, setCoverageData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const qs = getFilterParams();
        const res = await fetch(`/api/products/coverage${qs ? '?' + qs : ''}`);
        const allCoverage = await res.json();
        const map = new Map();
        for (const c of allCoverage) {
          const key = c.product.id;
          if (!map.has(key)) map.set(key, { product: c.product, coverageMap: {} });
          map.get(key).coverageMap[c.countryCode] = c.status;
        }
        setCoverageData([...map.values()]);
      } catch {}
      setLoading(false);
    })();
  }, [filters.category, filters.family, filters.productLine, filters.q]);

  return (
    <div className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold">Country Coverage Matrix</h2>
        <button
          className="border border-vf-border bg-white rounded-md px-3 py-1.5 text-xs cursor-pointer font-sans text-vf-muted hover:bg-vf-surface"
          onClick={() => showToast('Upload coverage matrix via Import tab', 'info')}
        >
          Upload →
        </button>
      </div>

      <div className="bg-white border border-vf-border rounded-[10px] overflow-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr>
              <th className="px-3 py-2 text-left border-b border-vf-border bg-vf-surface text-[11px] font-semibold text-vf-muted whitespace-nowrap">
                Product
              </th>
              {COUNTRIES.map((cc) => (
                <th key={cc} className="px-3 py-2 border-b border-vf-border bg-vf-surface text-[11px] font-semibold text-vf-muted whitespace-nowrap text-center">
                  {cc}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={COUNTRIES.length + 1} className="p-8 text-center text-vf-muted text-sm">
                  Loading coverage data...
                </td>
              </tr>
            ) : coverageData.length === 0 ? (
              <tr>
                <td colSpan={COUNTRIES.length + 1} className="p-8 text-center text-vf-muted text-sm">
                  No coverage data. Upload via Import tab.
                </td>
              </tr>
            ) : (
              coverageData.map(({ product, coverageMap }) => (
                <tr
                  key={product.id}
                  className="border-b border-[#f0eeea] cursor-pointer hover:bg-[#fdf9f9] transition-colors"
                  onClick={() => openDrawer(product.id)}
                >
                  <td className="px-3 py-2 text-left font-medium whitespace-nowrap">{product.name}</td>
                  {COUNTRIES.map((cc) => (
                    <td key={cc} className="px-3 py-2 text-center">
                      {statusIcon[coverageMap[cc]] || '⚪'}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-2.5 text-[11px] text-vf-muted">
        🟢 Available &nbsp;🟡 Partial &nbsp;🔴 Not available &nbsp;⚪ N/A
      </div>
    </div>
  );
}
