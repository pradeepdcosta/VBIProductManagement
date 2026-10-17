import { createContext, useCallback, useContext, useEffect, useState } from 'react';

const AuthContext = createContext(null);

// Any /api call answering 401 (session expired, user deactivated) signs the
// browser out. The sign-in calls themselves are excluded.
const nativeFetch = window.fetch.bind(window);
window.fetch = async (input, init) => {
  const res = await nativeFetch(input, init);
  const url = typeof input === 'string' ? input : input?.url || '';
  if (res.status === 401 && url.includes('/api/') && !url.includes('/api/auth/')) {
    window.dispatchEvent(new Event('vbi:signed-out'));
  }
  return res;
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = still checking, null = signed out

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => (r.ok ? r.json() : null))
      .then(setUser)
      .catch(() => setUser(null));
    const onSignedOut = () => setUser(null);
    window.addEventListener('vbi:signed-out', onSignedOut);
    return () => window.removeEventListener('vbi:signed-out', onSignedOut);
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Sign-in failed');
    setUser(data);
    return data;
  }, []);

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    // Full reload clears all cached portal data from memory
    window.location.assign('/');
  }, []);

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
