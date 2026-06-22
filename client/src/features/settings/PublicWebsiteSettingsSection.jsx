import {
  CalendarClock,
  ChevronsDownUp,
  ChevronsUpDown,
  Edit3,
  Eye,
  Globe2,
  GripVertical,
  ImageUp,
  Loader2,
  MapPin,
  MoreHorizontal,
  Palette,
  Plus,
  Copy,
  RotateCcw,
  Save,
  Search,
  ShieldCheck,
  Trash2,
  UploadCloud,
  X
} from 'lucide-react';
import {
  ConfirmModal,
  ErrorBlock,
  formatDate,
  LoadingBlock,
  useAuth,
  useEffect,
  useMemo,
  useResource,
  useState,
  useToast
} from '../../shared/phase1Shared.jsx';
import { can, hasRole } from '../../utils/roles.js';
import { defaultPublicWebsiteSettings, mergePublicWebsiteSettings, publicAssetUrl, publicLogoUrl } from '../../utils/publicWebsiteDefaults.js';

const imageTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const maxImageSize = 5 * 1024 * 1024;
const publicWebsiteSections = [
  { id: 'hero', label: 'Hero', title: 'Hero Section', description: 'Control the public homepage hero, primary actions, imagery, and website availability.' },
  { id: 'services', label: 'Services', title: 'Services Section', description: 'Manage service cards, ordering, visibility, categories, and public service imagery.' },
  { id: 'contact', label: 'Contact', title: 'Contact Section', description: 'Tune public phone, WhatsApp, email, hours, address, and map links.' },
  { id: 'booking', label: 'Booking', title: 'Booking Settings', description: 'Control public booking visibility, intake fields, and the default booking status.' },
  { id: 'branding', label: 'Branding', title: 'Logo & Branding', description: 'Set public website logo behavior and accent color independently from the admin theme.' },
  { id: 'seo', label: 'SEO', title: 'SEO Settings', description: 'Prepare search titles, metadata, keywords, and social sharing imagery.' },
  { id: 'footer', label: 'Footer', title: 'Footer Settings', description: 'Review footer identity and theme separation behavior.' }
];

function cloneSettings(settings) {
  return JSON.parse(JSON.stringify(mergePublicWebsiteSettings(settings || defaultPublicWebsiteSettings)));
}

function updateNested(target, path, value) {
  const next = cloneSettings(target);
  const keys = path.split('.');
  let cursor = next;
  keys.slice(0, -1).forEach((key) => {
    cursor[key] = cursor[key] || {};
    cursor = cursor[key];
  });
  cursor[keys.at(-1)] = value;
  return next;
}

function displayUser(user) {
  return user?.name || user?.username || 'System default';
}

function cleanAssetLabel(value = '') {
  if (!value) return 'No image selected';
  const path = String(value).split('?')[0].split('#')[0];
  const filename = path.split('/').filter(Boolean).pop() || path;
  try {
    return decodeURIComponent(filename).replace(/\s+/g, '-').toLowerCase();
  } catch {
    return filename.replace(/%20/g, '-').replace(/\s+/g, '-').toLowerCase();
  }
}

function isValidEmail(value = '') {
  const trimmed = String(value || '').trim();
  return trimmed ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed) : true;
}

function numberHint(value = '') {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return 'Use digits with optional country code.';
  if (digits.length < 10) return `${digits.length} digits entered. Check the number before saving.`;
  return `${digits.length} digits entered. Looks ready.`;
}

function clampNumber(value, fallback, min, max) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(max, Math.max(min, Math.round(numeric)));
}

function sectionStatus(sectionId, draft, savedSettings) {
  const heroDirty = JSON.stringify(draft.hero || {}) !== JSON.stringify(savedSettings.hero || {});
  const services = draft.services || [];
  const activeServices = services.filter((service) => service.visible !== false).length;
  const hiddenServices = Math.max(0, services.length - activeServices);
  const titleLength = String(draft.seo?.websiteTitle || '').length;
  const metaLength = String(draft.seo?.metaDescription || '').length;
  const contactComplete = Boolean(draft.contact?.phoneNumber && draft.contact?.whatsappNumber && isValidEmail(draft.contact?.email));
  const bookingServiceTypes = draft.booking?.serviceTypes || [];
  const activeBookingTypes = bookingServiceTypes.filter((service) => service.active !== false).length;
  const statusBySection = {
    hero: !draft.hero?.imageUrl ? 'Needs image' : heroDirty ? 'Updated' : 'Complete',
    services: `${activeServices} active / ${hiddenServices} hidden`,
    contact: draft.contact?.googleMapsLink ? (contactComplete ? 'Complete' : 'Check contact') : 'Check map link',
    booking: draft.booking?.publicBookingEnabled ? `${activeBookingTypes} active services` : 'Disabled',
    branding: draft.branding?.logoUrl ? 'Logo set' : 'Needs logo',
    seo: `${titleLength}/60 title / ${metaLength}/160 meta`,
    footer: 'Synced from company profile'
  };
  return statusBySection[sectionId] || '';
}

function normalizeServiceTypeName(value = '') {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/\b(service|services|support|repair|maintenance)\b/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function serviceSimilarityScore(a = '', b = '') {
  const first = new Set(normalizeServiceTypeName(a).split(' ').filter(Boolean));
  const second = new Set(normalizeServiceTypeName(b).split(' ').filter(Boolean));
  if (!first.size || !second.size) return 0;
  const overlap = [...first].filter((token) => second.has(token)).length;
  return overlap / Math.max(first.size, second.size);
}

function serviceTypeDuplicateMessage(name = '', serviceTypes = [], ignoreIndex = -1) {
  const normalized = normalizeServiceTypeName(name);
  if (!normalized) return '';
  const match = serviceTypes.find((service, index) => {
    if (index === ignoreIndex) return false;
    const existing = normalizeServiceTypeName(service.name);
    const containsMatch = normalized.length > 3 && existing.length > 3 && (existing.includes(normalized) || normalized.includes(existing));
    return existing === normalized || containsMatch || serviceSimilarityScore(name, service.name) >= 0.72;
  });
  return match ? `Similar to "${match.name}". Check before saving to avoid duplicate dropdown options.` : '';
}

function makeServiceTypeKey(name = '', serviceTypes = []) {
  const base = String(name || 'service-type')
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'service-type';
  const existing = new Set(serviceTypes.map((service) => service.key));
  let key = base;
  let suffix = 2;
  while (existing.has(key)) {
    key = `${base}-${suffix}`;
    suffix += 1;
  }
  return key;
}

function ToggleField({ label, checked, disabled, onChange, helper }) {
  return (
    <label className="public-website-toggle flex items-center justify-between gap-3 rounded-card border border-white/10 bg-white/[0.035] px-3 py-3">
      <span className="min-w-0">
        <span className="block font-bold text-slate-100">{label}</span>
        {helper ? <span className="mt-1 block text-xs muted">{helper}</span> : null}
      </span>
      <input
        type="checkbox"
        className="h-4 w-4 shrink-0 accent-[var(--brand)]"
        checked={Boolean(checked)}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
    </label>
  );
}

function TextField({ label, value, onChange, disabled, type = 'text', multiline = false, rows = 3, placeholder = '', helper = '', meta = null, tone = '' }) {
  return (
    <label className={`public-website-field ${tone ? `is-${tone}` : ''}`}>
      <span className="public-website-field-label">
        <span className="label">{label}</span>
        {meta ? <span className="public-website-field-meta">{meta}</span> : null}
      </span>
      {multiline ? (
        <textarea className="input min-h-24" rows={rows} value={value || ''} placeholder={placeholder} disabled={disabled} onChange={(event) => onChange(event.target.value)} />
      ) : (
        <input className="input" type={type} value={value || ''} placeholder={placeholder} disabled={disabled} onChange={(event) => onChange(event.target.value)} />
      )}
      {helper ? <span className="public-website-field-helper">{helper}</span> : null}
    </label>
  );
}

function LogoSizeField({ label, value, min, max, disabled, onChange }) {
  const width = clampNumber(value, min, min, max);

  function commit(nextValue) {
    onChange(clampNumber(nextValue, width, min, max));
  }

  return (
    <label className="public-logo-size-field">
      <span className="public-website-field-label">
        <span className="label">{label}</span>
        <span className="public-website-field-meta">{width}px</span>
      </span>
      <div className="public-logo-size-controls">
        <input
          type="range"
          min={min}
          max={max}
          step="1"
          value={width}
          disabled={disabled}
          onChange={(event) => commit(event.target.value)}
        />
        <input
          className="input"
          type="number"
          min={min}
          max={max}
          step="1"
          value={width}
          disabled={disabled}
          onChange={(event) => commit(event.target.value)}
        />
      </div>
    </label>
  );
}

function LogoSizeControls({ branding, disabled, onChange, onReset }) {
  const navbarWidth = clampNumber(branding?.navbarLogoWidth, 180, 80, 320);
  const footerWidth = clampNumber(branding?.footerLogoWidth, 280, 120, 480);
  const previewUrl = publicLogoUrl(branding, 'header');

  return (
    <div className="public-logo-size-panel rounded-card border border-white/10 bg-white/[0.035] p-3">
      <div className="public-logo-size-panel-head">
        <div>
          <p className="font-black text-slate-100">Logo display size</p>
          <p className="mt-1 text-xs muted">Adjust how large the same public logo appears in the navbar and footer.</p>
        </div>
        <button type="button" className="btn btn-secondary admin-compact-button" disabled={disabled} onClick={onReset}>
          <RotateCcw className="h-4 w-4" />
          Reset size
        </button>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <LogoSizeField label="Navbar logo width" value={navbarWidth} min={80} max={320} disabled={disabled} onChange={(value) => onChange('navbarLogoWidth', value)} />
        <LogoSizeField label="Footer logo width" value={footerWidth} min={120} max={480} disabled={disabled} onChange={(value) => onChange('footerLogoWidth', value)} />
      </div>
      <div className="public-logo-size-preview mt-4">
        <div className="public-logo-preview-card">
          <span>Navbar preview</span>
          {previewUrl ? <img src={previewUrl} alt="Universal Systems logo navbar preview" style={{ width: `${navbarWidth}px`, maxHeight: 48 }} /> : null}
        </div>
        <div className="public-logo-preview-card is-footer">
          <span>Footer preview</span>
          {previewUrl ? <img src={previewUrl} alt="Universal Systems logo footer preview" style={{ width: `${footerWidth}px`, maxHeight: 100 }} /> : null}
        </div>
      </div>
      <p className="mt-3 text-xs font-semibold muted">For best result, upload a tightly cropped transparent PNG logo.</p>
    </div>
  );
}

function ImageField({ label, value, disabled, uploading, onUpload, onChange, previewValue = value, fallbackValue = '' }) {
  const inputId = `public-website-image-${label.replace(/\W+/g, '-').toLowerCase()}`;
  const cleanLabel = cleanAssetLabel(value);
  const [previewFailed, setPreviewFailed] = useState(false);
  const previewSource = previewFailed && fallbackValue ? fallbackValue : previewValue;
  const previewUrl = publicAssetUrl(previewSource);

  useEffect(() => {
    setPreviewFailed(false);
  }, [previewValue, fallbackValue]);

  return (
    <div className="public-website-image-field rounded-card border border-white/10 bg-white/[0.035] p-3">
      <div className="public-website-image-row">
        <div className="public-website-image-preview">
          {previewUrl ? (
            <img
              src={previewUrl}
              alt=""
              onError={() => {
                if (fallbackValue && previewSource !== fallbackValue) setPreviewFailed(true);
              }}
            />
          ) : (
            <ImageUp className="h-5 w-5 text-slate-400" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <span className="label">{label}</span>
          <div className="public-website-file-display" title={cleanLabel}>{cleanLabel}</div>
          <input className="sr-only" value={value || ''} disabled={disabled} onChange={(event) => onChange(event.target.value)} aria-label={`${label} asset path`} tabIndex={-1} />
          <p className="mt-2 text-xs muted">JPG, PNG, or WEBP up to 5 MB.</p>
        </div>
        <div className="public-website-image-actions">
          <label className={`btn btn-secondary min-h-11 ${disabled || uploading ? 'pointer-events-none opacity-60' : ''}`} htmlFor={inputId}>
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
            {value ? 'Replace' : 'Upload'}
          </label>
          {previewUrl ? (
            <a className="btn btn-secondary min-h-11" href={previewUrl} target="_blank" rel="noreferrer">
              <Eye className="h-4 w-4" />
              Preview
            </a>
          ) : null}
          {value ? (
            <button type="button" className="btn btn-secondary min-h-11" disabled={disabled || uploading} onClick={() => onChange('')}>
              <X className="h-4 w-4" />
              Remove
            </button>
          ) : null}
          <input
            id={inputId}
            type="file"
            className="hidden"
            accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
            disabled={disabled || uploading}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              onUpload(file);
            }}
          />
        </div>
      </div>
    </div>
  );
}

function SectionCard({ title, description = '', status = '', icon: Icon, children, action = null }) {
  return (
    <section className="surface admin-control-card public-website-section-card p-5">
      <div className="public-website-section-head mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="admin-control-icon">
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="public-website-section-title-row">
              <h2 className="text-xl font-black">{title}</h2>
              {status ? <span className="public-website-status-chip">{status}</span> : null}
            </div>
            {description ? <p>{description}</p> : null}
          </div>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function ServiceModal({ service, index, disabled, uploadingKey, onClose, onSave, onUpload }) {
  const [draft, setDraft] = useState(service || {});

  useEffect(() => {
    setDraft(service || {});
  }, [service]);

  if (!service) return null;

  function update(field, value) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-black/55 p-4">
      <div className="surface admin-modal max-h-[92vh] w-full max-w-2xl overflow-y-auto p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-[var(--brand)]">Service Card</p>
            <h2 className="mt-1 text-xl font-black">{draft.title || `Service ${index + 1}`}</h2>
          </div>
          <button type="button" className="icon-button h-9 w-9" onClick={onClose} aria-label="Close service editor">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <TextField label="Service title" value={draft.title} disabled={disabled} onChange={(value) => update('title', value)} />
          <TextField label="Categories" value={(draft.categories || []).join(', ')} disabled={disabled} onChange={(value) => update('categories', value.split(',').map((item) => item.trim()).filter(Boolean))} placeholder="Computer & Laptop, Support & Recovery" />
          <label className="lg:col-span-2">
            <span className="label">Service description</span>
            <textarea className="input min-h-28" value={draft.description || ''} disabled={disabled} onChange={(event) => update('description', event.target.value)} />
          </label>
          <div className="lg:col-span-2">
            <ImageField
              label="Service image"
              value={draft.imageUrl}
              disabled={disabled}
              uploading={uploadingKey === `service-${index}`}
              onChange={(value) => update('imageUrl', value)}
              onUpload={(file) => onUpload(file, (url) => update('imageUrl', url), `service-${index}`)}
            />
          </div>
          <ToggleField label="Visible on public website" checked={draft.visible !== false} disabled={disabled} onChange={(value) => update('visible', value)} />
        </div>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="button" className="btn btn-primary" disabled={disabled} onClick={() => onSave(draft)}>
            <Save className="h-4 w-4" />
            Save Service
          </button>
        </div>
      </div>
    </div>
  );
}

function ServiceEditor({ services, disabled, uploadingKey, onChange, onUpload }) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [expanded, setExpanded] = useState(() => new Set());
  const [editingIndex, setEditingIndex] = useState(null);
  const [deleteIndex, setDeleteIndex] = useState(null);
  const [menuIndex, setMenuIndex] = useState(null);

  function normalize(nextServices) {
    onChange(nextServices.map((service, index) => ({ ...service, order: index })));
  }

  function update(index, field, value) {
    const next = [...services];
    next[index] = { ...next[index], [field]: value };
    normalize(next);
  }

  function move(index, direction) {
    const target = index + direction;
    if (target < 0 || target >= services.length) return;
    const next = [...services];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    normalize(next);
  }

  function addService() {
    normalize([
      ...services,
      {
        title: 'New Service',
        description: 'Describe this service.',
        imageUrl: '/images/service-laptop.png',
        visible: true,
        order: services.length,
        categories: []
      }
    ]);
  }

  function duplicateService(index) {
    const source = services[index];
    if (!source) return;
    normalize([
      ...services.slice(0, index + 1),
      { ...source, title: `${source.title || 'Service'} Copy`, order: index + 1 },
      ...services.slice(index + 1)
    ]);
  }

  const categories = useMemo(() => {
    const values = new Set();
    services.forEach((service) => (service.categories || []).forEach((item) => values.add(item)));
    return ['All', ...Array.from(values).sort((a, b) => a.localeCompare(b))];
  }, [services]);

  const filteredServices = useMemo(() => {
    const term = search.trim().toLowerCase();
    return services
      .map((service, index) => ({ service, index }))
      .filter(({ service }) => {
        const matchesSearch = !term || `${service.title || ''} ${service.description || ''} ${(service.categories || []).join(' ')}`.toLowerCase().includes(term);
        const matchesCategory = category === 'All' || (service.categories || []).includes(category);
        return matchesSearch && matchesCategory;
      });
  }, [category, search, services]);
  const activeCount = services.filter((service) => service.visible !== false).length;
  const hiddenCount = Math.max(0, services.length - activeCount);

  function toggleExpanded(index) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  function expandAll() {
    setExpanded(new Set(filteredServices.map((item) => item.index)));
  }

  function collapseAll() {
    setExpanded(new Set());
  }

  function saveService(index, nextService) {
    const next = [...services];
    next[index] = { ...next[index], ...nextService };
    normalize(next);
    setEditingIndex(null);
  }

  function deleteService() {
    if (deleteIndex == null) return;
    normalize(services.filter((_, itemIndex) => itemIndex !== deleteIndex));
    setDeleteIndex(null);
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_auto]">
        <label className="search-input-shell relative block">
          <span className="search-input-icon pointer-events-none muted" aria-hidden="true"><Search className="h-4 w-4" /></span>
          <input className="input search-input-control pl-9" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search services" />
        </label>
        <select className="input" value={category} onChange={(event) => setCategory(event.target.value)}>
          {categories.map((item) => <option key={item}>{item}</option>)}
        </select>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-secondary admin-compact-button" onClick={expandAll}>
            <ChevronsUpDown className="h-4 w-4" />
            Expand All
          </button>
          <button type="button" className="btn btn-secondary admin-compact-button" onClick={collapseAll}>
            <ChevronsDownUp className="h-4 w-4" />
            Collapse All
          </button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <span className="rounded-full border border-emerald-400/25 bg-emerald-500/15 px-3 py-1 text-xs font-black text-emerald-100">{activeCount} active</span>
        <span className="rounded-full border border-slate-400/25 bg-slate-500/15 px-3 py-1 text-xs font-black text-slate-100">{hiddenCount} hidden</span>
        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-black text-slate-200">{services.length} total services</span>
      </div>

      <div className="grid gap-3">
        {filteredServices.map(({ service, index }, rowIndex) => {
          const menuOpen = menuIndex === index;
          const menuOpensUp = rowIndex >= filteredServices.length - 2;
          return (
          <article key={`${service.title}-${index}`} className={`public-website-service-row ${service.visible === false ? 'is-hidden' : ''} ${menuOpen ? 'is-menu-open' : ''} ${menuOpensUp ? 'is-menu-up' : ''}`}>
            <div className="public-website-service-main">
              <button type="button" className="public-website-service-summary" onClick={() => toggleExpanded(index)}>
                <span className="public-website-service-handle"><GripVertical className="h-4 w-4" />{index + 1}</span>
                {service.imageUrl ? <img className="public-website-service-thumb" src={publicAssetUrl(service.imageUrl)} alt="" /> : null}
                <span className="public-website-service-copy">
                  <span className="block truncate font-black text-slate-100">{service.title || `Service ${index + 1}`}</span>
                  <span className="mt-1 block truncate text-xs muted">Order {index + 1} - {(service.categories || []).join(', ') || 'No category'}</span>
                </span>
              </button>
              <div className="public-website-service-actions">
                <button type="button" className="btn btn-secondary py-2 text-xs" disabled={disabled || index === 0} onClick={() => move(index, -1)}>Up</button>
                <button type="button" className="btn btn-secondary py-2 text-xs" disabled={disabled || index === services.length - 1} onClick={() => move(index, 1)}>Down</button>
                <button type="button" className="btn btn-secondary py-2 text-xs" disabled={disabled} onClick={() => update(index, 'visible', service.visible === false)}>
                  {service.visible === false ? 'Show' : 'Hide'}
                </button>
                <button type="button" className="btn btn-secondary py-2 text-xs" disabled={disabled} onClick={() => setEditingIndex(index)}>
                  <Edit3 className="h-3.5 w-3.5" />
                  Edit
                </button>
                <div className="public-website-row-menu-wrap">
                  <button type="button" className="icon-button h-9 w-9" disabled={disabled} aria-label={`More actions for ${service.title || `Service ${index + 1}`}`} onClick={() => setMenuIndex(menuIndex === index ? null : index)}>
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                  {menuOpen ? (
                    <div className="public-website-row-menu" role="menu">
                      <button type="button" role="menuitem" onClick={() => { duplicateService(index); setMenuIndex(null); }}>
                        <Copy className="h-4 w-4" />
                        Duplicate
                      </button>
                      <button type="button" role="menuitem" className="is-danger" onClick={() => { setDeleteIndex(index); setMenuIndex(null); }}>
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
            {expanded.has(index) ? (
              <div className="mt-3 rounded-card border border-white/10 bg-slate-950/20 p-3">
                <p className="text-sm leading-6 muted">{service.description || 'No description provided.'}</p>
              </div>
            ) : null}
          </article>
          );
        })}
        {!filteredServices.length ? <p className="rounded-card border border-white/10 bg-white/[0.035] p-4 text-sm muted">No services match the current search or category.</p> : null}
      </div>
      <button type="button" className="btn btn-secondary justify-center" disabled={disabled} onClick={addService}>
        <Plus className="h-4 w-4" />
        Add Service Card
      </button>
      {editingIndex != null ? (
        <ServiceModal
          service={services[editingIndex]}
          index={editingIndex}
          disabled={disabled}
          uploadingKey={uploadingKey}
          onClose={() => setEditingIndex(null)}
          onSave={(nextService) => saveService(editingIndex, nextService)}
          onUpload={onUpload}
        />
      ) : null}
      {deleteIndex != null ? (
        <ConfirmModal
          title="Remove service card?"
          message={`Remove ${services[deleteIndex]?.title || 'this service'} from this public website draft. This only removes the marketing card and does not change existing bookings.`}
          confirmLabel="Remove Service Card"
          onCancel={() => setDeleteIndex(null)}
          onConfirm={deleteService}
        />
      ) : null}
    </div>
  );
}

function BookingServiceTypeManager({ serviceTypes = [], usageCounts = {}, disabled, onChange, onBlockedDelete }) {
  const [newName, setNewName] = useState('');
  const [confirmAction, setConfirmAction] = useState(null);
  const sortedTypes = useMemo(() => (
    [...serviceTypes]
      .sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
      .map((service, index) => ({ ...service, order: index }))
  ), [serviceTypes]);
  const activeCount = sortedTypes.filter((service) => service.active !== false).length;
  const inactiveCount = Math.max(0, sortedTypes.length - activeCount);
  const addWarning = serviceTypeDuplicateMessage(newName, sortedTypes);

  function commit(nextTypes) {
    onChange(nextTypes.map((service, index) => ({
      ...service,
      name: String(service.name || '').trim(),
      key: service.key || makeServiceTypeKey(service.name, nextTypes),
      order: index
    })).filter((service) => service.name));
  }

  function update(index, patch) {
    const next = [...sortedTypes];
    next[index] = { ...next[index], ...patch };
    commit(next);
  }

  function move(index, direction) {
    const target = index + direction;
    if (target < 0 || target >= sortedTypes.length) return;
    const next = [...sortedTypes];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    commit(next);
  }

  function addServiceType() {
    const name = newName.trim();
    if (!name) return;
    commit([
      ...sortedTypes,
      {
        key: makeServiceTypeKey(name, sortedTypes),
        name,
        active: true,
        order: sortedTypes.length
      }
    ]);
    setNewName('');
  }

  function deleteServiceType(service) {
    const index = sortedTypes.findIndex((item) => item.key === service.key);
    if (index < 0) return;
    const usage = usageCounts[service.name] || 0;
    if (usage > 0) {
      onBlockedDelete?.(service.name);
      return;
    }
    commit(sortedTypes.filter((_, itemIndex) => itemIndex !== index));
  }

  return (
    <div className="public-booking-service-manager">
      <div className="public-booking-service-head">
        <div>
          <h3>Service Type Dropdown</h3>
          <p>Manage the exact service options customers see on the public Book Service form.</p>
        </div>
        <div className="public-booking-service-stats">
          <span>{activeCount} active</span>
          <span>{inactiveCount} hidden</span>
          <span>{sortedTypes.length} total</span>
        </div>
      </div>

      <div className="public-booking-service-add">
        <label className="public-website-field">
          <span className="public-website-field-label">
            <span className="label">Add service type</span>
          </span>
          <input
            className="input"
            value={newName}
            disabled={disabled}
            onChange={(event) => setNewName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                addServiceType();
              }
            }}
            placeholder="Example: Laptop Repair"
          />
          {addWarning ? <span className="public-website-field-helper text-amber-100">{addWarning}</span> : null}
        </label>
        <button type="button" className="btn btn-secondary admin-compact-button" disabled={disabled || !newName.trim()} onClick={addServiceType}>
          <Plus className="h-4 w-4" />
          Add Type
        </button>
      </div>

      <div className="public-booking-service-list">
        {sortedTypes.map((service, index) => {
          const usage = usageCounts[service.name] || 0;
          const duplicateWarning = serviceTypeDuplicateMessage(service.name, sortedTypes, index);
          return (
            <article key={service.key || `${service.name}-${index}`} className={`public-booking-service-row ${service.active === false ? 'is-inactive' : ''}`}>
              <div className="public-booking-service-order">
                <GripVertical className="h-4 w-4" />
                {index + 1}
              </div>
              <label className="public-booking-service-name">
                <span className="sr-only">Service type name</span>
                <input
                  className="input"
                  value={service.name || ''}
                  disabled={disabled}
                  onChange={(event) => update(index, { name: event.target.value })}
                />
                {duplicateWarning ? <span>{duplicateWarning}</span> : null}
              </label>
              <div className="public-booking-service-meta">
                <span className={service.active === false ? 'is-hidden' : 'is-active'}>{service.active === false ? 'Hidden' : 'Active'}</span>
                {usage > 0 ? <span>{usage} booking{usage === 1 ? '' : 's'}</span> : <span>Unused</span>}
              </div>
              <div className="public-booking-service-actions">
                <button type="button" className="btn btn-secondary py-2 text-xs" disabled={disabled || index === 0} onClick={() => move(index, -1)}>Up</button>
                <button type="button" className="btn btn-secondary py-2 text-xs" disabled={disabled || index === sortedTypes.length - 1} onClick={() => move(index, 1)}>Down</button>
                <button type="button" className="btn btn-secondary py-2 text-xs" disabled={disabled} onClick={() => {
                  if (service.active === false) update(index, { active: true });
                  else setConfirmAction({ type: 'disable', service });
                }}>
                  {service.active === false ? 'Enable' : 'Disable'}
                </button>
                <button type="button" className="btn btn-secondary py-2 text-xs" disabled={disabled} onClick={() => setConfirmAction({ type: usage > 0 ? 'disable' : 'delete', service })}>
                  <Trash2 className="h-3.5 w-3.5" />
                  {usage > 0 ? 'Disable' : 'Delete'}
                </button>
              </div>
            </article>
          );
        })}
        {!sortedTypes.length ? (
          <p className="rounded-card border border-white/10 bg-white/[0.035] p-4 text-sm muted">No service types yet. Add at least one active service type for the public booking dropdown.</p>
        ) : null}
      </div>
      <p className="public-booking-service-note">Inactive service types are hidden from the public dropdown. Existing bookings keep their saved service type text.</p>
      {confirmAction ? (
        <ConfirmModal
          title={confirmAction.type === 'disable' ? 'Disable service type?' : 'Remove service type?'}
          message={confirmAction.type === 'disable'
            ? `${confirmAction.service.name} will be disabled in this draft and hidden from the public dropdown after Save Changes. Existing bookings keep their saved service type text.`
            : `Remove ${confirmAction.service.name} from this public booking dropdown draft. This service type is not used by existing bookings.`}
          confirmLabel={confirmAction.type === 'disable' ? 'Disable' : 'Remove Service Type'}
          onCancel={() => setConfirmAction(null)}
          onConfirm={() => {
            const action = confirmAction;
            setConfirmAction(null);
            if (action.type === 'disable') {
              const index = sortedTypes.findIndex((item) => item.key === action.service.key);
              if (index >= 0) update(index, { active: false });
              return;
            }
            deleteServiceType(action.service);
          }}
        />
      ) : null}
    </div>
  );
}

export function PublicWebsiteSettingsSection({ onDirtyChange = null }) {
  const { request, user } = useAuth();
  const { push } = useToast();
  const canEdit = hasRole(user, 'admin') && can(user, 'manage_public_website_settings');
  const [draft, setDraft] = useState(defaultPublicWebsiteSettings);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [uploadingKey, setUploadingKey] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);
  const [activeSection, setActiveSection] = useState(publicWebsiteSections[0].id);
  const { data, loading, error, reload } = useResource(() => request('/settings/public-website'), [request]);
  const savedSettings = useMemo(() => mergePublicWebsiteSettings(data?.settings || defaultPublicWebsiteSettings), [data?.settings]);
  const serviceTypeUsage = useMemo(() => data?.serviceTypeUsage || {}, [data?.serviceTypeUsage]);
  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(savedSettings), [draft, savedSettings]);

  useEffect(() => {
    setDraft(cloneSettings(savedSettings));
  }, [savedSettings]);

  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  const activeSectionMeta = publicWebsiteSections.find((section) => section.id === activeSection) || publicWebsiteSections[0];
  const activeSectionStatus = sectionStatus(activeSection, draft, savedSettings);

  function selectSection(sectionId) {
    setActiveSection(sectionId);
  }

  function setPath(path, value) {
    setDraft((current) => updateNested(current, path, value));
  }

  async function uploadImage(file, applyUrl, key) {
    if (!file) return;
    if (!imageTypes.has(file.type)) {
      push('Only JPG, PNG, and WEBP images are allowed', 'error');
      return;
    }
    if (file.size > maxImageSize) {
      push('Image size must be 5 MB or less', 'error');
      return;
    }
    const form = new FormData();
    form.append('image', file);
    setUploadingKey(key);
    try {
      const result = await request('/settings/public-website/assets', { method: 'POST', body: form });
      applyUrl(result.asset?.url || '');
      push('Image uploaded');
    } catch (err) {
      push(err.message, 'error');
    } finally {
      setUploadingKey('');
    }
  }

  async function saveSettings(event) {
    event?.preventDefault?.();
    if (!canEdit) {
      push('Only admin users can edit public website settings', 'error');
      return;
    }
    setSaving(true);
    try {
      const result = await request('/settings/public-website', {
        method: 'PATCH',
        body: JSON.stringify({ settings: draft })
      });
      push(result.message || 'Public website settings saved');
      await reload({ silent: true });
    } catch (err) {
      push(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function resetDefaults() {
    if (!canEdit) {
      push('Only admin users can reset public website settings', 'error');
      return;
    }
    setResetting(true);
    try {
      const result = await request('/settings/public-website/reset', { method: 'POST' });
      push(result.message || 'Public website settings reset');
      await reload({ silent: true });
    } catch (err) {
      push(err.message, 'error');
    } finally {
      setResetting(false);
    }
  }

  if (loading) return <LoadingBlock />;
  if (error) return <ErrorBlock message={error} />;

  return (
    <form className="public-website-settings grid gap-5" onSubmit={saveSettings}>
      <section className="surface admin-control-card public-website-settings-hero p-5">
        <div className="public-website-hero-row flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <p className="text-xs font-black uppercase tracking-wide text-[var(--brand)]">PUBLIC WEBSITE</p>
              <span className="admin-premium-badge">SEPARATE FROM ADMIN THEME</span>
            </div>
            <h2 className="text-2xl font-black">Public Website Settings</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 muted">Manage public website content, booking visibility, branding, services, contact information, and SEO without editing code.</p>
          </div>
          <div className="public-website-hero-actions flex flex-wrap gap-2">
            <a className="btn btn-secondary admin-compact-button" href="/" target="_blank" rel="noreferrer">
              <Eye className="h-4 w-4" />
              Preview Website
            </a>
            <button type="button" className="btn btn-secondary admin-compact-button" disabled={!canEdit || resetting} onClick={() => setConfirmReset(true)}>
              {resetting ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
              Reset to Default
            </button>
            <button type="submit" className="btn btn-primary admin-compact-button" disabled={!canEdit || saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <div className="settings-info-item">
            <ShieldCheck className="h-4 w-4 text-[var(--brand)]" />
            <div>
              <p className="text-xs font-black uppercase text-slate-400">Last updated by</p>
              <p className="mt-1 font-bold text-slate-100">{displayUser(data?.settings?.lastUpdatedBy)}</p>
            </div>
          </div>
          <div className="settings-info-item">
            <CalendarClock className="h-4 w-4 text-[var(--brand)]" />
            <div>
              <p className="text-xs font-black uppercase text-slate-400">Last updated date</p>
              <p className="mt-1 font-bold text-slate-100">{data?.settings?.lastUpdatedDate ? formatDate(data.settings.lastUpdatedDate) : 'Not edited yet'}</p>
            </div>
          </div>
        </div>
        {!canEdit ? <p className="mt-4 rounded-card border border-amber-300/25 bg-amber-500/10 p-3 text-sm font-semibold text-amber-100">Only admin users can save, upload, or reset public website settings.</p> : null}
      </section>

      <nav className="public-website-section-nav" aria-label="Public website settings sections">
        {publicWebsiteSections.map((section) => (
          <button key={section.id} type="button" className={activeSection === section.id ? 'is-active' : ''} onClick={() => selectSection(section.id)}>
            <span>{section.label}</span>
            <small>{sectionStatus(section.id, draft, savedSettings)}</small>
          </button>
        ))}
      </nav>

      <div className="public-website-active-panel" data-active-section={activeSection}>
      {activeSection === 'hero' ? (
      <SectionCard title={activeSectionMeta.title} description={activeSectionMeta.description} status={activeSectionStatus} icon={ImageUp}>
        <div className="public-website-subsection">
          <div>
            <h3>Website Status</h3>
            <p>Availability controls stay here so the public page can be paused without leaving the hero editor.</p>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <ToggleField label="Public website enabled" checked={draft.status.websiteEnabled} disabled={!canEdit} onChange={(value) => setPath('status.websiteEnabled', value)} />
            <ToggleField label="Maintenance mode" checked={draft.status.maintenanceMode} disabled={!canEdit} onChange={(value) => setPath('status.maintenanceMode', value)} />
            <div className="lg:col-span-2">
              <TextField label="Maintenance message" value={draft.status.maintenanceMessage} disabled={!canEdit} multiline rows={3} onChange={(value) => setPath('status.maintenanceMessage', value)} />
            </div>
          </div>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <TextField label="Hero title" value={draft.hero.title} disabled={!canEdit} onChange={(value) => setPath('hero.title', value)} />
          <TextField label="Hero subtitle" value={draft.hero.subtitle} disabled={!canEdit} multiline rows={4} onChange={(value) => setPath('hero.subtitle', value)} />
          <TextField label="Primary button text" value={draft.hero.primaryButtonText} disabled={!canEdit} onChange={(value) => setPath('hero.primaryButtonText', value)} />
          <TextField label="Secondary button text" value={draft.hero.secondaryButtonText} disabled={!canEdit} onChange={(value) => setPath('hero.secondaryButtonText', value)} />
          <div className="lg:col-span-2">
            <ImageField label="Hero image" value={draft.hero.imageUrl} disabled={!canEdit} uploading={uploadingKey === 'hero'} onChange={(value) => setPath('hero.imageUrl', value)} onUpload={(file) => uploadImage(file, (url) => setPath('hero.imageUrl', url), 'hero')} />
          </div>
          <div className="lg:col-span-2">
            <ToggleField label="Enable glassmorphism hero card animation" checked={draft.hero.glassmorphismAnimation} disabled={!canEdit} onChange={(value) => setPath('hero.glassmorphismAnimation', value)} />
          </div>
        </div>
      </SectionCard>
      ) : null}

      {activeSection === 'services' ? (
      <SectionCard title={activeSectionMeta.title} description={activeSectionMeta.description} status={activeSectionStatus} icon={GripVertical}>
        <ServiceEditor services={draft.services || []} disabled={!canEdit} uploadingKey={uploadingKey} onChange={(services) => setDraft((current) => ({ ...current, services }))} onUpload={uploadImage} />
      </SectionCard>
      ) : null}

      {activeSection === 'contact' ? (
      <SectionCard title={activeSectionMeta.title} description={activeSectionMeta.description} status={activeSectionStatus} icon={MapPin}>
        <div className="grid gap-4 lg:grid-cols-2">
          <TextField label="Phone number" value={draft.contact.phoneNumber} disabled={!canEdit} helper={numberHint(draft.contact.phoneNumber)} onChange={(value) => setPath('contact.phoneNumber', value)} />
          <TextField label="WhatsApp number" value={draft.contact.whatsappNumber} disabled={!canEdit} helper={numberHint(draft.contact.whatsappNumber)} onChange={(value) => setPath('contact.whatsappNumber', value)} />
          <TextField label="Email" value={draft.contact.email} disabled={!canEdit} tone={isValidEmail(draft.contact.email) ? 'valid' : 'invalid'} helper={isValidEmail(draft.contact.email) ? 'Used for public contact links.' : 'Check the email format before saving.'} onChange={(value) => setPath('contact.email', value)} />
          <TextField label="Business hours" value={draft.contact.businessHours} disabled={!canEdit} onChange={(value) => setPath('contact.businessHours', value)} />
          <div className="lg:col-span-2">
            <TextField label="Address" value={draft.contact.address} disabled={!canEdit} multiline rows={3} onChange={(value) => setPath('contact.address', value)} />
          </div>
          <div className="lg:col-span-2">
            <div className="public-website-map-field">
              <TextField label="Google Maps link" value={draft.contact.googleMapsLink} disabled={!canEdit} helper="Paste a public Google Maps URL for the contact section." onChange={(value) => setPath('contact.googleMapsLink', value)} />
              {draft.contact.googleMapsLink ? (
                <a className="btn btn-secondary admin-compact-button" href={draft.contact.googleMapsLink} target="_blank" rel="noreferrer">
                  <MapPin className="h-4 w-4" />
                  Test Link
                </a>
              ) : null}
            </div>
          </div>
        </div>
      </SectionCard>
      ) : null}

      {activeSection === 'booking' ? (
      <SectionCard title={activeSectionMeta.title} description={activeSectionMeta.description} status={activeSectionStatus} icon={CalendarClock}>
        <div className="grid gap-4 lg:grid-cols-2">
          <ToggleField label="Enable public booking" checked={draft.booking.publicBookingEnabled} disabled={!canEdit} onChange={(value) => setPath('booking.publicBookingEnabled', value)} />
          <ToggleField label="Show service selection" checked={draft.booking.showServiceSelection} disabled={!canEdit} onChange={(value) => setPath('booking.showServiceSelection', value)} />
          <ToggleField label="Show preferred date/time field" checked={draft.booking.showPreferredDateTime} disabled={!canEdit} onChange={(value) => setPath('booking.showPreferredDateTime', value)} />
          <TextField label="Booking button text" value={draft.booking.bookingButtonText} disabled={!canEdit} onChange={(value) => setPath('booking.bookingButtonText', value)} />
          <label>
            <span className="label">Default booking status</span>
            <select className="input" value={draft.booking.defaultBookingStatus} disabled={!canEdit} onChange={(event) => setPath('booking.defaultBookingStatus', event.target.value)}>
              <option>Pending</option>
              <option>Converted</option>
            </select>
          </label>
        </div>
        <div className="mt-5">
          <BookingServiceTypeManager
            serviceTypes={draft.booking.serviceTypes || []}
            usageCounts={serviceTypeUsage}
            disabled={!canEdit}
            onChange={(serviceTypes) => setPath('booking.serviceTypes', serviceTypes)}
            onBlockedDelete={(name) => push(`${name} is used in existing bookings. You can disable it instead.`, 'info')}
          />
        </div>
      </SectionCard>
      ) : null}

      {activeSection === 'branding' ? (
      <SectionCard title={activeSectionMeta.title} description={activeSectionMeta.description} status={activeSectionStatus} icon={Palette}>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="grid gap-2">
            <ToggleField label="Use company logo on public website" checked={draft.branding.useCompanyLogo} disabled={!canEdit} onChange={(value) => setPath('branding.useCompanyLogo', value)} />
            <p className="rounded-card border border-white/10 bg-white/[0.035] px-3 py-2 text-xs font-semibold muted">
              {draft.branding.useCompanyLogo
                ? 'Company logo is active. Custom logo is saved but not used.'
                : 'Custom public website logo is active.'}
            </p>
          </div>
          <label>
            <span className="label">Accent color for public website</span>
            <div className="grid grid-cols-[3.25rem_minmax(0,1fr)] gap-2">
              <input className="h-12 w-full rounded-card border border-white/10 bg-transparent p-1" type="color" value={draft.branding.accentColor || '#75c4ff'} disabled={!canEdit} onChange={(event) => setPath('branding.accentColor', event.target.value)} />
              <input className="input" value={draft.branding.accentColor || ''} disabled={!canEdit} onChange={(event) => setPath('branding.accentColor', event.target.value)} />
            </div>
          </label>
          <div className="lg:col-span-2">
            <ImageField
              label="Public website logo"
              value={draft.branding.logoUrl}
              previewValue={publicLogoUrl(draft.branding, 'header')}
              fallbackValue="/logo-icon.png"
              disabled={!canEdit}
              uploading={uploadingKey === 'logo'}
              onChange={(value) => setPath('branding.logoUrl', value)}
              onUpload={(file) => uploadImage(file, (url) => setPath('branding.logoUrl', url), 'logo')}
            />
          </div>
          <div className="lg:col-span-2">
            <LogoSizeControls
              branding={draft.branding}
              disabled={!canEdit}
              onChange={(field, value) => setPath(`branding.${field}`, value)}
              onReset={() => {
                setPath('branding.navbarLogoWidth', 180);
                setPath('branding.footerLogoWidth', 280);
              }}
            />
          </div>
        </div>
      </SectionCard>
      ) : null}

      {activeSection === 'seo' ? (
      <SectionCard title={activeSectionMeta.title} description={activeSectionMeta.description} status={activeSectionStatus} icon={Search}>
        <div className="grid gap-4 lg:grid-cols-2">
          <TextField label="Website title" value={draft.seo.websiteTitle} disabled={!canEdit} meta={`${String(draft.seo.websiteTitle || '').length}/60`} onChange={(value) => setPath('seo.websiteTitle', value)} />
          <TextField label="Keywords" value={draft.seo.keywords} disabled={!canEdit} onChange={(value) => setPath('seo.keywords', value)} />
          <div className="lg:col-span-2">
            <TextField label="Meta description" value={draft.seo.metaDescription} disabled={!canEdit} multiline rows={3} meta={`${String(draft.seo.metaDescription || '').length}/160`} onChange={(value) => setPath('seo.metaDescription', value)} />
          </div>
          <div className="lg:col-span-2">
            <ImageField label="Social sharing image" value={draft.seo.socialSharingImage} disabled={!canEdit} uploading={uploadingKey === 'seo'} onChange={(value) => setPath('seo.socialSharingImage', value)} onUpload={(file) => uploadImage(file, (url) => setPath('seo.socialSharingImage', url), 'seo')} />
          </div>
        </div>
      </SectionCard>
      ) : null}

      {activeSection === 'footer' ? (
        <SectionCard title={activeSectionMeta.title} description={activeSectionMeta.description} status={activeSectionStatus} icon={ShieldCheck}>
          <div className="public-website-footer-grid grid gap-3 md:grid-cols-2">
            <div className="public-website-footer-info rounded-card border border-white/10 bg-white/[0.035] p-3">
              <p className="font-black text-slate-100">Footer identity</p>
              <p className="mt-1 text-sm leading-6 muted">Company name, contact details, WhatsApp, and logo are sourced from Company Profile with safe static fallbacks.</p>
            </div>
            <div className="public-website-footer-info rounded-card border border-white/10 bg-white/[0.035] p-3">
              <p className="font-black text-slate-100">Public theme separation</p>
              <p className="mt-1 text-sm leading-6 muted">Public accent and branding stay separate from admin dark/light theme preferences.</p>
            </div>
          </div>
        </SectionCard>
      ) : null}
      </div>

      <div className="surface admin-control-card public-website-bottom-actions flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-end">
        <button type="button" className="btn btn-secondary" disabled={saving} onClick={() => setDraft(cloneSettings(savedSettings))}>
          Cancel / Revert
        </button>
        <button type="submit" className="btn btn-primary" disabled={!canEdit || saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
      {dirty ? (
        <div className="public-website-save-bar" role="status" aria-live="polite">
          <div>
            <p>Unsaved changes in Public Website Settings</p>
            <span>Your public website draft has changes ready to save.</span>
          </div>
          <div className="public-website-save-bar-actions">
            <button type="button" className="btn btn-secondary admin-compact-button" disabled={saving} onClick={() => setDraft(cloneSettings(savedSettings))}>
              Cancel / Revert
            </button>
            <button type="button" className="btn btn-primary admin-compact-button" disabled={!canEdit || saving} onClick={saveSettings}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Changes
            </button>
          </div>
        </div>
      ) : null}
      {confirmReset ? (
        <ConfirmModal
          title="Reset public website settings?"
          message="This resets public website content and service cards to defaults. Existing bookings and generated PDFs are not changed."
          confirmLabel="Reset Settings"
          onCancel={() => setConfirmReset(false)}
          onConfirm={() => {
            setConfirmReset(false);
            resetDefaults();
          }}
        />
      ) : null}
    </form>
  );
}
