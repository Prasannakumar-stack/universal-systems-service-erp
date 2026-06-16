import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { apiBase } from '../utils/constants.js';

const AuthContext = createContext(null);

function toNetworkMessage(error) {
  if (error instanceof TypeError && /fetch/i.test(error.message || '')) {
    return 'Cannot connect to server. Please check backend is running.';
  }
  return error?.message || 'Request failed';
}

async function parseResponse(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'Request failed');
  return data;
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('us_token') || '');
  const [user, setUserState] = useState(() => {
    const stored = localStorage.getItem('us_user');
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(Boolean(token));

  const setUser = useCallback((nextUser) => {
    setUserState((current) => {
      const resolved = typeof nextUser === 'function' ? nextUser(current) : nextUser;
      if (resolved) localStorage.setItem('us_user', JSON.stringify(resolved));
      else localStorage.removeItem('us_user');
      return resolved;
    });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('us_token');
    localStorage.removeItem('us_user');
    setToken('');
    setUserState(null);
  }, []);

  const request = useCallback(
    async (path, options = {}) => {
      const headers = new Headers(options.headers || {});
      if (!(options.body instanceof FormData) && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
      if (token) headers.set('Authorization', `Bearer ${token}`);
      try {
        return parseResponse(
          await fetch(`${apiBase}${path}`, {
            ...options,
            headers
          })
        );
      } catch (error) {
        throw new Error(toNetworkMessage(error));
      }
    },
    [token]
  );

  const login = useCallback(async (username, password) => {
    let data;
    try {
      data = await parseResponse(
        await fetch(`${apiBase}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        })
      );
    } catch (error) {
      throw new Error(toNetworkMessage(error));
    }
    if (data.success !== true) {
      throw new Error(data.message || 'Invalid credentials');
    }
    const user = data.user ? { ...data.user, role: data.user.role || data.role } : null;
    if (!user) {
      throw new Error('Invalid credentials');
    }
    localStorage.setItem('us_token', data.token);
    localStorage.setItem('us_user', JSON.stringify(user));
    setToken(data.token);
    setUser(user);
    return user;
  }, []);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return undefined;
    }
    let mounted = true;
    fetch(`${apiBase}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(parseResponse)
      .then((data) => {
        if (!mounted) return;
        setUser(data.user);
        localStorage.setItem('us_user', JSON.stringify(data.user));
      })
      .catch(logout)
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [logout, token]);

  const value = useMemo(() => ({ token, user, loading, login, logout, request, setUser }), [token, user, loading, login, logout, request]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
