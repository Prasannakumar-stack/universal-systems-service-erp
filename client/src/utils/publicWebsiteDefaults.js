import { apiBase, company } from './constants.js';

const apiOrigin = apiBase.replace(/\/api$/, '');

export const defaultPublicWebsiteSettings = {
  status: {
    websiteEnabled: true,
    maintenanceMode: false,
    maintenanceMessage: 'We are updating our public website. Please contact us by phone or WhatsApp for urgent service.'
  },
  hero: {
    title: 'Fast, Reliable & Professional Tech Support You Can Trust',
    subtitle: 'Clear diagnosis and careful repair for computers, laptops, printers, CCTV, and networks, with simple booking for homes, students, shops, and offices.',
    primaryButtonText: 'Book a Service',
    secondaryButtonText: 'Contact / WhatsApp',
    imageUrl: '/Home%20Page%20image.png',
    glassmorphismAnimation: true
  },
  services: [
    {
      title: 'OS Installation & Setup',
      description: 'Windows setup, drivers, updates, essential software, and clean configuration.',
      imageUrl: '/images/service-laptop.png',
      visible: true,
      order: 0,
      categories: ['Computer & Laptop', 'Support & Recovery']
    },
    {
      title: 'Laptop Repair',
      description: 'Screen, keyboard, charging, heating, slow performance, and upgrade support.',
      imageUrl: '/images/service-laptop-repair.png',
      visible: true,
      order: 1,
      categories: ['Computer & Laptop']
    },
    {
      title: 'Desktop Repair',
      description: 'Boot issues, SMPS, RAM, SSD, motherboard checks, cleaning, and tune-ups.',
      imageUrl: '/images/service-desktop.png',
      visible: true,
      order: 2,
      categories: ['Computer & Laptop']
    },
    {
      title: 'Printer Service / Toner Refilling',
      description: 'Printer repair, cartridge support, toner refilling, and print quality fixes.',
      imageUrl: '/images/service-printer.png',
      visible: true,
      order: 3,
      categories: ['Printer & Office']
    },
    {
      title: 'CCTV Installation & Maintenance',
      description: 'Camera setup, DVR checks, cabling support, troubleshooting, and maintenance.',
      imageUrl: '/images/service-cctv.png',
      visible: true,
      order: 4,
      categories: ['CCTV & Networking']
    },
    {
      title: 'Networking Support',
      description: 'Router, LAN, sharing, Wi-Fi, and small office connectivity support.',
      imageUrl: '/images/service-router.png',
      visible: true,
      order: 5,
      categories: ['CCTV & Networking']
    },
    {
      title: 'Computer Sales & Service',
      description: 'New and refurbished computer sales, setup, upgrades, and service support.',
      imageUrl: '/images/service-computer-sales.png',
      visible: true,
      order: 6,
      categories: ['Computer & Laptop']
    },
    {
      title: 'UPS Battery Sales & Replacement',
      description: 'UPS battery sales, replacement, backup checks, and device connectivity support.',
      imageUrl: '/images/service-ups-battery.png',
      visible: true,
      order: 7,
      categories: ['Power & UPS']
    },
    {
      title: 'Solar UPS & Inverter Sales & Service',
      description: 'Solar UPS, inverter, and battery solutions for homes, shops, and businesses.',
      imageUrl: '/images/service-solar-ups-inverter.png',
      visible: true,
      order: 8,
      categories: ['Power & UPS']
    },
    {
      title: 'AMC / On-site Support',
      description: 'Maintenance visits and support planning for shops and offices.',
      imageUrl: '/images/service-amc-onsite.png',
      visible: true,
      order: 9,
      categories: ['Printer & Office', 'Support & Recovery']
    },
    {
      title: 'Software Support',
      description: 'Virus cleanup, app errors, driver issues, office software, and system optimization.',
      imageUrl: '/images/service-software-support.png',
      visible: true,
      order: 10,
      categories: ['Support & Recovery']
    },
    {
      title: 'Data Recovery',
      description: 'Recovery support for deleted files, corrupted drives, and damaged storage.',
      imageUrl: '/images/service-data-recovery.png',
      visible: true,
      order: 11,
      categories: ['Support & Recovery']
    }
  ],
  contact: {
    phoneNumber: company.phones.join(' / '),
    whatsappNumber: company.whatsapp,
    email: company.email,
    address: company.address,
    businessHours: company.hours,
    googleMapsLink: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(company.address)}`
  },
  booking: {
    publicBookingEnabled: true,
    bookingButtonText: 'Book a Service',
    defaultBookingStatus: 'Pending',
    showServiceSelection: true,
    showPreferredDateTime: false
  },
  branding: {
    logoUrl: '/logo-icon.png',
    useCompanyLogo: true,
    accentColor: '#75c4ff'
  },
  seo: {
    websiteTitle: 'Universal Systems | Computer, Laptop, Printer & CCTV Service',
    metaDescription: 'Universal Systems provides computer, laptop, printer, CCTV, networking, UPS, and AMC service in Mettur Dam.',
    keywords: 'computer service, laptop repair, printer service, CCTV, networking, AMC, Mettur Dam',
    socialSharingImage: '/Home%20Page%20image.png'
  }
};

const publicPageHeroImages = {
  home: '/Home%20Page%20image.png',
  about: '/About%20page%20image.png',
  services: '/Service%20page%20image.png',
  contact: '/Contact%20Page%20image.png',
  bookService: '/Book%20Service%20Page%20image.png'
};

export function mergePublicWebsiteSettings(settings = {}) {
  const merged = {
    ...defaultPublicWebsiteSettings,
    ...settings,
    status: { ...defaultPublicWebsiteSettings.status, ...(settings.status || {}) },
    hero: { ...defaultPublicWebsiteSettings.hero, ...(settings.hero || {}) },
    contact: { ...defaultPublicWebsiteSettings.contact, ...(settings.contact || {}) },
    booking: { ...defaultPublicWebsiteSettings.booking, ...(settings.booking || {}) },
    branding: { ...defaultPublicWebsiteSettings.branding, ...(settings.branding || {}) },
    seo: { ...defaultPublicWebsiteSettings.seo, ...(settings.seo || {}) }
  };
  merged.services = Array.isArray(settings.services) && settings.services.length
    ? settings.services.map((service, index) => ({ ...service, order: Number.isFinite(Number(service.order)) ? Number(service.order) : index }))
    : defaultPublicWebsiteSettings.services;
  return merged;
}

export function publicAssetUrl(value) {
  const url = String(value || '').trim();
  if (!url) return '';
  if (/^https?:\/\//i.test(url) || url.startsWith('data:') || url.startsWith('blob:')) return url;
  if (url.startsWith('/uploads/')) return `${apiOrigin}${url}`;
  return url;
}

export function publicPageHeroImage(page) {
  return publicPageHeroImages[page] || publicPageHeroImages.home;
}

export function publicPhoneList(contact = defaultPublicWebsiteSettings.contact) {
  return String(contact.phoneNumber || '')
    .split(/[\/,]/)
    .map((phone) => phone.trim())
    .filter(Boolean);
}

export function phoneHref(phone = '') {
  return `tel:${String(phone).replace(/[^\d+]/g, '')}`;
}

export function whatsappHref(number = '') {
  const digits = String(number || '').replace(/\D/g, '');
  return digits ? `https://wa.me/${digits}` : '#';
}

export function visiblePublicServices(settings = defaultPublicWebsiteSettings) {
  return (settings.services || [])
    .filter((service) => service.visible !== false)
    .sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
}
