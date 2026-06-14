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

export function getPublicWebsiteSettings() {
  return parse(fetch(`${apiBase}/public/website-settings`));
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
  return parse(
    fetch(`${apiBase}/public/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: String(payload.name || '').trim(),
        phone: String(payload.phone || '').trim(),
        serviceType: serviceInterest,
        device: serviceInterest || 'General Service Enquiry',
        issue: String(payload.message || '').trim(),
        bookingSource: 'Contact Form',
        status: 'New Enquiry',
        address: ''
      })
    })
  );
}
