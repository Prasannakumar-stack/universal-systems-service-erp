import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Award,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Eye,
  Gem,
  HeartHandshake,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  PhoneCall,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
  Wrench
} from 'lucide-react';
import { company } from '../utils/constants.js';

const serviceFocus = [
  'OS installation & setup',
  'Laptop & desktop repair',
  'Printer & toner service',
  'Data recovery',
  'Software support',
  'Networking support',
  'General service booking',
  'On-site follow-up'
];

const principles = [
  { title: 'Mission', icon: Target, text: 'Provide reliable repair and service support with clear communication and fair billing.' },
  { title: 'Vision', icon: Eye, text: 'Be the trusted local service desk for computer and office technology needs in Mettur Dam.' },
  { title: 'Values', icon: Gem, text: 'Care, honesty, practical solutions, customer respect, and long-term service relationships.' }
];

const heroBadges = [
  { label: 'Local Service', icon: MapPin },
  { label: 'Clear Diagnosis', icon: ClipboardCheck },
  { label: 'Warranty Support', icon: ShieldCheck },
  { label: 'Fast Follow-up', icon: PhoneCall }
];

const servicePromise = [
  'We explain the issue clearly before service.',
  'We confirm the work before proceeding.',
  'We use practical solutions and reliable parts.',
  'We keep billing simple and transparent.',
  'We support customers after repair.'
];

const trustReasons = [
  { title: 'Clear communication', icon: MessageCircle },
  { title: 'No unnecessary service pressure', icon: ShieldCheck },
  { title: 'Technician confirmation before work', icon: ClipboardCheck },
  { title: 'Support after repair', icon: HeartHandshake },
  { title: 'Local follow-up', icon: Users }
];

const credibilityItems = [
  { title: 'Local support', icon: MapPin },
  { title: 'Experienced technicians', icon: Wrench },
  { title: 'Clear service records', icon: ClipboardCheck },
  { title: 'Customer-first process', icon: HeartHandshake }
];

function useAboutReveal() {
  useEffect(() => {
    const items = Array.from(document.querySelectorAll('.about-reveal'));
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

export default function About() {
  useAboutReveal();

  const phoneHref = useMemo(() => `tel:${company.phones[0].replace(/\s/g, '')}`, []);
  const whatsappHref = useMemo(() => `https://wa.me/${company.whatsapp}`, []);
  const landlineHref = useMemo(() => `tel:${company.landline.replace(/[^\d]/g, '')}`, []);

  return (
    <div className="about-page section">
      <div className="container-page about-page-container">
        <section className="about-premium-hero about-reveal page-hero hero-with-bg public-hero-card public-hero-glass">
          <img
            className="page-hero-bg-image"
            src="/About%20page%20image.png"
            alt="Universal Systems hero"
          />
          <div className="page-hero-overlay" aria-hidden="true" />
          <div className="about-hero-glow" aria-hidden="true" />
          <div className="page-hero-content about-hero-copy">
            <div className="about-eyebrow-chip">
              <Sparkles className="h-4 w-4" />
              About Universal Systems
            </div>
            <h1>Trusted local computer service in Mettur Dam.</h1>
            <p>
              Universal Systems helps homes, students, shops, and offices keep their devices running smoothly with reliable repair and support.
            </p>
            <div className="about-hero-badges" aria-label="Universal Systems trust highlights">
              {heroBadges.map((badge) => {
                const Icon = badge.icon;
                return (
                  <span className="about-hero-badge" key={badge.label}>
                    <Icon className="h-4 w-4" />
                    {badge.label}
                  </span>
                );
              })}
            </div>
            <div className="about-trust-pill">
              <CheckCircle2 className="h-4 w-4" />
              <span>Serving Mettur Dam, Salem Dt and nearby areas.</span>
            </div>
          </div>
        </section>

        <section className="about-promise-grid about-reveal">
          <div className="about-promise-panel">
            <p className="about-section-eyebrow">Our local service promise</p>
            <h2>Clear guidance before work starts.</h2>
            <p>
              We keep the service process practical, transparent, and easy to understand, whether the issue is a laptop repair, printer problem, data recovery request, or office support need.
            </p>
          </div>
          <div className="about-promise-list">
            {servicePromise.map((item) => (
              <div className="about-promise-row" key={item}>
                <CheckCircle2 className="h-4 w-4" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="about-section about-reveal">
          <div className="about-section-heading">
            <p className="about-section-eyebrow">Mission, Vision, Values</p>
            <h2>A service desk built on trust.</h2>
          </div>
          <div className="about-principles-grid">
            {principles.map((item) => {
              const Icon = item.icon;
              return (
                <article className="about-principle-card" key={item.title}>
                  <span className="about-icon-shell">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="about-credibility-strip about-reveal" aria-label="Universal Systems credibility">
          {credibilityItems.map((item) => {
            const Icon = item.icon;
            return (
              <div className="about-credibility-item" key={item.title}>
                <Icon className="h-4 w-4" />
                <span>{item.title}</span>
              </div>
            );
          })}
        </section>

        <section className="about-section about-reveal">
          <div className="about-section-heading">
            <p className="about-section-eyebrow">Why customers trust us</p>
            <h2>Support that respects your time and your device.</h2>
          </div>
          <div className="about-trust-grid">
            {trustReasons.map((item) => {
              const Icon = item.icon;
              return (
                <article className="about-trust-card" key={item.title}>
                  <Icon className="h-5 w-5" />
                  <h3>{item.title}</h3>
                </article>
              );
            })}
          </div>
        </section>

        <section className="about-main-grid about-reveal">
          <div className="about-info-panel">
            <p className="about-section-eyebrow">Service Focus</p>
            <h2>Practical support for daily technology.</h2>
            <div className="about-service-grid">
              {serviceFocus.map((item) => (
                <div className="about-service-row" key={item}>
                  <Wrench className="h-4 w-4" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="about-info-panel about-contact-panel">
            <p className="about-section-eyebrow">Contact Details</p>
            <h2>Reach the local team.</h2>
            <div className="about-contact-list">
              <p className="about-contact-row">
                <MapPin className="h-4 w-4" />
                <span>
                  <strong>Address</strong>
                  <small>{company.address}</small>
                </span>
              </p>
              <div className="about-contact-row">
                <Phone className="h-4 w-4" />
                <span>
                  <strong>Phone</strong>
                  <small className="about-inline-links">
                    {company.phones.map((phone, index) => (
                      <span key={phone}>
                        {index > 0 ? ' / ' : ''}
                        <a href={`tel:${phone.replace(/\s/g, '')}`}>{phone}</a>
                      </span>
                    ))}
                  </small>
                </span>
              </div>
              <a className="about-contact-row" href={landlineHref}>
                <Phone className="h-4 w-4" />
                <span>
                  <strong>Landline</strong>
                  <small>{company.landline}</small>
                </span>
              </a>
              <a className="about-contact-row" href={`mailto:${company.email}`}>
                <Mail className="h-4 w-4" />
                <span>
                  <strong>Email</strong>
                  <small>{company.email}</small>
                </span>
              </a>
            </div>

            <div className="about-whatsapp-highlight">
              <Users className="h-5 w-5" />
              <p>Local staff, direct follow-up, and practical service records.</p>
            </div>
            <a className="btn btn-secondary about-whatsapp-button" href={whatsappHref} target="_blank" rel="noreferrer">
              <MessageCircle className="h-4 w-4" />
              WhatsApp Support
            </a>
          </div>
        </section>

        <section className="about-care-card about-reveal">
          <Award className="h-7 w-7" />
          <div>
            <h2>We care for the technology you depend on</h2>
            <p>
              The promise reflects our role in keeping computers, printers, and office systems available for students, staff, businesses, and professionals who depend on working technology every day.
            </p>
          </div>
        </section>

        <section className="about-final-cta about-reveal">
          <div>
            <p className="about-section-eyebrow">
              <HeartHandshake className="h-4 w-4" />
              Service support
            </p>
            <h2>Ready to get your device checked?</h2>
            <p>Book a service or message us on WhatsApp. Our team will guide you clearly before any service starts.</p>
          </div>
          <div className="about-cta-actions">
            <Link className="btn btn-primary shine-button about-book-button" to="/book-service">
              <CalendarClock className="h-4 w-4" />
              Book Service
            </Link>
            <a className="btn btn-secondary about-whatsapp-action" href={whatsappHref} target="_blank" rel="noreferrer">
              <MessageCircle className="h-4 w-4" />
              WhatsApp Support
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}
