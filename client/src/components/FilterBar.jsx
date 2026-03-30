import { useEffect, useState, useRef } from 'react';
import useProductStore from '../store/useProductStore.js';

export default function FilterBar() {
  const filters = useProductStore((s) => s.filters);
  const categories = useProductStore((s) => s.categories);
  const families = useProductStore((s) => s.families);
  const productLines = useProductStore((s) => s.productLines);
  const totalProducts = useProductStore((s) => s.stats.totalProducts);
  const fetchCategories = useProductStore((s) => s.fetchCategories);
  const fetchFamilies = useProductStore((s) => s.fetchFamilies);
  const fetchProductLines = useProductStore((s) => s.fetchProductLines);
  const setFilters = useProductStore((s) => s.setFilters);
  const clearFilters = useProductStore((s) => s.clearFilters);

  const [searchInput, setSearchInput] = useState('');
  const isInitial = useRef(true);

  useEffect(() => {
    fetchCategories();
    fetchFamilies();
    fetchProductLines();
    // Mark as initialized after first render cycle
    const id = setTimeout(() => { isInitial.current = false; }, 0);
    return () => clearTimeout(id);
  }, []);

  // Debounced search — only fire after user types, not on mount
  useEffect(() => {
    if (isInitial.current) return;
    const currentQ = useProductStore.getState().filters.q;
    if (searchInput === currentQ) return;
    const timer = setTimeout(() => {
      setFilters({ q: searchInput });
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const handleCategoryChange = (e) => {
    const cat = e.target.value;
    setFilters({ category: cat, family: '', productLine: '' });
    fetchFamilies(cat);
    fetchProductLines(cat, '');
  };

  const handleFamilyChange = (e) => {
    const fam = e.target.value;
    setFilters({ family: fam, productLine: '' });
    fetchProductLines(filters.category, fam);
  };

  const handleProductLineChange = (e) => {
    setFilters({ productLine: e.target.value });
  };

  const hasFilters = filters.category || filters.family || filters.productLine || filters.q;

  return (
    <div className="bg-white border-b border-vf-border px-4 py-2 flex items-center gap-2.5 flex-wrap">
      <span className="text-[11px] font-semibold text-vf-muted uppercase tracking-wide whitespace-nowrap">
        Filter
      </span>
      <select
        className="border border-vf-border rounded-md px-2.5 py-1 text-xs text-vf-text bg-white font-sans cursor-pointer min-w-[140px] focus:outline-none focus:border-vf-red"
        value={filters.category}
        onChange={handleCategoryChange}
      >
        <option value="">All Categories</option>
        {categories.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>
      <select
        className="border border-vf-border rounded-md px-2.5 py-1 text-xs text-vf-text bg-white font-sans cursor-pointer min-w-[140px] focus:outline-none focus:border-vf-red"
        value={filters.family}
        onChange={handleFamilyChange}
      >
        <option value="">All Families</option>
        {families.map((f) => (
          <option key={f} value={f}>{f}</option>
        ))}
      </select>
      <select
        className="border border-vf-border rounded-md px-2.5 py-1 text-xs text-vf-text bg-white font-sans cursor-pointer min-w-[140px] focus:outline-none focus:border-vf-red"
        value={filters.productLine}
        onChange={handleProductLineChange}
      >
        <option value="">All Product Lines</option>
        {productLines.map((pl) => (
          <option key={pl} value={pl}>{pl}</option>
        ))}
      </select>
      <input
        className="border border-vf-border rounded-md px-2.5 py-1 text-xs font-sans flex-1 min-w-[180px] focus:outline-none focus:border-vf-red"
        placeholder="Search products, lines, families..."
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
      />
      {hasFilters && (
        <button
          className="border border-vf-border rounded-md px-3 py-1 text-xs cursor-pointer bg-white font-sans text-vf-muted hover:bg-vf-surface"
          onClick={() => {
            clearFilters();
            setSearchInput('');
            fetchFamilies();
            fetchProductLines();
          }}
        >
          Clear
        </button>
      )}
      <span className="text-[11px] text-vf-muted whitespace-nowrap">
        {totalProducts} results
      </span>
    </div>
  );
}
