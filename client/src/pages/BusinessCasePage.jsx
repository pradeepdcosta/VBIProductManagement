import { useEffect, useState, useRef } from 'react';
import useProductStore from '../store/useProductStore.js';

const FY_COLS = ['fy27', 'fy28', 'fy29', 'fy30', 'fy31'];
const FY_LABELS = ['FY27 (€m)', 'FY28 (€m)', 'FY29 (€m)', 'FY30 (€m)', 'FY31 (€m)'];

function fmtVal(v) {
  if (v == null) return '-';
  if (v < 0) return `(${Math.abs(v).toFixed(1)})`;
  return v.toFixed(1);
}

function fmtTotal(line) {
  const sum = FY_COLS.reduce((s, k) => s + (line[k] || 0), 0);
  if (sum === 0 && FY_COLS.every(k => line[k] == null)) return '-';
  return fmtVal(sum);
}

const SECTION_COLORS = {
  Revenue: 'bg-red-50',
  'Cost of Sale': 'bg-orange-50',
  Margin: 'bg-yellow-50',
  OpEx: 'bg-purple-50',
  EBITDA: 'bg-green-50',
  CapEx: 'bg-blue-50',
  'Cash Flow': 'bg-emerald-50',
};

const STATUS_STYLE = {
  Approved: 'bg-green-600 text-white',
  'In Review': 'bg-yellow-500 text-black',
  Draft: 'bg-gray-500 text-white',
};

function PnLDetail({ bizCase, product, onBack }) {
  const lines = bizCase.lines || [];
  let lastSection = '';

  return (
    <div>
      <button
        className="mb-4 text-xs text-vf-red font-semibold hover:underline cursor-pointer"
        onClick={onBack}
      >
        ← Back to product list
      </button>

      <div className="bg-white border border-vf-border rounded-[10px] overflow-hidden">
        {/* Header */}
        <div className="bg-vf-dark text-white px-4 py-3 flex items-center justify-between">
          <div>
            <div className="text-[13px] font-semibold">{product.name}</div>
            <div className="text-[10px] text-gray-400 mt-0.5">VBI Business Case P&L</div>
          </div>
          <div className="flex gap-4 text-[11px]">
            {bizCase.status && (
              <span className={`px-2 py-0.5 rounded-full font-semibold ${STATUS_STYLE[bizCase.status] || 'bg-gray-500 text-white'}`}>
                {bizCase.status}
              </span>
            )}
          </div>
        </div>

        {lines.length === 0 ? (
          <div className="px-4 py-6 text-center text-vf-muted text-xs">
            No P&L line items uploaded yet.
          </div>
        ) : (
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-vf-red text-white">
                <th className="text-left px-3 py-2 font-semibold text-[11px] w-[280px]">Business Case P&L</th>
                {FY_LABELS.map(l => (
                  <th key={l} className="text-right px-3 py-2 font-semibold text-[11px] w-[90px]">{l}</th>
                ))}
                <th className="text-right px-3 py-2 font-semibold text-[11px] w-[110px]">Total FY27-FY31 (€m)</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line, idx) => {
                const showSection = line.section !== lastSection;
                lastSection = line.section;
                const isNeg = FY_COLS.some(k => line[k] != null && line[k] < 0);
                const sectionBg = SECTION_COLORS[line.section] || '';

                return (
                  <tr
                    key={idx}
                    className={`border-b border-[#f0eeea] ${line.isTotal ? 'font-semibold' : ''} ${
                      line.isTotal ? sectionBg : ''
                    } hover:bg-[#fdf9f9] transition-colors`}
                  >
                    <td className={`px-3 py-1.5 ${line.isTotal ? 'font-semibold text-vf-dark' : 'text-vf-text pl-6'}`}>
                      {line.lineItem}
                    </td>
                    {FY_COLS.map(k => (
                      <td
                        key={k}
                        className={`px-3 py-1.5 text-right font-mono ${
                          line[k] != null && line[k] < 0 ? 'text-red-600' : ''
                        }`}
                      >
                        {fmtVal(line[k])}
                      </td>
                    ))}
                    <td className={`px-3 py-1.5 text-right font-mono font-semibold ${isNeg ? 'text-red-600' : ''}`}>
                      {fmtTotal(line)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Summary section */}
        {(bizCase.npv != null || bizCase.roi != null || bizCase.irr != null || bizCase.paybackMonths != null) && (
          <div className="border-t border-vf-border px-4 py-3 bg-vf-surface">
            <div className="text-[11px] font-semibold text-vf-muted uppercase tracking-wide mb-2">FY27-FY31 Summary</div>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <div className="text-[10px] text-vf-muted">NPV</div>
                <div className="text-sm font-semibold font-mono">{bizCase.npv != null ? `€${bizCase.npv.toFixed(1)}M` : '—'}</div>
              </div>
              <div>
                <div className="text-[10px] text-vf-muted">RoI</div>
                <div className="text-sm font-semibold font-mono">{bizCase.roi != null ? `${bizCase.roi.toFixed(1)}%` : '—'}</div>
              </div>
              <div>
                <div className="text-[10px] text-vf-muted">IRR</div>
                <div className="text-sm font-semibold font-mono">{bizCase.irr != null ? `${bizCase.irr.toFixed(1)}%` : '—'}</div>
              </div>
              <div>
                <div className="text-[10px] text-vf-muted">Payback</div>
                <div className="text-sm font-semibold font-mono">{bizCase.paybackMonths != null ? `${(bizCase.paybackMonths / 12).toFixed(1)} yrs` : '—'}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function BusinessCasePage() {
  const { filters, getFilterParams, showToast } = useProductStore();
  const [allProducts, setAllProducts] = useState([]);
  const [bizCaseMap, setBizCaseMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Upload state
  const [showUpload, setShowUpload] = useState(false);
  const [uploadProducts, setUploadProducts] = useState([]);
  const [uploadProductId, setUploadProductId] = useState('');
  const [uploadCat, setUploadCat] = useState('');
  const [uploadFam, setUploadFam] = useState('');
  const [uploadLine, setUploadLine] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const qs = getFilterParams();
      const [productsRes, casesRes] = await Promise.all([
        fetch(`/api/products?limit=5000${qs ? '&' + qs : ''}`),
        fetch(`/api/products/bizcase${qs ? '?' + qs : ''}`),
      ]);
      const productsData = await productsRes.json();
      const casesData = await casesRes.json();

      setAllProducts(productsData.data || []);

      const caseMap = {};
      for (const bc of casesData) {
        caseMap[bc.product.id] = bc;
      }
      setBizCaseMap(caseMap);
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    setSelectedProduct(null);
    fetchData();
  }, [filters.category, filters.family, filters.productLine, filters.q]);

  // Fetch all products for upload dropdown (unfiltered)
  useEffect(() => {
    if (!showUpload) return;
    (async () => {
      try {
        const res = await fetch('/api/products?limit=5000');
        const data = await res.json();
        setUploadProducts(data.data || []);
      } catch {}
    })();
  }, [showUpload]);

  // Upload filter derivations
  const uploadCategories = [...new Set(uploadProducts.map(p => p.category))].sort();
  const uploadFamilies = [...new Set(uploadProducts.filter(p => !uploadCat || p.category === uploadCat).map(p => p.family))].sort();
  const uploadLines = [...new Set(uploadProducts.filter(p => (!uploadCat || p.category === uploadCat) && (!uploadFam || p.family === uploadFam)).map(p => p.productLine))].sort();
  const filteredUploadProducts = uploadProducts.filter(p =>
    (!uploadCat || p.category === uploadCat) &&
    (!uploadFam || p.family === uploadFam) &&
    (!uploadLine || p.productLine === uploadLine)
  );

  const handleUpload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!uploadProductId) { showToast('Select a product first', 'warning'); return; }
    if (!file) { showToast('Select a file to upload', 'warning'); return; }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`/api/upload/bizcase?productId=${uploadProductId}`, { method: 'POST', body: formData });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'Business case uploaded');
        setShowUpload(false);
        setUploadProductId('');
        if (fileRef.current) fileRef.current.value = '';
        fetchData();
      } else {
        showToast(data.error || 'Upload failed', 'warning');
      }
    } catch { showToast('Upload failed', 'warning'); }
    setUploading(false);
  };

  const handleDownloadTemplate = async () => {
    try {
      const res = await fetch('/api/export/bizcase-template');
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'vbi_business_case_template.xlsx';
      a.click();
      URL.revokeObjectURL(url);
      showToast('Template downloaded');
    } catch { showToast('Download failed', 'warning'); }
  };

  // Detail view
  if (selectedProduct) {
    const bc = bizCaseMap[selectedProduct.id];
    return (
      <div className="p-5">
        <PnLDetail
          bizCase={bc}
          product={selectedProduct}
          onBack={() => setSelectedProduct(null)}
        />
      </div>
    );
  }

  // List view
  return (
    <div className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold">Business Cases</h2>
        <div className="flex gap-2">
          <button
            className="border border-vf-border bg-white rounded-md px-3 py-1.5 text-xs cursor-pointer font-sans text-vf-muted hover:bg-vf-surface"
            onClick={handleDownloadTemplate}
          >
            Download Template
          </button>
          <button
            className="bg-vf-red text-white rounded-md px-3 py-1.5 text-xs cursor-pointer font-sans font-semibold hover:bg-red-700"
            onClick={() => setShowUpload(!showUpload)}
          >
            {showUpload ? 'Cancel' : 'Upload Business Case'}
          </button>
        </div>
      </div>

      {/* Upload panel */}
      {showUpload && (
        <div className="bg-white border border-vf-border rounded-[10px] p-4 mb-4">
          <div className="text-[13px] font-semibold mb-3">Upload Business Case</div>
          <div className="flex gap-3 mb-3">
            <div className="flex-1">
              <label className="text-[11px] text-vf-muted block mb-1">Category</label>
              <select className="w-full border border-vf-border rounded-md px-2.5 py-1.5 text-xs bg-white" value={uploadCat}
                onChange={(e) => { setUploadCat(e.target.value); setUploadFam(''); setUploadLine(''); setUploadProductId(''); }}>
                <option value="">All Categories</option>
                {uploadCategories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="text-[11px] text-vf-muted block mb-1">Family</label>
              <select className="w-full border border-vf-border rounded-md px-2.5 py-1.5 text-xs bg-white" value={uploadFam}
                onChange={(e) => { setUploadFam(e.target.value); setUploadLine(''); setUploadProductId(''); }}>
                <option value="">All Families</option>
                {uploadFamilies.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="text-[11px] text-vf-muted block mb-1">Product Line</label>
              <select className="w-full border border-vf-border rounded-md px-2.5 py-1.5 text-xs bg-white" value={uploadLine}
                onChange={(e) => { setUploadLine(e.target.value); setUploadProductId(''); }}>
                <option value="">All Product Lines</option>
                {uploadLines.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
          </div>
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="text-[11px] text-vf-muted block mb-1">Product ({filteredUploadProducts.length})</label>
              <select className="w-full border border-vf-border rounded-md px-2.5 py-1.5 text-xs bg-white" value={uploadProductId}
                onChange={(e) => setUploadProductId(e.target.value)}>
                <option value="">Select a product...</option>
                {filteredUploadProducts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="text-[11px] text-vf-muted block mb-1">Business Case File (.xlsx)</label>
              <input ref={fileRef} type="file" accept=".xlsx" className="w-full border border-vf-border rounded-md px-2.5 py-1.5 text-xs bg-white" />
            </div>
            <button className="bg-vf-red text-white rounded-md px-4 py-1.5 text-xs cursor-pointer font-sans font-semibold hover:bg-red-700 disabled:opacity-50"
              onClick={handleUpload} disabled={uploading}>
              {uploading ? 'Uploading...' : 'Upload'}
            </button>
          </div>
          <div className="text-[10px] text-vf-muted mt-2">
            Filter by category, family, and product line to find your product, then upload the filled-in template.
          </div>
        </div>
      )}

      {/* Product list */}
      {loading ? (
        <div className="text-center py-8 text-vf-muted text-sm">Loading...</div>
      ) : allProducts.length === 0 ? (
        <div className="text-center py-12 text-vf-muted">
          <div className="text-sm font-medium mb-1">No products match the current filters</div>
        </div>
      ) : (
        <div className="bg-white border border-vf-border rounded-[10px] overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-vf-surface border-b border-vf-border">
                <th className="text-left px-4 py-2.5 font-semibold text-[11px] text-vf-muted uppercase tracking-wide">Product</th>
                <th className="text-left px-4 py-2.5 font-semibold text-[11px] text-vf-muted uppercase tracking-wide">Category</th>
                <th className="text-left px-4 py-2.5 font-semibold text-[11px] text-vf-muted uppercase tracking-wide">Family</th>
                <th className="text-center px-4 py-2.5 font-semibold text-[11px] text-vf-muted uppercase tracking-wide">Business Case</th>
                <th className="text-center px-4 py-2.5 font-semibold text-[11px] text-vf-muted uppercase tracking-wide">Status</th>
                <th className="text-right px-4 py-2.5 font-semibold text-[11px] text-vf-muted uppercase tracking-wide">NPV</th>
              </tr>
            </thead>
            <tbody>
              {allProducts.map((product) => {
                const bc = bizCaseMap[product.id];
                const hasCase = !!bc;
                const hasLines = hasCase && bc.lines && bc.lines.length > 0;

                return (
                  <tr
                    key={product.id}
                    className={`border-b border-[#f0eeea] transition-colors ${
                      hasCase ? 'hover:bg-[#fdf9f9] cursor-pointer' : 'opacity-60'
                    }`}
                    onClick={() => hasCase && setSelectedProduct(product)}
                  >
                    <td className="px-4 py-2.5 font-medium text-vf-dark">{product.name}</td>
                    <td className="px-4 py-2.5 text-vf-muted">{product.category}</td>
                    <td className="px-4 py-2.5 text-vf-muted">{product.family}</td>
                    <td className="px-4 py-2.5 text-center">
                      {hasLines ? (
                        <span className="inline-block w-2 h-2 rounded-full bg-green-500" title="P&L uploaded" />
                      ) : hasCase ? (
                        <span className="inline-block w-2 h-2 rounded-full bg-yellow-400" title="Case exists, no P&L lines" />
                      ) : (
                        <span className="inline-block w-2 h-2 rounded-full bg-gray-300" title="No business case" />
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {bc?.status ? (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${STATUS_STYLE[bc.status] || 'bg-gray-500 text-white'}`}>
                          {bc.status}
                        </span>
                      ) : (
                        <span className="text-vf-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono">
                      {bc?.npv != null ? `€${bc.npv.toFixed(1)}M` : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
