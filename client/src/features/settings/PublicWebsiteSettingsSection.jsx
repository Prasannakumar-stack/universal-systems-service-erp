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
import { defaultPublicWebsiteSettings, mergePublicWebsiteSettings, publicAssetUrl } from '../../utils/publicWebsiteDefaults.js';

const imageTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const maxImageSize = 5 * 1024 * 1024;

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

function ToggleField({ label, checked, disabled, onChange, helper }) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-card border border-white/10 bg-white/[0.035] px-3 py-3">
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

function TextField({ label, value, onChange, disabled, type = 'text', multiline = false, rows = 3, placeholder = '' }) {
  return (
    <label>
      <span className="label">{label}</span>
      {multiline ? (
        <textarea className="input min-h-24" rows={rows} value={value || ''} placeholder={placeholder} disabled={disabled} onChange={(event) => onChange(event.target.value)} />
      ) : (
        <input className="input" type={type} value={value || ''} placeholder={placeholder} disabled={disabled} onChange={(event) => onChange(event.target.value)} />
      )}
    </label>
  );
}

function ImageField({ label, value, disabled, uploading, onUpload, onChange }) {
  const inputId = `public-website-image-${label.replace(/\W+/g, '-').toLowerCase()}`;
  return (
    <div className="rounded-card border border-white/10 bg-white/[0.035] p-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <span className="label">{label}</span>
          <input className="input mt-2" value={value || ''} disabled={disabled} onChange={(event) => onChange(event.target.value)} placeholder="/image.png or uploaded URL" />
          <p className="mt-2 text-xs muted">JPG, PNG, or WEBP up to 5 MB.</p>
        </div>
        <div className="flex items-center gap-3">
          {value ? (
            <img className="h-16 w-24 rounded-card border border-white/10 object-cover" src={publicAssetUrl(value)} alt="" />
          ) : (
            <div className="grid h-16 w-24 place-items-center rounded-card border border-dashed border-white/15 bg-slate-950/30">
              <ImageUp className="h-5 w-5 text-slate-400" />
            </div>
          )}
          <label className={`btn btn-secondary min-h-11 ${disabled || uploading ? 'pointer-events-none opacity-60' : ''}`} htmlFor={inputId}>
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
            Upload
          </label>
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

function SectionCard({ title, icon: Icon, children, action = null }) {
  return (
    <section className="surface admin-control-card p-5">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="admin-control-icon">
            <Icon className="h-5 w-5" />
          </div>
          <h2 className="text-xl font-black">{title}</h2>
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
        {filteredServices.map(({ service, index }) => (
          <article key={`${service.title}-${index}`} className="rounded-card border border-white/10 bg-white/[0.035] p-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <button type="button" className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={() => toggleExpanded(index)}>
                <GripVertical className="h-5 w-5 shrink-0 text-slate-500" />
                {service.imageUrl ? <img className="h-12 w-16 rounded-card border border-white/10 object-cover" src={publicAssetUrl(service.imageUrl)} alt="" /> : null}
                <span className="min-w-0">
                  <span className="block truncate font-black text-slate-100">{service.title || `Service ${index + 1}`}</span>
                  <span className="mt-1 block truncate text-xs muted">Order {index + 1} - {(service.categories || []).join(', ') || 'No category'}</span>
                </span>
              </button>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn btn-secondary py-2 text-xs" disabled={disabled || index === 0} onClick={() => move(index, -1)}>Up</button>
                <button type="button" className="btn btn-secondary py-2 text-xs" disabled={disabled || index === services.length - 1} onClick={() => move(index, 1)}>Down</button>
                <button type="button" className="btn btn-secondary py-2 text-xs" disabled={disabled} onClick={() => update(index, 'visible', !service.visible)}>
                  {service.visible === false ? 'Show' : 'Hide'}
                </button>
                <button type="button" className="btn btn-secondary py-2 text-xs" disabled={disabled} onClick={() => setEditingIndex(index)}>
                  <Edit3 className="h-3.5 w-3.5" />
                  Edit
                </button>
                <button type="button" className="btn btn-secondary py-2 text-xs" disabled={disabled} onClick={() => duplicateService(index)}>
                  <Copy className="h-3.5 w-3.5" />
                  Duplicate
                </button>
                <button type="button" className="btn btn-secondary py-2 text-xs text-rose-100" disabled={disabled} onClick={() => setDeleteIndex(index)}>
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </button>
              </div>
            </div>
            {expanded.has(index) ? (
              <div className="mt-3 rounded-card border border-white/10 bg-slate-950/20 p-3">
                <p className="text-sm leading-6 muted">{service.description || 'No description provided.'}</p>
              </div>
            ) : null}
          </article>
        ))}
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
          title="Delete service?"
          message={`Delete ${services[deleteIndex]?.title || 'this service'} from the public website services list?`}
          confirmLabel="Delete Service"
          onCancel={() => setDeleteIndex(null)}
          onConfirm={deleteService}
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
  const { data, loading, error, reload } = useResource(() => request('/settings/public-website'), [request]);
  const savedSettings = useMemo(() => mergePublicWebsiteSettings(data?.settings || defaultPublicWebsiteSettings), [data?.settings]);
  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(savedSettings), [draft, savedSettings]);

  useEffect(() => {
    setDraft(cloneSettings(savedSettings));
  }, [savedSettings]);

  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

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
    event.preventDefault();
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
    <form className="grid gap-5" onSubmit={saveSettings}>
      <section className="surface admin-control-card p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <p className="text-xs font-black uppercase tracking-wide text-[var(--brand)]">PUBLIC WEBSITE</p>
              <span className="admin-premium-badge">SEPARATE FROM ADMIN THEME</span>
            </div>
            <h2 className="text-2xl font-black">Public Website Settings</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 muted">Manage public website content, booking visibility, branding, services, contact information, and SEO without editing code.</p>
          </div>
          <div className="flex flex-wrap gap-2">
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
        <div className="mt-5 flex flex-wrap gap-2">
          {[
            ['Hero', '#public-hero'],
            ['Services', '#public-services'],
            ['Contact', '#public-contact'],
            ['Booking', '#public-booking'],
            ['Branding', '#public-branding'],
            ['SEO', '#public-seo'],
            ['Footer', '#public-footer']
          ].map(([label, href]) => (
            <a key={label} className="btn btn-secondary admin-compact-button" href={href}>{label}</a>
          ))}
        </div>
      </section>

      <SectionCard title="Website Status" icon={Globe2}>
        <div className="grid gap-4 lg:grid-cols-2">
          <ToggleField label="Public website enabled" checked={draft.status.websiteEnabled} disabled={!canEdit} onChange={(value) => setPath('status.websiteEnabled', value)} />
          <ToggleField label="Maintenance mode" checked={draft.status.maintenanceMode} disabled={!canEdit} onChange={(value) => setPath('status.maintenanceMode', value)} />
          <div className="lg:col-span-2">
            <TextField label="Maintenance message" value={draft.status.maintenanceMessage} disabled={!canEdit} multiline rows={3} onChange={(value) => setPath('status.maintenanceMessage', value)} />
          </div>
        </div>
      </SectionCard>

      <div id="public-hero">
      <SectionCard title="Hero Section" icon={ImageUp}>
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
      </div>

      <div id="public-services">
      <SectionCard title="Services Section" icon={GripVertical}>
        <ServiceEditor services={draft.services || []} disabled={!canEdit} uploadingKey={uploadingKey} onChange={(services) => setDraft((current) => ({ ...current, services }))} onUpload={uploadImage} />
      </SectionCard>
      </div>

      <div id="public-contact">
      <SectionCard title="Contact Section" icon={MapPin}>
        <div className="grid gap-4 lg:grid-cols-2">
          <TextField label="Phone number" value={draft.contact.phoneNumber} disabled={!canEdit} onChange={(value) => setPath('contact.phoneNumber', value)} />
          <TextField label="WhatsApp number" value={draft.contact.whatsappNumber} disabled={!canEdit} onChange={(value) => setPath('contact.whatsappNumber', value)} />
          <TextField label="Email" value={draft.contact.email} disabled={!canEdit} onChange={(value) => setPath('contact.email', value)} />
          <TextField label="Business hours" value={draft.contact.businessHours} disabled={!canEdit} onChange={(value) => setPath('contact.businessHours', value)} />
          <div className="lg:col-span-2">
            <TextField label="Address" value={draft.contact.address} disabled={!canEdit} multiline rows={3} onChange={(value) => setPath('contact.address', value)} />
          </div>
          <div className="lg:col-span-2">
            <TextField label="Google Maps link" value={draft.contact.googleMapsLink} disabled={!canEdit} onChange={(value) => setPath('contact.googleMapsLink', value)} />
          </div>
        </div>
      </SectionCard>
      </div>

      <div id="public-booking">
      <SectionCard title="Booking Settings" icon={CalendarClock}>
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
      </SectionCard>
      </div>

      <div id="public-branding">
      <SectionCard title="Logo & Branding" icon={Palette}>
        <div className="grid gap-4 lg:grid-cols-2">
          <ToggleField label="Use company logo on public website" checked={draft.branding.useCompanyLogo} disabled={!canEdit} onChange={(value) => setPath('branding.useCompanyLogo', value)} />
          <label>
            <span className="label">Accent color for public website</span>
            <div className="grid grid-cols-[3.25rem_minmax(0,1fr)] gap-2">
              <input className="h-12 w-full rounded-card border border-white/10 bg-transparent p-1" type="color" value={draft.branding.accentColor || '#75c4ff'} disabled={!canEdit} onChange={(event) => setPath('branding.accentColor', event.target.value)} />
              <input className="input" value={draft.branding.accentColor || ''} disabled={!canEdit} onChange={(event) => setPath('branding.accentColor', event.target.value)} />
            </div>
          </label>
          <div className="lg:col-span-2">
            <ImageField label="Public website logo" value={draft.branding.logoUrl} disabled={!canEdit} uploading={uploadingKey === 'logo'} onChange={(value) => setPath('branding.logoUrl', value)} onUpload={(file) => uploadImage(file, (url) => setPath('branding.logoUrl', url), 'logo')} />
          </div>
        </div>
      </SectionCard>
      </div>

      <div id="public-seo">
      <SectionCard title="SEO Settings" icon={Search}>
        <div className="grid gap-4 lg:grid-cols-2">
          <TextField label="Website title" value={draft.seo.websiteTitle} disabled={!canEdit} onChange={(value) => setPath('seo.websiteTitle', value)} />
          <TextField label="Keywords" value={draft.seo.keywords} disabled={!canEdit} onChange={(value) => setPath('seo.keywords', value)} />
          <div className="lg:col-span-2">
            <TextField label="Meta description" value={draft.seo.metaDescription} disabled={!canEdit} multiline rows={3} onChange={(value) => setPath('seo.metaDescription', value)} />
          </div>
          <div className="lg:col-span-2">
            <ImageField label="Social sharing image" value={draft.seo.socialSharingImage} disabled={!canEdit} uploading={uploadingKey === 'seo'} onChange={(value) => setPath('seo.socialSharingImage', value)} onUpload={(file) => uploadImage(file, (url) => setPath('seo.socialSharingImage', url), 'seo')} />
          </div>
        </div>
      </SectionCard>
      </div>

      <div id="public-footer">
        <SectionCard title="Footer Settings" icon={ShieldCheck}>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-card border border-white/10 bg-white/[0.035] p-3">
              <p className="font-black text-slate-100">Footer identity</p>
              <p className="mt-1 text-sm leading-6 muted">Company name, contact details, WhatsApp, and logo are sourced from Company Profile with safe static fallbacks.</p>
            </div>
            <div className="rounded-card border border-white/10 bg-white/[0.035] p-3">
              <p className="font-black text-slate-100">Public theme separation</p>
              <p className="mt-1 text-sm leading-6 muted">Public accent and branding stay separate from admin dark/light theme preferences.</p>
            </div>
          </div>
        </SectionCard>
      </div>

      <div className="surface admin-control-card flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-end">
        <button type="button" className="btn btn-secondary" disabled={saving} onClick={() => setDraft(cloneSettings(savedSettings))}>
          Cancel / Revert
        </button>
        <button type="submit" className="btn btn-primary" disabled={!canEdit || saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
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
