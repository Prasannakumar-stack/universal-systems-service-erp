import { useMemo, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  ArrowRight,
  BadgeCheck,
  Clock3,
  CreditCard,
  Mail,
  MapPin,
  Menu,
  MessageCircle,
  Phone,
  Search,
  Wrench,
  X
} from 'lucide-react';
import { PublicWebsiteSettingsProvider, usePublicWebsiteSettings } from '../context/PublicWebsiteSettingsContext.jsx';
import { phoneHref, publicAssetUrl, publicPhoneList, whatsappHref } from '../utils/publicWebsiteDefaults.js';

const baseLinks = [
  { to: '/', label: 'Home' },
  { to: '/about', label: 'About' },
  { to: '/services', label: 'Services' },
  { to: '/contact', label: 'Contact' },
  { to: '/book-service', label: 'Book Service', booking: true }
];

const footerHighlights = [
  { label: 'Same-day Support', Icon: Clock3 },
  { label: 'AMC Available', Icon: BadgeCheck },
  { label: 'WhatsApp Updates', Icon: MessageCircle },
  { label: 'Clear Diagnosis', Icon: Search },
  { label: 'Pay After Confirmation', Icon: CreditCard }
];

const footerServiceLinks = [
  'OS Installation & Setup',
  'Laptop Repair',
  'Desktop Repair',
  'Printer Service / Toner Refilling',
  'CCTV Installation & Maintenance',
  'Networking Support'
];

function NavItems({ onClick, links }) {
  return (
    <>
      {links.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          onClick={onClick}
          className={({ isActive }) => `public-nav-link ${isActive ? 'is-active' : ''}`}
        >
          {link.label}
        </NavLink>
      ))}
    </>
  );
}

function WhatsAppIcon(props) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" fill="currentColor" {...props}>
      <path d="M16.04 4.5c-6.2 0-11.25 4.86-11.25 10.84 0 2.05.6 4.05 1.75 5.78L4.5 27.5l6.72-1.98a11.7 11.7 0 0 0 4.82.99c6.2 0 11.25-4.86 11.25-10.84S22.24 4.5 16.04 4.5Zm0 20.04c-1.56 0-3.08-.38-4.42-1.1l-.46-.25-3.88 1.14 1.18-3.66-.3-.48a8.7 8.7 0 0 1-1.39-4.84c0-4.9 4.15-8.87 9.27-8.87s9.27 3.97 9.27 8.87-4.16 9.19-9.27 9.19Zm5.08-6.7c-.28-.13-1.65-.79-1.9-.88-.26-.09-.45-.14-.64.14-.19.27-.73.88-.9 1.06-.16.18-.33.2-.61.07-.28-.14-1.18-.42-2.25-1.34-.83-.74-1.39-1.64-1.55-1.92-.16-.27-.02-.42.12-.56.13-.12.28-.32.42-.48.14-.16.19-.27.28-.45.09-.18.05-.34-.02-.48-.07-.14-.64-1.5-.88-2.05-.23-.54-.47-.46-.64-.47h-.55c-.19 0-.49.07-.75.34-.26.27-.98.93-.98 2.28 0 1.34 1 2.64 1.14 2.82.14.18 1.97 2.91 4.77 4.08.67.28 1.19.45 1.59.57.67.2 1.28.17 1.77.1.54-.08 1.65-.65 1.88-1.28.23-.63.23-1.17.16-1.28-.07-.12-.25-.18-.53-.32Z" />
    </svg>
  );
}

function PublicNavbarLogo({ branding }) {
  const logoUrl = branding?.useCompanyLogo === false ? '' : publicAssetUrl(branding?.logoUrl || '/logo-icon.png');
  return (
    <span className="public-navbar-brand" aria-hidden="true">
      <span className="public-navbar-icon-crop">
        {logoUrl ? (
          <img src={logoUrl} alt="" className="public-navbar-logo-icon" />
        ) : (
          <Wrench className="h-6 w-6 text-white" />
        )}
      </span>
      <span className="public-navbar-logo-text">
        <span>Universal</span>
        <span>Systems</span>
      </span>
    </span>
  );
}

function PublicHeaderLogo() {
  return (
    <span className="public-header-wordmark" aria-hidden="true">
      <img src="/logo-full.png" alt="" className="public-header-wordmark-image" draggable="false" />
    </span>
  );
}

function PublicMaintenancePage({ settings }) {
  const contact = settings.contact || {};
  const phones = publicPhoneList(contact);
  const primaryPhone = phones[0] || '';
  return (
    <div className="public-maintenance-page min-h-screen">
      <div className="container-page grid min-h-screen place-items-center py-16">
        <section className="public-maintenance-card">
          <div className="public-maintenance-icon">
            <Wrench className="h-8 w-8" />
          </div>
          <p className="premium-eyebrow">Universal Systems</p>
          <h1>Public website is temporarily unavailable</h1>
          <p>{settings.status?.maintenanceMessage || 'We are updating our public website. Please contact us by phone or WhatsApp for urgent service.'}</p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            {primaryPhone ? (
              <a className="btn btn-primary btn-xl" href={phoneHref(primaryPhone)}>
                <Phone className="h-4 w-4" />
                Call Now
              </a>
            ) : null}
            {contact.whatsappNumber ? (
              <a className="btn btn-secondary btn-xl" href={whatsappHref(contact.whatsappNumber)} target="_blank" rel="noreferrer">
                <MessageCircle className="h-4 w-4" />
                WhatsApp
              </a>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}

function PublicLayoutShell() {
  const [open, setOpen] = useState(false);
  const { settings, contact, booking, branding } = usePublicWebsiteSettings();
  const links = useMemo(
    () => baseLinks.filter((link) => !link.booking || booking.publicBookingEnabled),
    [booking.publicBookingEnabled]
  );
  const phones = publicPhoneList(contact);
  const primaryPhone = phones[0] || '';
  const accentColor = branding?.accentColor || '#75c4ff';

  if (!settings.status?.websiteEnabled || settings.status?.maintenanceMode) {
    return (
      <div className="public-site-shell" style={{ '--public-accent': accentColor, '--brand': accentColor, '--brand-2': accentColor }}>
        <PublicMaintenancePage settings={settings} />
      </div>
    );
  }

  return (
    <div className="public-site-shell min-h-screen" style={{ '--public-accent': accentColor, '--brand': accentColor, '--brand-2': accentColor }}>
      <header className="public-header sticky top-0 z-50 border-b border-[var(--line)] backdrop-blur-xl">
        <div className="container-page flex h-18 items-center justify-between py-3">
          <NavLink to="/" className="public-header-logo-link flex items-center" aria-label="Universal Systems home">
            <PublicHeaderLogo />
          </NavLink>
          <nav className="public-nav hidden items-center gap-1 lg:flex">
            <NavItems links={links} />
          </nav>
          <button className="icon-button h-10 w-10 lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </header>

      {open ? (
        <div className="public-mobile-scrim fixed inset-0 z-[60] bg-black/55 lg:hidden" onClick={() => setOpen(false)}>
          <div className="public-mobile-drawer ml-auto h-full w-80 max-w-[88vw] p-5 shadow-soft" onClick={(event) => event.stopPropagation()}>
            <div className="mb-6 flex items-center justify-between">
              <span className="public-header-logo-link inline-flex items-center">
                <PublicHeaderLogo />
              </span>
              <button className="icon-button h-9 w-9" onClick={() => setOpen(false)} aria-label="Close menu">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex flex-col gap-2">
              <NavItems links={links} onClick={() => setOpen(false)} />
            </nav>
          </div>
        </div>
      ) : null}

      <main>
        <Outlet />
      </main>

      <a
        className="whatsapp-floating fixed bottom-5 right-5 z-40 inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow-[0_0_28px_rgba(16,185,129,0.45)] transition hover:-translate-y-1 hover:bg-emerald-400"
        href={whatsappHref(contact.whatsappNumber)}
        target="_blank"
        rel="noreferrer"
        aria-label="WhatsApp Universal Systems"
      >
        <WhatsAppIcon className="h-7 w-7" />
        <span className="whatsapp-tooltip">Chat with us</span>
      </a>

      <footer className="public-footer border-t border-[var(--line)] bg-[var(--surface)]">
        <div className="container-page grid gap-8 py-10 md:grid-cols-2 lg:grid-cols-[1.45fr_0.78fr_1fr_1fr]">
          <div className="footer-brand-block">
            <PublicNavbarLogo branding={branding} />
            <p className="footer-brand-description muted max-w-md text-sm leading-6">
              Computer repair, OS installation, printer service, software support, data recovery, and maintenance solutions in Mettur Dam.
            </p>
            <div className="footer-trust-chips" aria-label="Universal Systems service highlights">
              {footerHighlights.map(({ label, Icon }) => (
                <span className="footer-trust-chip" key={label}>
                  <Icon aria-hidden="true" />
                  {label}
                </span>
              ))}
            </div>
          </div>
          <div>
            <h3 className="footer-heading">Quick Links</h3>
            <div className="footer-link-list grid gap-2 text-sm">
              {links.map((link) => (
                <NavLink key={link.to} to={link.to} className="footer-link-row">
                  <span>{link.label}</span>
                  <ArrowRight className="footer-link-arrow" aria-hidden="true" />
                </NavLink>
              ))}
            </div>
          </div>
          <div>
            <h3 className="footer-heading">Services</h3>
            <div className="footer-link-list grid gap-2 text-sm">
              {footerServiceLinks.map((service) => (
                <NavLink key={service} to="/services" className="footer-link-row">
                  <span>{service}</span>
                  <ArrowRight className="footer-link-arrow" aria-hidden="true" />
                </NavLink>
              ))}
            </div>
          </div>
          <div>
            <h3 className="footer-heading">Contact</h3>
            <div className="footer-contact-list space-y-3 text-sm">
              {primaryPhone ? (
                <a className="footer-contact-row" href={phoneHref(primaryPhone)}>
                  <Phone className="h-4 w-4 shrink-0" />
                  <span>{contact.phoneNumber}</span>
                </a>
              ) : null}
              <a className="footer-contact-row" href={whatsappHref(contact.whatsappNumber)} target="_blank" rel="noreferrer">
                <MessageCircle className="h-4 w-4 shrink-0" />
                <span>WhatsApp support</span>
              </a>
              <a className="footer-contact-row" href={`mailto:${contact.email}`}>
                <Mail className="h-4 w-4 shrink-0" />
                <span>{contact.email}</span>
              </a>
              <p className="footer-contact-row">
                <MapPin className="mt-1 h-4 w-4 shrink-0" />
                <span>{contact.address}</span>
              </p>
            </div>
          </div>
        </div>
        <div className="footer-copyright border-t border-[var(--line)] py-4 text-center text-xs muted">
          <span>&copy; 2026 Universal Systems. All rights reserved.</span>
          <a className="footer-staff-link" href="/app" aria-label="Open Universal Systems staff app">
            Staff App
          </a>
        </div>
      </footer>
    </div>
  );
}

export default function PublicLayout() {
  return (
    <PublicWebsiteSettingsProvider>
      <PublicLayoutShell />
    </PublicWebsiteSettingsProvider>
  );
}
