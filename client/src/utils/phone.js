export function phoneDigits(value = '') {
  return String(value || '').replace(/\D/g, '');
}

export function phoneForTel(value = '') {
  const raw = String(value || '').trim();
  const hasPlus = raw.startsWith('+');
  const digits = phoneDigits(raw);
  if (!digits) return '';
  return hasPlus ? `+${digits}` : digits;
}

export function phoneForWhatsapp(value = '') {
  let digits = phoneDigits(value);
  if (!digits) return '';
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) digits = `91${digits.slice(1)}`;
  if (digits.length === 10) return `91${digits}`;
  return digits.startsWith('91') ? digits : digits;
}

export function telHref(value = '') {
  const phone = phoneForTel(value);
  return phone ? `tel:${phone}` : '#';
}

export function whatsappHref(value = '', message = '') {
  const phone = phoneForWhatsapp(value);
  if (!phone) return '#';
  const suffix = message ? `?text=${encodeURIComponent(message)}` : '';
  return `https://wa.me/${phone}${suffix}`;
}
