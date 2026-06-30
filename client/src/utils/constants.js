export const company = {
  name: 'Universal Systems',
  tagline: 'We care for the technology you depend on',
  address: 'Demo Service Center, Main Road, Sample City - 000000.',
  phones: ['Demo phone hidden'],
  landline: 'Demo landline hidden',
  email: 'demo@universalsystems.example',
  whatsapp: '',
  hours: 'Monday - Saturday, 9:00 AM - 8:00 PM'
};

export const serviceTypes = [
  'PC / Laptop Service',
  'Printer Service',
  'Toner Refilling',
  'CCTV Service',
  'Networking / AMC',
  'Solar / UPS / Inverter Service',
  'Software / Installation Project',
  'Other'
];

export const statuses = ['Pending', 'In Progress', 'Waiting for Parts', 'Completed', 'Delivered', 'Cancelled'];

export const pdfTypes = [
  { value: 'quotation', label: 'Quotation PDF' },
  { value: 'invoice', label: 'Invoice / Work Completion PDF' },
  { value: 'thank-you', label: 'Service Completed / Thank You PDF' }
];

function resolveApiUrl() {
  const configuredApiUrl = String(import.meta.env.VITE_API_URL || '').trim();
  if (configuredApiUrl) return configuredApiUrl;

  if (typeof window !== 'undefined') {
    const { protocol, hostname, origin, port } = window.location;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      if (port === '5050') return origin;
      return `${protocol}//${hostname}:5050`;
    }
    return origin;
  }

  return 'http://localhost:5050';
}

const normalizedApiUrl = resolveApiUrl().replace(/\/$/, '');

export const apiBase = normalizedApiUrl.endsWith('/api') ? normalizedApiUrl : `${normalizedApiUrl}/api`;
