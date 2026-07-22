export default function LandingPage({ onEnter }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        fontFamily: "'Vodafone Rg', Arial, Helvetica, sans-serif",
        backgroundImage: "url('https://d8j0ntlcm91z4.cloudfront.net/user_3GiPDDUtDYKsdmoVzWdMxSEAzmJ/hf_20260722_131118_197dc731-506e-4ec4-8c43-0a5aa9f95e27.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {/* Gradient overlay */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.35) 40%, rgba(0,0,0,0.75) 100%)',
      }} />

      {/* Content */}
      <div style={{
        position: 'relative',
        zIndex: 2,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        padding: '0 24px',
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '48px', letterSpacing: '0.5px' }}>
          <span style={{ fontSize: '20px', fontWeight: 700, color: '#ffffff' }}>Vodafone</span>
          <span style={{ fontSize: '20px', fontWeight: 700, color: '#E60000' }}>Business</span>
          <div style={{ width: '1px', height: '18px', background: 'rgba(255,255,255,0.35)', margin: '0 6px' }} />
          <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.75)', letterSpacing: '1px', textTransform: 'uppercase' }}>International</span>
        </div>

        {/* Headline */}
        <h1 style={{ fontSize: '52px', fontWeight: 700, color: '#ffffff', lineHeight: 1.15, maxWidth: '760px', letterSpacing: '-0.5px', margin: 0 }}>
          Product Intelligence,<br />
          <span style={{ color: '#E60000' }}>unified</span> at last.
        </h1>

        {/* Subtitle */}
        <p style={{ marginTop: '20px', fontSize: '18px', color: 'rgba(255,255,255,0.8)', maxWidth: '560px', lineHeight: 1.6, fontWeight: 300 }}>
          One portal to see everything VBI sells, plan every launch, and keep the roadmap honest.
        </p>

        {/* Feature pills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '12px', marginTop: '40px', maxWidth: '620px' }}>
          {['Product catalog', 'Product requests', 'NPD pipeline', 'Cost management'].map((f) => (
            <div key={f} style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '10px 18px',
              border: '1px solid rgba(255,255,255,0.25)',
              borderRadius: '100px',
              background: 'rgba(255,255,255,0.06)',
              backdropFilter: 'blur(4px)',
            }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#E60000', flexShrink: 0, display: 'inline-block' }} />
              <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.85)', letterSpacing: '0.3px', whiteSpace: 'nowrap' }}>{f}</span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <button
          onClick={onEnter}
          style={{
            marginTop: '56px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '10px',
            background: '#E60000',
            color: '#ffffff',
            border: 'none',
            padding: '16px 40px',
            fontSize: '16px',
            fontWeight: 700,
            borderRadius: '4px',
            cursor: 'pointer',
            letterSpacing: '0.5px',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#C40000'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = '#E60000'; e.currentTarget.style.transform = 'translateY(0)'; }}
        >
          Enter Portal
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </button>
      </div>

      {/* Footer */}
      <div style={{
        position: 'absolute',
        bottom: '28px',
        zIndex: 2,
        fontSize: '12px',
        color: 'rgba(255,255,255,0.45)',
        letterSpacing: '0.5px',
      }}>
        VBI &middot; FY27
      </div>
    </div>
  );
}
