import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

const services = [
  {
    title: 'OS Installation & Setup',
    text: 'Windows setup, drivers, updates, essential software, and clean configuration.',
    image: '/images/service-os-installation.png',
    fallbackImage: '/images/service-laptop.png'
  },
  {
    title: 'Laptop Repair',
    text: 'Screen, keyboard, charging, heating, slow performance, and upgrade support.',
    image: '/images/service-laptop-repair.png'
  },
  {
    title: 'Desktop Repair',
    text: 'Boot issues, SMPS, RAM, SSD, motherboard checks, cleaning, and tune-ups.',
    image: '/images/service-desktop.png'
  },
  {
    title: 'Printer Service / Toner Refilling',
    text: 'Printer repair, cartridge support, toner refilling, and print quality fixes.',
    image: '/images/service-printer.png'
  },
  {
    title: 'CCTV Installation & Maintenance',
    text: 'Secondary support for camera setup, DVR checks, and maintenance.',
    image: '/images/service-cctv.png'
  },
  {
    title: 'Networking Support',
    text: 'Router, LAN, sharing, Wi-Fi, and small office connectivity support.',
    image: '/images/service-router.png'
  },
  {
    title: 'Computer Sales & Service',
    text: 'New and refurbished computer sales, setup, upgrades, and service support.',
    image: '/images/service-computer-sales.png'
  },
  {
    title: 'UPS Battery Sales & Replacement',
    text: 'UPS battery sales, replacement, backup checks, and device connectivity support.',
    image: '/images/service-ups-battery.png'
  },
  {
    title: 'Solar UPS & Inverter Sales & Service',
    text: 'Solar UPS, inverter, and battery solutions for homes, shops, and businesses.',
    image: '/images/service-solar-ups-inverter.png'
  },
  {
    title: 'AMC / On-site Support',
    text: 'Maintenance visits and support planning for shops and offices.',
    image: '/images/service-amc-onsite.png'
  },
  {
    title: 'Software Support',
    text: 'Virus cleanup, app errors, driver issues, office software, and system optimization.',
    image: '/images/service-software-support.png'
  },
  {
    title: 'Data Recovery',
    text: 'Recovery support for deleted files, corrupted drives, and damaged storage.',
    image: '/images/service-data-recovery.png'
  }
];

export default function Services() {
  return (
    <div className="services-page section">
      <div className="container-page">
        <div className="services-page-header mb-10 max-w-4xl">
          <p className="services-page-eyebrow">Services</p>
          <h1>Our Professional IT Services</h1>
          <p>
            Choose the support you need. Every card leads into the booking flow, so your request is simple and direct.
          </p>
        </div>

        <div className="services-showcase-grid grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => {
            const imageLayers = service.fallbackImage ? `url("${service.image}"), url("${service.fallbackImage}")` : `url("${service.image}")`;
            return (
              <article key={service.title} className="services-showcase-card" style={{ '--service-card-image': imageLayers }}>
                <div className="services-card-light" aria-hidden="true" />
                <div className="services-card-visual" aria-hidden="true" />
                <div className="services-card-copy">
                  <h2 className="text-xl font-black">{service.title}</h2>
                  <p className="mt-2 text-sm leading-6 muted">{service.text}</p>
                  <Link to="/book-service" className="services-book-button mt-5">
                    Book Now <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}
