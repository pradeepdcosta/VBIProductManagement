import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';

export default function MagicLinkPage() {
  const { token } = useParams();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [form, setForm] = useState({});
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/requests/by-token/${token}`)
      .then((r) => {
        if (!r.ok) throw new Error('not found');
        return r.json();
      })
      .then((data) => {
        setRequest(data);
        setForm({
          submitterName: data.submitterName || '',
          submitterEmail: data.submitterEmail || '',
          description: data.description || '',
          justification: data.justification || '',
          dealAccount: data.dealAccount || '',
          priority: data.priority || 'Medium',
          vbiFeedback: data.vbiFeedback || '',
        });
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [token]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await fetch(`/api/requests/by-token/${token}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-vf-surface flex items-center justify-center">
        <div className="text-vf-muted text-sm">Loading…</div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-vf-surface flex items-center justify-center">
        <div className="text-center">
          <p className="text-vf-text font-semibold mb-1">Link not found</p>
          <p className="text-vf-muted text-sm">This link may have expired or is invalid.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-vf-surface flex flex-col items-center justify-start py-10 px-4">
      {/* Header */}
      <div className="w-full max-w-xl mb-6 flex items-center gap-3">
        <div className="bg-vf-red text-white font-bold text-sm px-3 py-1 rounded">
          Vodafone <span className="font-light">Business</span>
        </div>
        <span className="text-vf-muted text-sm">| Product Request Update</span>
      </div>

      <div className="w-full max-w-xl bg-white border border-vf-border rounded-xl shadow-sm overflow-hidden">
        {/* Request header */}
        <div className="px-5 py-4 border-b border-vf-border bg-vf-surface">
          <p className="text-[11px] font-semibold text-vf-muted uppercase tracking-wide mb-1">
            {request.type} · {request.productName}
          </p>
          <h1 className="text-base font-semibold text-vf-text">{request.title}</h1>
          <div className="mt-2 flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
              request.status === 'Open' ? 'bg-blue-100 text-blue-700' :
              request.status === 'In Review' ? 'bg-yellow-100 text-yellow-700' :
              request.status === 'Approved' ? 'bg-green-100 text-green-700' :
              request.status === 'Declined' ? 'bg-red-100 text-red-700' :
              'bg-gray-100 text-gray-600'
            }`}>
              {request.status}
            </span>
            <span className="text-[11px] text-vf-muted">
              Submitted {new Date(request.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          </div>
        </div>

        {saved ? (
          <div className="p-8 flex flex-col items-center gap-3 text-center">
            <CheckCircle size={40} className="text-vf-success" />
            <p className="font-semibold text-vf-text">Thank you — your update has been saved.</p>
            <p className="text-sm text-vf-muted">The VBI Product team will be in touch.</p>
            <button
              onClick={() => setSaved(false)}
              className="mt-2 text-xs text-vf-red underline"
            >
              Edit again
            </button>
          </div>
        ) : (
          <form onSubmit={handleSave} className="p-5 space-y-4">
            <p className="text-xs text-vf-muted">Please review and update any details below, then click Save.</p>

            {/* Submitter */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-vf-muted uppercase tracking-wide">Your Name</label>
                <input
                  className="border border-vf-border rounded-md px-2.5 py-1.5 text-xs font-sans focus:outline-none focus:border-vf-red"
                  value={form.submitterName}
                  onChange={(e) => setForm({ ...form, submitterName: e.target.value })}
                  placeholder="Full name"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-vf-muted uppercase tracking-wide">Your Email</label>
                <input
                  type="email"
                  className="border border-vf-border rounded-md px-2.5 py-1.5 text-xs font-sans focus:outline-none focus:border-vf-red"
                  value={form.submitterEmail}
                  onChange={(e) => setForm({ ...form, submitterEmail: e.target.value })}
                  placeholder="email@company.com"
                />
              </div>
            </div>

            {/* Deal */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-vf-muted uppercase tracking-wide">Deal / Account (if applicable)</label>
              <input
                className="border border-vf-border rounded-md px-2.5 py-1.5 text-xs font-sans focus:outline-none focus:border-vf-red"
                value={form.dealAccount}
                onChange={(e) => setForm({ ...form, dealAccount: e.target.value })}
                placeholder="e.g. Maybank APAC bid"
              />
            </div>

            {/* Description */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-vf-muted uppercase tracking-wide">Description</label>
              <textarea
                className="w-full border border-vf-border rounded-md px-2.5 py-1.5 text-xs font-sans focus:outline-none focus:border-vf-red resize-y min-h-[80px]"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={4}
              />
            </div>

            {/* Justification */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-vf-muted uppercase tracking-wide">Business Justification</label>
              <textarea
                className="w-full border border-vf-border rounded-md px-2.5 py-1.5 text-xs font-sans focus:outline-none focus:border-vf-red resize-y min-h-[80px]"
                value={form.justification}
                onChange={(e) => setForm({ ...form, justification: e.target.value })}
                rows={3}
                placeholder="Revenue at stake, strategic rationale, timeline…"
              />
            </div>

            {/* VBI Feedback */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold text-vf-muted uppercase tracking-wide">VBI Product &amp; Services Feedback</label>
              <textarea
                className="w-full border border-vf-border rounded-md px-2.5 py-1.5 text-xs font-sans focus:outline-none focus:border-vf-red resize-y min-h-[80px]"
                value={form.vbiFeedback}
                onChange={(e) => setForm({ ...form, vbiFeedback: e.target.value })}
                rows={3}
                placeholder="Feedback on existing VBI products and services…"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-vf-red text-white rounded-lg py-2 text-sm font-medium hover:bg-vf-red-hover transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save Update'}
            </button>
          </form>
        )}
      </div>

      <p className="mt-6 text-[11px] text-vf-muted">
        This link is private — only people with it can access this request.
      </p>
    </div>
  );
}
