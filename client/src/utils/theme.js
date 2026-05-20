import { useCallback, useEffect, useState } from 'react';

export const THEME_STORAGE_KEY = 'app-theme';
const LEGACY_THEME_STORAGE_KEY = 'us_theme_preference';
export const themePreferenceOptions = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System Default' }
];

const validThemePreferences = new Set(themePreferenceOptions.map((option) => option.value));

function safeThemePreference(value) {
  return validThemePreferences.has(value) ? value : 'system';
}

function systemTheme() {
  if (typeof window === 'undefined' || !window.matchMedia) return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function getStoredThemePreference() {
  if (typeof window === 'undefined') return 'system';
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (stored) return safeThemePreference(stored);
  const legacyStored = window.localStorage.getItem(LEGACY_THEME_STORAGE_KEY);
  if (legacyStored) {
    const migratedTheme = safeThemePreference(legacyStored);
    window.localStorage.setItem(THEME_STORAGE_KEY, migratedTheme);
    return migratedTheme;
  }
  return 'system';
}

export function resolveThemePreference(preference = getStoredThemePreference()) {
  const safePreference = safeThemePreference(preference);
  return safePreference === 'system' ? systemTheme() : safePreference;
}

export function applyThemePreference(preference = getStoredThemePreference()) {
  if (typeof document === 'undefined') return 'dark';
  const safePreference = safeThemePreference(preference);
  const resolvedTheme = resolveThemePreference(safePreference);
  const targets = [document.documentElement, document.body, document.getElementById('root')].filter(Boolean);

  targets.forEach((target) => {
    target.dataset.themePreference = safePreference;
    target.dataset.theme = resolvedTheme;
    target.classList.toggle('theme-light', resolvedTheme === 'light');
    target.classList.toggle('theme-dark', resolvedTheme === 'dark');
  });
  document.documentElement.style.colorScheme = resolvedTheme;
  return resolvedTheme;
}

export function setStoredThemePreference(preference) {
  const safePreference = safeThemePreference(preference);
  window.localStorage.setItem(THEME_STORAGE_KEY, safePreference);
  return applyThemePreference(safePreference);
}

export function initThemePreference() {
  if (typeof window === 'undefined') return;
  applyThemePreference();

  const media = window.matchMedia?.('(prefers-color-scheme: dark)');
  const syncSystemTheme = () => {
    if (getStoredThemePreference() === 'system') applyThemePreference('system');
  };
  media?.addEventListener?.('change', syncSystemTheme);
  window.addEventListener('storage', (event) => {
    if (event.key === THEME_STORAGE_KEY || event.key === LEGACY_THEME_STORAGE_KEY) applyThemePreference(getStoredThemePreference());
  });
}

export function useThemePreference() {
  const [themePreference, setThemePreferenceState] = useState(getStoredThemePreference);
  const [resolvedTheme, setResolvedTheme] = useState(() => resolveThemePreference(themePreference));

  useEffect(() => {
    setResolvedTheme(applyThemePreference(themePreference));
    const media = window.matchMedia?.('(prefers-color-scheme: dark)');
    const handleSystemChange = () => {
      if (getStoredThemePreference() === 'system') setResolvedTheme(applyThemePreference('system'));
    };
    const handleStorage = (event) => {
      if (event.key !== THEME_STORAGE_KEY && event.key !== LEGACY_THEME_STORAGE_KEY) return;
      const nextPreference = getStoredThemePreference();
      setThemePreferenceState(nextPreference);
      setResolvedTheme(applyThemePreference(nextPreference));
    };

    media?.addEventListener?.('change', handleSystemChange);
    window.addEventListener('storage', handleStorage);
    return () => {
      media?.removeEventListener?.('change', handleSystemChange);
      window.removeEventListener('storage', handleStorage);
    };
  }, [themePreference]);

  const setThemePreference = useCallback((nextPreference) => {
    const safePreference = safeThemePreference(nextPreference);
    setThemePreferenceState(safePreference);
    setResolvedTheme(setStoredThemePreference(safePreference));
  }, []);

  return { themePreference, resolvedTheme, setThemePreference };
}
