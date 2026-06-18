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

function hasAvatarField(value) {
  if (!value || typeof value !== 'object') return false;
  return ['avatarUrl', 'photoUrl', 'profilePhoto', 'avatar'].some((field) => Object.prototype.hasOwnProperty.call(value, field));
}

function normalizeAuthUser(nextUser, currentUser = null) {
  if (!nextUser) return nextUser;
  const avatarValue = nextUser.avatarUrl ?? nextUser.photoUrl ?? nextUser.profilePhoto ?? nextUser.avatar;
  return {
    ...nextUser,
    avatarUrl: hasAvatarField(nextUser) ? String(avatarValue || '') : String(currentUser?.avatarUrl || '')
  };
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
      const normalized = normalizeAuthUser(resolved, current);
      if (normalized) localStorage.setItem('us_user', JSON.stringify(normalized));
      else localStorage.removeItem('us_user');
      return normalized;
    });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('us_token');
    localStorage.removeItem('us_user');
    setToken('');
    setUserState(null);
  }, []);

  const refreshUser = useCallback(async (authToken = token) => {
    if (!authToken) return null;
    try {
      const data = await parseResponse(
        await fetch(`${apiBase}/auth/me`, {
          headers: { Authorization: `Bearer ${authToken}` },
          cache: 'no-store'
        })
      );
      if (data?.user) {
        setUser(data.user);
      }
      return data?.user || null;
    } catch (error) {
      throw new Error(toNetworkMessage(error));
    }
  }, [setUser, token]);

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
    const user = data.user ? normalizeAuthUser({ ...data.user, role: data.user.role || data.role }) : null;
    if (!user) {
      throw new Error('Invalid credentials');
    }
    localStorage.setItem('us_token', data.token);
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
    refreshUser(token)
      .then(() => {
        if (!mounted) return;
      })
      .catch(logout)
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [logout, refreshUser, token]);

  const value = useMemo(() => ({ token, user, loading, login, logout, request, setUser, refreshUser }), [token, user, loading, login, logout, request, setUser, refreshUser]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
