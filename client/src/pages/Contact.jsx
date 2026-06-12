import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowUpRight,
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
import { serviceTypes } from '../utils/constants.js';
import { usePublicWebsiteSettings } from '../context/PublicWebsiteSettingsContext.jsx';
import { BrandLogoStrip } from '../components/PublicBrandSupport.jsx';
import { createContactBooking, createContactRequest } from '../utils/publicApi.js';
import { phoneHref, publicAssetUrl, publicPageHeroImage, publicPhoneList, visiblePublicServices, whatsappHref } from '../utils/publicWebsiteDefaults.js';
import { useToast } from '../context/ToastContext.jsx';

const empty = { name: '', phone: '', serviceInterest: '', message: '' };

const trustBadges = [
  { label: 'Fast Response', icon: PhoneCall },
  { label: 'WhatsApp Support', icon: MessageCircle },
  { label: 'Local Service', icon: Store },
  { label: 'Clear Communication', icon: CheckCircle2 }
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

function phoneDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

function validateContactField(field, value) {
  if (field === 'name') {
    return value.trim() ? '' : 'Name is required.';
  }

  if (field === 'phone') {
    const digits = phoneDigits(value);
    if (!digits) return 'Phone is required.';
    if (digits.length !== 10) return 'Phone must be exactly 10 digits.';
    return '';
  }

  if (field === 'message') {
    return value.trim() ? '' : 'Message is required.';
  }

  return '';
}

export default function Contact() {
  const { settings, contact, booking } = usePublicWebsiteSettings();
  const [form, setForm] = useState(empty);
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const { push } = useToast();

  useContactReveal();

  const publicServices = useMemo(() => visiblePublicServices(settings).map((service) => service.title), [settings]);
  const contactServiceOptions = useMemo(() => {
    const base = publicServices.length ? publicServices : serviceTypes;
    return Array.from(new Set(base.filter(Boolean)));
  }, [publicServices]);
  const phones = publicPhoneList(contact);
  const primaryPhone = phones[0] || '';
  const contactPhoneHref = useMemo(() => phoneHref(primaryPhone), [primaryPhone]);
  const contactWhatsappHref = useMemo(() => whatsappHref(contact.whatsappNumber), [contact.whatsappNumber]);
  const googleMapsHref = contact.googleMapsLink || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(contact.address)}`;
  const areaItems = useMemo(() => [
    { label: 'Serving Mettur Dam, Salem Dt and nearby areas', icon: MapPin },
    { label: contact.businessHours, icon: Clock3 },
    { label: 'Emergency support available through WhatsApp', icon: LifeBuoy }
  ], [contact.businessHours]);
  const heroCardClass = settings.hero.glassmorphismAnimation === false ? 'public-hero-card public-hero-static' : 'public-hero-card public-hero-glass';

  const quickActions = [
    {
      title: 'Call Now',
      text: 'Tap to speak with our service team',
      href: contactPhoneHref,
      icon: PhoneCall,
      tone: 'cyan'
    },
    {
      title: 'WhatsApp Support',
      text: 'Message us for quick repair help',
      href: contactWhatsappHref,
      icon: MessageCircle,
      tone: 'green',
      external: true
    },
    {
      title: 'Book Service',
      text: 'Create a service request in simple steps',
      to: booking.publicBookingEnabled ? '/book-service' : '/contact',
      icon: CalendarClock,
      tone: 'blue'
    }
  ];

  function update(field, value) {
    const nextValue = field === 'phone' ? phoneDigits(value).slice(0, 10) : value;
    setSubmitError('');
    setForm((current) => ({ ...current, [field]: nextValue }));
    setFieldErrors((current) => {
      if (!current[field]) return current;
      return { ...current, [field]: validateContactField(field, nextValue) };
    });
  }

  function handleBlur(field) {
    setFieldErrors((current) => ({ ...current, [field]: validateContactField(field, form[field] || '') }));
  }

  function validateForm() {
    const nextErrors = {
      name: validateContactField('name', form.name),
      phone: validateContactField('phone', form.phone),
      message: validateContactField('message', form.message)
    };

    setFieldErrors(nextErrors);
    return nextErrors;
  }

  async function submit(event) {
    event.preventDefault();
    if (loading) return;
    const nextErrors = validateForm();
    const firstError = Object.values(nextErrors).find(Boolean);
    if (firstError) {
      push(firstError, 'error');
      return;
    }

    const digits = phoneDigits(form.phone);
    setSubmitError('');
    setLoading(true);
    try {
      if (booking.publicBookingEnabled) {
        await createContactBooking({ ...form, phone: digits });
      } else {
        await createContactRequest({ ...form, phone: digits });
      }
      push('Request sent successfully. Our team will contact you soon.');
      setForm(empty);
      setFieldErrors({});
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
        <section className={`contact-hero contact-reveal page-hero hero-with-bg ${heroCardClass}`}>
          <img
            className="page-hero-bg-image"
            src={publicAssetUrl(publicPageHeroImage('contact'))}
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
          <p className="contact-action-helper">Choose how you want to reach us</p>
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
                <ArrowUpRight className="contact-action-arrow h-4 w-4" />
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
                <a className="contact-detail-row" href={contactPhoneHref}>
                  <Phone className="h-4 w-4" />
                  <span>
                    <strong>Phone</strong>
                    <small>{contact.phoneNumber}</small>
                  </span>
                </a>
                <a className="contact-detail-row" href={`mailto:${contact.email}`}>
                  <Mail className="h-4 w-4" />
                  <span>
                    <strong>Email</strong>
                    <small>{contact.email}</small>
                  </span>
                </a>
                <p className="contact-detail-row">
                  <MapPin className="h-4 w-4" />
                  <span>
                    <strong>Address</strong>
                    <small>{contact.address}</small>
                  </span>
                </p>
                <p className="contact-detail-row">
                  <Clock3 className="h-4 w-4" />
                  <span>
                    <strong>Working Hours</strong>
                    <small>{contact.businessHours}</small>
                  </span>
                </p>
              </div>

              <a href={contactWhatsappHref} target="_blank" rel="noreferrer" className="btn btn-primary shine-button contact-full-action">
                <MessageCircle className="h-4 w-4" />
                WhatsApp
              </a>
            </section>

            <section className="contact-quick-response-card contact-reveal">
              <div className="contact-quick-response-icon">
                <Clock3 className="h-5 w-5" />
              </div>
              <div>
                <h2>Quick Response</h2>
                <p>We usually respond within 10-30 minutes during working hours.</p>
                <p>Serving Mettur Dam, Salem Dt and nearby areas.</p>
              </div>
            </section>

            <a
              className="contact-location-card contact-reveal"
              href={googleMapsHref}
              target="_blank"
              rel="noreferrer"
              aria-label="Open Universal Systems location in Google Maps"
            >
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
                <span className="contact-map-button">
                  Open Location in Google Maps
                  <ArrowUpRight className="h-4 w-4" />
                </span>
              </div>
            </a>
          </div>

          <form className="contact-form-card contact-reveal" onSubmit={submit} noValidate>
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
                  aria-describedby={fieldErrors.name ? 'contact-name-error' : undefined}
                  aria-invalid={fieldErrors.name ? 'true' : 'false'}
                  autoComplete="name"
                  value={form.name}
                  onChange={(event) => update('name', event.target.value)}
                  onBlur={() => handleBlur('name')}
                  placeholder="Enter your name"
                />
                {fieldErrors.name ? <p id="contact-name-error" className="contact-field-error">{fieldErrors.name}</p> : null}
              </div>
              <div className="contact-field">
                <label className="label" htmlFor="contact-phone">Phone</label>
                <input
                  id="contact-phone"
                  className="input"
                  aria-describedby={fieldErrors.phone ? 'contact-phone-error' : undefined}
                  aria-invalid={fieldErrors.phone ? 'true' : 'false'}
                  type="tel"
                  autoComplete="tel"
                  inputMode="numeric"
                  maxLength={10}
                  value={form.phone}
                  onChange={(event) => update('phone', event.target.value)}
                  onBlur={() => handleBlur('phone')}
                  placeholder="Phone or WhatsApp number"
                />
                {fieldErrors.phone ? <p id="contact-phone-error" className="contact-field-error">{fieldErrors.phone}</p> : null}
              </div>
              <div className="contact-field">
                <label className="label" htmlFor="contact-service-interest">Service Interest</label>
                <select
                  id="contact-service-interest"
                  className="input"
                  value={form.serviceInterest}
                  onChange={(event) => update('serviceInterest', event.target.value)}
                >
                  <option value="" disabled>
                    Select service interest
                  </option>
                  {contactServiceOptions.map((service) => (
                    <option key={service} value={service}>{service}</option>
                  ))}
                </select>
              </div>
              <div className="contact-field sm:col-span-2">
                <label className="label" htmlFor="contact-message">Message</label>
                <textarea
                  id="contact-message"
                  className="input min-h-32"
                  aria-describedby={fieldErrors.message ? 'contact-message-error' : undefined}
                  aria-invalid={fieldErrors.message ? 'true' : 'false'}
                  value={form.message}
                  onChange={(event) => update('message', event.target.value)}
                  onBlur={() => handleBlur('message')}
                  placeholder="Tell us what support you need"
                />
                {fieldErrors.message ? <p id="contact-message-error" className="contact-field-error">{fieldErrors.message}</p> : null}
              </div>
            </div>

            {submitError ? (
              <div className="contact-error-panel" role="alert">
                <AlertTriangle className="h-5 w-5" />
                <div>
                  <strong>Request needs attention</strong>
                  <p>{submitError}</p>
                </div>
                <a className="btn btn-secondary contact-error-whatsapp" href={contactWhatsappHref} target="_blank" rel="noreferrer">
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp
                </a>
              </div>
            ) : null}

            <button className="btn btn-primary shine-button contact-submit-button" disabled={loading} aria-busy={loading}>
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

        <BrandLogoStrip
          className="contact-brand-support contact-reveal"
          size="medium"
          heading="Brands We Service & Support"
          subtitle="Trusted service support for leading computer, printer and security brands."
        />

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
            <a className="btn btn-secondary contact-whatsapp-action" href={contactWhatsappHref} target="_blank" rel="noreferrer">
              <MessageCircle className="h-4 w-4" />
              WhatsApp Now
            </a>
            <a className="btn btn-secondary contact-call-action" href={contactPhoneHref}>
              <PhoneCall className="h-4 w-4" />
              Call Now
            </a>
            {booking.publicBookingEnabled ? (
              <Link className="btn btn-primary shine-button contact-book-action" to="/book-service">
                <CalendarClock className="h-4 w-4" />
                {booking.bookingButtonText}
              </Link>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
