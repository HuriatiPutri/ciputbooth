import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const TOKEN_KEY = 'ciputbooth_token';
const AuthContext = createContext(null);

async function request(path, options = {}) {
  const res = await fetch(`/api/auth${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.success) throw new Error(body.message || 'Request failed');
  return body.data;
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(null);
  const [isRestoring, setIsRestoring] = useState(Boolean(localStorage.getItem(TOKEN_KEY)));

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

  // Restore the session from a stored token; drop it if the server rejects it.
  useEffect(() => {
    if (!token) {
      setIsRestoring(false);
      return;
    }
    let cancelled = false;
    request('/me', { headers: { Authorization: `Bearer ${token}` } })
      .then((data) => !cancelled && setUser(data))
      .catch(() => !cancelled && logout())
      .finally(() => !cancelled && setIsRestoring(false));
    return () => {
      cancelled = true;
    };
  }, [token, logout]);

  const login = useCallback(async (email, password) => {
    const data = await request('/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    localStorage.setItem(TOKEN_KEY, data.token);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  // fetch wrapper for protected endpoints; returns the unwrapped `data` or throws with the API message.
  const authFetch = useCallback(
    async (url, options = {}) => {
      const headers = {
        Authorization: `Bearer ${token}`,
        ...(options.headers || {})
      };

      if (!(options.body instanceof FormData) && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
      }

      const res = await fetch(url, {
        ...options,
        headers
      });
      const body = await res.json().catch(() => ({}));
      if (res.status === 401) logout();
      if (!res.ok || !body.success) throw new Error(body.message || 'Request failed');
      return body.data;
    },
    [token, logout]
  );

  const value = useMemo(
    () => ({
      token,
      user,
      isAuthenticated: Boolean(user),
      isAdmin: user?.role === 'admin',
      isRestoring,
      login,
      logout,
      authFetch
    }),
    [token, user, isRestoring, login, logout, authFetch]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
