import PublicWebsiteSettings from '../models/PublicWebsiteSettings.js';
import Booking from '../models/Booking.js';
import { COMPANY } from '../config.js';
import { hasRole } from '../permissions.js';
import { appError, clean } from '../utils/http.js';
import { getCompanyIdentity } from './companyProfileService.js';
import { logAudit } from './auditService.js';

const SETTINGS_KEY = 'default';
const MAX_TEXT = 3000;
const allowedBookingStatuses = new Set(['Pending', 'Converted']);

const defaultBookingServiceTypes = [
  'Laptop Repair',
  'Desktop Repair',
  'Printer Service / Toner Refilling',
  'CCTV Installation & Maintenance',
  'Networking Support',
  'OS Installation & Setup',
  'Software Support',
  'Data Recovery',
  'Computer Sales & Service',
  'UPS Battery Sales & Replacement',
  'Solar / UPS / Inverter Sales & Service',
  'AMC / On-site Support'
];

const defaultServices = [
  {
    title: 'OS Installation & Setup',
    description: 'Windows setup, drivers, updates, essential software, and clean configuration.',
    imageUrl: '/images/service-laptop.png',
    categories: ['Computer & Laptop', 'Support & Recovery']
  },
  {
    title: 'Laptop Repair',
    description: 'Screen, keyboard, charging, heating, slow performance, and upgrade support.',
    imageUrl: '/images/service-laptop-repair.png',
    categories: ['Computer & Laptop']
  },
  {
    title: 'Desktop Repair',
    description: 'Boot issues, SMPS, RAM, SSD, motherboard checks, cleaning, and tune-ups.',
    imageUrl: '/images/service-desktop.png',
    categories: ['Computer & Laptop']
  },
  {
    title: 'Printer Service / Toner Refilling',
    description: 'Printer repair, cartridge support, toner refilling, and print quality fixes.',
    imageUrl: '/images/service-printer.png',
    categories: ['Printer & Office']
  },
  {
    title: 'CCTV Installation & Maintenance',
    description: 'Camera setup, DVR checks, cabling support, troubleshooting, and maintenance.',
    imageUrl: '/images/service-cctv.png',
    categories: ['CCTV & Networking']
  },
  {
    title: 'Networking Support',
    description: 'Router, LAN, sharing, Wi-Fi, and small office connectivity support.',
    imageUrl: '/images/service-router.png',
    categories: ['CCTV & Networking']
  },
  {
    title: 'Computer Sales & Service',
    description: 'New and refurbished computer sales, setup, upgrades, and service support.',
    imageUrl: '/images/service-computer-sales.png',
    categories: ['Computer & Laptop']
  },
  {
    title: 'UPS Battery Sales & Replacement',
    description: 'UPS battery sales, replacement, backup checks, and device connectivity support.',
    imageUrl: '/images/service-ups-battery.png',
    categories: ['Power & UPS']
  },
  {
    title: 'Solar UPS & Inverter Sales & Service',
    description: 'Solar UPS, inverter, and battery solutions for homes, shops, and businesses.',
    imageUrl: '/images/service-solar-ups-inverter.png',
    categories: ['Power & UPS']
  },
  {
    title: 'AMC / On-site Support',
    description: 'Maintenance visits and support planning for shops and offices.',
    imageUrl: '/images/service-amc-onsite.png',
    categories: ['Printer & Office', 'Support & Recovery']
  },
  {
    title: 'Software Support',
    description: 'Virus cleanup, app errors, driver issues, office software, and system optimization.',
    imageUrl: '/images/service-software-support.png',
    categories: ['Support & Recovery']
  },
  {
    title: 'Data Recovery',
    description: 'Recovery support for deleted files, corrupted drives, and damaged storage.',
    imageUrl: '/images/service-data-recovery.png',
    categories: ['Support & Recovery']
  }
];

export const defaultPublicWebsiteSettings = {
  key: SETTINGS_KEY,
  status: {
    websiteEnabled: true,
    maintenanceMode: false,
    maintenanceMessage: 'We are updating our public website. Please contact us by phone or WhatsApp for urgent service.'
  },
  hero: {
    title: 'Fast, Reliable & Professional Tech Support You Can Trust',
    subtitle: 'Computer, laptop, printer, CCTV, and networking service for homes, students, shops, and offices with clear diagnosis, careful repair, and simple booking.',
    primaryButtonText: 'Book a Service',
    secondaryButtonText: 'Contact / WhatsApp',
    imageUrl: '/Home%20Page%20image.png',
    glassmorphismAnimation: true
  },
  services: defaultServices.map((service, index) => ({
    ...service,
    visible: true,
    order: index
  })),
  contact: {
    phoneNumber: COMPANY.phones.join(' / '),
    whatsappNumber: '',
    email: COMPANY.email,
    address: COMPANY.address.replace(/\n/g, ' '),
    businessHours: 'Monday - Saturday, 9:00 AM - 8:00 PM',
    googleMapsLink: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(COMPANY.address.replace(/\n/g, ' '))}`
  },
  booking: {
    publicBookingEnabled: true,
    bookingButtonText: 'Book a Service',
    defaultBookingStatus: 'Pending',
    showServiceSelection: true,
    showPreferredDateTime: false,
    serviceTypes: defaultBookingServiceTypes.map((name, index) => ({
      key: `booking-service-${index + 1}`,
      name,
      active: true,
      order: index
    }))
  },
  branding: {
    logoUrl: '/logo-icon.png',
    useCompanyLogo: true,
    navbarLogoWidth: 180,
    footerLogoWidth: 280,
    accentColor: '#75c4ff'
  },
  seo: {
    websiteTitle: 'Universal Systems | Computer, Laptop, Printer & CCTV Service',
    metaDescription: 'Universal Systems provides computer, laptop, printer, CCTV, networking, UPS, and AMC service in Sample City.',
    keywords: 'computer service, laptop repair, printer service, CCTV, networking, AMC, Sample City',
    socialSharingImage: '/Home%20Page%20image.png'
  }
};

function cleanText(value, fallback = '', max = MAX_TEXT) {
  const text = clean(value ?? fallback);
  return text.length > max ? text.slice(0, max) : text;
}

function sanitizeColor(value, fallback = '#75c4ff') {
  const text = clean(value || fallback);
  return /^#[0-9a-f]{6}$/i.test(text) ? text : fallback;
}

function booleanValue(value, fallback = false) {
  return typeof value === 'boolean' ? value : fallback;
}

function numberInRange(value, fallback, min, max) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(max, Math.max(min, Math.round(numeric)));
}

function sanitizeServices(services = []) {
  const source = Array.isArray(services) ? services : [];
  return source.slice(0, 40).map((service, index) => ({
    title: cleanText(service?.title, `Service ${index + 1}`, 160),
    description: cleanText(service?.description || service?.text, '', 900),
    imageUrl: cleanText(service?.imageUrl || service?.image, '', 400),
    visible: service?.visible !== false,
    order: Number.isFinite(Number(service?.order)) ? Number(service.order) : index,
    categories: Array.isArray(service?.categories)
      ? service.categories.map((category) => cleanText(category, '', 80)).filter(Boolean).slice(0, 6)
      : []
  })).sort((a, b) => a.order - b.order).map((service, index) => ({ ...service, order: index }));
}

function normalizeServiceTypeKey(value = '') {
  return clean(value)
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function sanitizeBookingServiceTypes(serviceTypes = []) {
  const source = Array.isArray(serviceTypes) && serviceTypes.length
    ? serviceTypes
    : defaultPublicWebsiteSettings.booking.serviceTypes;
  const seenKeys = new Set();
  const seenNames = new Set();

  return source
    .slice(0, 80)
    .map((service, index) => {
      const rawName = typeof service === 'string' ? service : service?.name;
      const name = cleanText(rawName, '', 160);
      if (!name) return null;
      const baseKey = normalizeServiceTypeKey(typeof service === 'string' ? name : service?.key || name) || `booking-service-${index + 1}`;
      let key = baseKey;
      let suffix = 2;
      while (seenKeys.has(key)) {
        key = `${baseKey}-${suffix}`;
        suffix += 1;
      }
      const normalizedName = normalizeServiceTypeKey(name);
      if (seenNames.has(normalizedName)) return null;
      seenKeys.add(key);
      seenNames.add(normalizedName);
      return {
        key,
        name,
        active: typeof service === 'string' ? true : service?.active !== false,
        order: Number.isFinite(Number(service?.order)) ? Number(service.order) : index
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.order - b.order)
    .map((service, index) => ({ ...service, order: index }));
}

export function sanitizePublicWebsiteSettings(payload = {}) {
  const base = {
    ...defaultPublicWebsiteSettings,
    ...payload,
    status: { ...defaultPublicWebsiteSettings.status, ...(payload.status || {}) },
    hero: { ...defaultPublicWebsiteSettings.hero, ...(payload.hero || {}) },
    contact: { ...defaultPublicWebsiteSettings.contact, ...(payload.contact || {}) },
    booking: { ...defaultPublicWebsiteSettings.booking, ...(payload.booking || {}) },
    branding: { ...defaultPublicWebsiteSettings.branding, ...(payload.branding || {}) },
    seo: { ...defaultPublicWebsiteSettings.seo, ...(payload.seo || {}) }
  };
  const defaultStatus = defaultPublicWebsiteSettings.status;
  const defaultHero = defaultPublicWebsiteSettings.hero;
  const defaultContact = defaultPublicWebsiteSettings.contact;
  const defaultBooking = defaultPublicWebsiteSettings.booking;
  const defaultBranding = defaultPublicWebsiteSettings.branding;
  const defaultSeo = defaultPublicWebsiteSettings.seo;

  return {
    key: SETTINGS_KEY,
    status: {
      websiteEnabled: booleanValue(base.status.websiteEnabled, defaultStatus.websiteEnabled),
      maintenanceMode: booleanValue(base.status.maintenanceMode, defaultStatus.maintenanceMode),
      maintenanceMessage: cleanText(base.status.maintenanceMessage, defaultStatus.maintenanceMessage, 1000)
    },
    hero: {
      title: cleanText(base.hero.title, defaultHero.title, 180),
      subtitle: cleanText(base.hero.subtitle, defaultHero.subtitle, 900),
      primaryButtonText: cleanText(base.hero.primaryButtonText, defaultHero.primaryButtonText, 80),
      secondaryButtonText: cleanText(base.hero.secondaryButtonText, defaultHero.secondaryButtonText, 80),
      imageUrl: cleanText(base.hero.imageUrl, defaultHero.imageUrl, 400),
      glassmorphismAnimation: booleanValue(base.hero.glassmorphismAnimation, defaultHero.glassmorphismAnimation)
    },
    services: sanitizeServices(base.services?.length ? base.services : defaultPublicWebsiteSettings.services),
    contact: {
      phoneNumber: cleanText(base.contact.phoneNumber, defaultContact.phoneNumber, 120),
      whatsappNumber: cleanText(base.contact.whatsappNumber, defaultContact.whatsappNumber, 40).replace(/[^\d]/g, ''),
      email: cleanText(base.contact.email, defaultContact.email, 160),
      address: cleanText(base.contact.address, defaultContact.address, 1000),
      businessHours: cleanText(base.contact.businessHours, defaultContact.businessHours, 240),
      googleMapsLink: cleanText(base.contact.googleMapsLink, defaultContact.googleMapsLink, 700)
    },
    booking: {
      publicBookingEnabled: booleanValue(base.booking.publicBookingEnabled, defaultBooking.publicBookingEnabled),
      bookingButtonText: cleanText(base.booking.bookingButtonText, defaultBooking.bookingButtonText, 80),
      defaultBookingStatus: allowedBookingStatuses.has(base.booking.defaultBookingStatus) ? base.booking.defaultBookingStatus : defaultBooking.defaultBookingStatus,
      showServiceSelection: booleanValue(base.booking.showServiceSelection, defaultBooking.showServiceSelection),
      showPreferredDateTime: booleanValue(base.booking.showPreferredDateTime, defaultBooking.showPreferredDateTime),
      serviceTypes: sanitizeBookingServiceTypes(base.booking.serviceTypes)
    },
    branding: {
      logoUrl: cleanText(base.branding.logoUrl, defaultBranding.logoUrl, 400),
      useCompanyLogo: booleanValue(base.branding.useCompanyLogo, defaultBranding.useCompanyLogo),
      navbarLogoWidth: numberInRange(base.branding.navbarLogoWidth, defaultBranding.navbarLogoWidth, 80, 320),
      footerLogoWidth: numberInRange(base.branding.footerLogoWidth, defaultBranding.footerLogoWidth, 120, 480),
      accentColor: sanitizeColor(base.branding.accentColor, defaultBranding.accentColor)
    },
    seo: {
      websiteTitle: cleanText(base.seo.websiteTitle, defaultSeo.websiteTitle, 180),
      metaDescription: cleanText(base.seo.metaDescription, defaultSeo.metaDescription, 320),
      keywords: cleanText(base.seo.keywords, defaultSeo.keywords, 500),
      socialSharingImage: cleanText(base.seo.socialSharingImage, defaultSeo.socialSharingImage, 400)
    }
  };
}

export async function getBookingServiceTypeUsageCounts() {
  const rows = await Booking.aggregate([
    { $match: { serviceType: { $type: 'string', $ne: '' } } },
    { $group: { _id: '$serviceType', count: { $sum: 1 } } }
  ]);
  return rows.reduce((map, row) => {
    map[row._id] = row.count;
    return map;
  }, {});
}

function preserveUsedRemovedServiceTypes(sanitized, before, usageCounts = {}) {
  const nextTypes = sanitized.booking.serviceTypes || [];
  const nextKeys = new Set(nextTypes.map((item) => item.key).filter(Boolean));
  const nextNames = new Set(nextTypes.map((item) => item.name));
  const restored = [];

  (before.booking?.serviceTypes || []).forEach((service) => {
    const usage = usageCounts[service.name] || 0;
    if (!usage) return;
    if (nextKeys.has(service.key) || nextNames.has(service.name)) return;
    restored.push({
      ...service,
      active: false,
      order: nextTypes.length + restored.length
    });
  });

  if (!restored.length) return sanitized;
  return {
    ...sanitized,
    booking: {
      ...sanitized.booking,
      serviceTypes: sanitizeBookingServiceTypes([...nextTypes, ...restored])
    }
  };
}

function userSummary(user) {
  if (!user) return null;
  return {
    id: String(user._id || user.id || ''),
    name: user.name || user.username || 'User',
    username: user.username || '',
    role: user.role || ''
  };
}

function applyCompanyProfile(settings, company) {
  const phoneNumber = company.phone || settings.contact?.phoneNumber;
  return {
    ...settings,
    contact: {
      ...settings.contact,
      phoneNumber,
      whatsappNumber: company.whatsappNumber || settings.contact?.whatsappNumber,
      email: company.email || settings.contact?.email,
      address: company.address || settings.contact?.address,
      googleMapsLink: company.googleMapsLink || settings.contact?.googleMapsLink
    }
  };
}

function serializeSettings(settings, company = null) {
  const item = settings?.toObject ? settings.toObject() : settings;
  const serialized = {
    id: String(item._id || item.id || ''),
    ...sanitizePublicWebsiteSettings(item),
    lastUpdatedBy: userSummary(item.lastUpdatedBy),
    lastUpdatedDate: item.updatedAt || item.createdAt || null,
    updatedAt: item.updatedAt || null,
    createdAt: item.createdAt || null
  };
  return company ? applyCompanyProfile(serialized, company) : serialized;
}

export async function ensurePublicWebsiteSettings() {
  const defaults = sanitizePublicWebsiteSettings(defaultPublicWebsiteSettings);
  const settings = await PublicWebsiteSettings.findOneAndUpdate(
    { key: SETTINGS_KEY },
    { $setOnInsert: defaults },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).populate('lastUpdatedBy', 'name username role');
  return settings;
}

export async function getPublicWebsiteSettings() {
  const settings = await ensurePublicWebsiteSettings();
  const company = await getCompanyIdentity();
  return serializeSettings(settings, company);
}

export async function updatePublicWebsiteSettings(payload = {}, user = null) {
  if (!hasRole(user, 'admin')) throw appError('Only admin users can edit public website settings', 403);
  const existing = await ensurePublicWebsiteSettings();
  const before = serializeSettings(existing);
  const usageCounts = await getBookingServiceTypeUsageCounts();
  const sanitized = preserveUsedRemovedServiceTypes(sanitizePublicWebsiteSettings(payload.settings || payload), before, usageCounts);
  const updated = await PublicWebsiteSettings.findOneAndUpdate(
    { key: SETTINGS_KEY },
    { $set: { ...sanitized, lastUpdatedBy: user?._id || null } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).populate('lastUpdatedBy', 'name username role');
  const after = serializeSettings(updated);
  await logAudit({
    userId: user?._id || null,
    action: 'public_website_settings_updated',
    module: 'public_website_settings',
    recordId: updated._id,
    before,
    after
  });
  const beforeTitles = new Set((before.services || []).map((service) => `${service.title || ''}:${service.order}`));
  const afterTitles = new Set((after.services || []).map((service) => `${service.title || ''}:${service.order}`));
  const removed = (before.services || []).filter((service) => !afterTitles.has(`${service.title || ''}:${service.order}`));
  await Promise.all(removed.map((service) => logAudit({
    userId: user?._id || null,
    action: 'public_website_service_deleted',
    module: 'public_website_settings',
    recordId: updated._id,
    before: service,
    after: null
  })));
  const afterByTitle = new Map((after.services || []).map((service) => [service.title || '', service]));
  const visibilityChanged = (before.services || []).filter((service) => {
    const next = afterByTitle.get(service.title || '');
    return next && service.visible !== next.visible;
  });
  const reordered = (before.services || []).filter((service) => {
    const next = afterByTitle.get(service.title || '');
    return next && service.order !== next.order;
  });
  await Promise.all(visibilityChanged.map((service) => logAudit({
    userId: user?._id || null,
    action: service.visible === false ? 'public_website_service_shown' : 'public_website_service_hidden',
    module: 'public_website_settings',
    recordId: updated._id,
    before: service,
    after: afterByTitle.get(service.title || '')
  })));
  if (reordered.length) {
    await logAudit({
      userId: user?._id || null,
      action: 'public_website_services_reordered',
      module: 'public_website_settings',
      recordId: updated._id,
      before: before.services,
      after: after.services
    });
  }
  return after;
}

export async function resetPublicWebsiteSettings(user = null) {
  if (!hasRole(user, 'admin')) throw appError('Only admin users can reset public website settings', 403);
  const existing = await ensurePublicWebsiteSettings();
  const before = serializeSettings(existing);
  const usageCounts = await getBookingServiceTypeUsageCounts();
  const defaults = preserveUsedRemovedServiceTypes(sanitizePublicWebsiteSettings(defaultPublicWebsiteSettings), before, usageCounts);
  const updated = await PublicWebsiteSettings.findOneAndUpdate(
    { key: SETTINGS_KEY },
    { $set: { ...defaults, lastUpdatedBy: user?._id || null } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).populate('lastUpdatedBy', 'name username role');
  const after = serializeSettings(updated);
  await logAudit({
    userId: user?._id || null,
    action: 'public_website_settings_reset',
    module: 'public_website_settings',
    recordId: updated._id,
    before,
    after
  });
  return after;
}

export async function assertPublicWebsiteOpen() {
  const settings = await getPublicWebsiteSettings();
  if (!settings.status.websiteEnabled || settings.status.maintenanceMode) {
    throw appError(settings.status.maintenanceMessage || 'Public website is temporarily unavailable', 503);
  }
  return settings;
}

export async function assertPublicBookingOpen() {
  const settings = await assertPublicWebsiteOpen();
  if (!settings.booking.publicBookingEnabled) {
    throw appError('Public booking is currently disabled. Please contact us by phone or WhatsApp.', 503);
  }
  return settings;
}
