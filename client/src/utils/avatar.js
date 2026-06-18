import { apiBase } from './constants.js';

function resolveAssetBase() {
  const normalizedApiBase = String(apiBase || '').replace(/\/$/, '');
  if (/^https?:\/\//i.test(normalizedApiBase)) {
    return normalizedApiBase.replace(/\/api\/?$/, '');
  }

  if (typeof window !== 'undefined') {
    const { protocol, hostname, origin, port } = window.location;
    if ((hostname === 'localhost' || hostname === '127.0.0.1') && port && port !== '5050') {
      return `${protocol}//${hostname}:5050`;
    }
    return origin;
  }

  return 'http://localhost:5050';
}

const assetBase = resolveAssetBase();

export function resolveAvatarUrl(value = '') {
  const normalized = String(value || '').trim();
  if (!normalized) return '';
  if (/^(https?:\/\/|blob:|data:)/i.test(normalized)) return normalized;
  return `${assetBase}${normalized.startsWith('/') ? normalized : `/${normalized}`}`;
}

export function resolveUserAvatarUrl(user = null) {
  const candidate = user?.avatarUrl
    || user?.photoUrl
    || user?.profilePhoto
    || user?.avatar
    || '';
  const resolved = resolveAvatarUrl(candidate);
  const version = String(user?.avatarUpdatedAt || user?.updatedAt || '').trim();
  if (!resolved || !version || /^(blob:|data:)/i.test(resolved)) return resolved;
  return `${resolved}${resolved.includes('?') ? '&' : '?'}v=${encodeURIComponent(version)}`;
}

export function userInitials(user = null, fallback = 'A') {
  const source = String(user?.name || user?.username || fallback).trim();
  if (!source) return fallback.toUpperCase();

  const words = source.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return `${words[0]?.[0] || ''}${words[1]?.[0] || ''}`.toUpperCase();
  }

  const compact = source.replace(/[^a-z0-9]/gi, '');
  if (!compact) return fallback.toUpperCase();
  return compact.slice(0, compact.length > 1 ? 2 : 1).toUpperCase();
}
