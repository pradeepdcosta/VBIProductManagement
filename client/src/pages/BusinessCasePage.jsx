import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Pencil, Upload, Download, Plus } from 'lucide-react';
import useProductStore from '../store/useProductStore.js';

const FY_LABELS = { fy27: 'FY27 (€m)', fy28: 'FY28 (€m)', fy29: 'FY29 (€m)', fy30: 'FY30 (€m)', fy31: 'FY31 (€m)' };

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
  'In Review': 'bg-yellow-400 text-black',
  Draft: 'bg-gray-500 text-white',
};

async function sendJson(url, method = 'GET', body) {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

function fmtVal(v, percent) {
  if (v == null) return '-';
  if (percent) return `${v.toFixed(1)}%`;
  if (v < 0) return `(${Math.abs(v).toFixed(1)})`;
  return v.toFixed(1);
}

// Same formulas as the server (lib/bizcase.js), driven by the template it sends
function calculate(rows, fyKeys, values) {
  const round = (n, dp = 4) => Math.round(n * 10 ** dp) / 10 ** dp;
  const out = {};
  for (const row of rows) {
    if (row.input) {
      out[row.lineItem] = Object.fromEntries(fyKeys.map((fy) => [fy, values?.[row.lineItem]?.[fy] ?? null]));
      continue;
    }
    const { op, of } = row.formula;
    out[row.lineItem] = Object.fromEntries(fyKeys.map((fy) => {
      const parts = of.map((item) => out[item]?.[fy] ?? null);
      if (parts.every((v) => v == null)) return [fy, null];
      if (op === 'sum') return [fy, round(parts.reduce((s, v) => s + (v || 0), 0))];
      if (op === 'sub') return [fy, round((parts[0] || 0) - (parts[1] || 0))];
      if (op === 'pct') return [fy, parts[0] == null || !parts[1] ? null : round((parts[0] / parts[1]) * 100, 1)];
      return [fy, null];
    }));
  }
  return out;
}

const rowTotal = (cells, fyKeys) => {
  const present = fyKeys.map((fy) => cells?.[fy]).filter((v) => v != null);
  return present.length ? present.reduce((s, v) => s + v, 0) : null;
};

// Draft values are strings while editing
const toDraft = (values) => JSON.parse(JSON.stringify(values || {}), (k, v) => (typeof v === 'number' ? String(v) : v === null ? '' : v));
const fromDraft = (draft) => JSON.parse(JSON.stringify(draft || {}), (k, v) => (typeof v === 'string' ? (v.trim() === '' ? null : Number(v)) : v));

/* ─── Status: Draft → [Submit for review] → In Review ⇄ Approved (slider) ─── */
function StatusControl({ status, busy, onChange }) {
  if (!status) return null;
  if (status === 'Draft') {
    return (
      <div className="flex items-center gap-2">
        <span className={`px-2.5 py-1 rounded-full text-[0.6875rem] font-semibold ${STATUS_STYLE.Draft}`}>Draft</span>
        <button
          disabled={busy}
          onClick={() => onChange('In Review')}
          className="bg-yellow-400 hover:bg-yellow-300 text-black text-xs font-semibold rounded-md px-3 py-1.5 disabled:opacity-50"
        >
          Submit for review
        </button>
      </div>
    );
  }
  const approved = status === 'Approved';
  return (
    <div className="flex items-center gap-3">
      <span className={`px-2.5 py-1 rounded-full text-[0.6875rem] font-semibold ${approved ? 'bg-white/15 text-white/60' : STATUS_STYLE['In Review']}`}>In Review</span>
      <button
        type="button"
        role="switch"
        aria-checked={approved}
        aria-label="Approved"
        disabled={busy}
        onClick={() => onChange(approved ? 'In Review' : 'Approved')}
        className={`relative w-11 h-6 rounded-full transition-colors disabled:opacity-50 ${approved ? 'bg-green-500' : 'bg-white/25'}`}
        title={approved ? 'Slide back to In Review' : 'Slide to approve'}
      >
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${approved ? 'translate-x-5' : ''}`} />
      </button>
      <span className={`text-xs font-semibold ${approved ? 'text-green-400' : 'text-white/60'}`}>Approved</span>
      <button disabled={busy} onClick={() => onChange('Draft')} className="text-[0.6875rem] text-white/50 hover:text-white underline ml-1">Back to draft</button>
    </div>
  );
}

/* ─── Detail: one product line's business case ─── */
function BusinessCaseDetail({ line, template, onBack, onChanged }) {
  const showToast = useProductStore((s) => s.showToast);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({});
  const [metrics, setMetrics] = useState({ npv: '', roi: '', irr: '', paybackYears: '', summary: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const params = `productFamily=${encodeURIComponent(line.productFamily)}&productLine=${encodeURIComponent(line.productLine)}`;
  const { rows, fyKeys } = template;

  const load = async () => {
    setLoading(true);
    try { setData(await sendJson(`/api/business-cases/line?${params}`)); } catch (err) { setError(err.message); }
    setLoading(false);
  };
  useEffect(() => { load(); }, [line.key]);

  const bc = data?.case;
  const startEdit = () => {
    setDraft(toDraft(bc?.values || {}));
    setMetrics({
      npv: bc?.npv ?? '', roi: bc?.roi ?? '', irr: bc?.irr ?? '', paybackYears: bc?.paybackYears ?? '', summary: bc?.summary || '',
    });
    setError(null);
    setEditing(true);
  };

  const values = editing ? fromDraft(draft) : bc?.values;
  const calc = useMemo(() => calculate(rows, fyKeys, values), [rows, fyKeys, values]);

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const saved = await sendJson('/api/business-cases/line', 'PUT', {
        productFamily: line.productFamily, productLine: line.productLine,
        values: fromDraft(draft), ...metrics,
      });
      setData(saved);
      setEditing(false);
      showToast(bc ? 'Business case saved' : 'Business case created (Draft)');
      onChanged();
    } catch (err) { setError(err.message); }
    setBusy(false);
  };

  const changeStatus = async (status) => {
    setBusy(true);
    setError(null);
    try {
      const res = await sendJson('/api/business-cases/line/status', 'PUT', { productFamily: line.productFamily, productLine: line.productLine, status });
      setData((d) => ({ ...d, case: res.case }));
      showToast(`Status: ${status}`);
      onChanged();
    } catch (err) { setError(err.message); }
    setBusy(false);
  };

  const remove = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setBusy(true);
    try {
      await sendJson(`/api/business-cases/line?${params}`, 'DELETE');
      setData((d) => ({ ...d, case: null }));
      setEditing(false);
      setConfirmDelete(false);
      showToast('Business case deleted');
      onChanged();
    } catch (err) { setError(err.message); }
    setBusy(false);
  };

  const cancel = () => { setEditing(false); setError(null); };
  const setCell = (item, fy, v) => setDraft((d) => ({ ...d, [item]: { ...(d[item] || {}), [fy]: v } }));
  const metricInput = (key, label, suffix) => (
    <div>
      <div className="text-[0.625rem] text-vf-muted">{label}</div>
      {editing ? (
        <input
          type="number" step="any" value={metrics[key]} onChange={(e) => setMetrics((m) => ({ ...m, [key]: e.target.value }))}
          className="w-24 border border-vf-border rounded px-1.5 py-0.5 text-sm font-mono text-right focus:outline-none focus:border-vf-red"
        />
      ) : (
        <div className="text-sm font-semibold font-mono">{bc?.[key] != null ? `${key === 'npv' ? '€' : ''}${Number(bc[key]).toFixed(1)}${suffix}` : '—'}</div>
      )}
    </div>
  );

  let lastSection = '';

  return (
    <div>
      <button className="mb-4 text-xs text-vf-red font-semibold hover:underline cursor-pointer" onClick={onBack}>
        ← Back to business cases
      </button>

      <div className="bg-white border border-vf-border rounded-[10px] overflow-hidden">
        {/* Header */}
        <div className="bg-vf-dark text-white px-5 py-4 flex items-center justify-between gap-4">
          <div>
            <div className="text-[0.625rem] text-gray-400 uppercase tracking-wide">Product Line</div>
            <div className="text-[0.9375rem] font-semibold">{line.productLine}</div>
            <div className="text-[0.6875rem] text-gray-400 mt-0.5">{line.productFamily} · {line.portfolio} · VBI Business Case P&L</div>
          </div>
          <div className="flex items-center gap-4">
            <StatusControl status={bc?.status} busy={busy} onChange={changeStatus} />
            {bc && !editing && (
              <button onClick={startEdit} className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-medium rounded-md px-3 py-1.5">
                <Pencil size={12} /> Edit business case
              </button>
            )}
          </div>
        </div>

        {editing && (
          <div className="bg-amber-50 border-b border-amber-200 px-5 py-2.5 flex items-center gap-3 text-xs flex-wrap">
            <span className="font-semibold text-amber-900">{bc ? 'Editing business case' : 'New business case'} (€m)</span>
            <span className="text-amber-800">Enter Revenue and Cost of Sale as positive, OpEx and CapEx as negative. Totals, margins, EBITDA and cash flow are calculated.</span>
            <div className="flex-1" />
            {bc && (
              <button
                onClick={remove}
                onBlur={() => setConfirmDelete(false)}
                disabled={busy}
                className={`px-2.5 py-1 rounded font-medium ${confirmDelete ? 'bg-red-600 text-white' : 'text-red-700 border border-red-200 hover:bg-red-50'}`}
              >
                {confirmDelete ? 'Confirm — delete business case' : 'Delete'}
              </button>
            )}
            <button onClick={cancel} disabled={busy} className="px-2.5 py-1 text-vf-muted hover:text-vf-dark">Cancel</button>
            <button onClick={save} disabled={busy} className="bg-vf-red text-white rounded-md px-4 py-1.5 font-semibold hover:bg-vf-red-hover disabled:opacity-50">
              {busy ? 'Saving…' : bc ? 'Save business case' : 'Create business case'}
            </button>
          </div>
        )}
        {error && <div className="mx-5 mt-3 bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">{error}</div>}

        {loading ? (
          <div className="px-4 py-10 text-center text-vf-muted text-sm">Loading…</div>
        ) : !bc && !editing ? (
          <div className="px-4 py-12 text-center">
            <div className="text-sm font-medium text-vf-dark mb-1">No business case for this product line yet</div>
            <div className="text-xs text-vf-muted mb-4">Create one here, or upload the filled-in template from the business case list.</div>
            <button onClick={startEdit} className="inline-flex items-center gap-1.5 bg-vf-red text-white rounded-md px-4 py-2 text-xs font-semibold hover:bg-vf-red-hover">
              <Plus size={13} /> Create business case
            </button>
          </div>
        ) : (
          <>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-vf-red text-white">
                  <th className="text-left px-3 py-2 font-semibold text-[0.6875rem] w-[280px]">Business Case P&L</th>
                  {fyKeys.map((fy) => <th key={fy} className="text-right px-3 py-2 font-semibold text-[0.6875rem] w-[100px]">{FY_LABELS[fy]}</th>)}
                  <th className="text-right px-3 py-2 font-semibold text-[0.6875rem] w-[110px]">Total FY27-FY31 (€m)</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const newSection = row.section !== lastSection;
                  lastSection = row.section;
                  const cells = calc[row.lineItem];
                  const total = row.percent ? null : rowTotal(cells, fyKeys);
                  return (
                    <tr
                      key={row.lineItem}
                      className={`border-b border-[#f0eeea] ${row.isTotal ? `font-semibold ${SECTION_COLORS[row.section] || ''}` : ''} ${newSection ? 'border-t border-t-vf-border' : ''} ${!editing ? 'hover:bg-[#fdf9f9]' : ''}`}
                    >
                      <td className={`px-3 py-1.5 ${row.isTotal ? 'text-vf-dark' : row.input ? 'text-vf-text pl-6' : 'text-vf-muted pl-6 italic'}`}>
                        {row.lineItem}
                      </td>
                      {fyKeys.map((fy) => (
                        <td key={fy} className={`px-3 py-1 text-right font-mono ${!editing && cells[fy] != null && cells[fy] < 0 ? 'text-red-600' : ''}`}>
                          {editing && row.input ? (
                            <input
                              type="number"
                              step="any"
                              inputMode="decimal"
                              aria-label={`${row.lineItem} ${fy.toUpperCase()}`}
                              max={row.sign === 'negative' ? 0 : undefined}
                              min={row.sign === 'positive' ? 0 : undefined}
                              value={draft[row.lineItem]?.[fy] ?? ''}
                              onChange={(e) => setCell(row.lineItem, fy, e.target.value)}
                              className="w-full max-w-[90px] ml-auto block text-right font-mono text-xs border border-vf-border rounded px-1.5 py-0.5 bg-white focus:outline-none focus:border-vf-red [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                            />
                          ) : (
                            <span className={cells[fy] != null && cells[fy] < 0 ? 'text-red-600' : ''}>{fmtVal(cells[fy], row.percent)}</span>
                          )}
                        </td>
                      ))}
                      <td className={`px-3 py-1.5 text-right font-mono font-semibold ${total != null && total < 0 ? 'text-red-600' : ''}`}>
                        {row.percent ? '' : fmtVal(total)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Summary metrics */}
            <div className="border-t border-vf-border px-4 py-3 bg-vf-surface">
              <div className="text-[0.6875rem] font-semibold text-vf-muted uppercase tracking-wide mb-2">FY27-FY31 Summary</div>
              <div className="grid grid-cols-4 gap-4 max-w-2xl">
                {metricInput('npv', 'NPV (€m)', 'M')}
                {metricInput('roi', 'RoI (%)', '%')}
                {metricInput('irr', 'IRR (%)', '%')}
                {metricInput('paybackYears', 'Payback (years)', ' yrs')}
              </div>
              <div className="mt-3">
                <div className="text-[0.625rem] text-vf-muted mb-1">Summary</div>
                {editing ? (
                  <textarea
                    rows={3}
                    value={metrics.summary}
                    onChange={(e) => setMetrics((m) => ({ ...m, summary: e.target.value }))}
                    className="w-full max-w-3xl border border-vf-border rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-vf-red resize-y bg-white"
                    placeholder="Investment rationale, key assumptions, risks…"
                  />
                ) : (
                  <p className="text-xs text-vf-text leading-relaxed max-w-3xl whitespace-pre-line">{bc?.summary || <span className="text-vf-muted italic">No summary yet.</span>}</p>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ─── List of product lines ─── */
function CaseDot({ row }) {
  if (row.hasPnl) return <span className="inline-block w-2 h-2 rounded-full bg-green-500" title="P&L entered" />;
  if (row.hasCase) return <span className="inline-block w-2 h-2 rounded-full bg-yellow-400" title="Business case without P&L figures" />;
  return <span className="inline-block w-2 h-2 rounded-full bg-gray-300" title="No business case" />;
}

export default function BusinessCasePage() {
  const { filters, getFilterParams, showToast } = useProductStore();
  const [data, setData] = useState({ rows: [], summary: {} });
  const [template, setTemplate] = useState(null);
  const [loading, setLoading] = useState(true);
  // ?line=<family>|<product line> opens that line's business case (e.g. from the product drawer)
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedKey, setSelectedKeyState] = useState(() => searchParams.get('line'));
  const setSelectedKey = (key) => {
    setSelectedKeyState(key);
    setSearchParams(key ? { line: key } : {}, { replace: true });
  };
  const [reloadKey, setReloadKey] = useState(0);

  // Upload state
  const [showUpload, setShowUpload] = useState(false);
  const [uploadCat, setUploadCat] = useState('');
  const [uploadFam, setUploadFam] = useState('');
  const [uploadLineKey, setUploadLineKey] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    sendJson('/api/business-cases/template').then(setTemplate).catch((err) => showToast(err.message, 'warning'));
  }, [showToast]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const qs = getFilterParams();
        setData(await sendJson(`/api/business-cases${qs ? '?' + qs : ''}`));
      } catch (err) { showToast(err.message, 'warning'); }
      setLoading(false);
    })();
  }, [filters.category, filters.family, filters.productLine, filters.q, reloadKey]);

  const { rows, summary } = data;
  const selected = selectedKey && rows.find((r) => r.key === selectedKey);

  // Upload: pick the product line by category → family → line
  const uploadCategories = [...new Set(rows.map((r) => r.portfolio))].sort();
  const uploadFamilies = [...new Set(rows.filter((r) => !uploadCat || r.portfolio === uploadCat).map((r) => r.productFamily))].sort();
  const uploadLines = rows.filter((r) => (!uploadCat || r.portfolio === uploadCat) && (!uploadFam || r.productFamily === uploadFam))
    .sort((a, b) => a.productLine.localeCompare(b.productLine));

  const handleUpload = async () => {
    const file = fileRef.current?.files?.[0];
    const target = rows.find((r) => r.key === uploadLineKey);
    if (!target) { showToast('Select a product line first', 'warning'); return; }
    if (!file) { showToast('Select a file to upload', 'warning'); return; }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const p = new URLSearchParams({ productFamily: target.productFamily, productLine: target.productLine });
      const res = await fetch(`/api/upload/bizcase?${p}`, { method: 'POST', body: formData });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Upload failed');
      showToast(json.message || 'Business case uploaded');
      setShowUpload(false);
      setUploadLineKey('');
      if (fileRef.current) fileRef.current.value = '';
      setReloadKey((k) => k + 1);
    } catch (err) { showToast(err.message, 'warning'); }
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

  if (selected && template) {
    return (
      <div className="p-5">
        <BusinessCaseDetail line={selected} template={template} onBack={() => setSelectedKey(null)} onChanged={() => setReloadKey((k) => k + 1)} />
      </div>
    );
  }

  const selectCls = 'w-full border border-vf-border rounded-md px-2.5 py-1.5 text-xs bg-white';

  return (
    <div className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold">Business Cases</h2>
          {summary.lines > 0 && (
            <div className="text-[0.6875rem] text-vf-muted mt-0.5">
              {summary.withCase} of {summary.lines} product lines have a business case
              {summary.byStatus && ` · ${summary.byStatus.Approved} approved · ${summary.byStatus['In Review']} in review · ${summary.byStatus.Draft} draft`}
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-1.5 border border-vf-border bg-white rounded-md px-3 py-1.5 text-xs cursor-pointer font-sans text-vf-muted hover:bg-vf-surface" onClick={handleDownloadTemplate}>
            <Download size={12} /> Download Template
          </button>
          <button className="flex items-center gap-1.5 bg-vf-red text-white rounded-md px-3 py-1.5 text-xs cursor-pointer font-sans font-semibold hover:bg-red-700" onClick={() => setShowUpload(!showUpload)}>
            <Upload size={12} /> {showUpload ? 'Cancel' : 'Upload Business Case'}
          </button>
        </div>
      </div>

      {showUpload && (
        <div className="bg-white border border-vf-border rounded-[10px] p-4 mb-4">
          <div className="text-[0.8125rem] font-semibold mb-3">Upload Business Case</div>
          <div className="grid grid-cols-4 gap-3 items-end">
            <div>
              <label className="text-[0.6875rem] text-vf-muted block mb-1">Category</label>
              <select className={selectCls} value={uploadCat} onChange={(e) => { setUploadCat(e.target.value); setUploadFam(''); setUploadLineKey(''); }}>
                <option value="">All Categories</option>
                {uploadCategories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[0.6875rem] text-vf-muted block mb-1">Family</label>
              <select className={selectCls} value={uploadFam} onChange={(e) => { setUploadFam(e.target.value); setUploadLineKey(''); }}>
                <option value="">All Families</option>
                {uploadFamilies.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[0.6875rem] text-vf-muted block mb-1">Product Line ({uploadLines.length})</label>
              <select className={selectCls} value={uploadLineKey} onChange={(e) => setUploadLineKey(e.target.value)}>
                <option value="">Select a product line…</option>
                {uploadLines.map((l) => <option key={l.key} value={l.key}>{l.productLine}{uploadFam ? '' : ` (${l.productFamily})`}</option>)}
              </select>
            </div>
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <label className="text-[0.6875rem] text-vf-muted block mb-1">File (.xlsx)</label>
                <input ref={fileRef} type="file" accept=".xlsx" className="w-full border border-vf-border rounded-md px-2 py-1 text-xs bg-white" />
              </div>
              <button className="bg-vf-red text-white rounded-md px-4 py-1.5 text-xs cursor-pointer font-sans font-semibold hover:bg-red-700 disabled:opacity-50" onClick={handleUpload} disabled={uploading}>
                {uploading ? 'Uploading…' : 'Upload'}
              </button>
            </div>
          </div>
          <div className="text-[0.625rem] text-vf-muted mt-2">Upload the filled-in template. Only the input lines are read; totals, margins, EBITDA and cash flow are recalculated. Replaces that line's existing P&L.</div>
        </div>
      )}

      {loading && rows.length === 0 ? (
        <div className="text-center py-8 text-vf-muted text-sm">Loading...</div>
      ) : rows.length === 0 ? (
        <div className="text-center py-12 text-vf-muted text-sm">No product lines match the current filters</div>
      ) : (
        <div className="bg-white border border-vf-border rounded-[10px] overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-vf-surface border-b border-vf-border">
                <th className="text-left px-4 py-2.5 font-semibold text-[0.6875rem] text-vf-muted uppercase tracking-wide">Product Line</th>
                <th className="text-left px-4 py-2.5 font-semibold text-[0.6875rem] text-vf-muted uppercase tracking-wide">Category</th>
                <th className="text-left px-4 py-2.5 font-semibold text-[0.6875rem] text-vf-muted uppercase tracking-wide">Family</th>
                <th className="text-center px-4 py-2.5 font-semibold text-[0.6875rem] text-vf-muted uppercase tracking-wide">Business Case</th>
                <th className="text-center px-4 py-2.5 font-semibold text-[0.6875rem] text-vf-muted uppercase tracking-wide">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr
                  key={r.key}
                  className={`border-b border-[#f0eeea] transition-colors hover:bg-[#fdf9f9] cursor-pointer ${r.hasCase ? '' : 'text-vf-muted'} ${i > 0 && rows[i - 1].hasCase && !r.hasCase ? 'border-t-2 border-t-vf-border' : ''}`}
                  onClick={() => setSelectedKey(r.key)}
                >
                  <td className={`px-4 py-2.5 font-medium ${r.hasCase ? 'text-vf-dark' : ''}`}>{r.productLine}</td>
                  <td className="px-4 py-2.5 text-vf-muted">{r.portfolio}</td>
                  <td className="px-4 py-2.5 text-vf-muted">{r.productFamily}</td>
                  <td className="px-4 py-2.5 text-center"><CaseDot row={r} /></td>
                  <td className="px-4 py-2.5 text-center">
                    {r.status ? (
                      <span className={`px-2 py-0.5 rounded-full text-[0.625rem] font-semibold ${STATUS_STYLE[r.status] || 'bg-gray-500 text-white'}`}>{r.status}</span>
                    ) : (
                      <span className="text-vf-muted">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center gap-5 mt-3 text-[0.6875rem] text-vf-muted flex-wrap">
        <span className="font-semibold text-vf-dark">Business case:</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-500" /> P&L entered</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-yellow-400" /> Created, P&L figures not yet entered</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-gray-300" /> None yet</span>
        <span className="ml-auto">Click any product line to open, create or edit its business case →</span>
      </div>
    </div>
  );
}
