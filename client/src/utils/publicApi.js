import { apiBase } from './constants.js';

async function parse(response) {
  const resolvedResponse = await response;
  const data = await resolvedResponse.json().catch(() => ({}));
  if (!resolvedResponse.ok) throw new Error(data.message || 'Request failed');
  return data;
}

export function createBooking(formData) {
  return parse(
    fetch(`${apiBase}/public/bookings`, {
      method: 'POST',
      body: formData
    })
  );
}

export function createContactRequest(payload) {
  return parse(
    fetch(`${apiBase}/public/contact-requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
  );
}

export function createContactBooking(payload) {
  const serviceInterest = String(payload.serviceInterest || '').trim();
  const data = new FormData();
  data.append('customerName', String(payload.name || '').trim());
  data.append('phone', String(payload.phone || '').trim());
  data.append('serviceType', serviceInterest);
  data.append('device', serviceInterest || 'General Service Request');
  data.append('issue', String(payload.message || '').trim());
  data.append('bookingSource', 'Website');
  data.append('address', '');
  return createBooking(data);
}
