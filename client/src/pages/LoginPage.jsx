import { useState } from 'react';
import { useAuth } from '../auth.jsx';

const BACKGROUND = "url('https://d8j0ntlcm91z4.cloudfront.net/user_3GiPDDUtDYKsdmoVzWdMxSEAzmJ/hf_20260722_131118_197dc731-506e-4ec4-8c43-0a5aa9f95e27.png')";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email, password);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  const inputCls = 'w-full bg-white/[0.07] border border-white/20 rounded-md px-3.5 py-2.5 text-sm text-white placeholder-white/40 focus:outline-none focus:border-vf-red focus:bg-white/10 transition-colors';

  return (
    <div
      className="fixed inset-0 flex items-center justify-center px-6"
      style={{ backgroundImage: BACKGROUND, backgroundSize: 'cover', backgroundPosition: 'center', fontFamily: "'Vodafone Rg', Arial, Helvetica, sans-serif" }}
    >
      <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.55) 45%, rgba(0,0,0,0.85) 100%)' }} />

      <div className="relative z-10 w-full max-w-[380px]">
        <div className="flex items-center justify-center gap-2.5 mb-8 tracking-wide">
          <span className="text-xl font-bold text-white">Vodafone</span>
          <span className="text-xl font-bold text-vf-red">Business</span>
          <span className="w-px h-[18px] bg-white/35 mx-1.5" />
          <span className="text-[0.8125rem] text-white/75 uppercase tracking-widest">International</span>
        </div>

        <form
          onSubmit={submit}
          className="bg-black/55 backdrop-blur-md border border-white/15 rounded-xl px-7 py-8 shadow-2xl"
        >
          <h1 className="text-2xl font-bold text-white">Sign in</h1>
          <p className="text-sm text-white/60 mt-1 mb-6">VBI Product Intelligence Portal</p>

          {error && (
            <div role="alert" className="mb-4 bg-red-500/15 border border-red-500/40 text-red-200 text-sm px-3 py-2 rounded-md">{error}</div>
          )}

          <label htmlFor="login-email" className="block text-[0.6875rem] font-semibold text-white/60 uppercase tracking-wider mb-1.5">Email</label>
          <input
            id="login-email"
            type="email"
            autoComplete="username"
            autoFocus
            required
            className={inputCls}
            placeholder="name@vodafone.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <label htmlFor="login-password" className="block text-[0.6875rem] font-semibold text-white/60 uppercase tracking-wider mb-1.5 mt-4">Password</label>
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            required
            className={inputCls}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button
            type="submit"
            disabled={busy}
            className="w-full mt-6 bg-vf-red hover:bg-[#C40000] text-white font-bold text-[0.9375rem] tracking-wide rounded py-3 transition-colors disabled:opacity-60"
          >
            {busy ? 'Signing in…' : 'Sign in'}
          </button>

          <p className="text-[0.6875rem] text-white/45 mt-5 text-center leading-relaxed">
            No account? Ask a portal administrator to add you.
          </p>
        </form>

        <div className="text-center text-xs text-white/45 mt-8 tracking-wide">VBI &middot; FY27</div>
      </div>
    </div>
  );
}
