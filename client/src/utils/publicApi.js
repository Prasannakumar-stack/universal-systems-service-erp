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
