import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';

const statusStyle = (s) => {
  if (s === 'Open') return 'bg-blue-100 text-blue-700';
  if (s === 'In Review') return 'bg-yellow-100 text-yellow-700';
  if (s === 'Approved') return 'bg-green-100 text-green-700';
  if (s === 'Declined') return 'bg-red-100 text-red-700';
  return 'bg-gray-100 text-gray-600';
};

function Field({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-semibold text-vf-muted uppercase tracking-wide">{label}</span>
      <span className="text-xs text-vf-text">{value}</span>
    </div>
  );
}

export default function ProductReviewPage() {
  const { token } = useParams();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch(`/api/requests/by-token/${token}`)
      .then((r) => {
        if (!r.ok) throw new Error('not found');
        return r.json();
      })
      .then((data) => {
        setRequest(data);
        setFeedback(data.vbiFeedback || '');
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await fetch(`/api/requests/by-token/${token}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vbiFeedback: feedback }),
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
          <p className="text-vf-muted text-sm">This review link may be invalid or has already been used.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-vf-surface flex flex-col items-center justify-start py-10 px-4 font-sans">
      {/* Header */}
      <div className="w-full max-w-xl mb-6 flex items-center gap-3">
        <div className="w-8 h-8 bg-vf-red rounded-full flex items-center justify-center">
          <span className="text-white text-xs font-bold">V</span>
        </div>
        <div>
          <span className="text-sm font-semibold text-vf-text">Vodafone Business</span>
          <span className="text-vf-muted text-xs ml-2">| Product Team Review</span>
        </div>
      </div>

      <div className="w-full max-w-xl space-y-4">
        {/* Request summary — read only */}
        <div className="bg-white border border-vf-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-vf-border bg-vf-surface">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-semibold text-vf-muted uppercase tracking-wide">{request.type}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusStyle(request.status)}`}>
                {request.status}
              </span>
            </div>
            <h1 className="text-base font-semibold text-vf-text">{request.title}</h1>
            <p className="text-[11px] text-vf-muted mt-0.5">
              {request.productName}
              {request.submitterName ? ` · Raised by ${request.submitterName}` : ''}
              {' · '}Submitted {new Date(request.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          </div>

          <div className="px-5 py-4 grid grid-cols-3 gap-4 border-b border-vf-border">
            <Field label="Category" value={request.category} />
            <Field label="Family" value={request.productFamily} />
            <Field label="Product Line" value={request.productLine} />
          </div>

          <div className="px-5 py-4 space-y-3">
            <Field label="Description" value={request.description} />
            <Field label="Business Justification" value={request.justification} />
            {request.dealAccount && <Field label="Deal / Account" value={request.dealAccount} />}
          </div>
        </div>

        {/* Product team feedback */}
        {saved ? (
          <div className="bg-white border border-vf-border rounded-xl p-8 flex flex-col items-center gap-3 text-center">
            <CheckCircle size={40} className="text-green-500" />
            <p className="font-semibold text-vf-text">Feedback submitted — thank you.</p>
            <p className="text-sm text-vf-muted">Your response has been saved against this request.</p>
            <button onClick={() => setSaved(false)} className="mt-1 text-xs text-vf-red underline">
              Edit response
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white border border-vf-border rounded-xl p-5 space-y-3">
            <div>
              <label className="text-[11px] font-semibold text-vf-muted uppercase tracking-wide block mb-1">
                VBI Product &amp; Services Feedback
              </label>
              <p className="text-[11px] text-vf-muted mb-2">
                Provide your product team assessment — feasibility, timeline, existing roadmap alignment, or any blockers.
              </p>
              <textarea
                required
                className="w-full border border-vf-border rounded-md px-3 py-2 text-xs font-sans focus:outline-none focus:border-vf-red resize-y min-h-[120px]"
                placeholder="e.g. This is on our H2 roadmap under the IoT expansion programme. Estimated delivery Q3 FY27…"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                rows={5}
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="w-full bg-vf-red text-white rounded-lg py-2 text-sm font-medium hover:bg-vf-red-hover transition-colors disabled:opacity-50"
            >
              {saving ? 'Submitting…' : 'Submit Feedback'}
            </button>
          </form>
        )}
      </div>

      <p className="mt-6 text-[11px] text-vf-muted text-center">
        This link is for VBI Product Team use only — do not forward externally.
      </p>
    </div>
  );
}
