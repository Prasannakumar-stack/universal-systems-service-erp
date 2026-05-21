import { clean } from './http.js';

function unique(values = []) {
  return [...new Set(values.filter(Boolean))];
}

export function phoneDigits(value = '') {
  return String(value || '').replace(/\D/g, '');
}

export function normalizePhoneInput(value = '') {
  const raw = clean(value);
  if (!raw) return '';
  const hasPlus = raw.startsWith('+');
  const digits = phoneDigits(raw);
  if (!digits) return '';
  return hasPlus ? `+${digits}` : digits;
}

export function phoneLookupValues(value = '') {
  const raw = clean(value);
  const normalized = normalizePhoneInput(raw);
  const digits = phoneDigits(raw);
  const noLeadingZero = digits.length === 11 && digits.startsWith('0') ? digits.slice(1) : '';
  const local = digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : '';
  const withCountry = digits.length === 10 ? `91${digits}` : '';
  const zeroPrefixedCountry = noLeadingZero ? `91${noLeadingZero}` : '';
  return unique([raw, normalized, digits, noLeadingZero, local, withCountry, zeroPrefixedCountry]);
}
