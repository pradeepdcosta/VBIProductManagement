import { useEffect } from 'react';
import useProductStore from '../store/useProductStore.js';
import CategoryBadge from '../components/CategoryBadge.jsx';

export default function ProductCatalog() {
  const {
    products, stats, loading, filters,
    fetchProducts, loadMore, currentPage, totalPages, openDrawer,
  } = useProductStore();

  useEffect(() => {
    fetchProducts(1);
  }, []);

  return (
    <div className="p-5">
      {/* Stats row */}
      <div className="grid grid-cols-4 gap-2.5 mb-5">
        <div className="bg-white border border-vf-border rounded-[10px] px-4 py-3.5">
          <div className="text-2xl font-semibold text-vf-dark">{stats.totalProducts}</div>
          <div className="text-[11px] text-vf-muted mt-0.5">Total Products</div>
          <div className="text-[11px] text-vf-red mt-1 font-medium">{stats.categories} categories</div>
        </div>
        <div className="bg-white border border-vf-border rounded-[10px] px-4 py-3.5">
          <div className="text-2xl font-semibold text-vf-dark">{stats.families}</div>
          <div className="text-[11px] text-vf-muted mt-0.5">Product Families</div>
          <div className="text-[11px] text-vf-red mt-1 font-medium">across VBI</div>
        </div>
        <div className="bg-white border border-vf-border rounded-[10px] px-4 py-3.5">
          <div className="text-2xl font-semibold text-vf-dark">{stats.lines}</div>
          <div className="text-[11px] text-vf-muted mt-0.5">Product Lines</div>
          <div className="text-[11px] text-vf-red mt-1 font-medium">active</div>
        </div>
        <div className="bg-white border border-vf-border rounded-[10px] px-4 py-3.5">
          <div className="text-2xl font-semibold text-vf-dark">{products.length}</div>
          <div className="text-[11px] text-vf-muted mt-0.5">Showing</div>
          <div className="text-[11px] text-vf-red mt-1 font-medium">
            {filters.category || filters.family || filters.q ? 'filtered' : 'all products'}
          </div>
        </div>
      </div>

      {/* Catalog table */}
      <div className="bg-white border border-vf-border rounded-[10px] overflow-hidden">
        <div className="grid grid-cols-[175px_175px_175px_1fr_90px] border-b border-vf-border bg-vf-surface">
          {['Category', 'Family', 'Product Line', 'Product Name', 'Action'].map((h) => (
            <div key={h} className="px-3.5 py-2.5 text-[11px] font-semibold text-vf-muted uppercase tracking-wide border-r border-vf-border last:border-r-0">
              {h}
            </div>
          ))}
        </div>

        {loading && products.length === 0 ? (
          <div className="p-8 text-center text-vf-muted text-sm">Loading products...</div>
        ) : products.length === 0 ? (
          <div className="p-8 text-center text-vf-muted text-sm">No products found</div>
        ) : (
          products.map((p) => (
            <div
              key={p.id}
              className="grid grid-cols-[175px_175px_175px_1fr_90px] border-b border-[#f0eeea] last:border-b-0 cursor-pointer hover:bg-[#fdf9f9] transition-colors"
              onClick={() => openDrawer(p.id)}
            >
              <div className="px-3.5 py-2 text-xs border-r border-[#f0eeea] flex items-center overflow-hidden">
                <CategoryBadge category={p.category} />
              </div>
              <div className="px-3.5 py-2 text-xs border-r border-[#f0eeea] flex items-center overflow-hidden whitespace-nowrap text-ellipsis">
                {p.family}
              </div>
              <div className="px-3.5 py-2 text-xs border-r border-[#f0eeea] flex items-center overflow-hidden whitespace-nowrap text-ellipsis">
                {p.productLine}
              </div>
              <div className="px-3.5 py-2 text-xs border-r border-[#f0eeea] flex items-center overflow-hidden whitespace-nowrap text-ellipsis font-medium">
                {p.name}
              </div>
              <div className="px-3.5 py-2 text-xs flex items-center">
                <button className="bg-vf-red text-white border-none rounded px-2.5 py-1 text-[11px] cursor-pointer font-sans font-medium hover:bg-vf-red-hover">
                  View →
                </button>
              </div>
            </div>
          ))
        )}

        {currentPage < totalPages && (
          <div className="p-3 text-center border-t border-vf-border">
            <button
              onClick={loadMore}
              className="border border-vf-border bg-white rounded-md px-5 py-1.5 text-xs cursor-pointer font-sans text-vf-muted hover:bg-vf-surface"
            >
              Load more products ↓
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
