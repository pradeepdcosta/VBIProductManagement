import { useEffect, useState } from 'react';
import { Plus, Pencil, Info } from 'lucide-react';
import useProductStore from '../store/useProductStore.js';

function fmtK(v) {
  if (v == null || v === 0) return '—';
  if (Math.abs(v) >= 1000000) return `€${(v / 1000000).toFixed(1)}M`;
  return `€${(v / 1000).toFixed(0)}K`;
}

function fmtCell(v) {
  if (v == null || v === 0) return '-';
  return Math.round(v).toLocaleString();
}

const pctOf = (part, whole) => (whole ? Math.round((part / whole) * 100) : 0);

const ACTION_STATUSES = {
  'Planned': 'bg-gray-100 text-gray-700',
  'In Progress': 'bg-blue-100 text-blue-800',
  'On Track': 'bg-green-100 text-green-800',
  'At Risk': 'bg-yellow-100 text-yellow-800',
  'Completed': 'bg-green-200 text-green-900',
  'Cancelled': 'bg-gray-100 text-gray-400 line-through',
};

const IMPACT_STYLE = {
  'OpEx reduction': 'bg-red-50 text-red-700 border-red-200',
  'Depreciation reduction': 'bg-blue-50 text-blue-700 border-blue-200',
  'OpEx & depreciation': 'bg-purple-50 text-purple-700 border-purple-200',
  'Allocation reduction': 'bg-amber-50 text-amber-800 border-amber-200',
  'Cost avoidance': 'bg-green-50 text-green-700 border-green-200',
};

async function sendJson(url, method, body) {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

function PlaceholderNote({ count, total }) {
  if (!count) return null;
  return (
    <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 text-amber-900 text-xs px-3 py-2 rounded-lg mb-4">
      <Info size={14} className="shrink-0 mt-px" />
      <span>
        <span className="font-semibold">Placeholder figures.</span>{' '}
        {count === total ? 'All' : `${count} of ${total}`} product lines show the same dummy cost profile until real cost data is loaded for them. These are not actual costs.
      </span>
    </div>
  );
}

/* ─── Cost reduction actions (add / edit / delete) ─── */
const EMPTY_ACTION = { action: '', impactType: 'OpEx reduction', savings: '', status: 'Planned', owner: '', targetDate: '', notes: '' };

function ActionForm({ initial, options, onCancel, onSave, saving }) {
  const [form, setForm] = useState(initial);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const inputCls = 'w-full border border-vf-border rounded-md px-2.5 py-1.5 text-xs focus:outline-none focus:border-vf-red bg-white';
  const label = (t, req) => <label className="text-[10px] font-semibold text-vf-muted uppercase tracking-wide block mb-1">{t}{req && <span className="text-vf-red ml-0.5">*</span>}</label>;

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); onSave(form); }}
      className="border border-vf-border rounded-lg p-3 bg-vf-surface space-y-2.5"
    >
      <div>
        {label('What is the action?', true)}
        <textarea required rows={2} className={`${inputCls} resize-y`} value={form.action} onChange={(e) => set('action', e.target.value)} placeholder="e.g. Consolidate hosting onto the shared platform" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          {label('Impact', true)}
          <select className={inputCls} value={form.impactType} onChange={(e) => set('impactType', e.target.value)}>
            {options.impactTypes.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          {label('Saving (€ per year)')}
          <input type="number" min="0" step="1000" className={`${inputCls} font-mono`} value={form.savings} onChange={(e) => set('savings', e.target.value)} placeholder="0" />
        </div>
        <div>
          {label('Status')}
          <select className={inputCls} value={form.status} onChange={(e) => set('status', e.target.value)}>
            {options.statuses.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          {label('Target date')}
          <input type="date" className={inputCls} value={form.targetDate} onChange={(e) => set('targetDate', e.target.value)} />
        </div>
      </div>
      <div>
        {label('Owner')}
        <input className={inputCls} value={form.owner} onChange={(e) => set('owner', e.target.value)} placeholder="Name or team" />
      </div>
      <div>
        {label('Notes')}
        <textarea rows={2} className={`${inputCls} resize-y`} value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Dependencies, assumptions, how the saving is measured…" />
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={onCancel} className="text-xs text-vf-muted hover:text-vf-dark px-2 py-1.5">Cancel</button>
        <button type="submit" disabled={saving} className="bg-vf-red text-white rounded-md px-3 py-1.5 text-xs font-semibold hover:bg-vf-red-hover disabled:opacity-50">
          {saving ? 'Saving…' : 'Save action'}
        </button>
      </div>
    </form>
  );
}

function CostActions({ item, onChanged }) {
  const showToast = useProductStore((s) => s.showToast);
  const [actions, setActions] = useState([]);
  const [options, setOptions] = useState({ impactTypes: Object.keys(IMPACT_STYLE), statuses: Object.keys(ACTION_STATUSES) });
  const [editing, setEditing] = useState(null); // null | 'new' | action id
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [list, opts] = await Promise.all([
          sendJson(`/api/costs/actions?fy=${item.fy}&productLine=${encodeURIComponent(item.productLine)}&productFamily=${encodeURIComponent(item.productFamily)}`, 'GET'),
          sendJson('/api/costs/actions/options', 'GET'),
        ]);
        setActions(list);
        setOptions(opts);
      } catch (err) { setError(err.message); }
    })();
  }, [item.productLine, item.productFamily, item.fy]);

  const save = async (form) => {
    setSaving(true);
    setError(null);
    try {
      const body = { ...form, productLine: item.productLine, productFamily: item.productFamily, fy: item.fy, savings: form.savings === '' ? 0 : Number(form.savings) };
      if (editing === 'new') {
        const created = await sendJson('/api/costs/actions', 'POST', body);
        setActions((a) => [...a, created]);
        showToast('Action added');
      } else {
        const updated = await sendJson(`/api/costs/actions/${editing}`, 'PUT', body);
        setActions((a) => a.map((x) => (x.id === updated.id ? updated : x)));
        showToast('Action saved');
      }
      setEditing(null);
      onChanged?.();
    } catch (err) { setError(err.message); }
    setSaving(false);
  };

  const remove = async (a) => {
    if (confirmDelete !== a.id) { setConfirmDelete(a.id); return; }
    setError(null);
    try {
      await sendJson(`/api/costs/actions/${a.id}`, 'DELETE');
      setActions((list) => list.filter((x) => x.id !== a.id));
      setConfirmDelete(null);
      showToast('Action deleted');
      onChanged?.();
    } catch (err) { setError(err.message); }
  };

  const live = actions.filter((a) => a.status !== 'Cancelled');
  const totalSavings = live.reduce((s, a) => s + a.savings, 0);
  const byImpact = live.reduce((m, a) => ({ ...m, [a.impactType]: (m[a.impactType] || 0) + a.savings }), {});
  const toForm = (a) => ({
    action: a.action, impactType: a.impactType, savings: a.savings ? String(a.savings) : '', status: a.status,
    owner: a.owner || '', targetDate: a.targetDate ? a.targetDate.slice(0, 10) : '', notes: a.notes || '',
  });

  return (
    <div className="px-4 py-4">
      <div className="flex items-center justify-between mb-1">
        <div className="text-xs font-bold text-vf-dark uppercase tracking-wide">Cost Reduction Actions</div>
        {editing === null && (
          <button onClick={() => { setEditing('new'); setError(null); }} className="flex items-center gap-1 bg-vf-red text-white rounded-md px-2.5 py-1 text-[11px] font-semibold hover:bg-vf-red-hover">
            <Plus size={12} /> Add action
          </button>
        )}
      </div>

      {live.length > 0 && (
        <div className="mb-3">
          <div className="text-sm font-bold text-green-700 font-mono">Planned savings: {fmtK(totalSavings)}</div>
          <div className="text-[10px] text-vf-muted mt-0.5">
            {Object.entries(byImpact).map(([t, v]) => `${t} ${fmtK(v)}`).join(' · ')}
            {item.grandTotal > 0 && ` · ${pctOf(totalSavings, item.grandTotal)}% of total cost`}
          </div>
        </div>
      )}

      {error && <div className="mb-3 bg-red-50 border border-red-200 text-red-700 text-xs px-2.5 py-2 rounded-lg">{error}</div>}

      {editing === 'new' && (
        <div className="mb-3">
          <ActionForm initial={EMPTY_ACTION} options={options} saving={saving} onCancel={() => setEditing(null)} onSave={save} />
        </div>
      )}

      {actions.length === 0 && editing !== 'new' ? (
        <div className="text-sm text-vf-muted italic py-4">No actions planned yet.</div>
      ) : (
        <div className="space-y-2.5">
          {actions.map((a) => (editing === a.id ? (
            <ActionForm key={a.id} initial={toForm(a)} options={options} saving={saving} onCancel={() => setEditing(null)} onSave={save} />
          ) : (
            <div key={a.id} className="border border-[#e8e6e1] rounded-lg p-3 hover:shadow-sm transition-shadow group">
              <div className="flex items-start gap-2 mb-2">
                <div className="text-xs font-medium text-vf-dark leading-snug flex-1">{a.action}</div>
                <button onClick={() => { setEditing(a.id); setError(null); }} title="Edit action" className="opacity-0 group-hover:opacity-100 text-vf-muted hover:text-vf-dark p-0.5"><Pencil size={12} /></button>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                <span className={`px-2 py-0.5 rounded border text-[10px] font-semibold ${IMPACT_STYLE[a.impactType] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>{a.impactType}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${ACTION_STATUSES[a.status] || 'bg-gray-100 text-gray-600'}`}>{a.status}</span>
                <span className="ml-auto text-sm font-bold font-mono text-green-700">{fmtK(a.savings)}</span>
              </div>
              <div className="flex items-center justify-between text-[10px] text-vf-muted">
                <span>{a.owner || '—'}</span>
                <span>{a.targetDate ? new Date(a.targetDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) : 'TBC'}</span>
              </div>
              {a.notes && <div className="text-[11px] text-vf-muted mt-1.5 leading-snug whitespace-pre-line">{a.notes}</div>}
              <div className="flex justify-end mt-1.5">
                <button
                  onClick={() => remove(a)}
                  onBlur={() => setConfirmDelete(null)}
                  className={`text-[10px] font-medium rounded px-1.5 py-0.5 ${confirmDelete === a.id ? 'bg-red-600 text-white' : 'text-vf-muted hover:text-red-600 opacity-0 group-hover:opacity-100'}`}
                >
                  {confirmDelete === a.id ? 'Confirm delete' : 'Delete'}
                </button>
              </div>
            </div>
          )))}
        </div>
      )}
    </div>
  );
}

/* ─── Cost Detail View (editable cost sheet) ─── */

// Same arithmetic as the server (routes/costs.js) so totals update while typing
function sectionTotals(s) {
  const directOpex = s.directFte + s.voisFte + s.external + s.manualAdj;
  const directDep = s.depreciation;
  const opex = directOpex + s.crossOpex + s.indirectOpex;
  const dep = directDep + s.crossDep + s.indirectDep;
  return { directOpex, directDep, directTotal: directOpex + directDep, opex, dep, total: opex + dep };
}

function sheetTotals(b) {
  const ps = sectionTotals(b.ps);
  const ppe = sectionTotals(b.ppe);
  const allocations = b.alloc.commercial + b.alloc.directorate + b.alloc.vsol + b.alloc.networks;
  return { ps, ppe, allocations, opex: ps.opex + ppe.opex + allocations, dep: ps.dep + ppe.dep, grandTotal: ps.total + ppe.total + allocations };
}

// Draft values are strings while editing; totals treat blanks as 0
const toNumbers = (draft) => JSON.parse(JSON.stringify(draft), (k, v) => (typeof v === 'string' ? (Number(v) || 0) : v));
const toDraft = (b) => JSON.parse(JSON.stringify(b), (k, v) => (typeof v === 'number' ? (v === 0 ? '' : String(v)) : v));

// Rows of one direct-cost section (P&S or PPE). `opex`/`dep` name the editable field.
function sectionRows(sec, label) {
  return [
    { label: `Direct FTE (${label})`, opex: 'directFte', fte: true },
    { label: `VOIS FTE (${label})`, opex: 'voisFte' },
    { label: 'External', opex: 'external' },
    { label: 'Depreciation', dep: 'depreciation' },
    { label: 'Manual Adjs (Accounting)', opex: 'manualAdj', allowNegative: true },
    { label: `Total ${label} Direct`, total: (t) => [t[sec].directOpex, t[sec].directDep, t[sec].directTotal], bold: true, topBorder: true },
    { label: 'Cross Portfolio Allocations', opex: 'crossOpex', dep: 'crossDep' },
    { label: `${label} Indirect Allocations`, opex: 'indirectOpex', dep: 'indirectDep' },
    { label: `Total ${label} Cost`, total: (t) => [t[sec].opex, t[sec].dep, t[sec].total], bold: true, topBorder: true, highlight: true },
  ].map((r) => ({ ...r, sec }));
}

const SHEET = [
  ...sectionRows('ps', 'P&S'),
  { spacer: true },
  ...sectionRows('ppe', 'PPE'),
  { spacer: true },
  { label: 'Other Allocations', sectionHeader: true },
  { label: 'Commercial', alloc: 'commercial' },
  { label: 'Directorate (SAMs Allocation)', alloc: 'directorate' },
  { label: 'VSOL', alloc: 'vsol' },
  { label: 'Networks', alloc: 'networks' },
  { label: 'Total Allocations', total: (t) => [t.allocations, 0, t.allocations], bold: true, topBorder: true },
  { spacer: true },
  { label: 'Grand Total', total: (t) => [t.opex, t.dep, t.grandTotal], bold: true, topBorder: true, isGrand: true },
];

function CellInput({ value, onChange, allowNegative, label }) {
  return (
    <input
      type="number"
      inputMode="decimal"
      step="any"
      min={allowNegative ? undefined : 0}
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="0"
      className="w-full max-w-[110px] ml-auto block text-right font-mono text-xs border border-vf-border rounded px-1.5 py-0.5 bg-white focus:outline-none focus:border-vf-red [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
    />
  );
}

function CostDetail({ item, onBack, onSaved, onActionsChanged }) {
  const showToast = useProductStore((s) => s.showToast);
  const fteBreakdown = item.fteBreakdown || [];
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(() => toDraft(item.breakdown));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [confirmRevert, setConfirmRevert] = useState(false);

  // Reset the draft whenever fresh figures arrive from the server
  useEffect(() => { if (!editing) setDraft(toDraft(item.breakdown)); }, [item.breakdown, editing]);

  const values = editing ? toNumbers(draft) : item.breakdown;
  const t = sheetTotals(values);
  const dirty = editing && JSON.stringify(toNumbers(draft)) !== JSON.stringify(item.breakdown);

  const setField = (group, field, v) => setDraft((d) => ({ ...d, [group]: { ...d[group], [field]: v } }));

  const lineParams = `fy=${item.fy}&productFamily=${encodeURIComponent(item.productFamily)}&productLine=${encodeURIComponent(item.productLine)}`;

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await sendJson('/api/costs/line', 'PUT', { fy: item.fy, productFamily: item.productFamily, productLine: item.productLine, breakdown: toNumbers(draft) });
      setEditing(false);
      showToast(`Costs saved for ${item.productLine}`);
      onSaved();
    } catch (err) { setError(err.message); }
    setSaving(false);
  };

  const revert = async () => {
    if (!confirmRevert) { setConfirmRevert(true); return; }
    setSaving(true);
    setError(null);
    try {
      await sendJson(`/api/costs/line?${lineParams}`, 'DELETE');
      setEditing(false);
      setConfirmRevert(false);
      showToast(`${item.productLine} reverted to placeholder figures`);
      onSaved();
    } catch (err) { setError(err.message); }
    setSaving(false);
  };

  const cancel = () => {
    if (dirty && !window.confirm('Discard your unsaved cost changes?')) return;
    setDraft(toDraft(item.breakdown));
    setEditing(false);
    setError(null);
  };

  const back = () => {
    if (dirty && !window.confirm('You have unsaved cost changes. Leave without saving?')) return;
    onBack();
  };

  const opexCell = (r) => {
    if (r.total) return fmtCell(r.total(t)[0]);
    const group = r.alloc ? 'alloc' : r.sec;
    const field = r.alloc || r.opex;
    if (!field) return '';
    return editing
      ? <CellInput label={`${r.label} opex`} value={draft[group][field]} allowNegative={r.allowNegative} onChange={(v) => setField(group, field, v)} />
      : fmtCell(values[group][field]);
  };
  const depCell = (r) => {
    if (r.total) return fmtCell(r.total(t)[1]);
    if (r.alloc) return '-';
    if (!r.dep) return '';
    return editing
      ? <CellInput label={`${r.label} depreciation`} value={draft[r.sec][r.dep]} onChange={(v) => setField(r.sec, r.dep, v)} />
      : fmtCell(values[r.sec][r.dep]);
  };
  const rowTotal = (r) => {
    if (r.total) return r.total(t)[2];
    const group = r.alloc ? 'alloc' : r.sec;
    return (r.alloc ? values.alloc[r.alloc] : 0) + (r.opex ? values[group][r.opex] : 0) + (r.dep ? values[r.sec][r.dep] : 0);
  };
  const fteCell = (r) => {
    if (!r.fte) return '';
    return editing
      ? <CellInput label={`${r.label} count`} value={draft.fte[r.sec]} onChange={(v) => setField('fte', r.sec, v)} />
      : (values.fte[r.sec] || '—');
  };

  return (
    <div>
      <button onClick={back} className="flex items-center gap-1.5 text-sm text-vf-red hover:underline mb-4 font-medium">
        ← Back to Cost Overview
      </button>

      {item.placeholder && !editing && <PlaceholderNote count={1} total={1} />}

      {/* Header */}
      <div className="bg-vf-dark text-white rounded-t-[10px] px-6 py-4 flex items-center justify-between gap-4">
        <div>
          <div className="text-xs text-gray-400 mb-0.5">Product Line</div>
          <h3 className="text-xl font-bold">{item.productLine}</h3>
          <div className="text-sm text-gray-300 mt-0.5">{item.productFamily} · {item.portfolio} · {item.fy}</div>
        </div>
        <div className="flex items-center gap-5">
          {!editing && (
            <button onClick={() => { setEditing(true); setError(null); }} className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white text-sm font-medium rounded-lg px-3 py-1.5">
              <Pencil size={13} /> Edit costs
            </button>
          )}
          <div className="text-right">
            <div className="text-xs text-gray-400">Grand Total</div>
            <div className="text-3xl font-bold font-mono">{fmtK(t.grandTotal)}</div>
            <div className="text-xs text-gray-400 mt-1">FTE: {(values.fte.ps + values.fte.ppe) || '—'}</div>
          </div>
        </div>
      </div>

      {editing && (
        <div className="bg-amber-50 border-x border-amber-200 px-6 py-2.5 flex items-center gap-3 text-xs">
          <span className="font-semibold text-amber-900">Editing costs (€)</span>
          <span className="text-amber-800">Totals update as you type. Only Manual Adjs can be negative.</span>
          {error && <span className="text-red-700 font-medium">{error}</span>}
          <div className="flex-1" />
          {!item.placeholder && (
            <button
              onClick={revert}
              onBlur={() => setConfirmRevert(false)}
              disabled={saving}
              className={`px-2.5 py-1 rounded font-medium ${confirmRevert ? 'bg-red-600 text-white' : 'text-red-700 hover:bg-red-50 border border-red-200'}`}
            >
              {confirmRevert ? 'Confirm — discard these figures' : 'Revert to placeholder'}
            </button>
          )}
          <button onClick={cancel} disabled={saving} className="px-2.5 py-1 text-vf-muted hover:text-vf-dark">Cancel</button>
          <button onClick={save} disabled={saving || !dirty} className="bg-vf-red text-white rounded-md px-4 py-1.5 font-semibold hover:bg-vf-red-hover disabled:opacity-40">
            {saving ? 'Saving…' : 'Save costs'}
          </button>
        </div>
      )}

      <div className="flex gap-0">
        {/* Left: Cost Table */}
        <div className="flex-1 bg-white border-l border-b border-vf-border rounded-bl-[10px] overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            {/* Column headers matching Excel */}
            <thead>
              <tr className="bg-yellow-300">
                <th className="text-left py-2 px-3 font-semibold border-b-2 border-vf-dark w-[220px]"></th>
                <th className="text-right py-2 px-2 font-semibold border-b-2 border-vf-dark w-[110px]">Opex</th>
                <th className="text-right py-2 px-2 font-semibold border-b-2 border-vf-dark w-[110px]">Dep</th>
                <th className="text-right py-2 px-2 font-semibold border-b-2 border-vf-dark w-[90px]">Total</th>
                <th className="text-right py-2 px-2 font-semibold border-b-2 border-vf-dark w-[80px]">Below EBIT</th>
                <th className="text-right py-2 px-2 font-bold border-b-2 border-vf-dark w-[100px]">Total</th>
                <th className="text-right py-2 px-2 font-semibold border-b-2 border-vf-dark w-[90px]">No of FTE</th>
              </tr>
            </thead>
            <tbody>
              {SHEET.map((r, i) => {
                if (r.spacer) return <tr key={i}><td colSpan={7} className="py-2" /></tr>;
                if (r.sectionHeader) return (
                  <tr key={i}><td colSpan={7} className="py-2 px-3 font-bold text-sm text-vf-dark">{r.label}</td></tr>
                );
                const total = rowTotal(r);
                return (
                  <tr key={i} className={`
                    ${r.topBorder ? 'border-t-2 border-vf-dark' : 'border-t border-[#e8e6e1]'}
                    ${r.bold ? 'font-bold' : ''}
                    ${r.isGrand ? 'bg-vf-dark text-white text-sm' : ''}
                    ${r.highlight ? 'bg-blue-50' : ''}
                  `}>
                    <td className={`py-1.5 px-3 ${r.bold ? 'font-bold' : ''}`}>{r.label}</td>
                    <td className="py-1 px-2 text-right font-mono">{opexCell(r)}</td>
                    <td className="py-1 px-2 text-right font-mono">{depCell(r)}</td>
                    <td className="py-1.5 px-2 text-right font-mono">{fmtCell(total)}</td>
                    <td className="py-1.5 px-2 text-right font-mono">{r.total ? '-' : ''}</td>
                    <td className={`py-1.5 px-2 text-right font-mono ${r.bold || r.isGrand ? 'font-bold' : ''}`}>{fmtCell(total)}</td>
                    <td className="py-1 px-2 text-right font-mono">{fteCell(r)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* FTE Breakdown below the table */}
          {fteBreakdown.length > 0 && (
            <div className="px-4 py-4 border-t border-vf-border">
              <div className="text-xs font-bold text-vf-dark uppercase tracking-wide mb-2">P&S FTE Breakdown</div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-vf-border">
                    <th className="text-left py-1.5 text-vf-muted font-semibold">Employee Name</th>
                    <th className="text-left py-1.5 text-vf-muted font-semibold">Direct / VOIS</th>
                    <th className="text-right py-1.5 text-vf-muted font-semibold">FTE Allocation</th>
                  </tr>
                </thead>
                <tbody>
                  {fteBreakdown.map((f, i) => (
                    <tr key={i} className="border-t border-[#f0eeea]">
                      <td className="py-1.5 font-medium">{f.name}</td>
                      <td className="py-1.5">{f.type}</td>
                      <td className="py-1.5 text-right font-mono font-semibold">{f.allocation}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right: Cost Reduction Actions */}
        <div className="w-[360px] shrink-0 bg-white border-x border-b border-vf-border rounded-br-[10px]">
          <CostActions item={{ ...item, grandTotal: t.grandTotal }} onChanged={onActionsChanged} />
        </div>
      </div>
    </div>
  );
}

/* ─── Main Cost Overview ─── */
function Tile({ label, value, sub, tone }) {
  return (
    <div className="bg-white border border-vf-border rounded-[10px] px-5 py-4">
      <div className="text-xs font-semibold text-vf-muted uppercase tracking-wide mb-1">{label}</div>
      <div className={`text-4xl font-bold font-mono ${tone === 'red' ? 'text-vf-red' : 'text-vf-dark'}`}>{value}</div>
      {sub && <div className="text-xs text-vf-muted mt-1">{sub}</div>}
    </div>
  );
}

export default function CostManagement() {
  const filters = useProductStore((s) => s.filters);
  const showToast = useProductStore((s) => s.showToast);
  const [data, setData] = useState({ rows: [], summary: {} });
  const [loading, setLoading] = useState(true);
  const [selectedKey, setSelectedKey] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ fy: 'FY28' });
        if (filters.category) params.set('category', filters.category);
        if (filters.family) params.set('family', filters.family);
        if (filters.productLine) params.set('productLine', filters.productLine);
        if (filters.q) params.set('q', filters.q);
        const json = await sendJson(`/api/costs?${params}`, 'GET');
        setData(json);
      } catch (err) {
        showToast(err.message, 'warning');
      }
      setLoading(false);
    })();
  }, [filters.category, filters.family, filters.productLine, filters.q, reloadKey, showToast]);

  const { rows, summary } = data;
  const selectedItem = selectedKey && rows.find((r) => r.key === selectedKey);

  if (selectedItem) {
    return (
      <div className="p-5">
        <CostDetail
          item={selectedItem}
          onBack={() => setSelectedKey(null)}
          onSaved={() => setReloadKey((k) => k + 1)}
          onActionsChanged={() => setReloadKey((k) => k + 1)}
        />
      </div>
    );
  }

  const sum = (k) => rows.reduce((s, r) => s + (r[k] || 0), 0);

  return (
    <div className="p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">Cost Management <span className="text-sm text-vf-muted font-normal ml-1">{data.fy || 'FY28'}</span></h2>
      </div>

      <PlaceholderNote count={summary.placeholderLines} total={summary.lines} />

      {/* Summary Row — Opex + Depreciation = Total cost */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        <Tile label="Product Lines" value={summary.lines || 0} />
        <Tile
          label="Total Cost"
          value={fmtK(summary.grandTotal)}
          tone="red"
          sub={summary.grandTotal ? `Direct ${fmtK(summary.direct)} (${pctOf(summary.direct, summary.grandTotal)}%) · Allocations ${fmtK(summary.allocations)} (${pctOf(summary.allocations, summary.grandTotal)}%)` : null}
        />
        <Tile label="Opex" value={fmtK(summary.opex)} sub={summary.grandTotal ? `${pctOf(summary.opex, summary.grandTotal)}% of total · incl. all allocations` : null} />
        <Tile label="Depreciation" value={fmtK(summary.dep)} sub={summary.grandTotal ? `${pctOf(summary.dep, summary.grandTotal)}% of total · P&S + PPE` : null} />
      </div>

      {/* Product line table */}
      {loading ? (
        <div className="bg-white border border-vf-border rounded-[10px] p-8 text-center text-vf-muted">Loading cost data...</div>
      ) : rows.length === 0 ? (
        <div className="bg-white border border-vf-border rounded-[10px] p-8 text-center text-vf-muted">No product lines match these filters.</div>
      ) : (
        <div className="bg-white border border-vf-border rounded-[10px] overflow-hidden">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-yellow-300 border-b-2 border-vf-dark">
                <th className="text-left py-2 px-4 font-semibold">Product Line</th>
                <th className="text-left py-2 px-2 font-semibold">Product Family</th>
                <th className="text-right py-2 px-2 font-semibold w-[100px]">P&S Total</th>
                <th className="text-right py-2 px-2 font-semibold w-[100px]">PPE Total</th>
                <th className="text-right py-2 px-2 font-bold w-[110px]">Product Total</th>
                <th className="text-right py-2 px-2 font-semibold w-[100px]">Allocations</th>
                <th className="text-right py-2 px-4 font-bold w-[120px]">Grand Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.key}
                  className="border-t border-[#e8e6e1] cursor-pointer hover:bg-[#fdf9f9] transition-colors"
                  onClick={() => setSelectedKey(r.key)}
                >
                  <td className="py-2 px-4 font-medium text-vf-dark">
                    {r.productLine}
                    {r.actionCount > 0 && (
                      <span className="ml-2 text-[10px] font-semibold text-green-700 bg-green-50 border border-green-200 rounded px-1.5 py-px whitespace-nowrap">
                        {r.actionCount} action{r.actionCount === 1 ? '' : 's'} · {fmtK(r.plannedSavings)}
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-2 text-vf-muted">{r.productFamily}</td>
                  <td className="py-2 px-2 text-right font-mono">{fmtCell(r.psTotal)}</td>
                  <td className="py-2 px-2 text-right font-mono">{fmtCell(r.ppeTotal)}</td>
                  <td className="py-2 px-2 text-right font-mono font-bold">{fmtCell(r.totalProduct)}</td>
                  <td className="py-2 px-2 text-right font-mono text-vf-muted">{fmtCell(r.allocations)}</td>
                  <td className="py-2 px-4 text-right font-mono font-bold text-vf-red">{fmtCell(r.grandTotal)}</td>
                </tr>
              ))}
              {/* Totals row */}
              <tr className="border-t-2 border-vf-dark bg-vf-dark text-white font-bold text-sm">
                <td className="py-2.5 px-4">Grand Total</td>
                <td className="py-2.5 px-2"></td>
                <td className="py-2.5 px-2 text-right font-mono">{fmtCell(sum('psTotal'))}</td>
                <td className="py-2.5 px-2 text-right font-mono">{fmtCell(sum('ppeTotal'))}</td>
                <td className="py-2.5 px-2 text-right font-mono">{fmtCell(sum('totalProduct'))}</td>
                <td className="py-2.5 px-2 text-right font-mono">{fmtCell(sum('allocations'))}</td>
                <td className="py-2.5 px-4 text-right font-mono">{fmtCell(summary.grandTotal)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <div className="text-xs text-vf-muted mt-3">Click any product line to view the detailed cost breakdown and plan cost reduction actions →</div>
    </div>
  );
}
