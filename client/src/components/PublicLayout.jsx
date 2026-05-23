import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Mail, MapPin, Menu, MessageCircle, Phone, ShieldCheck, X } from 'lucide-react';
import { company } from '../utils/constants.js';

const links = [
  { to: '/', label: 'Home' },
  { to: '/about', label: 'About' },
  { to: '/services', label: 'Services' },
  { to: '/contact', label: 'Contact' },
  { to: '/book-service', label: 'Book Service' }
];

const footerServices = [
  'OS Installation',
  'Laptop Repair',
  'Desktop Service',
  'Printer Service',
  'CCTV Service',
  'Networking'
];

function NavItems({ onClick }) {
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
      <a href="/admin/login" onClick={onClick} className="btn btn-secondary nav-admin-link">
        <ShieldCheck className="h-4 w-4" />
        Admin Login
      </a>
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

function PublicNavbarLogo() {
  return (
    <span className="public-navbar-brand" aria-hidden="true">
      <span className="public-navbar-icon-crop">
        <img src="/logo-icon.png" alt="" className="public-navbar-logo-icon" />
      </span>
      <span className="public-navbar-logo-text">
        <span>Universal</span>
        <span>Systems</span>
      </span>
    </span>
  );
}

export default function PublicLayout() {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen">
      <header className="public-header sticky top-0 z-50 border-b border-[var(--line)] backdrop-blur-xl">
        <div className="container-page flex h-18 items-center justify-between py-3">
          <NavLink to="/" className="public-logo-link flex items-center" aria-label="Universal Systems home">
            <PublicNavbarLogo />
          </NavLink>
          <nav className="public-nav hidden items-center gap-1 lg:flex">
            <NavItems />
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
              <span className="public-logo-link public-logo-lockup inline-flex items-center">
                <PublicNavbarLogo />
              </span>
              <button className="icon-button h-9 w-9" onClick={() => setOpen(false)} aria-label="Close menu">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex flex-col gap-2">
              <NavItems onClick={() => setOpen(false)} />
            </nav>
          </div>
        </div>
      ) : null}

      <main>
        <Outlet />
      </main>

      <a
        className="whatsapp-floating fixed bottom-5 right-5 z-40 inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow-[0_0_28px_rgba(16,185,129,0.45)] transition hover:-translate-y-1 hover:bg-emerald-400"
        href={`https://wa.me/${company.whatsapp}`}
        target="_blank"
        rel="noreferrer"
        aria-label="WhatsApp Universal Systems"
      >
        <WhatsAppIcon className="h-7 w-7" />
        <span className="whatsapp-tooltip">Chat with us</span>
      </a>

      <footer className="public-footer border-t border-[var(--line)] bg-[var(--surface)]">
        <div className="container-page grid gap-8 py-10 md:grid-cols-2 xl:grid-cols-[1.35fr_0.85fr_0.9fr_1fr]">
          <div className="footer-brand-block">
            <PublicNavbarLogo />
            <p className="muted max-w-md text-sm leading-6">
              Computer repair, OS installation, printer service, software support, data recovery, and maintenance solutions in Mettur Dam.
            </p>
          </div>
          <div>
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-[var(--brand)]">Quick Links</h3>
            <div className="footer-link-list grid gap-2 text-sm">
              {links.map((link) => (
                <NavLink key={link.to} to={link.to} className="muted hover:text-[var(--brand-2)]">
                  {link.label}
                </NavLink>
              ))}
              <NavLink to="/technician/login" className="muted hover:text-[var(--brand-2)]">
                Technician Login
              </NavLink>
            </div>
          </div>
          <div>
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-[var(--brand)]">Services</h3>
            <div className="footer-link-list grid gap-2 text-sm">
              {footerServices.map((service) => (
                <NavLink key={service} to="/services" className="muted hover:text-[var(--brand-2)]">
                  {service}
                </NavLink>
              ))}
            </div>
          </div>
          <div>
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-[var(--brand)]">Contact</h3>
            <div className="footer-contact-list space-y-3 text-sm">
              <a className="flex gap-2 hover:text-[var(--brand-2)]" href={`tel:${company.phones[0].replace(/\s/g, '')}`}>
                <Phone className="h-4 w-4 shrink-0" /> {company.phones.join(' / ')}
              </a>
              <a className="flex gap-2 hover:text-[var(--brand-2)]" href={`https://wa.me/${company.whatsapp}`} target="_blank" rel="noreferrer">
                <MessageCircle className="h-4 w-4 shrink-0" /> WhatsApp support
              </a>
              <a className="flex gap-2 hover:text-[var(--brand-2)]" href={`mailto:${company.email}`}>
                <Mail className="h-4 w-4 shrink-0" /> {company.email}
              </a>
              <p className="flex gap-2 leading-6">
                <MapPin className="mt-1 h-4 w-4 shrink-0" /> {company.address}
              </p>
            </div>
          </div>
        </div>
        <div className="footer-copyright border-t border-[var(--line)] py-4 text-center text-xs muted">
          <span>&copy; {new Date().getFullYear()} Universal Systems. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
}
