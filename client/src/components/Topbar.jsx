import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuth } from '../auth.jsx';

// "pradeep.dcosta@vodafone.com" → "PD"
function initials(user) {
  const source = user?.name || user?.email?.split('@')[0] || '';
  const parts = source.split(/[.\s_-]+/).filter(Boolean);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || '?';
}

export default function Topbar() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e) => { if (!menuRef.current?.contains(e.target)) setMenuOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setMenuOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', onKey); };
  }, [menuOpen]);

  return (
    <div className="flex items-center px-5 h-[52px] bg-vf-dark text-white border-b-2 border-vf-red shrink-0 gap-4 relative z-40">
      <div className="text-[15px] font-semibold tracking-tight">
        Vodafone <span className="text-vf-red">Business</span>
      </div>
      <div className="text-xs text-[#aaa] font-normal ml-1">| VBI Product Intelligence Portal</div>
      <div className="ml-auto flex items-center gap-3">
        <span className="text-[11px] text-[#888]">VBI · FY27</span>
        <button
          onClick={() => navigate('/features')}
          className="bg-vf-red border border-vf-red text-white rounded-md px-3 py-1 text-xs cursor-pointer font-sans hover:bg-vf-red-hover"
        >
          + New Request
        </button>
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            title={user?.email}
            className="w-[30px] h-[30px] bg-vf-red rounded-full flex items-center justify-center text-[11px] font-semibold text-white cursor-pointer hover:ring-2 hover:ring-white/30"
          >
            {initials(user)}
          </button>
          {menuOpen && (
            <div role="menu" className="absolute right-0 top-full mt-2 w-64 bg-white text-vf-text rounded-lg shadow-xl border border-vf-border overflow-hidden">
              <div className="px-4 py-3 border-b border-vf-border">
                <div className="text-[10px] font-semibold text-vf-muted uppercase tracking-wide">Signed in as</div>
                <div className="text-sm font-medium truncate mt-0.5">{user?.email}</div>
              </div>
              <button
                role="menuitem"
                onClick={logout}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-vf-surface text-left"
              >
                <LogOut size={14} className="text-vf-muted" /> Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
