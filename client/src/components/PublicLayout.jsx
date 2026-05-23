import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { BookOpenCheck, CreditCard, Mail, MapPin, Menu, MessageCircle, Phone, ShieldCheck, Wrench, X } from 'lucide-react';
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

const paymentBadges = ['UPI', 'Cash', 'Cards', 'Bank Transfer'];

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
        <MessageCircle className="h-6 w-6" />
        <span className="whatsapp-tooltip">Chat with us</span>
      </a>

      <footer className="public-footer border-t border-[var(--line)] bg-[var(--surface)]">
        <div className="container-page grid gap-8 py-10 md:grid-cols-2 xl:grid-cols-[1.35fr_0.85fr_0.9fr_1fr]">
          <div className="footer-brand-block">
            <span className="footer-logo-shell mb-4 inline-flex rounded-card px-2 py-1">
              <img src="/logo-full.png" alt="Universal Systems" className="h-12 w-auto max-w-[220px]" />
            </span>
            <p className="muted max-w-md text-sm leading-6">
              Computer repair, OS installation, printer service, software support, data recovery, and maintenance solutions in Mettur Dam.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="status-badge">
                <Wrench className="mr-1.5 h-3.5 w-3.5" />
                Repair Focused
              </span>
              <span className="status-badge">
                <BookOpenCheck className="mr-1.5 h-3.5 w-3.5" />
                Easy Booking
              </span>
            </div>
            <div className="mt-5">
              <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-[var(--brand)]">Payment</h3>
              <div className="flex flex-wrap gap-2">
                {paymentBadges.map((badge) => (
                  <span key={badge} className="payment-badge">
                    <CreditCard className="h-3.5 w-3.5" />
                    {badge}
                  </span>
                ))}
              </div>
            </div>
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
        <div className="border-t border-[var(--line)] py-4 text-center text-xs muted">
          &copy; {new Date().getFullYear()} Universal Systems. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
