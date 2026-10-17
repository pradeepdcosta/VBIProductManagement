import { useEffect, useMemo, useRef, useState } from 'react';
import { Upload, Search, Eye, EyeOff, Plus, Pencil } from 'lucide-react';
import useProductStore from '../store/useProductStore.js';

const TABS = [
  { key: 'taxonomy', label: 'Product Taxonomy' },
  { key: 'npd', label: 'NPD Import' },
];

// Upload a file to an admin import endpoint (preview unless apply=true)
async function postImport(url, file, apply) {
  const form = new FormData();
  form.append('file', file);
  const sep = url.includes('?') ? '&' : '?';
  const res = await fetch(`${url}${apply ? `${sep}apply=1` : ''}`, { method: 'POST', body: form });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Import failed');
  return data;
}

function Stat({ label, value, tone }) {
  const color = tone === 'red' ? 'text-vf-red' : tone === 'green' ? 'text-vf-success' : 'text-vf-dark';
  return (
    <div className="bg-vf-surface rounded-lg px-3 py-2.5">
      <div className={`text-xl font-bold font-mono leading-none ${color}`}>{value}</div>
      <div className="text-[10px] text-vf-muted uppercase tracking-wide font-semibold mt-1">{label}</div>
    </div>
  );
}

// File picker + Preview → Apply flow shared by both importers
function ImportPanel({ title, description, accept = '.xlsx', onPreview, onApply, renderSummary, extraControls }) {
  const fileRef = useRef(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const run = async (fn, setter) => {
    setBusy(true);
    setError(null);
    try { setter(await fn(file)); } catch (err) { setError(err.message); }
    setBusy(false);
  };

  const reset = () => {
    setFile(null); setPreview(null); setResult(null); setError(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="bg-white border border-vf-border rounded-[10px] p-5">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h3 className="text-sm font-semibold text-vf-dark">{title}</h3>
          <p className="text-xs text-vf-muted mt-0.5 max-w-2xl leading-relaxed">{description}</p>
        </div>
      </div>

      <div className="flex items-end gap-3 flex-wrap">
        {extraControls}
        <div className="flex-1 min-w-[260px]">
          <label className="text-[11px] font-semibold text-vf-muted uppercase tracking-wide block mb-1">File (.xlsx)</label>
          <input
            ref={fileRef}
            type="file"
            accept={accept}
            className="w-full border border-vf-border rounded-md px-2.5 py-1.5 text-xs bg-white"
            onChange={(e) => { setFile(e.target.files?.[0] || null); setPreview(null); setResult(null); setError(null); }}
          />
        </div>
        <button
          disabled={!file || busy}
          onClick={() => { setResult(null); run(onPreview, setPreview); }}
          className="flex items-center gap-1.5 border border-vf-border bg-white rounded-md px-4 py-1.5 text-xs font-semibold text-vf-dark hover:bg-vf-surface disabled:opacity-40"
        >
          <Upload size={13} /> {busy && !preview ? 'Reading…' : 'Preview'}
        </button>
      </div>

      {error && <div className="mt-4 bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">{error}</div>}

      {preview && !result && (
        <div className="mt-5 border-t border-vf-border pt-4">
          <div className="text-[11px] font-semibold text-vf-muted uppercase tracking-wide mb-3">Preview — nothing has been changed yet</div>
          {renderSummary(preview)}
          <div className="flex items-center gap-2 mt-4">
            <button
              disabled={busy}
              onClick={() => run(onApply, setResult)}
              className="bg-vf-red text-white rounded-md px-4 py-1.5 text-xs font-semibold hover:bg-vf-red-hover disabled:opacity-50"
            >
              {busy ? 'Importing…' : 'Apply import'}
            </button>
            <button onClick={reset} className="text-xs text-vf-muted hover:text-vf-dark px-2 py-1.5">Cancel</button>
          </div>
        </div>
      )}

      {result && (
        <div className="mt-5 border-t border-vf-border pt-4">
          <div className="bg-green-50 border border-green-200 text-green-800 text-sm px-3 py-2 rounded-lg mb-3">{result.message}</div>
          {renderSummary(result)}
          <button onClick={reset} className="mt-3 text-xs text-vf-red hover:underline">Import another file</button>
        </div>
      )}
    </div>
  );
}

// ─── Product taxonomy tab ─────────────────────────────────────────────────────

function TaxonomySummary({ s }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-6 gap-2">
        <Stat label="Rows in file" value={s.rowsInFile} />
        <Stat label="New" value={s.toCreate} />
        <Stat label="Updated" value={s.toUpdate} />
        <Stat label="Removed" value={s.toDelete} tone={s.toDelete ? 'red' : undefined} />
        <Stat label="Shown in catalog" value={s.shownInCatalog} tone="green" />
        <Stat label="Hidden" value={s.hiddenInCatalog} />
      </div>
      {s.shownByPortfolio && (
        <div className="text-xs text-vf-muted">
          <span className="font-semibold text-vf-dark">Shown by portfolio: </span>
          {Object.entries(s.shownByPortfolio).sort((a, b) => b[1] - a[1]).map(([p, n]) => `${p} ${n}`).join(' · ')}
        </div>
      )}
      {s.linkedDataLost?.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 text-xs px-3 py-2 rounded-lg">
          <span className="font-semibold">Removed products with linked data</span> (costs, SLA, coverage, trading or business case — these are deleted with them): {s.linkedDataLost.join(', ')}
        </div>
      )}
      {s.linkedDataKept?.length > 0 && (
        <div className="text-xs text-vf-muted">
          <span className="font-semibold text-vf-dark">Linked data kept for:</span> {s.linkedDataKept.join(', ')}
        </div>
      )}
    </div>
  );
}

function Toggle({ on, onChange, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={onChange}
      className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ${on ? 'bg-vf-success' : 'bg-gray-300'} disabled:opacity-50`}
    >
      <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-4' : ''}`} />
    </button>
  );
}

const EMPTY_PRODUCT = {
  offeringId: '', name: '', category: '', family: '', productLine: '', market: 'VBI',
  mainLifecycle: 'Live', lifecycleStage: 'Live', portalList: 'Yes', vbiChecked: '',
  managerEmail: '', description: '',
};
const LIFECYCLE_MAIN = ['Live', 'Development', 'Rationalisation', 'Retired', 'Dropped'];
const LIFECYCLE_STAGE = ['Strategy', 'Planning', 'Product Development', 'Market Readiness', 'Launch', 'Live', 'Stop Sell', 'Retired', 'Dropped'];
const VBI_CHECKED = ['Yes', 'Move to VBI', 'TBC', 'No', 'Remove', 'Dedupe & use VBI PRD ID'];

// Same rule the server applies: Portal List = Yes, or New VBI Checked = Yes / Move to VBI
const ruleShows = (f) => f.portalList?.toLowerCase() === 'yes' || ['yes', 'move to vbi'].includes(f.vbiChecked?.toLowerCase());

// Slide-in form to add a product or edit one taxonomy row
function ProductFormPanel({ product, products, onClose, onSaved, onDeleted }) {
  const isEdit = !!product?.id;
  const [form, setForm] = useState(() => {
    const base = { ...EMPTY_PRODUCT };
    if (isEdit) for (const k of Object.keys(EMPTY_PRODUCT)) base[k] = product[k] ?? '';
    return base;
  });
  // undefined = follow the rule; true/false = explicit choice
  const [showChoice, setShowChoice] = useState(isEdit && product.manualVisibility ? product.showInCatalog : undefined);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState(null);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const showInCatalog = showChoice === undefined ? ruleShows(form) : showChoice;
  const uniq = (list) => [...new Set(list.filter(Boolean))].sort();
  const portfolios = uniq(products.map((p) => p.category));
  const families = uniq(products.filter((p) => !form.category || p.category === form.category).map((p) => p.family));
  const lines = uniq(products.filter((p) => (!form.category || p.category === form.category) && (!form.family || p.family === form.family)).map((p) => p.productLine));

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(isEdit ? `/api/admin/products/${product.id}` : '/api/admin/products', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, showInCatalog }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Save failed');
      onSaved(data, isEdit);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/products/${product.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Delete failed');
      onDeleted(product.id);
    } catch (err) {
      setError(err.message);
      setConfirmDelete(false);
    } finally {
      setSaving(false);
    }
  };

  const inputCls = 'w-full border border-vf-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-vf-red bg-white';
  const label = (text, required) => (
    <label className="block text-[11px] font-semibold text-vf-muted uppercase tracking-wide mb-1">
      {text}{required && <span className="text-vf-red ml-0.5">*</span>}
    </label>
  );

  return (
    <div className="fixed inset-0 z-50 flex bg-black/20" onClick={onClose}>
      <div className="flex-1" />
      <div className="w-[520px] bg-white h-full shadow-2xl flex flex-col border-l border-vf-border" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-vf-border flex items-center justify-between flex-shrink-0">
          <div>
            <h3 className="text-base font-semibold text-vf-dark">{isEdit ? 'Edit product' : 'Add product'}</h3>
            {isEdit && product.offeringId && <div className="text-[11px] font-mono text-vf-muted mt-0.5">{product.offeringId}</div>}
          </div>
          <button onClick={onClose} className="text-vf-muted hover:text-vf-dark text-2xl leading-none">×</button>
        </div>

        <form onSubmit={save} className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
            {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">{error}</div>}
            {isEdit && !product.addedInPortal && (
              <div className="bg-vf-surface border border-vf-border text-xs text-vf-muted px-3 py-2 rounded-lg leading-relaxed">
                This product comes from the taxonomy file. Your edits apply now, but the next taxonomy upload will overwrite them with the file's values (a show/hide choice is kept). Make permanent changes in the file too.
              </div>
            )}
            {!isEdit && (
              <div className="bg-vf-surface border border-vf-border text-xs text-vf-muted px-3 py-2 rounded-lg leading-relaxed">
                Products added here are kept when a new taxonomy file is uploaded. If the file later includes the same Offering ID or name, the file's row takes over.
              </div>
            )}

            <div>{label('Product name', true)}<input required className={inputCls} value={form.name} onChange={(e) => set('name', e.target.value)} /></div>
            <div>{label('Product Offering ID')}<input className={`${inputCls} font-mono`} value={form.offeringId} onChange={(e) => set('offeringId', e.target.value)} placeholder="e.g. PO10077" /></div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                {label('Portfolio', true)}
                <input required list="adm-portfolios" className={inputCls} value={form.category} onChange={(e) => set('category', e.target.value)} />
                <datalist id="adm-portfolios">{portfolios.map((v) => <option key={v} value={v} />)}</datalist>
              </div>
              <div>
                {label('Market')}
                <select className={inputCls} value={form.market} onChange={(e) => set('market', e.target.value)}>
                  {uniq(['VBI', 'VGE', form.market]).map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div>
                {label('Product family', true)}
                <input required list="adm-families" className={inputCls} value={form.family} onChange={(e) => set('family', e.target.value)} />
                <datalist id="adm-families">{families.map((v) => <option key={v} value={v} />)}</datalist>
              </div>
              <div>
                {label('Product line', true)}
                <input required list="adm-lines" className={inputCls} value={form.productLine} onChange={(e) => set('productLine', e.target.value)} />
                <datalist id="adm-lines">{lines.map((v) => <option key={v} value={v} />)}</datalist>
              </div>
              <div>
                {label('Main lifecycle')}
                <select className={inputCls} value={form.mainLifecycle} onChange={(e) => set('mainLifecycle', e.target.value)}>
                  <option value="">—</option>
                  {uniq([...LIFECYCLE_MAIN, form.mainLifecycle]).map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div>
                {label('Lifecycle stage')}
                <select className={inputCls} value={form.lifecycleStage} onChange={(e) => set('lifecycleStage', e.target.value)}>
                  <option value="">—</option>
                  {uniq([...LIFECYCLE_STAGE, form.lifecycleStage]).map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div>
                {label('VBI Portal List')}
                <select className={inputCls} value={form.portalList} onChange={(e) => set('portalList', e.target.value)}>
                  <option value="">—</option>
                  <option value="Yes">Yes</option>
                </select>
              </div>
              <div>
                {label('New VBI Checked')}
                <select className={inputCls} value={form.vbiChecked} onChange={(e) => set('vbiChecked', e.target.value)}>
                  <option value="">—</option>
                  {uniq([...VBI_CHECKED, form.vbiChecked]).map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
            </div>

            <div>{label('Product manager email')}<input className={inputCls} value={form.managerEmail} onChange={(e) => set('managerEmail', e.target.value)} placeholder="name@vodafone.com; separate several with ;" /></div>
            <div>{label('Description')}<textarea rows={4} className={`${inputCls} resize-y`} value={form.description} onChange={(e) => set('description', e.target.value)} /></div>

            <div className="border border-vf-border rounded-lg px-3 py-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium text-vf-dark">Show in Product Catalog</div>
                <div className="text-[11px] text-vf-muted mt-0.5">
                  {showChoice === undefined
                    ? `Following the rule (Portal List = Yes, or New VBI Checked = Yes / Move to VBI)`
                    : 'Set manually — kept on future uploads'}
                  {showChoice !== undefined && (
                    <button type="button" onClick={() => setShowChoice(undefined)} className="ml-1 text-vf-red hover:underline">Use rule</button>
                  )}
                </div>
              </div>
              <Toggle on={showInCatalog} onChange={() => setShowChoice(!showInCatalog)} />
            </div>
          </div>

          <div className="px-6 py-4 border-t border-vf-border flex items-center gap-3 flex-shrink-0 bg-white">
            {isEdit && (
              <button
                type="button"
                onClick={remove}
                onBlur={() => setConfirmDelete(false)}
                disabled={saving}
                className={`text-sm font-medium px-3 py-2 rounded-lg border transition-all ${confirmDelete ? 'bg-red-600 text-white border-red-600 hover:bg-red-700' : 'text-red-600 border-red-200 hover:bg-red-50'}`}
              >
                {confirmDelete ? 'Confirm delete' : 'Delete'}
              </button>
            )}
            {confirmDelete && <span className="text-[11px] text-red-600 leading-tight">Also deletes its costs, SLA, coverage, trading and business case.</span>}
            <div className="flex-1" />
            <button type="button" onClick={onClose} className="text-sm font-medium text-vf-muted hover:text-vf-dark px-3 py-2">Cancel</button>
            <button type="submit" disabled={saving} className="text-sm font-semibold bg-vf-red text-white px-5 py-2 rounded-lg hover:bg-vf-red-hover disabled:opacity-50">
              {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TaxonomyTab() {
  const showToast = useProductStore((s) => s.showToast);
  const fetchCategories = useProductStore((s) => s.fetchCategories);
  const fetchFamilies = useProductStore((s) => s.fetchFamilies);
  const fetchProductLines = useProductStore((s) => s.fetchProductLines);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [portfolio, setPortfolio] = useState('');
  const [visibility, setVisibility] = useState('');
  const [market, setMarket] = useState('');
  const [saving, setSaving] = useState(null);
  const [editing, setEditing] = useState(null); // null | {} (new) | product

  const handleSaved = (saved, isEdit) => {
    setProducts((list) => (isEdit ? list.map((p) => (p.id === saved.id ? saved : p)) : [saved, ...list]));
    setEditing(null);
    refreshFilters();
    showToast(isEdit ? `Saved "${saved.name}"` : `Added "${saved.name}"`);
  };

  const handleDeleted = (id) => {
    const name = products.find((p) => p.id === id)?.name;
    setProducts((list) => list.filter((p) => p.id !== id));
    setEditing(null);
    refreshFilters();
    showToast(`Deleted "${name}"`);
  };

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/products');
      const data = await res.json();
      if (!res.ok || !Array.isArray(data)) throw new Error(data.error || 'Could not load products');
      setProducts(data);
    } catch (err) {
      showToast(err.message, 'warning');
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // The global filter bar caches categories/families/lines — refresh after changes
  const refreshFilters = () => { fetchCategories(); fetchFamilies(); fetchProductLines(); };

  const toggle = async (p) => {
    const next = !p.showInCatalog;
    setSaving(p.id);
    setProducts((list) => list.map((x) => (x.id === p.id ? { ...x, showInCatalog: next, manualVisibility: true } : x)));
    try {
      const res = await fetch(`/api/admin/products/${p.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ showInCatalog: next }),
      });
      const saved = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(saved.error || 'Save failed');
      setProducts((list) => list.map((x) => (x.id === p.id ? saved : x)));
      refreshFilters();
    } catch (err) {
      setProducts((list) => list.map((x) => (x.id === p.id ? p : x)));
      showToast(`Not saved: ${err.message}`, 'warning');
    }
    setSaving(null);
  };

  const portfolios = useMemo(() => [...new Set(products.map((p) => p.category))].sort(), [products]);
  const markets = useMemo(() => [...new Set(products.map((p) => p.market).filter(Boolean))].sort(), [products]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return products.filter((p) =>
      (!portfolio || p.category === portfolio) &&
      (!market || p.market === market) &&
      (!visibility || (visibility === 'shown') === p.showInCatalog) &&
      (!needle || [p.name, p.offeringId, p.family, p.productLine, p.managerEmail].some((v) => v?.toLowerCase().includes(needle))),
    );
  }, [products, q, portfolio, visibility, market]);

  const shownCount = products.filter((p) => p.showInCatalog).length;
  const selectCls = 'border border-vf-border rounded-md px-2.5 py-1.5 text-xs bg-white focus:outline-none focus:border-vf-red';

  return (
    <div className="space-y-4">
      {editing && (
        <ProductFormPanel
          product={editing}
          products={products}
          onClose={() => setEditing(null)}
          onSaved={handleSaved}
          onDeleted={handleDeleted}
        />
      )}
      <ImportPanel
        title="Upload product taxonomy"
        description="Loads every product from the 'Prd List View' sheet as the master list. A product is shown in the Product Catalog when VBI Portal List is Yes, or New VBI Checked is Yes / Move to VBI. Products missing from the file are removed. Visibility you set manually below is kept on future uploads."
        onPreview={(f) => postImport('/api/admin/taxonomy', f, false)}
        onApply={async (f) => { const r = await postImport('/api/admin/taxonomy', f, true); await load(); refreshFilters(); return r; }}
        renderSummary={(s) => <TaxonomySummary s={s} />}
      />

      <div className="bg-white border border-vf-border rounded-[10px] overflow-hidden">
        <div className="px-4 py-3 border-b border-vf-border bg-vf-surface flex items-center gap-2 flex-wrap">
          <div className="text-[13px] font-semibold text-vf-dark mr-2">
            All products <span className="text-vf-muted font-normal">· {products.length} total · <span className="text-vf-success font-semibold">{shownCount} shown</span> in catalog</span>
          </div>
          <div className="flex-1" />
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-vf-muted" />
            <input className="border border-vf-border rounded-md pl-7 pr-2.5 py-1.5 text-xs w-[220px] focus:outline-none focus:border-vf-red" placeholder="Search name, ID, family, manager…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <select className={selectCls} value={portfolio} onChange={(e) => setPortfolio(e.target.value)}>
            <option value="">All portfolios</option>
            {portfolios.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <select className={selectCls} value={market} onChange={(e) => setMarket(e.target.value)}>
            <option value="">All markets</option>
            {markets.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <select className={selectCls} value={visibility} onChange={(e) => setVisibility(e.target.value)}>
            <option value="">Shown + hidden</option>
            <option value="shown">Shown only</option>
            <option value="hidden">Hidden only</option>
          </select>
          <button
            onClick={() => setEditing({})}
            className="flex items-center gap-1.5 bg-vf-red text-white rounded-md px-3 py-1.5 text-xs font-semibold hover:bg-vf-red-hover"
          >
            <Plus size={13} /> Add product
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-vf-muted text-sm">Loading products…</div>
        ) : products.length === 0 ? (
          <div className="p-8 text-center text-vf-muted text-sm">No products yet. Upload the product taxonomy above.</div>
        ) : (
          <div className="max-h-[620px] overflow-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-white z-10 shadow-[0_1px_0_#E2E0DB]">
                <tr className="text-left text-[10px] text-vf-muted uppercase tracking-wide">
                  <th className="px-4 py-2 font-semibold w-[90px]">In catalog</th>
                  <th className="px-3 py-2 font-semibold">Product</th>
                  <th className="px-3 py-2 font-semibold">Portfolio</th>
                  <th className="px-3 py-2 font-semibold">Family › Line</th>
                  <th className="px-3 py-2 font-semibold">Lifecycle</th>
                  <th className="px-3 py-2 font-semibold">Market</th>
                  <th className="px-3 py-2 font-semibold">VBI Portal List</th>
                  <th className="px-3 py-2 font-semibold">New VBI Checked</th>
                  <th className="px-3 py-2 font-semibold w-[60px]" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className={`border-t border-[#f0eeea] ${p.showInCatalog ? '' : 'text-vf-muted'}`}>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-1.5">
                        <Toggle on={p.showInCatalog} disabled={saving === p.id} onChange={() => toggle(p)} />
                        {p.manualVisibility && <span title="Set manually — kept on future uploads" className="text-[9px] font-semibold text-vf-muted uppercase">manual</span>}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className={`font-medium ${p.showInCatalog ? 'text-vf-dark' : ''}`}>{p.name}</div>
                      <div className="text-[10px] font-mono text-vf-muted">
                        {p.offeringId || '—'}
                        {p.addedInPortal && <span className="ml-1.5 font-sans font-semibold uppercase text-[9px] text-vf-accent">added in portal</span>}
                      </div>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">{p.category}</td>
                    <td className="px-3 py-2">{p.family} <span className="text-vf-muted">›</span> {p.productLine}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{p.lifecycleStage || p.mainLifecycle || '—'}</td>
                    <td className="px-3 py-2">{p.market || '—'}</td>
                    <td className="px-3 py-2">{p.portalList || '—'}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{p.vbiChecked || '—'}</td>
                    <td className="px-3 py-2">
                      <button
                        onClick={() => setEditing(p)}
                        title="Edit product"
                        className="flex items-center gap-1 text-[11px] font-medium text-vf-muted hover:text-vf-dark border border-vf-border rounded px-2 py-0.5 hover:bg-vf-surface"
                      >
                        <Pencil size={11} /> Edit
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={9} className="p-6 text-center text-vf-muted">No products match these filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div className="flex items-center gap-4 text-[11px] text-vf-muted">
        <span className="flex items-center gap-1"><Eye size={12} /> Shown products appear in Product Catalog and the filter bar</span>
        <span className="flex items-center gap-1"><EyeOff size={12} /> Hidden products stay stored here but are not displayed</span>
      </div>
    </div>
  );
}

// ─── NPD import tab ───────────────────────────────────────────────────────────

function NpdSummary({ s }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-5 gap-2">
        <Stat label="NPD actions" value={s.actionsInFile} />
        <Stat label="Epics" value={s.epicsInFile} />
        <Stat label="New initiatives" value={s.initiativesToCreate} tone="green" />
        <Stat label="Updated initiatives" value={s.initiativesToUpdate} />
        <Stat label="Blank epic rows skipped" value={s.placeholderEpicsSkipped} />
      </div>
      {s.newByRoadmapCategory && Object.keys(s.newByRoadmapCategory).length > 0 && (
        <div className="text-xs text-vf-muted">
          <span className="font-semibold text-vf-dark">Roadmap category (derived from epic categories and investment driver): </span>
          {Object.entries(s.newByRoadmapCategory).sort((a, b) => b[1] - a[1]).map(([c, n]) => `${c} ${n}`).join(' · ')}
        </div>
      )}
      {s.initiativesToCreate > 0 && (
        <div className="text-xs text-vf-muted">New initiatives are spread across Q1–Q4 with status Not Started — drag them between quarters on the NPD Pipeline page.</div>
      )}
      {s.inDatabaseNotInFile?.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 text-xs px-3 py-2 rounded-lg">
          <span className="font-semibold">{s.inDatabaseNotInFile.length} {s.fy} initiative(s) in the portal are not in this file</span> — they are left untouched: {s.inDatabaseNotInFile.slice(0, 8).join(', ')}{s.inDatabaseNotInFile.length > 8 ? '…' : ''}
        </div>
      )}
    </div>
  );
}

function NpdTab() {
  const [fy, setFy] = useState('FY28');
  const fyOptions = ['FY26', 'FY27', 'FY28', 'FY29', 'FY30'];
  return (
    <ImportPanel
      title="Import an NPD cycle"
      description="Loads NPD Actions as initiatives and their Epics from the 'NPD Actions & Epics' sheet, for the selected year only — other years are not touched. Re-importing the same year updates the text from the file and keeps everything set in the portal: quarter, status, category, stage gates, epic checklists and sign-off."
      onPreview={(f) => postImport(`/api/admin/npd?fy=${fy}`, f, false)}
      onApply={(f) => postImport(`/api/admin/npd?fy=${fy}`, f, true)}
      renderSummary={(s) => <NpdSummary s={s} />}
      extraControls={(
        <div>
          <label className="text-[11px] font-semibold text-vf-muted uppercase tracking-wide block mb-1">NPD year</label>
          <select className="border border-vf-border rounded-md px-2.5 py-1.5 text-xs bg-white focus:outline-none focus:border-vf-red" value={fy} onChange={(e) => setFy(e.target.value)}>
            {fyOptions.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      )}
    />
  );
}

export default function Admin() {
  const [tab, setTab] = useState('taxonomy');
  return (
    <div className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold">Admin</h2>
          <p className="text-xs text-vf-muted mt-0.5">Master data that drives the Product Catalog and NPD Pipeline.</p>
        </div>
      </div>
      <div className="flex border-b border-vf-border mb-5">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm border-b-2 -mb-px transition-colors ${tab === t.key ? 'border-vf-red text-vf-red font-semibold' : 'border-transparent text-vf-muted hover:text-vf-dark'}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'taxonomy' ? <TaxonomyTab /> : <NpdTab />}
    </div>
  );
}
