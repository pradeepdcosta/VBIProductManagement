import { useEffect, useState, useMemo, useCallback } from 'react';
import useProductStore from '../store/useProductStore.js';

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_COLORS = {
  'On Track':    { bg: 'bg-green-100',  text: 'text-green-800',  dot: 'bg-green-500' },
  'Done':        { bg: 'bg-green-100',  text: 'text-green-800',  dot: 'bg-green-500' },
  'In Progress': { bg: 'bg-blue-100',   text: 'text-blue-800',   dot: 'bg-blue-500' },
  'Mobilise':    { bg: 'bg-blue-100',   text: 'text-blue-800',   dot: 'bg-blue-500' },
  'DB Approved': { bg: 'bg-purple-100', text: 'text-purple-800', dot: 'bg-purple-500' },
  'Not Started': { bg: 'bg-gray-100',   text: 'text-gray-600',   dot: 'bg-gray-400' },
  'At Risk':     { bg: 'bg-yellow-100', text: 'text-yellow-800', dot: 'bg-yellow-500' },
  'Off-Track':   { bg: 'bg-red-100',    text: 'text-red-800',    dot: 'bg-red-500' },
};

const CATEGORY_COLORS = {
  'Product Launch':          '#E60000',
  'Feature Release':         '#0066CC',
  'Product Rationalization': '#FF9900',
  'Technical Enabler':       '#6B6A66',
  'Service Launch':          '#00857C',
  'Aspirational':            '#9B59B6',
};

const QUARTERS   = ['Q1', 'Q2', 'Q3', 'Q4'];
const STAGE_KEYS = ['concept', 'bizCase', 'development', 'deliveryReadiness', 'regulatoryCompliance', 'commercialApproval', 'gtm', 'channelPartner', 'salesEnable', 'launch'];
const STAGE_LABELS = ['Concept', 'Business Case', 'Development', 'Delivery Readiness', 'Regulatory & Compliance', 'Commercial Approval', 'GTM', 'Channel & Partner Readiness', 'Sales Enablement', 'Launch'];
const STAGE_DEFINITIONS = [
  'Initial idea validated — market need, opportunity, and feasibility confirmed by product leadership.',
  'Strategic and financial justification approved — funding agreed and investment committed to proceed.',
  'Product design and technical build complete — solution developed, tested, and ready for operational deployment.',
  'Operational readiness confirmed — ordering journeys live, support teams trained, back-office and billing systems updated.',
  'All market-specific regulatory and compliance requirements checked and cleared for target geographies.',
  'Pricing model, margins, and P&L reviewed and signed off by commercial and finance leadership.',
  'Go-to-market strategy agreed — positioning, messaging, target segments, pricing, and launch plan confirmed.',
  'External distribution channels and partners fully enabled — trained, contracted, and ready to sell.',
  'Internal sales teams trained, sales plays distributed, all customer-facing and sales-facing materials updated.',
  'Product live in market — orders can be taken across all agreed geographies. Post-launch monitoring active.',
];

const EPIC_TYPES = [
  'New Product',
  'New Feature',
  'Enhancement',
  'Migration',
  'Retirement',
];

const RISK_CONFIG = {
  High:   { bg: 'bg-red-100',    text: 'text-red-700',    dot: 'bg-red-500',    label: 'High Risk' },
  Medium: { bg: 'bg-amber-100',  text: 'text-amber-700',  dot: 'bg-amber-500',  label: 'Medium Risk' },
  Low:    { bg: 'bg-green-100',  text: 'text-green-700',  dot: 'bg-green-500',  label: 'Low Risk' },
};

const CHECKLIST_CATEGORIES = [
  'Market & Go-Live Dates',
  'Systems Readiness',
  'VBTS Readiness',
  'Commercial Readiness',
  'Sales Readiness',
  'Marketing Readiness',
  'Solution Sales Readiness',
  'Other',
];

// ─── NPD cycle review (budget review stages, flags, importance) ───────────────

const DB_STAGES = [
  { key: 'day1', short: 'Day 1', label: 'DB Day 1' },
  { key: 'day2', short: 'Day 2', label: 'DB Day 2' },
  { key: 'day3', short: 'Day 3', label: 'DB Day 3' },
  { key: 'final', short: 'Final budget', label: 'Final budget approval' },
];
const NPD_IMPORTANCE = ['High', 'Medium', 'Low', 'Not rated'];
const EMPTY_REVIEW_FILTERS = { db: '', target: '', ai: '', it: '', importance: '' };

const isYes = (v) => /^yes/i.test(v || '');
const isNo = (v) => /^no/i.test(v || '');
const yesNoMatches = (value, wanted) => !wanted || (wanted === 'Yes' ? isYes(value) : isNo(value));

function matchesReviewFilters(i, f) {
  if (f.db) {
    const [stage, outcome] = f.db.split('|');
    const actual = i.dbReview?.[stage] || 'Pending';
    if (actual !== outcome) return false;
  }
  if (!yesNoMatches(i.vbiTargetPortfolio, f.target)) return false;
  if (!yesNoMatches(i.aiFlag, f.ai)) return false;
  if (!yesNoMatches(i.localItImpact, f.it)) return false;
  if (f.importance && (i.npdImportance || 'Not rated') !== f.importance) return false;
  return true;
}

function ReviewSelect({ value, onChange, label, children }) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`border rounded-md px-2.5 py-1.5 text-xs bg-white cursor-pointer focus:outline-none focus:border-vf-red ${value ? 'border-vf-red text-vf-red font-semibold' : 'border-vf-border'}`}
    >
      {children}
    </select>
  );
}

const NPD_IMPORTANCE_STYLE = {
  High: 'bg-red-100 text-red-700',
  Medium: 'bg-amber-100 text-amber-700',
  Low: 'bg-blue-100 text-blue-700',
  'Not rated': 'bg-gray-100 text-gray-500',
};

function NpdImportanceBadge({ level, prefix = 'VBI importance' }) {
  if (!level) return null;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${NPD_IMPORTANCE_STYLE[level] || NPD_IMPORTANCE_STYLE['Not rated']}`}>
      {prefix}: {level}
    </span>
  );
}

const OUTCOME_STYLE = {
  Approved: 'bg-green-100 text-green-800 border-green-300',
  'Not approved': 'bg-red-100 text-red-700 border-red-300',
  Pending: 'bg-white text-vf-muted border-vf-border',
};
const NEXT_OUTCOME = { Pending: 'Approved', Approved: 'Not approved', 'Not approved': null };

// One chip per budget review stage; click to cycle Pending → Approved → Not approved → Pending
function DbReviewControl({ review, onChange }) {
  return (
    <div>
      <div className="text-[10px] font-semibold text-vf-muted uppercase tracking-wide mb-1.5">Budget review (VBI)</div>
      <div className="flex flex-wrap gap-1.5">
        {DB_STAGES.map((s) => {
          const outcome = review?.[s.key] || 'Pending';
          return (
            <button
              key={s.key}
              onClick={() => onChange({ ...Object.fromEntries(DB_STAGES.map((x) => [x.key, review?.[x.key] || null])), [s.key]: NEXT_OUTCOME[outcome] })}
              title="Click to change: Pending → Approved → Not approved"
              className={`px-2 py-1 rounded border text-[11px] font-semibold transition-colors hover:shadow-sm ${OUTCOME_STYLE[outcome]}`}
            >
              {s.label}: {outcome}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Small shared components ──────────────────────────────────────────────────

function StatusBadge({ status }) {
  const c = STATUS_COLORS[status] || STATUS_COLORS['Not Started'];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {status}
    </span>
  );
}

function CategoryTag({ category }) {
  const color = CATEGORY_COLORS[category] || '#6B6A66';
  return (
    <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium text-white" style={{ backgroundColor: color }}>
      {category}
    </span>
  );
}

function RiskBadge({ level }) {
  const c = RISK_CONFIG[level] || RISK_CONFIG.Medium;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}

// Yes/No review flags from the NPD cycle (e.g. "VBI Review: Yes - Day 1")
function ReviewFlag({ label, value }) {
  const yes = /^yes/i.test(value);
  const no = /^no/i.test(value);
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border ${yes ? 'bg-green-50 text-green-800 border-green-200' : no ? 'bg-gray-50 text-gray-600 border-gray-200' : 'bg-vf-surface text-vf-dark border-vf-border'}`}>
      <span className="text-vf-muted font-normal">{label}:</span> {value}
    </span>
  );
}

const IMPORTANCE_STYLE = {
  High:          'bg-red-100 text-red-700',
  Mid:           'bg-amber-100 text-amber-700',
  Low:           'bg-blue-100 text-blue-700',
  Unrated:       'bg-gray-100 text-gray-600',
  'No response': 'bg-gray-100 text-gray-500',
};

// Epic importance is stored as High / Mid / Low (as in the NPD file); shown as High / Medium / Low
const importanceLabel = (level) => (level === 'Mid' ? 'Medium' : level);

function ImportanceBadge({ level }) {
  if (!level) return null;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${IMPORTANCE_STYLE[level] || IMPORTANCE_STYLE.Unrated}`}>
      VBI: {importanceLabel(level)}
    </span>
  );
}

function fmt(v) {
  if (v == null) return '—';
  return `€${Number(v).toFixed(1)}M`;
}

function fmtDate(d) {
  if (!d) return null;
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function ProgressBar({ pct }) {
  const color = pct === 100 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-500' : 'bg-vf-red';
  return (
    <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
      <div className={`h-1.5 rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

// ─── Stage Gate ───────────────────────────────────────────────────────────────

const STAGE_STATUS_OPTIONS = [
  { value: 'complete',       label: 'Complete',       dot: 'bg-green-500',  ring: 'ring-green-400',  text: 'text-green-700',  bg: 'bg-green-50',  icon: '✓' },
  { value: 'in-progress',    label: 'In Progress',    dot: 'bg-blue-500',   ring: 'ring-blue-400',   text: 'text-blue-700',   bg: 'bg-blue-50',   icon: '●' },
  { value: 'at-risk',        label: 'At Risk',        dot: 'bg-red-500',    ring: 'ring-red-400',    text: 'text-red-700',    bg: 'bg-red-50',    icon: '!' },
  { value: 'planned',        label: 'Planned',        dot: 'bg-amber-400',  ring: 'ring-amber-300',  text: 'text-amber-700',  bg: 'bg-amber-50',  icon: '○' },
  { value: 'not-started',    label: 'Not Started',    dot: 'bg-gray-300',   ring: 'ring-gray-300',   text: 'text-gray-500',   bg: 'bg-gray-50',   icon: '' },
  { value: 'not-applicable', label: 'Not Applicable', dot: 'bg-green-400',  ring: 'ring-green-300',  text: 'text-green-700',  bg: 'bg-green-50',  icon: '–' },
];

function stageMeta(status) {
  return STAGE_STATUS_OPTIONS.find((o) => o.value === status) || STAGE_STATUS_OPTIONS[4];
}

function isOverdue(stage) {
  if (!stage?.date || stage?.status === 'complete' || stage?.status === 'not-applicable') return false;
  return new Date(stage.date) < new Date();
}

function EditableStageGate({ stages = {}, initiativeId, onStagesChange }) {
  const [activeKey, setActiveKey] = useState(null);
  const [localStages, setLocalStages] = useState(stages);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);

  const toggleStage = (key) => setActiveKey((k) => (k === key ? null : key));

  const updateStageField = async (key, field, value) => {
    const previous = localStages;
    const updated = { ...localStages, [key]: { ...(localStages[key] || {}), [field]: value } };
    setLocalStages(updated);
    setSaving(true);
    setSaveError(false);
    try {
      const res = await fetch(`/api/products/npd-initiatives/${initiativeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stages: updated }),
      });
      if (!res.ok) throw new Error();
      onStagesChange?.(updated);
    } catch {
      setLocalStages(previous);
      setSaveError(true);
    } finally { setSaving(false); }
  };

  const completeCount = STAGE_KEYS.filter((k) => ['complete', 'not-applicable'].includes(localStages[k]?.status)).length;
  const inProgressCount = STAGE_KEYS.filter((k) => ['in-progress', 'at-risk', 'planned'].includes(localStages[k]?.status)).length;

  return (
    <div>
      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-xs font-semibold text-vf-muted uppercase tracking-wide">Development Stage Gate</div>
        <div className="flex items-center gap-3 text-xs">
          <span className="text-vf-muted"><span className="font-bold text-green-600">{completeCount}</span> of {STAGE_KEYS.length} complete</span>
          {inProgressCount > 0 && <span className="text-vf-muted"><span className="font-bold text-blue-600">{inProgressCount}</span> in progress</span>}
          {saving && <span className="text-vf-muted italic text-[11px]">Saving…</span>}
          {saveError && <span className="text-[11px] text-red-600 font-medium">Save failed — change undone</span>}
          <span className="text-[11px] text-vf-muted italic">Click any stage to update</span>
        </div>
      </div>

      {/* Stage dots */}
      <div className="flex items-start w-full">
        {STAGE_KEYS.map((key, i) => {
          const s = localStages[key] || {};
          const meta = stageMeta(s.status);
          const overdue = isOverdue(s);
          const isActive = activeKey === key;
          return (
            <div key={key} className="flex-1 flex flex-col items-center relative">
              {i > 0 && (
                <div className={`absolute top-[16px] right-1/2 w-full h-0.5 ${['complete','not-applicable'].includes(localStages[STAGE_KEYS[i-1]]?.status) && ['complete','not-applicable'].includes(s.status) ? 'bg-green-400' : 'bg-gray-200'}`} style={{ zIndex: 0 }} />
              )}
              <button
                onClick={() => toggleStage(key)}
                title={STAGE_DEFINITIONS[i]}
                className={`relative z-10 w-8 h-8 rounded-full ${meta.dot} border-2 flex items-center justify-center text-white text-sm font-bold shadow-sm transition-all ${isActive ? `ring-2 ring-offset-2 ${meta.ring} scale-110` : 'hover:scale-105 cursor-pointer'}`}
              >
                {meta.icon}
              </button>
              <div className={`text-xs font-semibold mt-2 text-center leading-tight ${isActive ? 'text-vf-red' : 'text-vf-dark'}`}>
                {STAGE_LABELS[i]}
              </div>
              <div className={`text-xs mt-0.5 text-center font-mono font-medium ${overdue ? 'text-red-500' : 'text-vf-muted'}`}>
                {s.date ? new Date(s.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'TBC'}
              </div>
              {overdue && <div className="text-[10px] text-red-400 font-semibold text-center">Overdue</div>}
              {s.owner && <div className="text-[10px] text-vf-muted text-center truncate max-w-[72px] mt-0.5">{s.owner}</div>}
            </div>
          );
        })}
      </div>

      {/* Inline edit panel */}
      {activeKey && (() => {
        const s = localStages[activeKey] || {};
        const stageIdx = STAGE_KEYS.indexOf(activeKey);
        const pct = Math.round(((stageIdx + 0.5) / STAGE_KEYS.length) * 100);
        return (
          <div className="mt-5 border border-vf-border rounded-xl bg-vf-surface p-4 relative">
            {/* Pointer arrow */}
            <div className="absolute -top-[7px] w-3 h-3 bg-vf-surface border-l border-t border-vf-border rotate-45" style={{ left: `calc(${pct}% - 6px)` }} />
            <div className="flex items-start justify-between mb-3 gap-4">
              <div>
                <span className="text-sm font-semibold text-vf-dark">{STAGE_LABELS[stageIdx]}</span>
                <p className="text-[11px] text-vf-muted mt-0.5 leading-relaxed max-w-lg">{STAGE_DEFINITIONS[stageIdx]}</p>
              </div>
              <button onClick={() => setActiveKey(null)} className="text-vf-muted hover:text-vf-dark text-lg leading-none px-1 flex-shrink-0">×</button>
            </div>

            {/* Status pills */}
            <div className="mb-3">
              <div className="text-[10px] font-semibold text-vf-muted uppercase tracking-wide mb-2">Status — stages are independent and can be updated in any order</div>
              <div className="flex flex-wrap gap-2">
                {STAGE_STATUS_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => updateStageField(activeKey, 'status', opt.value)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${s.status === opt.value ? `${opt.bg} ${opt.text} border-current shadow-sm` : 'bg-white text-vf-muted border-vf-border hover:border-gray-400'}`}
                  >
                    <span className={`w-2 h-2 rounded-full ${opt.dot}`} />
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <div className="text-[10px] font-semibold text-vf-muted uppercase tracking-wide mb-1">Target / Actual Date</div>
                <input
                  type="date"
                  className="w-full border border-vf-border rounded-md px-2.5 py-1.5 text-sm focus:outline-none focus:border-vf-red bg-white"
                  value={s.date ? s.date.split('T')[0] : ''}
                  onChange={(e) => updateStageField(activeKey, 'date', e.target.value || null)}
                />
              </div>
              <div>
                <div className="text-[10px] font-semibold text-vf-muted uppercase tracking-wide mb-1">Stage Owner</div>
                <input
                  type="text"
                  placeholder="Name or team"
                  className="w-full border border-vf-border rounded-md px-2.5 py-1.5 text-sm focus:outline-none focus:border-vf-red bg-white"
                  value={s.owner || ''}
                  onChange={(e) => updateStageField(activeKey, 'owner', e.target.value)}
                />
              </div>
            </div>

            <div>
              <div className="text-[10px] font-semibold text-vf-muted uppercase tracking-wide mb-1">Notes / Blockers</div>
              <textarea
                rows={2}
                placeholder="Any blockers, dependencies, or context…"
                className="w-full border border-vf-border rounded-md px-2.5 py-1.5 text-xs focus:outline-none focus:border-vf-red resize-none bg-white"
                value={s.notes || ''}
                onChange={(e) => updateStageField(activeKey, 'notes', e.target.value)}
              />
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ─── Add Epic Modal ───────────────────────────────────────────────────────────

function AddEpicModal({ initiative, onClose, onCreated }) {
  const [form, setForm] = useState({
    productCanvas: initiative.investmentCanvas || '',
    epicName: '',
    epicType: '',
    description: '',
    capex: '',
    opex: '',
    marketsAgreed: '',
    goLiveDateOverall: '',
    goLiveDatePerMarket: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/npd-epics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          initiativeId: String(initiative.id),
          ...form,
          capex: form.capex !== '' ? parseFloat(form.capex) : null,
          opex:  form.opex  !== '' ? parseFloat(form.opex)  : null,
        }),
      });
      const epic = await res.json();
      if (!res.ok || !epic?.id) throw new Error(epic?.error || 'Could not create epic');
      onCreated(epic);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-vf-border flex items-center justify-between">
          <h2 className="text-base font-semibold text-vf-dark">Add Epic</h2>
          <button onClick={onClose} className="text-vf-muted hover:text-vf-dark text-lg leading-none">×</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">{error}</div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1 col-span-2">
              <label className="text-[11px] font-semibold text-vf-muted uppercase tracking-wide">Epic Name / ID *</label>
              <input required className="border border-vf-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-vf-red" value={form.epicName} onChange={(e) => set('epicName', e.target.value)} placeholder="e.g. EP-001 VBTS Ordering Integration" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-vf-muted uppercase tracking-wide">Epic Type</label>
              <select className="border border-vf-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-vf-red bg-white" value={form.epicType} onChange={(e) => set('epicType', e.target.value)}>
                <option value="">Select type…</option>
                {EPIC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-vf-muted uppercase tracking-wide">Product Canvas</label>
              <input className="border border-vf-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-vf-red" value={form.productCanvas} onChange={(e) => set('productCanvas', e.target.value)} placeholder="Canvas name" />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-vf-muted uppercase tracking-wide">Description — what this epic delivers</label>
            <textarea rows={3} className="border border-vf-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-vf-red resize-y" value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Brief description of scope and deliverable…" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-vf-muted uppercase tracking-wide">CAPEX Draw (€M)</label>
              <input type="number" step="0.1" className="border border-vf-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-vf-red" value={form.capex} onChange={(e) => set('capex', e.target.value)} placeholder="0.0" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-vf-muted uppercase tracking-wide">OPEX Draw (€M)</label>
              <input type="number" step="0.1" className="border border-vf-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-vf-red" value={form.opex} onChange={(e) => set('opex', e.target.value)} placeholder="0.0" />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-vf-muted uppercase tracking-wide">Markets Agreed for This Launch</label>
            <input className="border border-vf-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-vf-red" value={form.marketsAgreed} onChange={(e) => set('marketsAgreed', e.target.value)} placeholder="e.g. UK, DE, NL, AU" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-vf-muted uppercase tracking-wide">Planned Go-Live — Overall</label>
              <input type="date" className="border border-vf-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-vf-red" value={form.goLiveDateOverall} onChange={(e) => set('goLiveDateOverall', e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-vf-muted uppercase tracking-wide">Per-Market Go-Live Notes</label>
              <input className="border border-vf-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-vf-red" value={form.goLiveDatePerMarket} onChange={(e) => set('goLiveDatePerMarket', e.target.value)} placeholder="e.g. UK: Aug 26, DE: Sep 26…" />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-vf-border rounded-lg text-vf-dark hover:bg-vf-surface">Cancel</button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-vf-red text-white rounded-lg hover:bg-vf-red-hover disabled:opacity-50">
              {saving ? 'Creating…' : 'Create Epic'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Epic Detail ──────────────────────────────────────────────────────────────

// fetch() wrapper for writes: throws with the server's message when the save fails
async function sendJson(url, method, body) {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Save failed');
  return data;
}

function EpicDetail({ epic: initialEpic, onBack, onDeleted }) {
  const [error, setError] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [epic, setEpic] = useState(initialEpic);
  const [activities, setActivities] = useState(initialEpic.activities || []);
  const [editingHeader, setEditingHeader] = useState(false);
  const [headerForm, setHeaderForm] = useState({});
  const [savingHeader, setSavingHeader] = useState(false);
  const [newMilestone, setNewMilestone] = useState('');
  const [addingMilestone, setAddingMilestone] = useState(false);
  const [signOffForm, setSignOffForm] = useState({
    signOffComplete: epic.signOffComplete || false,
    signOffBy: epic.signOffBy || '',
    signOffDate: epic.signOffDate ? epic.signOffDate.split('T')[0] : '',
    signOffNotes: epic.signOffNotes || '',
  });
  const [savingSignOff, setSavingSignOff] = useState(false);

  const progress = useMemo(() => {
    const applicable = activities.filter((a) => a.status !== 'na');
    if (!applicable.length) return 0;
    return Math.round((applicable.filter((a) => a.status === 'complete').length / applicable.length) * 100);
  }, [activities]);

  const grouped = useMemo(() => {
    const g = {};
    for (const cat of CHECKLIST_CATEGORIES) g[cat] = [];
    for (const a of activities) {
      if (!g[a.category]) g[a.category] = [];
      g[a.category].push(a);
    }
    return g;
  }, [activities]);

  const toggleActivity = async (activity, nextStatus) => {
    setError(null);
    setActivities((list) => list.map((a) => a.id === activity.id ? { ...a, status: nextStatus } : a));
    try {
      await sendJson(`/api/npd-epics/${epic.id}/activities/${activity.id}`, 'PUT', { status: nextStatus });
    } catch (err) {
      setActivities((list) => list.map((a) => a.id === activity.id ? { ...a, status: activity.status } : a));
      setError(`Checklist not saved: ${err.message}`);
    }
  };

  const updateRisk = async (level) => {
    const previous = epic.riskLevel;
    setError(null);
    setEpic((e) => ({ ...e, riskLevel: level }));
    try {
      await sendJson(`/api/npd-epics/${epic.id}`, 'PUT', { riskLevel: level });
    } catch (err) {
      setEpic((e) => ({ ...e, riskLevel: previous }));
      setError(`Risk not saved: ${err.message}`);
    }
  };

  const deleteEpic = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    try {
      await sendJson(`/api/npd-epics/${epic.id}`, 'DELETE');
      onDeleted?.();
    } catch (err) {
      setConfirmDelete(false);
      setError(`Epic not deleted: ${err.message}`);
    }
  };

  const startEditHeader = () => {
    setHeaderForm({
      productCanvas: epic.productCanvas || '',
      epicName: epic.epicName || '',
      epicType: epic.epicType || '',
      description: epic.description || '',
      capex: epic.capex != null ? String(epic.capex) : '',
      opex:  epic.opex  != null ? String(epic.opex)  : '',
      marketsAgreed: epic.marketsAgreed || '',
      goLiveDateOverall: epic.goLiveDateOverall ? epic.goLiveDateOverall.split('T')[0] : '',
      goLiveDatePerMarket: epic.goLiveDatePerMarket || '',
      epicCategory: epic.epicCategory || '',
      vbiImportance: epic.vbiImportance || '',
      groupAccountability: epic.groupAccountability || '',
      vbiAccountability: epic.vbiAccountability || '',
      vbiResponse: epic.vbiResponse || '',
    });
    setEditingHeader(true);
  };

  const saveHeader = async () => {
    if (!headerForm.epicName?.trim()) { setError('Epic name is required'); return; }
    setSavingHeader(true);
    setError(null);
    try {
      const updated = await sendJson(`/api/npd-epics/${epic.id}`, 'PUT', {
        ...headerForm,
        capex: headerForm.capex !== '' ? parseFloat(headerForm.capex) : null,
        opex:  headerForm.opex  !== '' ? parseFloat(headerForm.opex)  : null,
      });
      setEpic(updated);
      setEditingHeader(false);
    } catch (err) {
      setError(`Epic not saved: ${err.message}`);
    } finally {
      setSavingHeader(false);
    }
  };

  const addMilestone = async () => {
    if (!newMilestone.trim()) return;
    setAddingMilestone(true);
    setError(null);
    try {
      const activity = await sendJson(`/api/npd-epics/${epic.id}/activities`, 'POST', { label: newMilestone.trim() });
      setActivities((a) => [...a, activity]);
      setNewMilestone('');
    } catch (err) {
      setError(`Milestone not added: ${err.message}`);
    } finally {
      setAddingMilestone(false);
    }
  };

  const saveSignOff = async () => {
    setSavingSignOff(true);
    setError(null);
    try {
      const updated = await sendJson(`/api/npd-epics/${epic.id}`, 'PUT', signOffForm);
      setEpic(updated);
    } catch (err) {
      setError(`Sign-off not saved: ${err.message}`);
    } finally {
      setSavingSignOff(false);
    }
  };

  const hSet = (k, v) => setHeaderForm((f) => ({ ...f, [k]: v }));
  const soSet = (k, v) => setSignOffForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="space-y-4">
      {/* Back */}
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-vf-red hover:underline font-medium">
        ← Back to Initiative
      </button>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg flex items-center justify-between">
          {error}
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 text-lg leading-none ml-3">×</button>
        </div>
      )}

      {/* Epic header card */}
      <div className="bg-white border border-vf-border rounded-xl overflow-hidden">
        <div className="bg-vf-dark text-white px-6 py-4 flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              {epic.epicType && (
                <span className="text-[11px] font-semibold bg-white/20 px-2 py-0.5 rounded text-white">{epic.epicType}</span>
              )}
              {epic.epicCategory && (
                <span className="text-[11px] font-semibold bg-white/20 px-2 py-0.5 rounded text-white">{epic.epicCategory}</span>
              )}
              <RiskBadge level={epic.riskLevel} />
              <ImportanceBadge level={epic.vbiImportance} />
            </div>
            <h3 className="text-lg font-bold">{epic.epicName}</h3>
            {epic.productCanvas && (
              <p className="text-gray-300 text-sm mt-0.5">Product Canvas: {epic.productCanvas}</p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Risk selector */}
            <div className="flex gap-1">
              {Object.keys(RISK_CONFIG).map((level) => (
                <button
                  key={level}
                  onClick={() => updateRisk(level)}
                  className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all ${epic.riskLevel === level ? 'bg-white text-vf-dark' : 'bg-white/10 text-white hover:bg-white/20'}`}
                >
                  {level}
                </button>
              ))}
            </div>
            <button onClick={startEditHeader} className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs rounded font-medium transition-all">
              Edit
            </button>
            <button
              onClick={deleteEpic}
              onBlur={() => setConfirmDelete(false)}
              className={`px-3 py-1.5 text-xs rounded font-medium transition-all ${confirmDelete ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-white/10 text-white hover:bg-white/20'}`}
            >
              {confirmDelete ? 'Confirm delete' : 'Delete'}
            </button>
          </div>
        </div>

        {/* Progress bar row */}
        <div className="px-6 py-3 border-b border-vf-border bg-vf-surface flex items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-vf-muted uppercase tracking-wide">Completion Progress</span>
              <span className="text-sm font-bold text-vf-dark font-mono">{progress}%</span>
            </div>
            <ProgressBar pct={progress} />
          </div>
          <div className="text-xs text-vf-muted">
            {activities.filter((a) => a.status === 'complete').length} of {activities.filter((a) => a.status !== 'na').length} gates done
          </div>
        </div>

        {/* Header info grid */}
        {editingHeader ? (
          <div className="px-6 py-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1 col-span-2">
                <label className="text-[11px] font-semibold text-vf-muted uppercase tracking-wide">Epic Name *</label>
                <input className="border border-vf-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-vf-red" value={headerForm.epicName} onChange={(e) => hSet('epicName', e.target.value)} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-vf-muted uppercase tracking-wide">Epic Type</label>
                <select className="border border-vf-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-vf-red bg-white" value={headerForm.epicType} onChange={(e) => hSet('epicType', e.target.value)}>
                  <option value="">Select…</option>
                  {EPIC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-vf-muted uppercase tracking-wide">Product Canvas</label>
                <input className="border border-vf-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-vf-red" value={headerForm.productCanvas} onChange={(e) => hSet('productCanvas', e.target.value)} />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-vf-muted uppercase tracking-wide">Description</label>
              <textarea rows={3} className="border border-vf-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-vf-red resize-y" value={headerForm.description} onChange={(e) => hSet('description', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-vf-muted uppercase tracking-wide">CAPEX Draw (€M)</label>
                <input type="number" step="0.1" className="border border-vf-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-vf-red" value={headerForm.capex} onChange={(e) => hSet('capex', e.target.value)} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-vf-muted uppercase tracking-wide">OPEX Draw (€M)</label>
                <input type="number" step="0.1" className="border border-vf-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-vf-red" value={headerForm.opex} onChange={(e) => hSet('opex', e.target.value)} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-vf-muted uppercase tracking-wide">Markets Agreed</label>
                <input className="border border-vf-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-vf-red" value={headerForm.marketsAgreed} onChange={(e) => hSet('marketsAgreed', e.target.value)} placeholder="e.g. UK, DE, NL" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-vf-muted uppercase tracking-wide">Planned Go-Live (Overall)</label>
                <input type="date" className="border border-vf-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-vf-red" value={headerForm.goLiveDateOverall} onChange={(e) => hSet('goLiveDateOverall', e.target.value)} />
              </div>
              <div className="flex flex-col gap-1 col-span-2">
                <label className="text-[11px] font-semibold text-vf-muted uppercase tracking-wide">Per-Market Go-Live Notes</label>
                <input className="border border-vf-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-vf-red" value={headerForm.goLiveDatePerMarket} onChange={(e) => hSet('goLiveDatePerMarket', e.target.value)} placeholder="e.g. UK: Aug 26, DE: Sep 26…" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-vf-muted uppercase tracking-wide">Epic Category</label>
                <input className="border border-vf-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-vf-red" value={headerForm.epicCategory} onChange={(e) => hSet('epicCategory', e.target.value)} placeholder="e.g. New Capability/Feature" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-vf-muted uppercase tracking-wide">VBI Importance</label>
                <select className="border border-vf-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-vf-red bg-white" value={headerForm.vbiImportance} onChange={(e) => hSet('vbiImportance', e.target.value)}>
                  <option value="">—</option>
                  {Object.keys(IMPORTANCE_STYLE).map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-vf-muted uppercase tracking-wide">Group Accountability</label>
              <textarea rows={3} className="border border-vf-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-vf-red resize-y" value={headerForm.groupAccountability} onChange={(e) => hSet('groupAccountability', e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-vf-muted uppercase tracking-wide">VBI (Market) Accountability</label>
              <textarea rows={3} className="border border-vf-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-vf-red resize-y" value={headerForm.vbiAccountability} onChange={(e) => hSet('vbiAccountability', e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-vf-muted uppercase tracking-wide">VBI Epic Response</label>
              <textarea rows={3} className="border border-vf-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-vf-red resize-y" value={headerForm.vbiResponse} onChange={(e) => hSet('vbiResponse', e.target.value)} />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setEditingHeader(false)} className="px-4 py-2 text-sm border border-vf-border rounded-lg text-vf-dark hover:bg-vf-surface">Cancel</button>
              <button onClick={saveHeader} disabled={savingHeader} className="px-4 py-2 text-sm bg-vf-red text-white rounded-lg hover:bg-vf-red-hover disabled:opacity-50">
                {savingHeader ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        ) : (
          <div className="px-6 py-5 grid grid-cols-3 gap-x-8 gap-y-3">
            {epic.description && (
              <div className="col-span-3 text-sm text-vf-dark leading-relaxed border-b border-vf-border pb-3 mb-1 whitespace-pre-line">{epic.description}</div>
            )}
            <InfoField label="CAPEX Draw" value={fmt(epic.capex)} />
            <InfoField label="OPEX Draw"  value={fmt(epic.opex)} />
            <InfoField label="Total Draw"  value={epic.capex == null && epic.opex == null ? null : fmt((epic.capex || 0) + (epic.opex || 0))} highlight />
            <InfoField label="Markets Agreed" value={epic.marketsAgreed} />
            <InfoField label="Planned Go-Live" value={fmtDate(epic.goLiveDateOverall)} />
            {epic.goLiveDatePerMarket && <InfoField label="Per-Market Dates" value={epic.goLiveDatePerMarket} />}
          </div>
        )}
      </div>

      {/* ─── NPD cycle review (from the NPD import) ─── */}
      {!editingHeader && (epic.groupAccountability || epic.vbiAccountability || epic.vbiResponse || epic.checkFlag) && (
        <div className="bg-white border border-vf-border rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-vf-border bg-vf-surface flex items-center justify-between gap-3">
            <div>
              <h4 className="text-xs font-semibold text-vf-muted uppercase tracking-wide">NPD Cycle Review</h4>
              <p className="text-[11px] text-vf-muted mt-0.5">Accountability split and VBI's response to this epic.</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-end">
              {epic.vbiTargetPortfolio && <ReviewFlag label="Target Portfolio" value={epic.vbiTargetPortfolio} />}
              {epic.checkFlag && (
                <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">{epic.checkFlag}</span>
              )}
            </div>
          </div>
          <div className="grid grid-cols-3 divide-x divide-vf-border">
            {[
              ['Group Accountability', epic.groupAccountability],
              ['VBI (Market) Accountability', epic.vbiAccountability],
              ['VBI Epic Response', epic.vbiResponse],
            ].map(([label, text]) => (
              <div key={label} className="px-5 py-4">
                <div className="text-[10px] font-semibold text-vf-muted uppercase tracking-wide mb-1.5">{label}</div>
                <p className={`text-sm leading-relaxed whitespace-pre-line ${text ? 'text-vf-dark' : 'text-vf-muted italic'}`}>{text || 'Not provided'}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Checklist ─── */}
      <div className="bg-white border border-vf-border rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-vf-border bg-vf-surface">
          <h4 className="text-xs font-semibold text-vf-muted uppercase tracking-wide">Launch Readiness Checklist</h4>
          <p className="text-[11px] text-vf-muted mt-0.5">Tick complete or mark N/A for each gate. N/A items are excluded from progress.</p>
        </div>

        <div className="divide-y divide-vf-border">
          {CHECKLIST_CATEGORIES.map((cat) => {
            const items = grouped[cat] || [];
            if (items.length === 0) return null;
            const done = items.filter((a) => a.status === 'complete').length;
            const applicable = items.filter((a) => a.status !== 'na').length;
            return (
              <ChecklistSection
                key={cat}
                category={cat}
                items={items}
                done={done}
                applicable={applicable}
                onToggle={toggleActivity}
              />
            );
          })}
        </div>

        {/* Add custom milestone */}
        <div className="px-5 py-4 border-t border-vf-border bg-vf-surface">
          <p className="text-[11px] font-semibold text-vf-muted uppercase tracking-wide mb-2">Add Custom Milestone</p>
          <div className="flex gap-2">
            <input
              className="flex-1 border border-vf-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-vf-red"
              placeholder="Describe the milestone…"
              value={newMilestone}
              onChange={(e) => setNewMilestone(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addMilestone()}
            />
            <button
              onClick={addMilestone}
              disabled={addingMilestone || !newMilestone.trim()}
              className="px-4 py-1.5 text-sm bg-vf-dark text-white rounded-lg hover:bg-vf-dark/90 disabled:opacity-40"
            >
              {addingMilestone ? 'Adding…' : 'Add'}
            </button>
          </div>
        </div>
      </div>

      {/* ─── VBI Sign-Off ─── */}
      <div className="bg-white border border-vf-border rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-vf-border bg-vf-surface flex items-center justify-between">
          <div>
            <h4 className="text-xs font-semibold text-vf-muted uppercase tracking-wide">VBI Sign-Off</h4>
            <p className="text-[11px] text-vf-muted mt-0.5">All launch gates confirmed and formally signed off.</p>
          </div>
          {epic.signOffComplete && (
            <span className="text-[11px] font-semibold bg-green-100 text-green-700 px-2.5 py-1 rounded-full">Signed Off</span>
          )}
        </div>
        <div className="px-5 py-5 space-y-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 rounded accent-vf-red"
              checked={signOffForm.signOffComplete}
              onChange={(e) => soSet('signOffComplete', e.target.checked)}
            />
            <span className="text-sm font-medium text-vf-dark">All above launch gates confirmed and signed off</span>
          </label>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-vf-muted uppercase tracking-wide">Sign-Off By (Name)</label>
              <input className="border border-vf-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-vf-red" value={signOffForm.signOffBy} onChange={(e) => soSet('signOffBy', e.target.value)} placeholder="Full name" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-vf-muted uppercase tracking-wide">Sign-Off Date</label>
              <input type="date" className="border border-vf-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-vf-red" value={signOffForm.signOffDate} onChange={(e) => soSet('signOffDate', e.target.value)} />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-vf-muted uppercase tracking-wide">Notes / Caveats / Deferred Markets</label>
            <textarea rows={3} className="border border-vf-border rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-vf-red resize-y" value={signOffForm.signOffNotes} onChange={(e) => soSet('signOffNotes', e.target.value)} placeholder="Any market where launch was deferred and new agreed date, caveats, etc." />
          </div>
          <div className="flex justify-end">
            <button onClick={saveSignOff} disabled={savingSignOff} className="px-4 py-2 text-sm bg-vf-red text-white rounded-lg hover:bg-vf-red-hover disabled:opacity-50">
              {savingSignOff ? 'Saving…' : 'Save Sign-Off'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoField({ label, value, highlight }) {
  if (!value || value === '—') return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-semibold text-vf-muted uppercase tracking-wide">{label}</span>
      <span className="text-sm text-vf-muted">—</span>
    </div>
  );
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-semibold text-vf-muted uppercase tracking-wide">{label}</span>
      <span className={`text-sm font-semibold ${highlight ? 'text-vf-red' : 'text-vf-dark'}`}>{value}</span>
    </div>
  );
}

function ChecklistSection({ category, items, done, applicable, onToggle }) {
  const [open, setOpen] = useState(true);
  const pct = applicable > 0 ? Math.round((done / applicable) * 100) : 0;

  return (
    <div>
      <button
        className="w-full px-5 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors text-left"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="text-xs font-semibold text-vf-dark flex-1">{category}</span>
        <span className="text-[11px] text-vf-muted font-mono">{done}/{applicable}</span>
        <div className="w-20">
          <ProgressBar pct={pct} />
        </div>
        <span className={`text-[10px] font-mono ${pct === 100 ? 'text-green-600' : 'text-vf-muted'}`}>{pct}%</span>
        <span className="text-vf-muted text-xs ml-1">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="px-5 pb-4 space-y-2">
          {items.map((activity) => (
            <ActivityRow key={activity.id} activity={activity} onToggle={onToggle} />
          ))}
        </div>
      )}
    </div>
  );
}

function ActivityRow({ activity, onToggle }) {
  const isDone = activity.status === 'complete';
  const isNa   = activity.status === 'na';

  const nextStatus = () => {
    if (isDone) return 'pending';
    return 'complete';
  };

  return (
    <div className={`flex items-start gap-3 p-2.5 rounded-lg border transition-colors ${isDone ? 'border-green-200 bg-green-50' : isNa ? 'border-gray-200 bg-gray-50' : 'border-vf-border bg-white'}`}>
      <button
        onClick={() => onToggle(activity, nextStatus())}
        className={`mt-0.5 flex-shrink-0 w-4.5 h-4.5 w-[18px] h-[18px] rounded border-2 flex items-center justify-center transition-all ${
          isDone ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 hover:border-vf-red'
        }`}
      >
        {isDone && <span className="text-[10px] leading-none">✓</span>}
      </button>
      <span className={`flex-1 text-xs leading-relaxed ${isDone ? 'text-green-800 line-through decoration-green-400' : isNa ? 'text-gray-400' : 'text-vf-dark'}`}>
        {activity.label}
        {activity.isCustom && <span className="ml-1.5 text-[10px] text-vf-muted italic">(custom)</span>}
      </span>
      <button
        onClick={() => onToggle(activity, isNa ? 'pending' : 'na')}
        className={`text-[11px] font-semibold px-2 py-0.5 rounded transition-all flex-shrink-0 ${
          isNa ? 'bg-gray-200 text-gray-600' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
        }`}
      >
        N/A
      </button>
    </div>
  );
}

// ─── Initiative Form Modal (add / edit) ──────────────────────────────────────

const PORTFOLIO_OPTIONS = [
  'Mobility',
  'Unified Communications',
  'Fixed Connectivity',
  'Cybersecurity',
  'Cloud & Edge Computing',
];

function InitiativeFormModal({ item, years, portfolios, defaultFy, onClose, onSave, onDelete }) {
  const isEdit = !!(item && item.id);
  const portfolioOptions = [...new Set([...PORTFOLIO_OPTIONS, ...(portfolios || []), item?.portfolio].filter(Boolean))].sort();
  const yearOptions = [...new Set([...(years || []), item?.fy, defaultFy].filter(Boolean))].sort();
  const [form, setForm] = useState({
    initiativeName:          item?.initiativeName          || '',
    portfolio:               item?.portfolio               || '',
    productFamily:           item?.productFamily           || '',
    productLine:             item?.productLine             || '',
    roadmapCategory:         item?.roadmapCategory         || '',
    fy:                      item?.fy                      || defaultFy || yearOptions[yearOptions.length - 1] || 'FY28',
    quarter:                 item?.quarter                 || 'Q1',
    status:                  item?.status                  || 'Not Started',
    capex:                   item?.capex   ?? '',
    opex:                    item?.opex    ?? '',
    investmentCanvas:        item?.investmentCanvas        || '',
    primaryInvestmentDriver: item?.primaryInvestmentDriver || '',
    description:             item?.description             || '',
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState(null);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.initiativeName.trim() || !form.portfolio || !form.productFamily.trim() || !form.productLine.trim() || !form.roadmapCategory) {
      setError('Please fill in all required fields marked with *');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const body = {
        ...form,
        capex: form.capex !== '' ? parseFloat(form.capex) : null,
        opex:  form.opex  !== '' ? parseFloat(form.opex)  : null,
      };
      const url    = isEdit ? `/api/products/npd-initiatives/${item.id}` : '/api/products/npd-initiatives';
      const method = isEdit ? 'PUT' : 'POST';
      const res    = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error((await res.json()).error || 'Save failed');
      onSave(await res.json(), isEdit);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/products/npd-initiatives/${item.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      onDelete(item.id);
    } catch (err) {
      setError(err.message);
      setConfirmDelete(false);
    } finally { setDeleting(false); }
  };

  const field = (label, required, children) => (
    <div>
      <label className="block text-[11px] font-semibold text-vf-muted uppercase tracking-wide mb-1">
        {label}{required && <span className="text-vf-red ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );

  const inputCls = 'w-full border border-vf-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-vf-red bg-white';

  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      <div className="flex-1" />
      <div
        className="w-[500px] bg-white h-full shadow-2xl flex flex-col border-l border-vf-border"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-vf-border flex items-center justify-between flex-shrink-0">
          <h3 className="text-base font-semibold text-vf-dark">{isEdit ? 'Edit Initiative' : 'Add Initiative'}</h3>
          <button onClick={onClose} className="text-vf-muted hover:text-vf-dark text-2xl leading-none">×</button>
        </div>

        {/* Scrollable fields + sticky footer, all inside the form */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">{error}</div>
            )}

            {field('Initiative Name', true,
              <input className={inputCls} value={form.initiativeName} onChange={(e) => set('initiativeName', e.target.value)} placeholder="e.g. SD-WAN Global Rollout" />
            )}

            <div className="grid grid-cols-2 gap-3">
              {field('FY', true,
                <select className={inputCls} value={form.fy} onChange={(e) => set('fy', e.target.value)}>
                  {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              )}
              {field('Quarter', true,
                <select className={inputCls} value={form.quarter} onChange={(e) => set('quarter', e.target.value)}>
                  {QUARTERS.map((q) => <option key={q} value={q}>{q}</option>)}
                </select>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              {field('Portfolio', true,
                <select className={inputCls} value={form.portfolio} onChange={(e) => set('portfolio', e.target.value)}>
                  <option value="">Select…</option>
                  {portfolioOptions.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              )}
              {field('Roadmap Category', true,
                <select className={inputCls} value={form.roadmapCategory} onChange={(e) => set('roadmapCategory', e.target.value)}>
                  <option value="">Select…</option>
                  {Object.keys(CATEGORY_COLORS).map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              {field('Product Family', true,
                <input className={inputCls} value={form.productFamily} onChange={(e) => set('productFamily', e.target.value)} placeholder="e.g. SDN" />
              )}
              {field('Product Line', true,
                <input className={inputCls} value={form.productLine} onChange={(e) => set('productLine', e.target.value)} placeholder="e.g. IP-VPN" />
              )}
            </div>

            {field('Status', false,
              <select className={inputCls} value={form.status} onChange={(e) => set('status', e.target.value)}>
                {Object.keys(STATUS_COLORS).map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            )}

            <div className="grid grid-cols-2 gap-3">
              {field('CapEx (€M)', false,
                <input type="number" step="0.1" min="0" className={inputCls} value={form.capex} onChange={(e) => set('capex', e.target.value)} placeholder="0.0" />
              )}
              {field('OpEx (€M)', false,
                <input type="number" step="0.1" min="0" className={inputCls} value={form.opex} onChange={(e) => set('opex', e.target.value)} placeholder="0.0" />
              )}
            </div>

            {field('Investment Canvas', false,
              <input className={inputCls} value={form.investmentCanvas} onChange={(e) => set('investmentCanvas', e.target.value)} placeholder="Link or reference" />
            )}

            {field('Primary Investment Driver', false,
              <input className={inputCls} value={form.primaryInvestmentDriver} onChange={(e) => set('primaryInvestmentDriver', e.target.value)} placeholder="e.g. Revenue growth, Cost reduction" />
            )}

            {field('Description', false,
              <textarea rows={3} className={`${inputCls} resize-none`} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Brief description of the initiative…" />
            )}
          </div>

          {/* Sticky footer */}
          <div className="px-6 py-4 border-t border-vf-border flex items-center gap-3 flex-shrink-0 bg-white">
            {isEdit && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className={`text-sm font-medium px-3 py-2 rounded-lg border transition-all ${
                  confirmDelete ? 'bg-red-600 text-white border-red-600 hover:bg-red-700' : 'text-red-600 border-red-200 hover:bg-red-50'
                }`}
              >
                {deleting ? 'Deleting…' : confirmDelete ? 'Confirm delete' : 'Delete'}
              </button>
            )}
            <div className="flex-1" />
            <button type="button" onClick={onClose} className="text-sm font-medium text-vf-muted hover:text-vf-dark px-3 py-2">Cancel</button>
            <button
              type="submit"
              disabled={saving}
              className="text-sm font-semibold bg-vf-red text-white px-5 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add initiative'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Pipeline Card (timeline view) with quick-status edit ────────────────────

function PipelineCard({ item, onClick, onSave, onEdit }) {
  const [showPicker, setShowPicker] = useState(false);
  const status = item.status;

  const changeStatus = (e, newStatus) => {
    e.stopPropagation();
    setShowPicker(false);
    if (newStatus !== status) onSave(item.id, { status: newStatus });
  };

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/npd-initiative', String(item.id));
        e.dataTransfer.effectAllowed = 'move';
      }}
      className="bg-white border border-vf-border rounded-lg p-3 cursor-pointer hover:shadow-md hover:border-vf-red transition-all relative group active:cursor-grabbing"
      onClick={onClick}
      title="Drag to another quarter to reschedule"
    >
      <button
        onClick={(e) => { e.stopPropagation(); onEdit?.(item); }}
        title="Edit initiative"
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-gray-100 text-vf-muted hover:text-vf-dark z-10"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      </button>
      <div className="text-sm font-semibold text-vf-dark leading-tight mb-1.5 pr-5">{item.initiativeName}</div>
      <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
        {/* Clickable status badge */}
        <div className="relative" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={(e) => { e.stopPropagation(); setShowPicker((v) => !v); }}
            title="Click to change status"
            className="hover:opacity-70 transition-opacity"
          >
            <StatusBadge status={status} />
          </button>
          {showPicker && (
            <div className="absolute left-0 top-full mt-1 bg-white border border-vf-border rounded-xl shadow-xl z-30 p-1.5 min-w-[150px]">
              {Object.keys(STATUS_COLORS).map((s) => (
                <button
                  key={s}
                  onClick={(e) => changeStatus(e, s)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs hover:bg-vf-surface text-left ${s === status ? 'font-semibold bg-vf-surface' : ''}`}
                >
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_COLORS[s].dot}`} />
                  <span className="text-vf-dark">{s}</span>
                  {s === status && <span className="ml-auto text-vf-muted text-[10px]">✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>
        <CategoryTag category={item.roadmapCategory} />
      </div>
      <div className="text-xs text-vf-muted">
        {item.portfolio} › {item.productFamily}
      </div>
      {(item.epicCount > 0 || item.npdImportance) && (
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          {item.epicCount > 0 && <span className="text-[10px] text-vf-muted font-medium">{item.epicCount} epic{item.epicCount === 1 ? '' : 's'}</span>}
          {item.npdImportance && <NpdImportanceBadge level={item.npdImportance} prefix="VBI" />}
        </div>
      )}
      {(item.capex != null || item.opex != null) && (
        <div className="text-[10px] text-vf-muted mt-1 font-mono">
          CapEx {fmt(item.capex)} · OpEx {fmt(item.opex)}
        </div>
      )}
    </div>
  );
}

// ─── Initiative Detail ────────────────────────────────────────────────────────

function InitiativeDetail({ item, onBack, onSave, onEdit, onEpicsChanged }) {
  const [epics, setEpics] = useState([]);
  const [loadingEpics, setLoadingEpics] = useState(true);
  const [showAddEpic, setShowAddEpic] = useState(false);
  const [selectedEpic, setSelectedEpic] = useState(null);
  const [epicError, setEpicError] = useState(null);
  const [epicFilter, setEpicFilter] = useState({ importance: '', category: '' });
  const IMPORTANCE_ORDER = ['High', 'Mid', 'Low', 'Unrated', 'No response'];
  const epicImportanceLevels = IMPORTANCE_ORDER.filter((l) => epics.some((e) => e.vbiImportance === l));
  const epicCategories = [...new Set(epics.map((e) => e.epicCategory).filter(Boolean))].sort();
  const visibleEpics = epics.filter((e) =>
    (!epicFilter.importance || e.vbiImportance === epicFilter.importance) &&
    (!epicFilter.category || e.epicCategory === epicFilter.category));
  const [currentStages, setCurrentStages] = useState(item.stages || {});
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const currentStatus = item.status || 'Not Started';

  const updateStatus = (newStatus) => {
    setShowStatusPicker(false);
    if (newStatus !== currentStatus) onSave(item.id, { status: newStatus });
  };

  const fetchEpics = useCallback(async () => {
    setLoadingEpics(true);
    try {
      const res = await fetch(`/api/npd-epics?initiativeId=${item.id}`);
      const data = await res.json();
      setEpics(Array.isArray(data) ? data : []);
    } catch {
      setEpics([]);
    }
    setLoadingEpics(false);
  }, [item.id]);

  useEffect(() => { fetchEpics(); }, [fetchEpics]);

  const openEpic = async (epicSummary) => {
    setEpicError(null);
    try {
      const res = await fetch(`/api/npd-epics/${epicSummary.id}`);
      const full = await res.json();
      if (!res.ok || !full?.id) throw new Error(full?.error || 'Could not open epic');
      setSelectedEpic(full);
    } catch (err) {
      setEpicError(err.message);
    }
  };

  if (selectedEpic) {
    return (
      <EpicDetail
        epic={selectedEpic}
        onBack={() => { setSelectedEpic(null); fetchEpics(); }}
        onDeleted={() => { setSelectedEpic(null); fetchEpics(); onEpicsChanged?.(item.id, -1); }}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Back */}
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-vf-red hover:underline font-medium">
        ← Back to Pipeline
      </button>

      {/* Header */}
      <div className="bg-vf-dark text-white rounded-t-[10px] px-6 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h3 className="text-xl font-bold">{item.initiativeName}</h3>
            <div className="text-sm text-gray-300 mt-1">
              {item.portfolio} › {item.productFamily} › {item.productLine}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Editable status */}
            <div className="relative">
              <button
                onClick={() => setShowStatusPicker((v) => !v)}
                className="cursor-pointer hover:opacity-80 transition-opacity"
                title="Click to change status"
              >
                <StatusBadge status={currentStatus} />
              </button>
              {showStatusPicker && (
                <div className="absolute right-0 top-full mt-1 bg-white border border-vf-border rounded-xl shadow-lg z-20 p-2 min-w-[160px]">
                  <div className="text-[10px] font-semibold text-vf-muted uppercase tracking-wide px-2 pb-1.5">Set Status</div>
                  {Object.keys(STATUS_COLORS).map((s) => (
                    <button
                      key={s}
                      onClick={() => updateStatus(s)}
                      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs hover:bg-vf-surface text-left transition-colors ${s === currentStatus ? 'bg-vf-surface font-semibold' : ''}`}
                    >
                      <span className={`w-2 h-2 rounded-full ${STATUS_COLORS[s].dot}`} />
                      <span className="text-vf-dark">{s}</span>
                      {s === currentStatus && <span className="ml-auto text-vf-muted">✓</span>}
                    </button>
                  ))}
                  <div className="border-t border-vf-border mt-1 pt-1 px-2">
                    <p className="text-[10px] text-vf-muted italic">Status is set manually by the product manager. It is not auto-calculated.</p>
                  </div>
                </div>
              )}
            </div>
            <CategoryTag category={item.roadmapCategory} />
            <button
              onClick={() => onEdit?.(item)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              Edit
            </button>
          </div>
        </div>
      </div>

      {/* Stage Gate */}
      <div className="bg-white border-x border-vf-border px-6 py-5 -mt-4">
        <EditableStageGate
          stages={currentStages}
          initiativeId={item.id}
          onStagesChange={setCurrentStages}
        />
      </div>

      {/* Info Grid */}
      <div className="bg-white border-x border-b border-vf-border rounded-b-[10px] px-6 py-5 -mt-4">
        <div className="grid grid-cols-3 gap-5">
          <div className="space-y-3">
            <div className="text-xs font-semibold text-vf-muted uppercase tracking-wide mb-2">Initiative Details</div>
            <div className="text-sm"><span className="text-vf-muted">Year / Quarter:</span> <span className="font-semibold">{item.fy} {item.quarter}</span></div>
            <div className="text-sm"><span className="text-vf-muted">Market:</span> <span className="font-semibold">{item.market}</span></div>
            {item.roadmapHorizon && <div className="text-sm"><span className="text-vf-muted">Horizon:</span> <span className="font-semibold">{item.roadmapHorizon}</span></div>}
            {item.primaryInvestmentDriver && <div className="text-sm"><span className="text-vf-muted">Investment Driver:</span> <span className="font-semibold">{item.primaryInvestmentDriver}</span></div>}
            {item.investmentCanvas && <div className="text-sm"><span className="text-vf-muted">Investment Canvas:</span> <span className="font-semibold">{item.investmentCanvas}</span></div>}
            {item.externalId && <div className="text-sm"><span className="text-vf-muted">NPD ID:</span> <span className="font-semibold font-mono">{item.externalId}</span></div>}
            {item.groupOwner && <div className="text-sm"><span className="text-vf-muted">Group Owner:</span> <span className="font-semibold break-all">{item.groupOwner}</span></div>}
            {item.npdImportance && (
              <div className="text-sm flex items-center gap-2">
                <span className="text-vf-muted">VBI Importance:</span> <NpdImportanceBadge level={item.npdImportance} prefix="NPD" />
              </div>
            )}
            <DbReviewControl review={item.dbReview} onChange={(dbReview) => onSave(item.id, { dbReview })} />
            {(item.vbiTargetPortfolio || item.aiFlag || item.localItImpact) && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {item.vbiTargetPortfolio && <ReviewFlag label="Target Portfolio" value={item.vbiTargetPortfolio} />}
                {item.aiFlag && <ReviewFlag label="AI" value={item.aiFlag} />}
                {item.localItImpact && <ReviewFlag label="Local IT Impact" value={item.localItImpact} />}
              </div>
            )}
          </div>
          <div>
            <div className="text-xs font-semibold text-vf-muted uppercase tracking-wide mb-2">Investment</div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-vf-surface rounded-lg p-4 text-center">
                <div className="text-xs text-vf-muted font-medium mb-1">CapEx</div>
                <div className="text-2xl font-bold text-vf-dark font-mono">{fmt(item.capex)}</div>
              </div>
              <div className="bg-vf-surface rounded-lg p-4 text-center">
                <div className="text-xs text-vf-muted font-medium mb-1">OpEx</div>
                <div className="text-2xl font-bold text-vf-dark font-mono">{fmt(item.opex)}</div>
              </div>
            </div>
            <div className="bg-vf-surface rounded-lg p-3 mt-3 text-center">
              <div className="text-xs text-vf-muted font-medium mb-1">Total Investment</div>
              <div className="text-xl font-bold text-vf-red font-mono">{item.capex == null && item.opex == null ? '—' : fmt((item.capex || 0) + (item.opex || 0))}</div>
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold text-vf-muted uppercase tracking-wide mb-2">
              {item.description || !item.vbiResponse ? 'Description & Objectives' : 'VBI Response'}
            </div>
            <div className="bg-vf-surface rounded-lg p-4 text-sm text-vf-dark leading-relaxed h-[160px] overflow-y-auto whitespace-pre-line">
              {item.description || item.vbiResponse || 'No description available.'}
              {item.description && item.vbiResponse && (
                <>
                  <div className="text-[10px] font-semibold text-vf-muted uppercase tracking-wide mt-3 mb-1">VBI Response</div>
                  {item.vbiResponse}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Epics Section ─── */}
      <div className="bg-white border border-vf-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-vf-border flex items-center justify-between">
          <div>
            <h4 className="text-sm font-semibold text-vf-dark">Epics</h4>
            <p className="text-[11px] text-vf-muted mt-0.5">Scoped work packages and delivery tracking against this initiative.</p>
          </div>
          <button
            onClick={() => setShowAddEpic(true)}
            className="px-3 py-1.5 text-sm bg-vf-red text-white rounded-lg hover:bg-vf-red-hover font-medium"
          >
            + Add Epic
          </button>
        </div>

        {epicError && (
          <div className="mx-5 mt-4 bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">{epicError}</div>
        )}
        {loadingEpics ? (
          <div className="p-8 text-center text-vf-muted text-sm">Loading epics…</div>
        ) : epics.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-vf-muted text-sm mb-1">No epics yet for this initiative.</p>
            <p className="text-vf-muted text-xs">Add an epic to start tracking delivery milestones and readiness gates.</p>
          </div>
        ) : (
          <>
            {/* Epic filters */}
            <div className="px-5 py-2.5 border-b border-vf-border bg-vf-surface flex items-center gap-2 flex-wrap">
              <ReviewSelect value={epicFilter.importance} onChange={(v) => setEpicFilter((f) => ({ ...f, importance: v }))} label="Epic VBI importance">
                <option value="">VBI importance: any</option>
                {epicImportanceLevels.map((l) => <option key={l} value={l}>VBI importance: {importanceLabel(l)}</option>)}
              </ReviewSelect>
              <ReviewSelect value={epicFilter.category} onChange={(v) => setEpicFilter((f) => ({ ...f, category: v }))} label="Epic category">
                <option value="">Category: any</option>
                {epicCategories.map((c) => <option key={c} value={c}>{c}</option>)}
              </ReviewSelect>
              {(epicFilter.importance || epicFilter.category) && (
                <button onClick={() => setEpicFilter({ importance: '', category: '' })} className="text-xs text-vf-red hover:underline">Clear</button>
              )}
              <span className="text-[11px] text-vf-muted ml-auto">Showing {visibleEpics.length} of {epics.length} epics</span>
            </div>
            <div className="divide-y divide-vf-border">
              {visibleEpics.map((epic) => (
                <EpicCard key={epic.id} epic={epic} index={epics.indexOf(epic) + 1} onClick={() => openEpic(epic)} />
              ))}
              {visibleEpics.length === 0 && <div className="p-6 text-center text-vf-muted text-sm">No epics match these filters.</div>}
            </div>
          </>
        )}
      </div>

      {showAddEpic && (
        <AddEpicModal
          initiative={item}
          onClose={() => setShowAddEpic(false)}
          onCreated={(epic) => {
            setEpics((e) => [...e, epic]);
            setShowAddEpic(false);
            onEpicsChanged?.(item.id, +1);
          }}
        />
      )}
    </div>
  );
}

function EpicCard({ epic, index, onClick }) {
  const totalDraw = (epic.capex || 0) + (epic.opex || 0);
  const progressColor = epic.progress === 100 ? 'text-green-600' : epic.progress >= 50 ? 'text-amber-600' : 'text-vf-red';

  return (
    <div
      className="px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors flex items-center gap-4"
      onClick={onClick}
    >
      {/* Epic ID (from the NPD file), or its position for epics added in the portal */}
      <div className="flex-shrink-0 w-14 text-center">
        <div className="text-[9px] font-semibold text-vf-muted uppercase tracking-wide">{epic.externalEpicId != null ? 'Epic ID' : 'Epic'}</div>
        <div className="text-sm font-bold font-mono text-vf-dark bg-vf-surface border border-vf-border rounded-md py-1 mt-0.5">
          {epic.externalEpicId ?? `#${index}`}
        </div>
      </div>

      {/* Name + description — takes remaining space */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
          <span className="text-sm font-bold text-vf-dark leading-tight">{epic.epicName}</span>
          {epic.signOffComplete && (
            <span className="text-[10px] bg-green-100 text-green-700 font-semibold px-1.5 py-0.5 rounded-full">Signed Off</span>
          )}
        </div>
        {(epic.epicType || epic.vbiImportance || epic.checkFlag) && (
          <div className="flex items-center gap-2 flex-wrap mt-0.5">
            {epic.epicType && <span className="text-[11px] font-medium text-vf-muted">{epic.epicType}</span>}
            <ImportanceBadge level={epic.vbiImportance} />
            {epic.checkFlag && (
              <span className="text-[10px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">{epic.checkFlag}</span>
            )}
          </div>
        )}
        {epic.description && (
          <p className="text-[11px] text-vf-muted leading-snug line-clamp-2 mt-0.5 pr-4">{epic.description}</p>
        )}
        {(epic.goLiveDateOverall || epic.marketsAgreed) && (
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            {epic.goLiveDateOverall && (
              <span className="text-[10px] text-vf-muted">Go-live: <span className="font-medium text-vf-dark">{fmtDate(epic.goLiveDateOverall)}</span></span>
            )}
            {epic.marketsAgreed && (
              <span className="text-[10px] text-vf-muted">Markets: <span className="font-medium text-vf-dark">{epic.marketsAgreed}</span></span>
            )}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="flex-shrink-0 flex items-center divide-x divide-vf-border border-l border-vf-border ml-2">
        {/* Epic category */}
        <div className="px-4 w-[150px]">
          <div className="text-[10px] font-semibold text-vf-muted uppercase tracking-wide mb-1">Category</div>
          <div className="text-[11px] font-semibold text-vf-dark leading-snug">{epic.epicCategory || '—'}</div>
        </div>

        {/* Budget draw */}
        <div className="px-4 text-right">
          <div className="text-[10px] font-semibold text-vf-muted uppercase tracking-wide mb-1">Budget Draw</div>
          <div className="text-lg font-bold text-vf-dark font-mono leading-none">
            {totalDraw > 0 ? fmt(totalDraw) : '—'}
          </div>
          {totalDraw > 0 && (
            <div className="text-[10px] text-vf-muted font-mono mt-1 whitespace-nowrap">
              {fmt(epic.capex)} Cap · {fmt(epic.opex)} Op
            </div>
          )}
        </div>

        {/* Completion */}
        <div className="px-4 text-right">
          <div className="text-[10px] font-semibold text-vf-muted uppercase tracking-wide mb-1">Completion</div>
          <div className={`text-2xl font-bold font-mono leading-none ${progressColor}`}>
            {epic.progress}%
          </div>
          <div className="mt-1.5 w-14 ml-auto">
            <ProgressBar pct={epic.progress} />
          </div>
          <div className="text-[10px] text-vf-muted mt-1 whitespace-nowrap">
            {epic.completedActivities}/{epic.totalActivities} gates
          </div>
        </div>

        {/* Risk */}
        <div className="px-4">
          <div className="text-[10px] font-semibold text-vf-muted uppercase tracking-wide mb-1.5">Risk</div>
          <RiskBadge level={epic.riskLevel} />
        </div>

        <div className="pl-3 pr-1 text-vf-muted text-lg">›</div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function NpdPipeline() {
  const filters = useProductStore((s) => s.filters);
  const [data, setData] = useState({ initiatives: [], summary: { total: 0, statusCounts: {}, categoryCounts: {}, portfolioCounts: {}, quarterCounts: {} } });
  const [loading, setLoading] = useState(true);
  const [fyFilter, setFyFilter] = useState('FY27');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [viewMode, setViewMode] = useState('timeline');
  const [selectedItem, setSelectedItem] = useState(null);
  const [formItem, setFormItem] = useState(null);
  const [quarterFilter, setQuarterFilter] = useState(null);
  // Summary-tile filters (category / portfolio / status); click a tile again to clear it
  const [tileFilter, setTileFilter] = useState({ roadmapCategory: null, portfolio: null, status: null });
  const toggleTile = (field, value) => setTileFilter((f) => ({ ...f, [field]: f[field] === value ? null : value }));
  // NPD cycle review filters (budget review stage, target portfolio, AI, local IT, VBI importance)
  const [reviewFilters, setReviewFilters] = useState(EMPTY_REVIEW_FILTERS);
  const setReview = (k, v) => setReviewFilters((f) => ({ ...f, [k]: v }));
  const [dragOverCell, setDragOverCell] = useState(null);
  const showToast = useProductStore((s) => s.showToast);

  const patchLocal = useCallback((id, patch) => {
    setData((prev) => ({ ...prev, initiatives: prev.initiatives.map((i) => (i.id === id ? { ...i, ...patch } : i)) }));
    setSelectedItem((prev) => (prev && prev.id === id ? { ...prev, ...patch } : prev));
  }, []);

  // Optimistically apply a change to an initiative, then save; undo it if the save fails.
  const saveInitiative = useCallback(async (id, patch) => {
    const before = data.initiatives.find((i) => i.id === id);
    if (!before) return;
    const undo = Object.fromEntries(Object.keys(patch).map((k) => [k, before[k]]));
    patchLocal(id, patch);
    try {
      const res = await fetch(`/api/products/npd-initiatives/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Save failed');
    } catch (err) {
      patchLocal(id, undo);
      showToast(`Not saved: ${err.message}`, 'warning');
    }
  }, [data.initiatives, patchLocal, showToast]);

  const adjustEpicCount = useCallback((id, delta) => {
    setData((prev) => ({
      ...prev,
      initiatives: prev.initiatives.map((i) => (i.id === id ? { ...i, epicCount: Math.max(0, (i.epicCount || 0) + delta) } : i)),
    }));
  }, []);

  const moveToQuarter = useCallback((id, fy, quarter) => {
    const item = data.initiatives.find((i) => i.id === id);
    if (!item || (item.quarter === quarter && item.fy === fy)) return;
    saveInitiative(id, { fy, quarter });
    showToast(`Moved "${item.initiativeName}" to ${fy} ${quarter}`);
  }, [data.initiatives, saveInitiative, showToast]);

  const handleSaveInitiative = useCallback((saved, isEdit) => {
    setData((prev) => ({
      ...prev,
      initiatives: isEdit
        ? prev.initiatives.map((i) => (i.id === saved.id ? { ...i, ...saved } : i))
        : [...prev.initiatives, saved],
    }));
    setSelectedItem((prev) => (prev && isEdit && prev.id === saved.id ? { ...prev, ...saved } : prev));
    setFormItem(null);
  }, []);

  const handleDeleteInitiative = useCallback((id) => {
    setData((prev) => ({ ...prev, initiatives: prev.initiatives.filter((i) => i.id !== id) }));
    setFormItem(null);
    setSelectedItem((prev) => (prev && prev.id === id ? null : prev));
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (filters.category) params.set('category', filters.category);
        if (filters.family) params.set('family', filters.family);
        if (filters.productLine) params.set('productLine', filters.productLine);
        if (filters.q) params.set('q', filters.q);
        if (statusFilter) params.set('status', statusFilter);
        if (categoryFilter) params.set('roadmapCategory', categoryFilter);
        const qs = params.toString();
        const res = await fetch(`/api/products/npd-initiatives${qs ? '?' + qs : ''}`);
        const json = await res.json();
        if (!res.ok || !Array.isArray(json.initiatives)) throw new Error(json.error || 'Could not load NPD pipeline');
        setData(json);
      } catch (err) {
        showToast(err.message, 'warning');
      }
      setLoading(false);
    })();
  }, [filters.category, filters.family, filters.productLine, filters.q, statusFilter, categoryFilter, showToast]);

  // Years present in the data (e.g. FY26, FY27, FY28)
  const years = useMemo(() => [...new Set(data.initiatives.map((i) => i.fy))].sort(), [data.initiatives]);
  const portfolios = useMemo(() => [...new Set(data.initiatives.map((i) => i.portfolio))].sort(), [data.initiatives]);

  const initiatives = useMemo(
    () => data.initiatives.filter((i) => (!fyFilter || i.fy === fyFilter) && matchesReviewFilters(i, reviewFilters)),
    [data.initiatives, fyFilter, reviewFilters],
  );

  const summary = useMemo(() => {
    const statusCounts = {}, categoryCounts = {}, portfolioCounts = {}, quarterCounts = {};
    for (const i of initiatives) {
      statusCounts[i.status] = (statusCounts[i.status] || 0) + 1;
      categoryCounts[i.roadmapCategory] = (categoryCounts[i.roadmapCategory] || 0) + 1;
      portfolioCounts[i.portfolio] = (portfolioCounts[i.portfolio] || 0) + 1;
      const key = `${i.fy} ${i.quarter}`;
      quarterCounts[key] = (quarterCounts[key] || 0) + 1;
    }
    return { total: initiatives.length, statusCounts, categoryCounts, portfolioCounts, quarterCounts };
  }, [initiatives]);

  const matrix = useMemo(() => {
    const counts = summary.quarterCounts || {};
    const years = [...new Set(Object.keys(counts).map((k) => k.split(' ')[0]))].sort();
    const grid = {};
    for (const q of QUARTERS) {
      grid[q] = {};
      for (const y of years) grid[q][y] = counts[`${y} ${q}`] || 0;
      grid[q]._total = Object.values(grid[q]).reduce((a, b) => a + b, 0);
    }
    const colTotals = {};
    for (const y of years) colTotals[y] = QUARTERS.reduce((a, q) => a + (grid[q][y] || 0), 0);
    colTotals._total = summary.total;
    return { years, grid, colTotals };
  }, [summary]);

  const filteredInitiatives = useMemo(() =>
    initiatives.filter((i) =>
      (!quarterFilter || i.quarter === quarterFilter) &&
      Object.entries(tileFilter).every(([field, value]) => !value || i[field] === value)),
  [initiatives, quarterFilter, tileFilter]);

  const timelineData = useMemo(() => {
    const grouped = {};
    for (const i of filteredInitiatives) {
      if (!grouped[i.fy]) grouped[i.fy] = {};
      if (!grouped[i.fy][i.quarter]) grouped[i.fy][i.quarter] = [];
      grouped[i.fy][i.quarter].push(i);
    }
    return grouped;
  }, [filteredInitiatives]);

  const fys = Object.keys(timelineData).sort();

  const formModal = formItem !== null && (
    <InitiativeFormModal
      item={formItem}
      years={years}
      portfolios={portfolios}
      defaultFy={fyFilter}
      onClose={() => setFormItem(null)}
      onSave={handleSaveInitiative}
      onDelete={handleDeleteInitiative}
    />
  );

  if (selectedItem) {
    return (
      <div className="p-5">
        {formModal}
        <InitiativeDetail
          key={selectedItem.id}
          item={selectedItem}
          onBack={() => setSelectedItem(null)}
          onSave={saveInitiative}
          onEdit={(i) => setFormItem(i)}
          onEpicsChanged={adjustEpicCount}
        />
      </div>
    );
  }

  return (
    <div className="p-5">
      {formModal}

      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">NPD Roadmap Pipeline</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFormItem({})}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-vf-red text-white rounded-md hover:bg-red-700 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Initiative
          </button>
          <div className="flex border border-vf-border rounded-md overflow-hidden">
            <button onClick={() => setViewMode('timeline')} className={`px-3 py-1.5 text-sm font-medium ${viewMode === 'timeline' ? 'bg-vf-dark text-white' : 'bg-white text-vf-dark hover:bg-gray-50'}`}>Timeline</button>
            <button onClick={() => setViewMode('list')} className={`px-3 py-1.5 text-sm font-medium ${viewMode === 'list' ? 'bg-vf-dark text-white' : 'bg-white text-vf-dark hover:bg-gray-50'}`}>List</button>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <select className="border border-vf-border rounded-md px-2.5 py-1.5 text-sm bg-white cursor-pointer focus:outline-none focus:border-vf-red" value={fyFilter} onChange={(e) => setFyFilter(e.target.value)}>
          <option value="">All Years</option>
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <select className="border border-vf-border rounded-md px-2.5 py-1.5 text-sm bg-white cursor-pointer focus:outline-none focus:border-vf-red" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All Statuses</option>
          {Object.keys(STATUS_COLORS).map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="border border-vf-border rounded-md px-2.5 py-1.5 text-sm bg-white cursor-pointer focus:outline-none focus:border-vf-red" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="">All Categories</option>
          {Object.keys(CATEGORY_COLORS).map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        {/* Active tile filters */}
        {[
          ['quarter', quarterFilter, () => setQuarterFilter(null)],
          ...Object.entries(tileFilter).map(([field, value]) => [field, value, () => toggleTile(field, value)]),
        ].filter(([, value]) => value).map(([field, value, clear]) => (
          <span key={field} className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-vf-red text-white">
            {value}
            <button onClick={clear} aria-label={`Remove ${value} filter`} className="hover:opacity-70 leading-none ml-0.5">×</button>
          </span>
        ))}
        {(fyFilter || statusFilter || categoryFilter || quarterFilter || Object.values(tileFilter).some(Boolean) || Object.values(reviewFilters).some(Boolean)) && (
          <button
            onClick={() => {
              setFyFilter(''); setStatusFilter(''); setCategoryFilter('');
              setQuarterFilter(null); setTileFilter({ roadmapCategory: null, portfolio: null, status: null });
              setReviewFilters(EMPTY_REVIEW_FILTERS);
            }}
            className="text-xs text-vf-red hover:underline ml-1"
          >
            Clear filters
          </button>
        )}
        {(quarterFilter || Object.values(tileFilter).some(Boolean)) && (
          <span className="text-xs text-vf-muted ml-auto">Showing {filteredInitiatives.length} of {initiatives.length} initiatives</span>
        )}
      </div>

      {/* NPD cycle review filters — narrow the tiles and the pipeline below */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <span className="text-[11px] font-semibold text-vf-muted uppercase tracking-wide mr-1">NPD Review</span>
        <ReviewSelect value={reviewFilters.db} onChange={(v) => setReview('db', v)} label="Budget review">
          <option value="">All budget review stages</option>
          {DB_STAGES.map((s) => (
            <optgroup key={s.key} label={s.label}>
              <option value={`${s.key}|Approved`}>{s.short} — VBI approved</option>
              <option value={`${s.key}|Not approved`}>{s.short} — VBI not approved</option>
              <option value={`${s.key}|Pending`}>{s.short} — pending</option>
            </optgroup>
          ))}
        </ReviewSelect>
        <ReviewSelect value={reviewFilters.target} onChange={(v) => setReview('target', v)} label="Target portfolio">
          <option value="">Target portfolio: any</option>
          <option value="Yes">Target portfolio: Yes</option>
          <option value="No">Target portfolio: No</option>
        </ReviewSelect>
        <ReviewSelect value={reviewFilters.ai} onChange={(v) => setReview('ai', v)} label="AI">
          <option value="">AI: any</option>
          <option value="Yes">AI: Yes</option>
          <option value="No">AI: No</option>
        </ReviewSelect>
        <ReviewSelect value={reviewFilters.it} onChange={(v) => setReview('it', v)} label="Local IT impact">
          <option value="">Local IT impact: any</option>
          <option value="Yes">Local IT impact: Yes</option>
          <option value="No">Local IT impact: No</option>
        </ReviewSelect>
        <ReviewSelect value={reviewFilters.importance} onChange={(v) => setReview('importance', v)} label="VBI importance">
          <option value="">VBI importance: any</option>
          {NPD_IMPORTANCE.map((l) => <option key={l} value={l}>VBI importance: {l}</option>)}
        </ReviewSelect>
        {Object.values(reviewFilters).some(Boolean) && (
          <button onClick={() => setReviewFilters(EMPTY_REVIEW_FILTERS)} className="text-xs text-vf-red hover:underline ml-1">Clear review filters</button>
        )}
      </div>

      {/* Summary Tiles */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        {/* Tile 1 — Initiatives by Quarter */}
        <div className="bg-white border border-vf-border rounded-[10px] px-4 py-4">
          <div className="text-xs font-semibold text-vf-muted uppercase tracking-wide mb-3">Initiatives by Quarter</div>
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left text-xs text-vf-muted font-medium pb-1.5" />
                {matrix.years.map((y) => (
                  <th key={y} className="text-center text-xs text-vf-muted font-semibold pb-1.5 px-1">{y}</th>
                ))}
                {matrix.years.length > 1 && (
                  <th className="text-center text-xs text-vf-dark font-bold pb-1.5 px-1 border-l border-[#e8e6e1]">Total</th>
                )}
              </tr>
            </thead>
            <tbody>
              {QUARTERS.map((q) => {
                const isActive = quarterFilter === q;
                return (
                  <tr
                    key={q}
                    onClick={() => setQuarterFilter(isActive ? null : q)}
                    className={`border-t border-[#f0eeea] cursor-pointer transition-colors ${isActive ? 'bg-vf-red/5' : 'hover:bg-gray-50'}`}
                  >
                    <td className={`py-1.5 text-xs font-semibold select-none ${isActive ? 'text-vf-red' : 'text-vf-dark'}`}>
                      {q}
                      {isActive && <span className="ml-1 text-[9px] font-bold tracking-wide text-vf-red">●</span>}
                    </td>
                    {matrix.years.map((y) => (
                      <td key={y} className={`py-1.5 text-center font-mono font-bold ${isActive ? 'text-vf-red' : 'text-vf-dark'}`}>{matrix.grid[q][y] || <span className="text-gray-300">—</span>}</td>
                    ))}
                    {matrix.years.length > 1 && (
                      <td className={`py-1.5 text-center font-mono font-bold border-l border-[#e8e6e1] ${isActive ? 'text-vf-red' : 'text-vf-dark'}`}>{matrix.grid[q]._total}</td>
                    )}
                  </tr>
                );
              })}
              <tr className="border-t-2 border-vf-dark">
                <td className="py-1.5 text-xs font-bold text-vf-dark">Total</td>
                {matrix.years.map((y) => (
                  <td key={y} className="py-1.5 text-center font-mono font-bold text-vf-red text-base">{matrix.colTotals[y]}</td>
                ))}
                {matrix.years.length > 1 && (
                  <td className="py-1.5 text-center font-mono font-bold text-vf-red text-lg border-l border-[#e8e6e1]">{matrix.colTotals._total}</td>
                )}
              </tr>
            </tbody>
          </table>
        </div>

        {/* Tile 2 — By Category */}
        <div className="bg-white border border-vf-border rounded-[10px] px-4 py-4">
          <div className="text-xs font-semibold text-vf-muted uppercase tracking-wide mb-3">By Category</div>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(summary.categoryCounts || {}).sort((a, b) => b[1] - a[1]).map(([c, n]) => {
              const color = CATEGORY_COLORS[c] || '#6B6A66';
              const active = tileFilter.roadmapCategory === c;
              return (
                <button
                  key={c}
                  onClick={() => toggleTile('roadmapCategory', c)}
                  aria-pressed={active}
                  className={`text-left rounded-lg border px-3 py-2.5 flex flex-col gap-1 transition-all ${active ? 'border-vf-red ring-2 ring-vf-red/30 bg-red-50/40' : 'border-[#e8e6e1] hover:bg-gray-50 hover:shadow-sm'}`}
                  style={{ borderLeftWidth: 3, borderLeftColor: color }}
                >
                  <span className="text-[11px] font-semibold text-vf-dark leading-tight">{c}</span>
                  <span className="text-lg font-bold font-mono leading-none" style={{ color }}>{n}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tile 3 — By Portfolio */}
        <div className="bg-white border border-vf-border rounded-[10px] px-4 py-4">
          <div className="text-xs font-semibold text-vf-muted uppercase tracking-wide mb-3">By Portfolio</div>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(summary.portfolioCounts || {}).sort((a, b) => b[1] - a[1]).map(([p, n]) => {
              const active = tileFilter.portfolio === p;
              return (
                <button
                  key={p}
                  onClick={() => toggleTile('portfolio', p)}
                  aria-pressed={active}
                  className={`text-left rounded-lg border px-3 py-2.5 flex flex-col gap-1 transition-all ${active ? 'border-vf-red ring-2 ring-vf-red/30 bg-red-50/40' : 'border-[#e8e6e1] bg-[#fafaf9] hover:bg-gray-100 hover:shadow-sm'}`}
                >
                  <span className={`text-[11px] font-semibold leading-tight ${active ? 'text-vf-red' : 'text-vf-dark'}`}>{p}</span>
                  <span className={`text-lg font-bold font-mono leading-none ${active ? 'text-vf-red' : 'text-vf-dark'}`}>{n}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tile 4 — By Status */}
        <div className="bg-white border border-vf-border rounded-[10px] px-4 py-4">
          <div className="text-xs font-semibold text-vf-muted uppercase tracking-wide mb-3">By Status</div>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(summary.statusCounts || {}).sort((a, b) => b[1] - a[1]).map(([s, c]) => {
              const col = STATUS_COLORS[s] || STATUS_COLORS['Not Started'];
              const active = tileFilter.status === s;
              return (
                <button
                  key={s}
                  onClick={() => toggleTile('status', s)}
                  aria-pressed={active}
                  className={`text-left rounded-lg border px-3 py-2.5 flex flex-col gap-1 transition-all ${col.bg} ${active ? 'border-vf-red ring-2 ring-vf-red/30' : 'border-[#e8e6e1] hover:shadow-sm hover:brightness-95'}`}
                >
                  <span className={`text-[11px] font-semibold leading-tight ${col.text}`}>{s}</span>
                  <span className={`text-lg font-bold font-mono leading-none ${col.text}`}>{c}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="bg-white border border-vf-border rounded-[10px] p-8 text-center text-vf-muted">Loading NPD pipeline...</div>
      ) : initiatives.length === 0 ? (
        <div className="bg-white border border-vf-border rounded-[10px] p-8 text-center text-vf-muted">No initiatives match these filters. A new NPD cycle can be loaded from Admin → NPD Import.</div>
      ) : viewMode === 'timeline' ? (
        <div className="space-y-4">
          {fys.map((fy) => (
            <div key={fy}>
              <div className="flex items-center gap-2 mb-3">
                <div className="text-base font-bold text-white bg-vf-dark px-3 py-1 rounded">{fy}</div>
                <div className="flex-1 h-px bg-vf-border" />
              </div>
              <div className="grid grid-cols-4 gap-3">
                {QUARTERS.map((q) => {
                  const items = timelineData[fy]?.[q] || [];
                  const cell = `${fy} ${q}`;
                  const isDropTarget = dragOverCell === cell;
                  return (
                    <div
                      key={q}
                      className={`min-h-[120px] rounded-lg transition-colors ${isDropTarget ? 'bg-red-50 outline-dashed outline-2 outline-vf-red/40 outline-offset-2' : ''}`}
                      onDragOver={(e) => {
                        if (!e.dataTransfer.types.includes('text/npd-initiative')) return;
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                        if (dragOverCell !== cell) setDragOverCell(cell);
                      }}
                      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDragOverCell(null); }}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDragOverCell(null);
                        const id = parseInt(e.dataTransfer.getData('text/npd-initiative'), 10);
                        if (!isNaN(id)) moveToQuarter(id, fy, q);
                      }}
                    >
                      <div className="text-sm font-semibold text-vf-muted mb-2 flex items-center justify-between">
                        <span>{q}</span>
                        {items.length > 0 && <span className="bg-vf-surface text-vf-muted text-xs px-1.5 py-0.5 rounded-full font-mono">{items.length}</span>}
                      </div>
                      <div className="space-y-2">
                        {items.map((item) => (
                          <PipelineCard key={item.id} item={item} onClick={() => setSelectedItem(item)} onSave={saveInitiative} onEdit={(i) => setFormItem(i)} />
                        ))}
                        {items.length === 0 && (
                          <div className="text-xs text-vf-muted italic p-2">{isDropTarget ? `Drop to move to ${q}` : 'No initiatives'}</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white border border-vf-border rounded-[10px] overflow-hidden">
          <div className="grid grid-cols-[1fr_130px_120px_110px_60px_50px_36px] border-b border-vf-border bg-vf-surface">
            <div className="px-4 py-2.5 text-xs font-semibold text-vf-muted uppercase tracking-wide">Initiative</div>
            <div className="px-3 py-2.5 text-xs font-semibold text-vf-muted uppercase tracking-wide">Portfolio</div>
            <div className="px-3 py-2.5 text-xs font-semibold text-vf-muted uppercase tracking-wide">Category</div>
            <div className="px-3 py-2.5 text-xs font-semibold text-vf-muted uppercase tracking-wide">Status</div>
            <div className="px-3 py-2.5 text-xs font-semibold text-vf-muted uppercase tracking-wide">Year</div>
            <div className="px-3 py-2.5 text-xs font-semibold text-vf-muted uppercase tracking-wide">Qtr</div>
            <div />
          </div>
          {filteredInitiatives.map((item) => {
            return (
              <div
                key={item.id}
                className="grid grid-cols-[1fr_130px_120px_110px_60px_50px_36px] border-b border-[#f0eeea] last:border-b-0 items-center cursor-pointer hover:bg-[#fdf9f9] transition-colors group"
                onClick={() => setSelectedItem(item)}
              >
                <div className="px-4 py-2.5">
                  <div className="text-sm font-medium text-vf-dark truncate">{item.initiativeName}</div>
                  <div className="text-xs text-vf-muted truncate">{item.productFamily} › {item.productLine}</div>
                </div>
                <div className="px-3 py-2.5 text-xs text-vf-dark truncate">{item.portfolio}</div>
                <div className="px-3 py-2.5"><CategoryTag category={item.roadmapCategory} /></div>
                <div className="px-3 py-2.5"><StatusBadge status={item.status} /></div>
                <div className="px-3 py-2.5 text-xs font-mono font-medium text-vf-dark">{item.fy}</div>
                <div className="px-3 py-2.5 text-xs font-mono font-medium text-vf-dark">{item.quarter}</div>
                <div className="pr-2 flex items-center justify-center">
                  <button
                    onClick={(e) => { e.stopPropagation(); setFormItem(item); }}
                    title="Edit initiative"
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-gray-100 text-vf-muted hover:text-vf-dark"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap gap-3 mt-4 text-xs text-vf-muted items-center">
        {Object.entries(CATEGORY_COLORS).map(([cat, color]) => (
          <span key={cat} className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded" style={{ backgroundColor: color }} />
            {cat}
          </span>
        ))}
        <span className="ml-auto">Click any initiative to view details →</span>
      </div>
    </div>
  );
}
