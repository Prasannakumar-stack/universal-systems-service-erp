import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { apiBase } from '../utils/constants.js';

const AuthContext = createContext(null);
const AUTH_TOKEN_KEY = 'us_token';
const AUTH_USER_KEY = 'us_user';
const LEGACY_AUTH_KEYS = ['us_token', 'us_user', 'adminToken', 'token'];
const AUTH_BOOTSTRAP_TIMEOUT_MS = 10000;

function safeStorage(storageName) {
  if (typeof window === 'undefined') return null;
  try {
    return window[storageName] || null;
  } catch {
    return null;
  }
}

function clearLegacyPersistentAuth() {
  const storage = safeStorage('localStorage');
  if (!storage) return;
  LEGACY_AUTH_KEYS.forEach((key) => storage.removeItem(key));
}

function readSessionToken() {
  const storage = safeStorage('sessionStorage');
  return storage?.getItem(AUTH_TOKEN_KEY) || '';
}

function readSessionUser() {
  const storage = safeStorage('sessionStorage');
  const stored = storage?.getItem(AUTH_USER_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    storage.removeItem(AUTH_USER_KEY);
    return null;
  }
}

function writeSessionToken(token) {
  const storage = safeStorage('sessionStorage');
  if (!storage) return;
  if (token) storage.setItem(AUTH_TOKEN_KEY, token);
  else storage.removeItem(AUTH_TOKEN_KEY);
}

function writeSessionUser(user) {
  const storage = safeStorage('sessionStorage');
  if (!storage) return;
  if (user) storage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  else storage.removeItem(AUTH_USER_KEY);
}

function toNetworkMessage(error) {
  if (error?.name === 'AbortError') {
    return 'Cannot connect to server. Please check backend is running.';
  }
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

async function fetchWithTimeout(url, options = {}, timeoutMs = AUTH_BOOTSTRAP_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...options,
      signal: options.signal || controller.signal
    });
  } finally {
    window.clearTimeout(timeoutId);
  }
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
  const [token, setToken] = useState(() => {
    clearLegacyPersistentAuth();
    return readSessionToken();
  });
  const [user, setUserState] = useState(() => readSessionUser());
  const [loading, setLoading] = useState(Boolean(token));

  const setUser = useCallback((nextUser) => {
    setUserState((current) => {
      const resolved = typeof nextUser === 'function' ? nextUser(current) : nextUser;
      const normalized = normalizeAuthUser(resolved, current);
      writeSessionUser(normalized);
      return normalized;
    });
  }, []);

  const logout = useCallback(() => {
    writeSessionToken('');
    writeSessionUser(null);
    clearLegacyPersistentAuth();
    setToken('');
    setUserState(null);
  }, []);

  const refreshUser = useCallback(async (authToken = token) => {
    if (!authToken) return null;
    try {
      const data = await parseResponse(
        await fetchWithTimeout(`${apiBase}/auth/me`, {
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
    clearLegacyPersistentAuth();
    writeSessionToken(data.token);
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
