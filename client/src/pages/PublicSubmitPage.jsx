import { useEffect, useState } from 'react';
import { Copy, Check, CheckCircle } from 'lucide-react';

function useCascadingDropdowns() {
  const [categories, setCategories] = useState([]);
  const [families, setFamilies] = useState([]);
  const [lines, setLines] = useState([]);

  useEffect(() => {
    fetch('/api/products/categories').then(r => r.json()).then(setCategories).catch(() => {});
  }, []);

  const onCategoryChange = (cat) => {
    setFamilies([]);
    setLines([]);
    if (!cat) return;
    fetch(`/api/products/families?category=${encodeURIComponent(cat)}`).then(r => r.json()).then(setFamilies).catch(() => {});
  };

  const onFamilyChange = (cat, fam) => {
    setLines([]);
    if (!fam) return;
    const p = new URLSearchParams({ category: cat, family: fam });
    fetch(`/api/products/lines?${p}`).then(r => r.json()).then(setLines).catch(() => {});
  };

  return { categories, families, lines, onCategoryChange, onFamilyChange };
}

const REQUEST_TYPES = [
  'New Partner Product Onboarding',
  'New Product Feature (Existing Product)',
  'Country Availability Expansion (Existing Product)',
  'New Product Development',
  'Product Delivery SLA Improvement (Existing Product)',
  'Other',
];
const PRIORITIES = ['High', 'Medium', 'Low'];

const EMPTY_FORM = {
  submitterName: '',
  submitterEmail: '',
  type: 'Feature Request',
  category: '',
  productFamily: '',
  productLine: '',
  productName: '',
  title: '',
  priority: 'Medium',
  dealAccount: '',
  description: '',
  justification: '',
  vbiFeedback: '',
};

export default function PublicSubmitPage() {
  const { categories, families, lines, onCategoryChange, onFamilyChange } = useCascadingDropdowns();
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(null); // holds the created request
  const [copied, setCopied] = useState(false);
  const [copiedPage, setCopiedPage] = useState(false);

  const pageUrl = `${window.location.origin}/raise-request`;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.productName) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: form.type,
          category: form.category || null,
          productFamily: form.productFamily || null,
          productLine: form.productLine || null,
          productName: form.productName,
          title: form.title,
          description: form.description,
          justification: form.justification || null,
          dealAccount: form.dealAccount || null,
          priority: form.priority,
          submitterName: form.submitterName || null,
          submitterEmail: form.submitterEmail || null,
          vbiFeedback: form.vbiFeedback || null,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setSubmitted(data);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const copyMagicLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/request/${submitted.token}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyPageLink = () => {
    navigator.clipboard.writeText(pageUrl);
    setCopiedPage(true);
    setTimeout(() => setCopiedPage(false), 2000);
  };

  if (submitted) {
    const magicLink = `${window.location.origin}/request/${submitted.token}`;
    return (
      <div className="min-h-screen bg-vf-surface flex items-start justify-center pt-16 px-4 font-sans">
        <div className="w-full max-w-lg">
          {/* Vodafone header */}
          <div className="flex items-center gap-2 mb-8">
            <div className="w-8 h-8 bg-vf-red rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">V</span>
            </div>
            <span className="text-sm font-semibold text-vf-text">Vodafone Business</span>
          </div>

          <div className="bg-white border border-vf-border rounded-xl p-8 text-center shadow-sm">
            <CheckCircle size={48} className="text-green-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-vf-text mb-1">Request Submitted!</h2>
            <p className="text-sm text-vf-muted mb-6">
              Thank you{submitted.submitterName ? `, ${submitted.submitterName}` : ''}. The VBI team will review it shortly.
            </p>

            <div className="bg-vf-surface border border-vf-border rounded-lg p-4 text-left mb-4">
              <p className="text-[11px] font-semibold text-vf-muted uppercase tracking-wide mb-1.5">
                Your tracking link — bookmark this to update your request
              </p>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={magicLink}
                  className="flex-1 text-xs border border-vf-border rounded-md px-2.5 py-1.5 bg-white font-mono text-vf-muted"
                />
                <button
                  onClick={copyMagicLink}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-vf-border rounded-md bg-white hover:bg-vf-surface transition-colors"
                >
                  {copied ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>

            <button
              onClick={() => setSubmitted(null)}
              className="text-xs text-vf-muted hover:text-vf-text underline"
            >
              Submit another request
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-vf-surface flex items-start justify-center pt-10 pb-16 px-4 font-sans">
      <div className="w-full max-w-2xl">
        {/* Vodafone header */}
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 bg-vf-red rounded-full flex items-center justify-center">
            <span className="text-white text-xs font-bold">V</span>
          </div>
          <span className="text-sm font-semibold text-vf-text">Vodafone Business</span>
        </div>

        <div className="bg-white border border-vf-border rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 pt-6 pb-4 border-b border-vf-border">
            <h1 className="text-base font-semibold text-vf-text">Submit a Product Request</h1>
            <p className="text-xs text-vf-muted mt-0.5">
              Tell us what you need — a feature, deal enablement, country expansion or SLA exception.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Submitter */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-vf-muted uppercase tracking-wide">Your Name</label>
                <input
                  className="border border-vf-border rounded-md px-2.5 py-1.5 text-xs font-sans focus:outline-none focus:border-vf-red"
                  placeholder="Full name"
                  value={form.submitterName}
                  onChange={(e) => setForm({ ...form, submitterName: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-vf-muted uppercase tracking-wide">Your Email</label>
                <input
                  type="email"
                  className="border border-vf-border rounded-md px-2.5 py-1.5 text-xs font-sans focus:outline-none focus:border-vf-red"
                  placeholder="email@company.com"
                  value={form.submitterEmail}
                  onChange={(e) => setForm({ ...form, submitterEmail: e.target.value })}
                />
              </div>
            </div>

            {/* Type + Category */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-vf-muted uppercase tracking-wide">Request Type</label>
                <select
                  className="border border-vf-border rounded-md px-2.5 py-1.5 text-xs font-sans focus:outline-none focus:border-vf-red"
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                >
                  {REQUEST_TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-vf-muted uppercase tracking-wide">Product Category</label>
                <select
                  className="border border-vf-border rounded-md px-2.5 py-1.5 text-xs font-sans focus:outline-none focus:border-vf-red"
                  value={form.category}
                  onChange={(e) => {
                    const cat = e.target.value;
                    setForm({ ...form, category: cat, productFamily: '', productLine: '' });
                    onCategoryChange(cat);
                  }}
                >
                  <option value="">Select category…</option>
                  {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            {/* Family + Line */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-vf-muted uppercase tracking-wide">Product Family</label>
                <select
                  className="border border-vf-border rounded-md px-2.5 py-1.5 text-xs font-sans focus:outline-none focus:border-vf-red disabled:opacity-40"
                  value={form.productFamily}
                  disabled={!form.category}
                  onChange={(e) => {
                    const fam = e.target.value;
                    setForm({ ...form, productFamily: fam, productLine: '' });
                    onFamilyChange(form.category, fam);
                  }}
                >
                  <option value="">Select family…</option>
                  {families.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-vf-muted uppercase tracking-wide">Product Line</label>
                <select
                  className="border border-vf-border rounded-md px-2.5 py-1.5 text-xs font-sans focus:outline-none focus:border-vf-red disabled:opacity-40"
                  value={form.productLine}
                  disabled={!form.productFamily}
                  onChange={(e) => setForm({ ...form, productLine: e.target.value })}
                >
                  <option value="">Select product line…</option>
                  {lines.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            </div>

            {/* Product Name */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-vf-muted uppercase tracking-wide">Product Name <span className="text-vf-red">*</span></label>
              <input
                required
                className="border border-vf-border rounded-md px-2.5 py-1.5 text-xs font-sans focus:outline-none focus:border-vf-red"
                placeholder="e.g. RedBox, Vodafone Identity Hub…"
                value={form.productName}
                onChange={(e) => setForm({ ...form, productName: e.target.value })}
              />
            </div>

            {/* Title + Priority */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-vf-muted uppercase tracking-wide">Title <span className="text-vf-red">*</span></label>
                <input
                  required
                  className="border border-vf-border rounded-md px-2.5 py-1.5 text-xs font-sans focus:outline-none focus:border-vf-red"
                  placeholder="Brief summary of the request"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-vf-muted uppercase tracking-wide">Priority</label>
                <select
                  className="border border-vf-border rounded-md px-2.5 py-1.5 text-xs font-sans focus:outline-none focus:border-vf-red"
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value })}
                >
                  {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
                </select>
              </div>
            </div>

            {/* Deal / Account */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-vf-muted uppercase tracking-wide">Deal / Account (if applicable)</label>
                <input
                  className="border border-vf-border rounded-md px-2.5 py-1.5 text-xs font-sans focus:outline-none focus:border-vf-red"
                  placeholder="e.g. Maybank APAC bid"
                  value={form.dealAccount}
                  onChange={(e) => setForm({ ...form, dealAccount: e.target.value })}
                />
              </div>
            </div>

            {/* Description */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-vf-muted uppercase tracking-wide">Description</label>
              <textarea
                className="w-full border border-vf-border rounded-md px-2.5 py-1.5 text-xs font-sans focus:outline-none focus:border-vf-red resize-y min-h-[70px]"
                placeholder="Describe the feature needed, countries required, SLA requirements, timeline..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
              />
            </div>

            {/* Business Justification */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-vf-muted uppercase tracking-wide">Business Justification</label>
              <textarea
                className="w-full border border-vf-border rounded-md px-2.5 py-1.5 text-xs font-sans focus:outline-none focus:border-vf-red resize-y min-h-[70px]"
                placeholder="Revenue at stake, customer name (if permitted), strategic rationale..."
                value={form.justification}
                onChange={(e) => setForm({ ...form, justification: e.target.value })}
                rows={3}
              />
            </div>

            {/* VBI Feedback */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-vf-muted uppercase tracking-wide">VBI Product &amp; Services Feedback</label>
              <textarea
                className="w-full border border-vf-border rounded-md px-2.5 py-1.5 text-xs font-sans focus:outline-none focus:border-vf-red resize-y min-h-[70px]"
                placeholder="Feedback on existing VBI products and services…"
                value={form.vbiFeedback}
                onChange={(e) => setForm({ ...form, vbiFeedback: e.target.value })}
                rows={3}
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="bg-vf-red text-white border-none rounded-lg px-5 py-2 text-[13px] font-medium cursor-pointer font-sans hover:bg-vf-red-hover disabled:opacity-50"
            >
              {submitting ? 'Submitting…' : 'Submit Request'}
            </button>
          </form>
        </div>

        {/* Shareable page link — for admin to copy and distribute */}
        <div className="mt-6 bg-white border border-vf-border rounded-xl p-4">
          <p className="text-[11px] font-semibold text-vf-muted uppercase tracking-wide mb-1.5">
            Share this form — copy the link below to send or post
          </p>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={pageUrl}
              className="flex-1 text-xs border border-vf-border rounded-md px-2.5 py-1.5 bg-vf-surface font-mono text-vf-muted"
            />
            <button
              onClick={copyPageLink}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-vf-border rounded-md bg-white hover:bg-vf-surface transition-colors whitespace-nowrap"
            >
              {copiedPage ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
              {copiedPage ? 'Copied!' : 'Copy Link'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
