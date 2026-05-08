import { useState } from 'react';
import { Mail, MapPin, MessageCircle, Phone, Send } from 'lucide-react';
import { company, serviceTypes } from '../utils/constants.js';
import { createContactRequest } from '../utils/publicApi.js';
import { useToast } from '../context/ToastContext.jsx';

const empty = { name: '', phone: '', serviceInterest: 'OS Installation', message: '' };

export default function Contact() {
  const [form, setForm] = useState(empty);
  const [loading, setLoading] = useState(false);
  const { push } = useToast();

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) {
      push('Name and phone are required', 'error');
      return;
    }
    setLoading(true);
    try {
      await createContactRequest(form);
      push('Contact request saved. Universal Systems will follow up.');
      setForm(empty);
    } catch (error) {
      push(error.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="section">
      <div className="container-page">
        <div className="mb-10 max-w-3xl">
          <p className="text-sm font-bold uppercase tracking-wide text-[var(--brand)]">Contact</p>
          <h1 className="mt-2 text-4xl font-black tracking-tight">Talk directly with Universal Systems.</h1>
          <p className="mt-4 text-base leading-7 muted">Call, WhatsApp, email, or send a request for repair and service support.</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="grid gap-4">
            <div className="surface p-5">
              <h2 className="mb-4 text-xl font-black">Store Details</h2>
              <div className="space-y-4 text-sm leading-6">
                <a className="flex gap-3 hover:text-[var(--brand-2)]" href={`tel:${company.phones[0].replace(/\s/g, '')}`}>
                  <Phone className="mt-1 h-4 w-4 shrink-0 text-[var(--brand)]" />
                  {company.phones.join(' / ')}
                </a>
                <p className="flex gap-3">
                  <Phone className="mt-1 h-4 w-4 shrink-0 text-[var(--brand)]" />
                  Landline: {company.landline}
                </p>
                <a className="flex gap-3 hover:text-[var(--brand-2)]" href={`mailto:${company.email}`}>
                  <Mail className="mt-1 h-4 w-4 shrink-0 text-[var(--brand)]" />
                  {company.email}
                </a>
                <p className="flex gap-3">
                  <MapPin className="mt-1 h-4 w-4 shrink-0 text-[var(--brand)]" />
                  {company.address}
                </p>
                <p>
                  <span className="font-bold">Working Hours:</span> {company.hours}
                </p>
              </div>
              <a href={`https://wa.me/${company.whatsapp}`} target="_blank" rel="noreferrer" className="btn btn-primary mt-5 w-full">
                <MessageCircle className="h-4 w-4" />
                WhatsApp
              </a>
            </div>

            <div className="surface overflow-hidden p-3">
              <div className="grid aspect-video place-items-center rounded-card bg-[var(--surface-2)] p-6 text-center">
                <div>
                  <MapPin className="mx-auto mb-3 h-9 w-9 text-[var(--brand)]" />
                  <p className="font-black">Mettur Dam, Salem Dt</p>
                  <p className="mt-1 text-sm muted">Map area for Universal Systems location</p>
                </div>
              </div>
            </div>
          </div>

          <form className="surface p-5 sm:p-6" onSubmit={submit}>
            <h2 className="text-2xl font-black">Contact Form</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label>
                <span className="label">Name</span>
                <input className="input" value={form.name} onChange={(event) => update('name', event.target.value)} />
              </label>
              <label>
                <span className="label">Phone</span>
                <input className="input" value={form.phone} onChange={(event) => update('phone', event.target.value)} />
              </label>
              <label>
                <span className="label">Service Interest</span>
                <select className="input" value={form.serviceInterest} onChange={(event) => update('serviceInterest', event.target.value)}>
                  {serviceTypes.map((service) => (
                    <option key={service}>{service}</option>
                  ))}
                </select>
              </label>
              <label className="sm:col-span-2">
                <span className="label">Message</span>
                <textarea className="input min-h-32" value={form.message} onChange={(event) => update('message', event.target.value)} />
              </label>
            </div>
            <button className="btn btn-primary mt-5" disabled={loading}>
              <Send className="h-4 w-4" />
              {loading ? 'Sending...' : 'Submit Request'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
