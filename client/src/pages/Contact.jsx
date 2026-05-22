import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Clock3,
  LifeBuoy,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  PhoneCall,
  Send,
  ShieldCheck,
  Sparkles,
  Store
} from 'lucide-react';
import { company, serviceTypes } from '../utils/constants.js';
import { createContactRequest } from '../utils/publicApi.js';
import { useToast } from '../context/ToastContext.jsx';

const empty = { name: '', phone: '', serviceInterest: 'OS Installation', message: '' };
const contactServiceOptions = serviceTypes.includes(empty.serviceInterest) ? serviceTypes : [empty.serviceInterest, ...serviceTypes];

const trustBadges = [
  { label: 'Fast Response', icon: PhoneCall },
  { label: 'WhatsApp Support', icon: MessageCircle },
  { label: 'Local Service', icon: Store },
  { label: 'Clear Communication', icon: CheckCircle2 }
];

const areaItems = [
  { label: 'Serving Mettur Dam, Salem Dt and nearby areas', icon: MapPin },
  { label: company.hours, icon: Clock3 },
  { label: 'Emergency support available through WhatsApp', icon: LifeBuoy }
];

function useContactReveal() {
  useEffect(() => {
    const items = Array.from(document.querySelectorAll('.contact-reveal'));
    if (!items.length) return undefined;

    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced || !('IntersectionObserver' in window)) {
      items.forEach((item) => item.classList.add('is-visible'));
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.14, rootMargin: '0px 0px -8% 0px' }
    );

    items.forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, []);
}

function getContactErrorMessage(error) {
  const message = error?.message?.trim() || '';
  const normalized = message.toLowerCase();

  if (
    normalized.includes('failed to fetch') ||
    normalized.includes('networkerror') ||
    normalized.includes('load failed') ||
    normalized.includes('network request failed') ||
    !message ||
    normalized === 'request failed' ||
    normalized.includes('internal server') ||
    normalized.includes('server unavailable')
  ) {
    return 'Request could not be submitted. Please contact us on WhatsApp for urgent support.';
  }

  return message;
}

export default function Contact() {
  const [form, setForm] = useState(empty);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const { push } = useToast();

  useContactReveal();

  const primaryPhone = company.phones[0];
  const phoneHref = useMemo(() => `tel:${primaryPhone.replace(/\s/g, '')}`, [primaryPhone]);
  const whatsappHref = useMemo(() => `https://wa.me/${company.whatsapp}`, []);
  const landlineHref = useMemo(() => `tel:${company.landline.replace(/[^\d]/g, '')}`, []);

  const quickActions = [
    {
      title: 'Call Now',
      text: 'Speak directly with our service team.',
      href: phoneHref,
      icon: PhoneCall,
      tone: 'cyan'
    },
    {
      title: 'WhatsApp Support',
      text: 'Share your issue and get a faster response.',
      href: whatsappHref,
      icon: MessageCircle,
      tone: 'green',
      external: true
    },
    {
      title: 'Book Service',
      text: 'Start a structured service request.',
      to: '/book-service',
      icon: CalendarClock,
      tone: 'blue'
    }
  ];

  function update(field, value) {
    setSubmitError('');
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    if (loading) return;
    if (!form.name.trim() || !form.phone.trim()) {
      push('Name and phone are required', 'error');
      return;
    }
    setSubmitError('');
    setLoading(true);
    try {
      await createContactRequest(form);
      push('Request submitted successfully. Our team will contact you shortly.');
      setForm(empty);
    } catch (error) {
      console.error('Contact request submit failed', error);
      const friendlyMessage = getContactErrorMessage(error);
      setSubmitError(friendlyMessage);
      push(friendlyMessage, 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="contact-page section">
      <div className="container-page contact-container">
        <section className="contact-hero contact-reveal page-hero hero-with-bg">
          <img
            className="page-hero-bg-image"
            src="/Contact%20Page%20image.png"
            alt="Universal Systems hero"
          />
          <div className="page-hero-overlay" aria-hidden="true" />
          <div className="contact-hero-glow" aria-hidden="true" />
          <div className="page-hero-content contact-hero-content">
            <div className="contact-eyebrow-chip">
              <Sparkles className="h-4 w-4" />
              Contact
            </div>
            <h1>Talk directly with Universal Systems.</h1>
            <p>Call, WhatsApp, email, or send a request for repair and service support.</p>
            <div className="contact-trust-badges" aria-label="Contact trust highlights">
              {trustBadges.map((badge) => {
                const Icon = badge.icon;
                return (
                  <span className="contact-trust-badge" key={badge.label}>
                    <Icon className="h-4 w-4" />
                    {badge.label}
                  </span>
                );
              })}
            </div>
            <div className="contact-trust-pill">
              <ShieldCheck className="h-4 w-4" />
              <span>For urgent service, WhatsApp or call us directly.</span>
            </div>
          </div>
        </section>

        <section className="contact-action-grid contact-reveal" aria-label="Quick contact actions">
          {quickActions.map((action) => {
            const Icon = action.icon;
            const content = (
              <>
                <span className="contact-action-icon">
                  <Icon className="h-5 w-5" />
                </span>
                <span>
                  <strong>{action.title}</strong>
                  <small>{action.text}</small>
                </span>
              </>
            );

            return action.to ? (
              <Link className={`contact-action-card contact-action-${action.tone}`} key={action.title} to={action.to}>
                {content}
              </Link>
            ) : (
              <a
                className={`contact-action-card contact-action-${action.tone}`}
                key={action.title}
                href={action.href}
                target={action.external ? '_blank' : undefined}
                rel={action.external ? 'noreferrer' : undefined}
              >
                {content}
              </a>
            );
          })}
        </section>

        <div className="contact-main-grid">
          <div className="contact-left-column">
            <section className="contact-details-card contact-reveal">
              <div className="contact-card-heading">
                <span className="contact-icon-shell">
                  <Store className="h-5 w-5" />
                </span>
                <div>
                  <h2>Store Details</h2>
                  <p>Reach us through call, WhatsApp, email, or visit coordination.</p>
                </div>
              </div>

              <div className="contact-detail-list">
                <a className="contact-detail-row" href={phoneHref}>
                  <Phone className="h-4 w-4" />
                  <span>
                    <strong>Phone</strong>
                    <small>{company.phones.join(' / ')}</small>
                  </span>
                </a>
                <a className="contact-detail-row" href={landlineHref}>
                  <Phone className="h-4 w-4" />
                  <span>
                    <strong>Landline</strong>
                    <small>{company.landline}</small>
                  </span>
                </a>
                <a className="contact-detail-row" href={`mailto:${company.email}`}>
                  <Mail className="h-4 w-4" />
                  <span>
                    <strong>Email</strong>
                    <small>{company.email}</small>
                  </span>
                </a>
                <p className="contact-detail-row">
                  <MapPin className="h-4 w-4" />
                  <span>
                    <strong>Address</strong>
                    <small>{company.address}</small>
                  </span>
                </p>
                <p className="contact-detail-row">
                  <Clock3 className="h-4 w-4" />
                  <span>
                    <strong>Working Hours</strong>
                    <small>{company.hours}</small>
                  </span>
                </p>
              </div>

              <a href={whatsappHref} target="_blank" rel="noreferrer" className="btn btn-primary shine-button contact-full-action">
                <MessageCircle className="h-4 w-4" />
                WhatsApp
              </a>
            </section>

            <section className="contact-location-card contact-reveal">
              <div className="contact-location-visual" aria-hidden="true">
                <div className="contact-map-grid" />
                <div className="contact-map-pin">
                  <MapPin className="h-6 w-6" />
                </div>
              </div>
              <div className="contact-location-copy">
                <p className="contact-section-eyebrow">Universal Systems service area</p>
                <h2>Mettur Dam, Salem Dt</h2>
                <p>Serving homes, shops, offices, students, and local businesses.</p>
              </div>
            </section>
          </div>

          <form className="contact-form-card contact-reveal" onSubmit={submit}>
            <div className="contact-card-heading">
              <span className="contact-icon-shell">
                <Send className="h-5 w-5" />
              </span>
              <div>
                <h2>Contact Form</h2>
                <p>Share your issue. Our team will contact you shortly.</p>
              </div>
            </div>

            <div className="contact-form-grid">
              <div className="contact-field">
                <label className="label" htmlFor="contact-name">Name</label>
                <input
                  id="contact-name"
                  className="input"
                  autoComplete="name"
                  value={form.name}
                  onChange={(event) => update('name', event.target.value)}
                  placeholder="Enter your name"
                />
              </div>
              <div className="contact-field">
                <label className="label" htmlFor="contact-phone">Phone</label>
                <input
                  id="contact-phone"
                  className="input"
                  type="tel"
                  autoComplete="tel"
                  value={form.phone}
                  onChange={(event) => update('phone', event.target.value)}
                  placeholder="Phone or WhatsApp number"
                />
              </div>
              <div className="contact-field">
                <label className="label" htmlFor="contact-service-interest">Service Interest</label>
                <select
                  id="contact-service-interest"
                  className="input"
                  value={form.serviceInterest}
                  onChange={(event) => update('serviceInterest', event.target.value)}
                >
                  {contactServiceOptions.map((service) => (
                    <option key={service}>{service}</option>
                  ))}
                </select>
              </div>
              <div className="contact-field sm:col-span-2">
                <label className="label" htmlFor="contact-message">Message</label>
                <textarea
                  id="contact-message"
                  className="input min-h-32"
                  value={form.message}
                  onChange={(event) => update('message', event.target.value)}
                  placeholder="Tell us what support you need"
                />
              </div>
            </div>

            {submitError ? (
              <div className="contact-error-panel" role="alert">
                <AlertTriangle className="h-5 w-5" />
                <div>
                  <strong>Request needs attention</strong>
                  <p>{submitError}</p>
                </div>
                <a className="btn btn-secondary contact-error-whatsapp" href={whatsappHref} target="_blank" rel="noreferrer">
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp
                </a>
              </div>
            ) : null}

            <button className="btn btn-primary shine-button contact-submit-button" disabled={loading}>
              <Send className="h-4 w-4" />
              {loading ? 'Sending...' : 'Submit Request'}
            </button>
          </form>
        </div>

        <section className="contact-availability-strip contact-reveal">
          {areaItems.map((item) => {
            const Icon = item.icon;
            return (
              <div className="contact-availability-item" key={item.label}>
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </div>
            );
          })}
        </section>

        <section className="contact-urgent-cta contact-reveal">
          <div>
            <p className="contact-section-eyebrow">
              <LifeBuoy className="h-4 w-4" />
              Urgent support
            </p>
            <h2>Need urgent repair support?</h2>
            <p>Call or WhatsApp us directly for faster response.</p>
          </div>
          <div className="contact-cta-actions">
            <a className="btn btn-secondary contact-whatsapp-action" href={whatsappHref} target="_blank" rel="noreferrer">
              <MessageCircle className="h-4 w-4" />
              WhatsApp Now
            </a>
            <a className="btn btn-secondary contact-call-action" href={phoneHref}>
              <PhoneCall className="h-4 w-4" />
              Call Now
            </a>
            <Link className="btn btn-primary shine-button contact-book-action" to="/book-service">
              <CalendarClock className="h-4 w-4" />
              Book Service
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
