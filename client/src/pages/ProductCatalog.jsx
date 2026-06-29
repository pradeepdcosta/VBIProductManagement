import { useEffect, useState } from 'react';
import { ChevronRight, ArrowLeft, Layers } from 'lucide-react';
import useProductStore from '../store/useProductStore.js';

const CATEGORY_ORDER = [
  'Mobile Connectivity',
  'Fixed Connectivity',
  'IoT',
  'Cloud and Security',
  'Converged Comms',
  'Carrier',
  'Services',
  'Other',
];

const CATEGORY_STYLE = {
  'Fixed Connectivity': { bg: '#e8f4fe', text: '#1355a0', border: '#b8d8fc' },
  'Mobile Connectivity': { bg: '#e8fef0', text: '#1a6b3a', border: '#b0e8c8' },
  'Cloud and Security':  { bg: '#f0e8fe', text: '#5a1a90', border: '#d0b0f8' },
  'IoT':                 { bg: '#fef3e8', text: '#8a4a00', border: '#f8d8a0' },
  'Converged Comms':     { bg: '#feeae8', text: '#8a1a10', border: '#f8c0b8' },
  'Services':            { bg: '#e8f0fe', text: '#1a3a90', border: '#b0c8f8' },
  'Carrier':             { bg: '#f0fee8', text: '#1a5a10', border: '#b8e8b0' },
  'Other':               { bg: '#f0eeea', text: '#4a4a42', border: '#d8d4d0' },
};

function getStyle(category) {
  return CATEGORY_STYLE[category] || CATEGORY_STYLE['Other'];
}

export default function ProductCatalog() {
  const { openDrawer } = useProductStore();
  const [view, setView] = useState('categories'); // 'categories' | 'products'
  const [summary, setSummary] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [categoryProducts, setCategoryProducts] = useState([]);
  const [loadingCat, setLoadingCat] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(true);

  useEffect(() => {
    fetch('/api/products/summary')
      .then(r => r.json())
      .then(data => { setSummary(data); setSummaryLoading(false); })
      .catch(() => setSummaryLoading(false));
  }, []);

  const openCategory = async (cat) => {
    setSelectedCategory(cat);
    setView('products');
    setLoadingCat(true);
    try {
      const res = await fetch(`/api/products?category=${encodeURIComponent(cat.category)}&limit=999`);
      const json = await res.json();
      setCategoryProducts(json.data);
    } finally {
      setLoadingCat(false);
    }
  };

  const goBack = () => {
    setView('categories');
    setSelectedCategory(null);
    setCategoryProducts([]);
  };

  // Group products by family
  const byFamily = categoryProducts.reduce((acc, p) => {
    (acc[p.family] = acc[p.family] || []).push(p);
    return acc;
  }, {});

  const totalProducts = summary.reduce((s, c) => s + c.products, 0);

  return (
    <div className="p-5">
      {view === 'categories' ? (
        <>
          {/* Top stats */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-white border border-vf-border rounded-[10px] px-5 py-4">
              <div className="text-2xl font-semibold text-vf-dark">{totalProducts || '—'}</div>
              <div className="text-[11px] text-vf-muted mt-0.5 uppercase tracking-wide font-medium">Total Products</div>
            </div>
            <div className="bg-white border border-vf-border rounded-[10px] px-5 py-4">
              <div className="text-2xl font-semibold text-vf-dark">{summary.length || '—'}</div>
              <div className="text-[11px] text-vf-muted mt-0.5 uppercase tracking-wide font-medium">Categories</div>
            </div>
            <div className="bg-white border border-vf-border rounded-[10px] px-5 py-4">
              <div className="text-2xl font-semibold text-vf-dark">
                {summary.reduce((s, c) => s + c.families, 0) || '—'}
              </div>
              <div className="text-[11px] text-vf-muted mt-0.5 uppercase tracking-wide font-medium">Product Families</div>
            </div>
          </div>

          {/* Category cards */}
          <div className="grid grid-cols-4 gap-4">
            {summaryLoading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="bg-white border border-vf-border rounded-xl p-5 animate-pulse h-36" />
                ))
              : [...summary].sort((a, b) => {
                const ai = CATEGORY_ORDER.indexOf(a.category);
                const bi = CATEGORY_ORDER.indexOf(b.category);
                return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
              }).map((cat) => {
                  const s = getStyle(cat.category);
                  return (
                    <button
                      key={cat.category}
                      onClick={() => openCategory(cat)}
                      className="bg-white border border-vf-border rounded-xl p-5 text-left hover:shadow-md transition-all hover:-translate-y-0.5 group cursor-pointer"
                    >
                      {/* Colour strip */}
                      <div
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold mb-3"
                        style={{ background: s.bg, color: s.text, border: `1px solid ${s.border}` }}
                      >
                        <Layers size={11} />
                        {cat.category}
                      </div>

                      <div className="flex items-end justify-between">
                        <div>
                          <div className="text-2xl font-bold text-vf-dark">{cat.products}</div>
                          <div className="text-[11px] text-vf-muted mt-0.5">products</div>
                        </div>
                        <ChevronRight
                          size={18}
                          className="text-vf-muted group-hover:text-vf-red group-hover:translate-x-0.5 transition-all"
                        />
                      </div>

                      <div className="flex gap-3 mt-3 pt-3 border-t border-vf-border">
                        <div>
                          <div className="text-[13px] font-semibold text-vf-dark">{cat.families}</div>
                          <div className="text-[10px] text-vf-muted uppercase tracking-wide">Families</div>
                        </div>
                        <div className="w-px bg-vf-border" />
                        <div>
                          <div className="text-[13px] font-semibold text-vf-dark">{cat.lines}</div>
                          <div className="text-[10px] text-vf-muted uppercase tracking-wide">Lines</div>
                        </div>
                      </div>
                    </button>
                  );
                })}
          </div>
        </>
      ) : (
        <>
          {/* Breadcrumb + back */}
          <div className="flex items-center gap-3 mb-5">
            <button
              onClick={goBack}
              className="flex items-center gap-1.5 text-xs text-vf-muted hover:text-vf-text transition-colors font-medium"
            >
              <ArrowLeft size={14} />
              All Categories
            </button>
            <ChevronRight size={13} className="text-vf-muted" />
            {selectedCategory && (
              <span
                className="px-2.5 py-1 rounded-full text-[11px] font-semibold"
                style={{
                  background: getStyle(selectedCategory.category).bg,
                  color: getStyle(selectedCategory.category).text,
                  border: `1px solid ${getStyle(selectedCategory.category).border}`,
                }}
              >
                {selectedCategory.category}
              </span>
            )}
            <span className="text-[11px] text-vf-muted ml-auto">
              {categoryProducts.length} products · {Object.keys(byFamily).length} families
            </span>
          </div>

          {loadingCat ? (
            <div className="grid grid-cols-2 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-white border border-vf-border rounded-xl p-4 animate-pulse h-32" />
              ))}
            </div>
          ) : (
            <div className="space-y-5">
              {Object.entries(byFamily).sort(([a], [b]) => a.localeCompare(b)).map(([family, products]) => (
                <div key={family} className="bg-white border border-vf-border rounded-xl overflow-hidden">
                  {/* Family header */}
                  <div className="flex items-center gap-2 px-5 py-3 border-b border-vf-border bg-vf-surface">
                    <span className="text-[12px] font-semibold text-vf-dark">{family}</span>
                    <span className="ml-1 bg-vf-border text-vf-muted rounded-full px-2 py-px text-[10px] font-semibold">
                      {products.length}
                    </span>
                  </div>

                  {/* Products grid */}
                  <div className="grid grid-cols-3 gap-px bg-vf-border">
                    {products.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => openDrawer(p.id)}
                        className="bg-white px-4 py-3 cursor-pointer hover:bg-[#fdf9f9] transition-colors group"
                      >
                        <div className="text-[13px] font-medium text-vf-text group-hover:text-vf-red transition-colors leading-snug">
                          {p.name}
                        </div>
                        <div className="text-[11px] text-vf-muted mt-0.5 truncate">{p.productLine}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
