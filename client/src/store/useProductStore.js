import { create } from 'zustand';

const useProductStore = create((set, get) => ({
  // Products
  products: [],
  totalProducts: 0,
  currentPage: 1,
  totalPages: 1,
  stats: { totalProducts: 0, families: 0, lines: 0, categories: 0 },
  loading: false,
  filters: { category: '', family: '', productLine: '', q: '' },
  categories: [],
  families: [],
  productLines: [],

  // Drawer
  selectedProduct: null,
  drawerOpen: false,

  // Feature requests
  featureRequests: [],

  // Trading
  tradingSummary: null,

  // Toast
  toast: null,

  // Actions
  fetchProducts: async (page = 1) => {
    set({ loading: true });
    const { filters } = get();
    const params = new URLSearchParams({ page, limit: 30 });
    if (filters.category) params.set('category', filters.category);
    if (filters.family) params.set('family', filters.family);
    if (filters.productLine) params.set('productLine', filters.productLine);
    if (filters.q) params.set('q', filters.q);

    try {
      const res = await fetch(`/api/products?${params}`);
      const json = await res.json();
      set({
        products: page === 1 ? json.data : [...get().products, ...json.data],
        totalProducts: json.total,
        currentPage: json.page,
        totalPages: json.totalPages,
        stats: json.stats,
        loading: false,
      });
    } catch {
      set({ loading: false });
    }
  },

  loadMore: () => {
    const { currentPage, totalPages } = get();
    if (currentPage < totalPages) {
      get().fetchProducts(currentPage + 1);
    }
  },

  setFilters: (newFilters) => {
    const current = get().filters;
    const hasChange = Object.keys(newFilters).some((k) => newFilters[k] !== current[k]);
    if (!hasChange) return;
    set((state) => ({ filters: { ...state.filters, ...newFilters } }));
    get().fetchProducts(1);
  },

  clearFilters: () => {
    set({ filters: { category: '', family: '', productLine: '', q: '' } });
    get().fetchProducts(1);
  },

  fetchCategories: async () => {
    try {
      const res = await fetch('/api/products/categories');
      const data = await res.json();
      set({ categories: data });
    } catch {}
  },

  fetchFamilies: async (category) => {
    try {
      const params = category ? `?category=${encodeURIComponent(category)}` : '';
      const res = await fetch(`/api/products/families${params}`);
      const data = await res.json();
      set({ families: data });
    } catch {}
  },

  fetchProductLines: async (category, family) => {
    try {
      const params = new URLSearchParams();
      if (category) params.set('category', category);
      if (family) params.set('family', family);
      const qs = params.toString();
      const res = await fetch(`/api/products/lines${qs ? '?' + qs : ''}`);
      const data = await res.json();
      set({ productLines: data });
    } catch {}
  },

  // Build filter query string for subpage API calls
  getFilterParams: () => {
    const { filters } = get();
    const params = new URLSearchParams();
    if (filters.category) params.set('category', filters.category);
    if (filters.family) params.set('family', filters.family);
    if (filters.productLine) params.set('productLine', filters.productLine);
    if (filters.q) params.set('q', filters.q);
    return params.toString();
  },

  openDrawer: async (productId) => {
    try {
      const res = await fetch(`/api/products/${productId}`);
      const product = await res.json();
      set({ selectedProduct: product, drawerOpen: true });
    } catch {}
  },

  closeDrawer: () => set({ drawerOpen: false, selectedProduct: null }),

  // Feature requests
  fetchFeatureRequests: async () => {
    try {
      const res = await fetch('/api/requests');
      const data = await res.json();
      set({ featureRequests: data });
    } catch {}
  },

  addFeatureRequest: async (data) => {
    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        get().fetchFeatureRequests();
        get().showToast('Request submitted successfully');
        return true;
      }
    } catch {}
    return false;
  },

  updateRequestStatus: async (id, status) => {
    try {
      await fetch(`/api/requests/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      get().fetchFeatureRequests();
    } catch {}
  },

  // Trading
  fetchTradingSummary: async (fy = 'FY26') => {
    try {
      const filterParams = get().getFilterParams();
      const params = new URLSearchParams(filterParams);
      params.set('fy', fy);
      const res = await fetch(`/api/trading/summary?${params}`);
      const data = await res.json();
      set({ tradingSummary: data });
    } catch {}
  },

  // Toast
  showToast: (message, type = 'success') => {
    set({ toast: { message, type } });
    setTimeout(() => set({ toast: null }), 3000);
  },
}));

export default useProductStore;
