import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  ClipboardCheck,
  CreditCard,
  MessageCircle,
  SearchCheck,
  ShieldCheck,
  Sparkles,
  UserCog,
  Wrench
} from 'lucide-react';
import { usePublicWebsiteSettings } from '../context/PublicWebsiteSettingsContext.jsx';
import { ServiceBrandChips } from '../components/PublicBrandSupport.jsx';
import { publicAssetUrl, visiblePublicServices, whatsappHref } from '../utils/publicWebsiteDefaults.js';

const categoryChips = [
  'All Services',
  'Computer & Laptop',
  'CCTV & Networking',
  'Printer & Office',
  'Power & UPS',
  'Support & Recovery'
];

const categoryDisplayLabels = {
  'Power & UPS': 'Solar & UPS'
};

const services = [
  {
    title: 'OS Installation & Setup',
    text: 'Windows setup, drivers, updates, essential software, and clean configuration.',
    image: '/images/service-os-installation.png',
    fallbackImage: '/images/service-laptop.png',
    categories: ['Computer & Laptop', 'Support & Recovery']
  },
  {
    title: 'Laptop Repair',
    text: 'Screen, keyboard, charging, heating, slow performance, and upgrade support.',
    image: '/images/service-laptop-repair.png',
    categories: ['Computer & Laptop']
  },
  {
    title: 'Desktop Repair',
    text: 'Boot issues, SMPS, RAM, SSD, motherboard checks, cleaning, and tune-ups.',
    image: '/images/service-desktop.png',
    categories: ['Computer & Laptop']
  },
  {
    title: 'Printer Service / Toner Refilling',
    text: 'Printer repair, cartridge support, toner refilling, and print quality fixes.',
    image: '/images/service-printer.png',
    categories: ['Printer & Office']
  },
  {
    title: 'CCTV Installation & Maintenance',
    text: 'Secondary support for camera setup, DVR checks, and maintenance.',
    image: '/images/service-cctv.png',
    categories: ['CCTV & Networking']
  },
  {
    title: 'Networking Support',
    text: 'Router, LAN, sharing, Wi-Fi, and small office connectivity support.',
    image: '/images/service-router.png',
    categories: ['CCTV & Networking']
  },
  {
    title: 'Computer Sales & Service',
    text: 'New and refurbished computer sales, setup, upgrades, and service support.',
    image: '/images/service-computer-sales.png',
    categories: ['Computer & Laptop']
  },
  {
    title: 'UPS Battery Sales & Replacement',
    text: 'UPS battery sales, replacement, backup checks, and device connectivity support.',
    image: '/images/service-ups-battery.png',
    categories: ['Power & UPS']
  },
  {
    title: 'Solar UPS & Inverter Sales & Service',
    text: 'Solar UPS, inverter, and battery solutions for homes, shops, and businesses.',
    image: '/images/service-solar-ups-inverter.png',
    categories: ['Power & UPS']
  },
  {
    title: 'AMC / On-site Support',
    text: 'Maintenance visits and support planning for shops and offices.',
    image: '/images/service-amc-onsite.png',
    categories: ['Printer & Office', 'Support & Recovery']
  },
  {
    title: 'Software Support',
    text: 'Virus cleanup, app errors, driver issues, office software, and system optimization.',
    image: '/images/service-software-support.png',
    categories: ['Support & Recovery']
  },
  {
    title: 'Data Recovery',
    text: 'Recovery support for deleted files, corrupted drives, and damaged storage.',
    image: '/images/service-data-recovery.png',
    categories: ['Support & Recovery']
  }
];

const trustBadges = [
  { label: 'Expert Technicians', icon: UserCog },
  { label: 'Genuine Parts', icon: ShieldCheck },
  { label: 'Reliable Support', icon: CheckCircle2 }
];

const bookingSteps = [
  { title: 'Choose Service', text: 'Select the service you need', icon: BookOpenCheck },
  { title: 'Share Issue', text: 'Tell us the issue or requirement', icon: ClipboardCheck },
  { title: 'Get Diagnosis', text: 'We inspect and provide the best solution', icon: SearchCheck },
  { title: 'Confirm & Pay', text: 'Confirm the service and pay after completion', icon: CreditCard }
];

function useServicesReveal(dependency) {
  useEffect(() => {
    const items = Array.from(document.querySelectorAll('.services-reveal'));
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
      { rootMargin: '0px 0px -70px 0px', threshold: 0.12 }
    );

    items.forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, [dependency]);
}

export default function Services() {
  const [activeCategory, setActiveCategory] = useState('All Services');
  const { settings, contact, booking } = usePublicWebsiteSettings();
  const servicesFromSettings = useMemo(() => visiblePublicServices(settings), [settings]);
  const categories = useMemo(() => {
    const unique = new Set(['All Services']);
    servicesFromSettings.forEach((service) => (service.categories || []).forEach((category) => unique.add(category)));
    return Array.from(unique);
  }, [servicesFromSettings]);

  useEffect(() => {
    if (!categories.includes(activeCategory)) setActiveCategory('All Services');
  }, [activeCategory, categories]);

  useServicesReveal(activeCategory);

  const visibleServices = useMemo(() => {
    if (activeCategory === 'All Services') return servicesFromSettings;
    return servicesFromSettings.filter((service) => (service.categories || []).includes(activeCategory));
  }, [activeCategory, servicesFromSettings]);

  const contactWhatsappHref = useMemo(() => whatsappHref(contact.whatsappNumber), [contact.whatsappNumber]);
  const heroCardClass = settings.hero.glassmorphismAnimation === false ? 'public-hero-card public-hero-static' : 'public-hero-card public-hero-glass';

  return (
    <div className="services-page section">
      <div className="container-page">
        <section className={`services-page-hero services-reveal page-hero hero-with-bg ${heroCardClass}`}>
          <img
            className="page-hero-bg-image"
            src={publicAssetUrl(settings.hero.imageUrl || '/Service%20page%20image.png')}
            alt="Universal Systems hero"
          />
          <div className="page-hero-overlay" aria-hidden="true" />
          <div className="page-hero-content services-page-header">
            <div className="services-page-eyebrow-chip">
              <Sparkles className="h-4 w-4" />
              Services
            </div>
            <h1>Our Professional IT Services</h1>
            <p>
              Choose the support you need. Every card leads into the booking flow, so your request is simple and direct.
            </p>
            <div className="services-hero-badges" aria-label="Universal Systems service trust badges">
              {trustBadges.map(({ label, icon: Icon }) => (
                <span key={label} className="services-trust-badge">
                  <Icon className="h-4 w-4" />
                  {label}
                </span>
              ))}
            </div>
            <div className="services-trust-pill">
              <CheckCircle2 className="h-4 w-4" />
              <span>No upfront payment required. Pay only after service confirmation.</span>
            </div>
          </div>
        </section>

        <section className="services-control-panel services-reveal" aria-label="Service categories">
          <div className="services-category-chips" role="list">
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                className={`services-category-chip ${activeCategory === category ? 'is-active' : ''}`}
                onClick={() => setActiveCategory(category)}
                aria-pressed={activeCategory === category}
              >
                {categoryDisplayLabels[category] || category}
              </button>
            ))}
          </div>
        </section>

        <div className="services-showcase-grid grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visibleServices.map((service, index) => {
            const imageUrl = publicAssetUrl(service.imageUrl || service.image);
            const fallbackImage = publicAssetUrl(service.fallbackImage || '');
            const resolvedImageLayers = fallbackImage ? `url("${imageUrl}"), url("${fallbackImage}")` : `url("${imageUrl}")`;
            return (
              <article
                key={service.title}
                className="services-showcase-card public-service-card services-reveal"
                style={{
                  '--service-card-image': resolvedImageLayers,
                  '--reveal-delay': `${Math.min(index, 8) * 55}ms`
                }}
              >
                <div className="services-card-light" aria-hidden="true" />
                <div className="services-card-visual" aria-hidden="true" />
                <div className="services-card-copy">
                  <h2 className="text-xl font-black">{service.title}</h2>
                  <p className="mt-2 text-sm leading-6 muted">{service.description || service.text}</p>
                  <ServiceBrandChips serviceTitle={service.title} />
                  <Link to={booking.publicBookingEnabled ? `/book-service?service=${encodeURIComponent(service.title)}` : '/contact'} className="services-book-button mt-5">
                    {booking.publicBookingEnabled ? 'Book Now' : 'Contact Now'} <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>

        <section className="services-booking-strip services-reveal" aria-label="How booking works">
          <div className="services-strip-heading">
            <p className="services-page-eyebrow">How booking works</p>
            <h2>Simple service booking, clear handover</h2>
          </div>
          <div className="services-process-grid">
            {bookingSteps.map(({ title, text, icon: Icon }, index) => (
              <div className="services-process-step" key={title}>
                <div className="services-process-icon">
                  <Icon className="h-5 w-5" />
                </div>
                <span className="services-process-index">0{index + 1}</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="services-help-cta services-reveal">
          <div>
            <p className="services-page-eyebrow">Need help choosing?</p>
            <h2>Not sure which service you need?</h2>
            <p>Tell us the issue — our team will guide you to the right solution.</p>
          </div>
          <div className="services-help-actions">
            <a href={contactWhatsappHref} target="_blank" rel="noreferrer" className="services-whatsapp-button">
              <MessageCircle className="h-5 w-5" />
              WhatsApp Now
            </a>
            {booking.publicBookingEnabled ? (
              <Link to="/book-service" className="btn btn-primary btn-xl shine-button">
                <Wrench className="h-5 w-5" />
                {booking.bookingButtonText}
                <ArrowRight className="btn-arrow h-5 w-5" />
              </Link>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
