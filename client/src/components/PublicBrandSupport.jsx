import { useId } from 'react';

export const SUPPORTED_BRANDS = [
  { key: 'dell', name: 'Dell', logo: '/brands/dell.png' },
  { key: 'hp', name: 'HP', logo: '/brands/hp.png' },
  { key: 'lenovo', name: 'Lenovo', logo: '/brands/lenovo.png' },
  { key: 'epson', name: 'Epson', logo: '/brands/epson.png' },
  { key: 'canon', name: 'Canon', logo: '/brands/canon.png' },
  { key: 'hikvision', name: 'Hikvision', logo: '/brands/hikvision.png' }
];

export const SUPPORTED_PUBLIC_BRANDS = SUPPORTED_BRANDS;

const brandLookup = new Map(SUPPORTED_BRANDS.map((brand) => [brand.name, brand]));

const laptopDesktopBrands = ['Dell', 'HP', 'Lenovo'];
const printerBrands = ['Epson', 'Canon', 'HP'];
const cctvBrands = ['Hikvision'];

function normalizeService(value = '') {
  return String(value).toLowerCase().replace(/&/g, ' and ');
}

function hasAny(value, keywords) {
  return keywords.some((keyword) => value.includes(keyword));
}

export function brandNamesForService(serviceTitle = '') {
  const service = normalizeService(serviceTitle);
  if (!service) return [];

  if (hasAny(service, ['printer', 'toner', 'cartridge'])) return printerBrands;
  if (hasAny(service, ['cctv', 'camera', 'dvr', 'nvr'])) return cctvBrands;
  if (hasAny(service, ['laptop', 'desktop', 'pc / laptop'])) return laptopDesktopBrands;

  return [];
}

export function shouldShowStandardProductNote(serviceTitle = '') {
  const service = normalizeService(serviceTitle);
  return Boolean(service);
}

function resolveBrands(brands = SUPPORTED_BRANDS) {
  return brands
    .map((brand) => (typeof brand === 'string' ? brandLookup.get(brand) : brand))
    .filter(Boolean);
}

function BrandLogoImage({ brand }) {
  return (
    <img
      className={`brand-logo-img brand-logo-img-${brand.key}`}
      src={brand.logo}
      alt={`${brand.name} logo`}
      loading="lazy"
      decoding="async"
    />
  );
}

export function BrandChips({ brands, className = '', compact = false, ariaLabel = 'Supported brands' }) {
  const resolvedBrands = resolveBrands(brands);
  if (!resolvedBrands.length) return null;

  return (
    <div className={`public-brand-chip-row ${compact ? 'public-brand-chip-row-compact' : ''} ${className}`.trim()} aria-label={ariaLabel}>
      {resolvedBrands.map((brand) => (
        <span
          className="brand-logo-card public-brand-chip"
          key={brand.key}
          aria-label={brand.name}
        >
          <BrandLogoImage brand={brand} />
        </span>
      ))}
    </div>
  );
}

export function BrandLogoStrip({
  heading = 'Brands We Service & Support',
  subtitle = 'We service and support commonly used computer, printer, CCTV, and IT equipment brands for homes and businesses.',
  brands = SUPPORTED_BRANDS,
  size = 'medium',
  className = '',
  as: Component = 'section'
}) {
  const headingId = useId();
  const resolvedBrands = resolveBrands(brands);

  return (
    <Component
      className={`public-brand-section public-brand-section-${size} ${className}`.trim()}
      aria-labelledby={headingId}
      role={Component === 'section' ? undefined : 'region'}
    >
      <div className="public-brand-inner">
        <div className="public-brand-copy">
          <h2 id={headingId}>{heading}</h2>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
        <div className="public-brand-logo-strip" role="list" aria-label="Supported equipment brands">
          {resolvedBrands.map((brand) => (
            <span
              className="brand-logo-card public-brand-logo-tile"
              key={brand.key}
              role="listitem"
              aria-label={brand.name}
            >
              <BrandLogoImage brand={brand} />
            </span>
          ))}
        </div>
      </div>
    </Component>
  );
}

export function ServiceBrandChips({ serviceTitle }) {
  const brands = brandNamesForService(serviceTitle);
  return <BrandChips brands={brands} className="service-brand-chip-row" compact ariaLabel={`Supported brands for ${serviceTitle}`} />;
}

export function BookingBrandSupport({ serviceTitle }) {
  const brands = brandNamesForService(serviceTitle);
  if (brands.length) {
    return (
      <div className="booking-brand-support" aria-live="polite">
        <p className="booking-section-eyebrow">Brands We Service &amp; Support</p>
        <BrandChips brands={brands} compact ariaLabel={`Supported brands for ${serviceTitle}`} />
      </div>
    );
  }

  if (shouldShowStandardProductNote(serviceTitle)) {
    return (
      <div className="booking-brand-support booking-brand-support-note" aria-live="polite">
        <p>We support multiple standard products based on customer requirements.</p>
      </div>
    );
  }

  return null;
}
