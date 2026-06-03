import { ArrowDown, ArrowUp, Download, Edit3, Eye, FileText, History, Layers, LayoutGrid, Loader2, Palette, Plus, RotateCcw, Save, Settings2, ShieldCheck, Trash2, X } from 'lucide-react';
import {
  apiBase,
  ConfirmModal,
  ErrorBlock,
  formatDate,
  LoadingBlock,
  useEffect,
  useAuth,
  useMemo,
  useRef,
  useResource,
  useState,
  useToast
} from '../../shared/phase1Shared.jsx';
import { can, hasRole } from '../../utils/roles.js';

const placeholders = [
  '{{company_name}}',
  '{{company_phone}}',
  '{{company_email}}',
  '{{company_address}}',
  '{{customer_name}}',
  '{{customer_phone}}',
  '{{customer_address}}',
  '{{invoice_no}}',
  '{{invoice_number}}',
  '{{invoice_date}}',
  '{{quotation_no}}',
  '{{quotation_number}}',
  '{{quotation_date}}',
  '{{work_order_no}}',
  '{{work_order_id}}',
  '{{amc_contract_no}}',
  '{{amc_reference}}',
  '{{service_name}}',
  '{{service_type}}',
  '{{device}}',
  '{{brand_model}}',
  '{{problem_complaint}}',
  '{{technician_name}}',
  '{{total_amount}}',
  '{{final_total}}',
  '{{amount_paid}}',
  '{{balance_due}}',
  '{{amc_start_date}}',
  '{{amc_end_date}}',
  '{{next_service_date}}',
  '{{current_date}}'
];

const sectionLabels = {
  service: 'Service Documents',
  amc: 'AMC Documents'
};

const pageBreakFields = [
  ['pageBreaks.repeatTableHeader', 'Repeat table header on new page'],
  ['pageBreaks.keepAmountSummaryTogether', 'Keep amount summary together'],
  ['pageBreaks.keepWorkNoticeTogether', 'Keep notice together'],
  ['pageBreaks.keepTermsTogether', 'Keep terms together'],
  ['pageBreaks.keepFooterAtBottom', 'Keep footer at bottom'],
  ['pageBreaks.showPageNumbers', 'Show page numbers']
];

const footerFields = [
  ['footer.showCallWhatsapp', 'Show call/WhatsApp'],
  ['footer.showEmail', 'Show email'],
  ['footer.showWebsite', 'Show website'],
  ['footer.showAddress', 'Show address']
];

const customCardTypes = [
  ['text', 'Text Card'],
  ['info', 'Info Card'],
  ['notice', 'Notice Card'],
  ['qr', 'QR / Payment Card'],
  ['signature', 'Signature Card'],
  ['spacer', 'Divider']
];

const cardWidthOptions = [
  ['full', 'Full width'],
  ['half', 'Half width'],
  ['third', 'One third'],
  ['auto', 'Auto']
];

const borderStyleOptions = [
  ['default', 'Default soft border'],
  ['thin', 'Thin border'],
  ['none', 'No border'],
  ['highlight', 'Highlight border']
];

function editedBy(template) {
  return template?.lastEditedBy?.name || template?.lastEditedBy?.username || 'System default';
}

function getPath(source, path, fallback = '') {
  return String(path).split('.').reduce((cursor, key) => (cursor && cursor[key] !== undefined ? cursor[key] : undefined), source) ?? fallback;
}

function setPath(source, path, value) {
  const next = { ...(source || {}) };
  const keys = String(path).split('.');
  let cursor = next;
  keys.slice(0, -1).forEach((key) => {
    cursor[key] = Array.isArray(cursor[key]) ? cursor[key].slice() : { ...(cursor[key] || {}) };
    cursor = cursor[key];
  });
  cursor[keys.at(-1)] = value;
  return next;
}

function stableJson(value) {
  return JSON.stringify(value || {});
}

function cloneValue(value) {
  return JSON.parse(JSON.stringify(value || {}));
}

function designStateFromConfig(config = {}) {
  return cloneValue(config.design || {});
}

function mergeDesignStateForSave(config = {}, designState = {}) {
  const currentDesign = config.design || {};
  return {
    ...config,
    editMode: 'design',
    design: {
      ...currentDesign,
      ...designState,
      page: {
        ...(currentDesign.page || {}),
        ...(designState.page || {})
      },
      colors: {
        ...(currentDesign.colors || {}),
        ...(designState.colors || {})
      },
      elements: Array.isArray(designState.elements) ? designState.elements : (currentDesign.elements || []),
      enabled: true,
      confirmed: true,
      lockedDefaultSections: true
    }
  };
}

function makeCustomCard(type = 'text') {
  const label = customCardTypes.find(([value]) => value === type)?.[1] || 'Custom Section';
  const isDivider = type === 'spacer';
  const isQr = type === 'qr';
  const isSignature = type === 'signature';
  return {
    id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type,
    enabled: true,
    title: label,
    content: '',
    variable: '',
    width: 'full',
    minHeight: isDivider ? 32 : isQr ? 104 : isSignature ? 90 : 74,
    backgroundColor: type === 'notice' ? '#f1f7ff' : type === 'info' ? '#eef8ff' : '#ffffff',
    textColor: '#0f172a',
    borderColor: '#d8e5f7',
    accentColor: '#0f2a52'
  };
}

function customCardTypeLabel(type = 'text') {
  return customCardTypes.find(([value]) => value === type)?.[1]
    || (type ? `${String(type).replace(/-/g, ' ')} Card` : 'Custom Card');
}

function sectionGroupLabel(section = {}) {
  const title = String(section.title || '').toLowerCase();
  if (title.includes('header')) return 'Header';
  if (title.includes('customer') || title.includes('detail') || title.includes('period') || title.includes('plan') || title.includes('payment') || title.includes('problem')) return 'Customer / Details';
  if (title.includes('table') || title.includes('item') || title.includes('covered') || title.includes('work completed') || title.includes('parts')) return 'Items / Table';
  if (title.includes('notice') || title.includes('term') || title.includes('message') || title.includes('summary') || title.includes('signature') || title.includes('acknowledgement') || title.includes('renewal')) return 'Notes / Terms';
  if (title.includes('footer') || title.includes('page break')) return 'Footer / Page Break';
  return 'Other Sections';
}

function sectionKey(section, index = 0) {
  return section.key || `${String(section.title || 'section').toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${index}`;
}

function visibilityField(section) {
  return section.fields.find((field) => String(field.path || '').endsWith('.show'))
    || section.fields.find((field) => /show\/hide (section|message|table|terms|notice|summary|footer|customer greeting|plan details|payment details|renewal amount)/i.test(field.label || ''));
}

function sectionVisible(section, draft) {
  const field = visibilityField(section);
  if (!field) return true;
  return getPath(draft, field.path, field.fallback ?? true) !== false;
}

function sectionOptionPath(section, index, option) {
  return `structured.sectionOptions.${sectionKey(section, index)}.${option}`;
}

function designLayerOptionPath(layerId, option) {
  return `sectionOptions.${layerId}.${option}`;
}

function cleanLayerTitle(title = 'Section') {
  return String(title)
    .replace(/\s+Section$/i, '')
    .replace(/^Total Summary$/i, 'Amount Summary')
    .replace(/^Work Completion Notice$/i, 'Notice / Terms')
    .trim() || 'Section';
}

function designLayerRole(title = '') {
  const value = String(title).toLowerCase();
  if (value.includes('header')) return 'header';
  if (value.includes('footer') || value.includes('thank you')) return 'footer';
  if (value.includes('table') || value.includes('covered') || value.includes('work completed') || value.includes('parts used')) return 'table';
  if (value.includes('amount') || value.includes('summary') || value.includes('total')) return 'amount';
  if (value.includes('notice') || value.includes('terms') || value.includes('message') || value.includes('validity') || value.includes('acknowledgement') || value.includes('signature')) return 'notice';
  if (value.includes('customer')) return 'customer';
  if (value.includes('service') || value.includes('device') || value.includes('visit') || value.includes('amc') || value.includes('payment') || value.includes('plan') || value.includes('problem')) return 'details';
  return 'details';
}

function overlayStyleForLayer(layer, index) {
  const role = layer.role || 'details';
  const detailLane = index % 2;
  const detailRow = Math.floor(index / 2) % 2;
  const base = {
    header: { top: '3%', left: '6%', width: '88%', height: '10%' },
    customer: { top: '15%', left: '52%', width: '42%', height: '12%' },
    details: { top: `${15 + detailRow * 13}%`, left: detailLane === 0 ? '6%' : '52%', width: '42%', height: '12%' },
    table: { top: '34%', left: '6%', width: '88%', height: '25%' },
    amount: { top: '62%', left: '54%', width: '40%', height: '10%' },
    notice: { top: '74%', left: '6%', width: '88%', height: '11%' },
    footer: { top: '89%', left: '6%', width: '88%', height: '7%' },
    custom: { top: '72%', left: '10%', width: '80%', height: '9%' }
  };
  return base[role] || base.details;
}

function TemplateStatusPill({ status = 'Active' }) {
  return <span className="inline-flex rounded-full border border-emerald-400/25 bg-emerald-500/15 px-2.5 py-1 text-xs font-black text-emerald-100">{status}</span>;
}

function TemplateCard({ template, canEdit, busyKey, onEdit, onPreview, onDownload, onReset }) {
  const previewBusy = busyKey === `preview-${template.key}`;
  const downloadBusy = busyKey === `download-${template.key}`;
  const resetBusy = busyKey === `reset-${template.key}`;
  const busy = Boolean(busyKey);
  return (
    <article className="surface admin-control-card flex h-full flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="admin-control-icon"><FileText className="h-5 w-5" /></div>
          <div className="min-w-0">
            <h3 className="text-lg font-black text-slate-50">{template.name}</h3>
            <p className="mt-2 text-sm leading-6 muted">{template.description}</p>
          </div>
        </div>
        <TemplateStatusPill status={template.status} />
      </div>
      <div className="mt-5 grid gap-3 rounded-card border border-white/10 bg-white/[0.035] p-3 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-bold text-slate-300">Last edited</span>
          <span className="font-semibold text-slate-100">{template.lastEditedDate ? formatDate(template.lastEditedDate) : 'Not edited yet'}</span>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-bold text-slate-300">Last edited by</span>
          <span className="font-semibold text-slate-100">{editedBy(template)}</span>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-bold text-slate-300">Version</span>
          <span className="font-semibold text-slate-100">v{template.version || 1}</span>
        </div>
      </div>
      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        <button type="button" className="btn btn-primary min-h-11" disabled={!canEdit || busy} onClick={() => onEdit(template)}>
          <Edit3 className="h-4 w-4" />
          Edit Template
        </button>
        <button type="button" className="btn btn-secondary min-h-11" disabled={busy} onClick={() => onPreview(template)}>
          {previewBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
          {previewBusy ? 'Loading...' : 'Preview PDF'}
        </button>
        <button type="button" className="btn btn-secondary min-h-11" disabled={busy} onClick={() => onDownload(template)}>
          {downloadBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          {downloadBusy ? 'Downloading...' : 'Download Sample PDF'}
        </button>
        <button type="button" className="btn btn-secondary min-h-11" disabled={!canEdit || busy} onClick={() => onReset(template)}>
          {resetBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
          Reset
        </button>
      </div>
      {!canEdit ? <p className="mt-3 text-xs font-semibold text-amber-100">Admin role required to edit or reset templates.</p> : null}
    </article>
  );
}

function TemplateVariablesModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-black/55 p-4">
      <div className="surface admin-modal max-h-[85vh] w-full max-w-2xl overflow-y-auto p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-[var(--brand)]">Template Variables</p>
            <h2 className="mt-1 text-xl font-black">Available PDF Variables</h2>
            <p className="mt-2 text-sm leading-6 muted">Use placeholders in editable text. Values are filled only when a new PDF is generated.</p>
          </div>
          <button type="button" className="icon-button h-9 w-9" onClick={onClose} aria-label="Close template variables">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          {placeholders.map((item) => (
            <code key={item} className="rounded-card border border-white/10 bg-white/[0.035] px-3 py-2 text-sm font-bold text-sky-100">{item}</code>
          ))}
        </div>
      </div>
    </div>
  );
}

function VersionHistoryPanel({ versions, restoring, onRestore }) {
  return (
    <section className="surface admin-control-card pdf-version-history-panel p-4">
      <div className="flex items-center gap-3">
        <div className="admin-control-icon"><History className="h-5 w-5" /></div>
        <div>
          <h3 className="font-black">Version History</h3>
          <p className="mt-1 text-xs muted">Recent saved template versions.</p>
        </div>
      </div>
      <div className="mt-4 grid gap-2">
        {versions.length ? versions.slice(0, 4).map((version) => (
          <div key={version.id || version.version} className="rounded-card border border-white/10 bg-white/[0.035] p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-black text-slate-100">v{version.version}</p>
              <button type="button" className="btn btn-secondary py-1.5 text-xs" disabled={restoring} onClick={() => onRestore(version)}>
                <RotateCcw className="h-3.5 w-3.5" />
                Restore
              </button>
            </div>
            <p className="mt-1 text-xs muted">{version.editedAt ? formatDate(version.editedAt) : 'No date'} by {version.editedBy?.name || version.editedBy?.username || 'System'}</p>
          </div>
        )) : <p className="rounded-card border border-white/10 bg-white/[0.035] p-3 text-sm muted">Previous versions will appear after the first edit.</p>}
      </div>
    </section>
  );
}

function FieldRow({ field, draft, setDraft, canEdit, saving }) {
  const value = getPath(draft, field.path, field.fallback ?? (field.type === 'toggle' ? true : ''));
  const disabled = !canEdit || saving;
  function update(nextValue) {
    setDraft((current) => setPath(current, field.path, nextValue));
  }

  if (field.type === 'toggle') {
    const checked = value !== false;
    return (
      <label className={`pdf-toggle-row ${disabled ? 'is-disabled' : ''}`}>
        <span className="pdf-toggle-label">{field.label}</span>
        <span className={`pdf-state-badge ${checked ? 'is-on' : 'is-off'}`}>{checked ? 'ON' : 'OFF'}</span>
        <span className="pdf-toggle-switch-wrap">
          <input className="sr-only" type="checkbox" checked={checked} disabled={disabled} onChange={(event) => update(event.target.checked)} />
          <span className={`pdf-toggle-switch ${checked ? 'is-on' : ''}`}>
            <span />
          </span>
        </span>
      </label>
    );
  }

  if (field.type === 'color') {
    return (
      <label className="pdf-control-field">
        <span className="label">{field.label}</span>
        <div className="pdf-color-control">
          <input className="h-12 w-full rounded-card border border-white/10 bg-transparent p-1" type="color" value={value || '#0f2a52'} disabled={disabled} onChange={(event) => update(event.target.value)} />
          <input className="input" value={value || ''} disabled={disabled} onChange={(event) => update(event.target.value)} />
        </div>
      </label>
    );
  }

  if (field.type === 'textarea' || field.type === 'lines') {
    const text = field.type === 'lines' ? (Array.isArray(value) ? value.join('\n') : value || '') : value || '';
    return (
      <label className="pdf-control-field pdf-field-full">
        <span className="label">{field.label}</span>
        <textarea className="input min-h-24" rows={field.rows || 4} value={text} disabled={disabled} onChange={(event) => update(field.type === 'lines' ? event.target.value.split('\n') : event.target.value)} />
      </label>
    );
  }

  return (
    <label className="pdf-control-field">
      <span className="label">{field.label}</span>
      <input className="input" value={value || ''} disabled={disabled} onChange={(event) => update(event.target.value)} />
    </label>
  );
}

function SectionCard({ section, draft, setDraft, canEdit, saving }) {
  const Icon = section.icon;
  return (
    <section className="surface admin-control-card p-5">
      <div className="mb-4 flex items-start gap-3">
        <div className="admin-control-icon"><Icon className="h-5 w-5" /></div>
        <div>
          <h3 className="text-lg font-black">{section.title}</h3>
          {section.description ? <p className="mt-1 text-sm muted">{section.description}</p> : null}
        </div>
      </div>
      <div className="pdf-editor-grid">
        {section.fields.map((field) => (
          <FieldRow key={field.path} field={field} draft={draft} setDraft={setDraft} canEdit={canEdit} saving={saving} />
        ))}
      </div>
    </section>
  );
}

function SelectControl({ label, value, options, disabled, onChange }) {
  return (
    <label className="pdf-control-field">
      <span className="label">{label}</span>
      <select className="input" value={value || ''} disabled={disabled} onChange={(event) => onChange(event.target.value)}>
        {options.map(([optionValue, optionLabel, optionDisabled]) => (
          <option key={optionValue} value={optionValue} disabled={Boolean(optionDisabled)}>{optionLabel}</option>
        ))}
      </select>
    </label>
  );
}

function ColorControl({ label, value, disabled, onChange }) {
  return (
    <label className="pdf-control-field">
      <span className="label">{label}</span>
      <div className="pdf-color-control">
        <input className="h-12 w-full rounded-card border border-white/10 bg-transparent p-1" type="color" value={value || '#0f2a52'} disabled={disabled} onChange={(event) => onChange(event.target.value)} />
        <input className="input" value={value || ''} disabled={disabled} onChange={(event) => onChange(event.target.value)} />
      </div>
    </label>
  );
}

function CustomSectionsEditor({ draft, setDraft, canEdit, saving, advancedEnabled, customSectionsEnabled, customColorsEnabled }) {
  const [newType, setNewType] = useState('text');
  const [removeCandidate, setRemoveCandidate] = useState(null);
  const [editingCardId, setEditingCardId] = useState('');
  const enabled = advancedEnabled && customSectionsEnabled;
  const disabled = !canEdit || saving || !enabled;
  const cards = Array.isArray(getPath(draft, 'structured.customSections', [])) ? getPath(draft, 'structured.customSections', []) : [];

  if (!advancedEnabled) return null;

  if (!customSectionsEnabled) {
    return (
      <section className="surface admin-control-card pdf-custom-card-empty p-4">
        <div className="flex min-w-0 items-start gap-3">
          <div className="admin-control-icon"><Layers className="h-5 w-5" /></div>
          <div className="min-w-0">
            <h3 className="text-lg font-black text-[var(--app-text)]">Custom Cards</h3>
            <p className="mt-1 text-sm muted">Enable custom sections/cards in Advanced Options to add custom cards.</p>
          </div>
        </div>
      </section>
    );
  }

  function setCards(updater) {
    setDraft((current) => {
      const currentCards = Array.isArray(getPath(current, 'structured.customSections', [])) ? getPath(current, 'structured.customSections', []) : [];
      const nextCards = typeof updater === 'function' ? updater(currentCards) : updater;
      return setPath(current, 'structured.customSections', nextCards);
    });
  }

  function updateCard(index, patch) {
    setCards((currentCards) => currentCards.map((card, cardIndex) => (cardIndex === index ? { ...card, ...patch } : card)));
  }

  function addCard() {
    if (disabled) return;
    const flags = {};
    if (newType === 'qr') flags['structured.qrPaymentCardEnabled'] = true;
    if (newType === 'signature') flags['structured.signatureCardEnabled'] = true;
    const nextCard = makeCustomCard(newType);
    setEditingCardId(nextCard.id);
    setDraft((current) => {
      let next = current;
      Object.entries(flags).forEach(([path, value]) => {
        next = setPath(next, path, value);
      });
      const currentCards = Array.isArray(getPath(next, 'structured.customSections', [])) ? getPath(next, 'structured.customSections', []) : [];
      return setPath(next, 'structured.customSections', [...currentCards, nextCard]);
    });
  }

  function changeCardType(index, type) {
    const defaults = makeCustomCard(type);
    if (type === 'qr') setDraft((current) => setPath(current, 'structured.qrPaymentCardEnabled', true));
    if (type === 'signature') setDraft((current) => setPath(current, 'structured.signatureCardEnabled', true));
    updateCard(index, {
      type,
      minHeight: defaults.minHeight,
      backgroundColor: defaults.backgroundColor,
      title: cards[index]?.title || defaults.title
    });
  }

  function moveCard(index, direction) {
    if (disabled) return;
    setCards((currentCards) => {
      const target = index + direction;
      if (target < 0 || target >= currentCards.length) return currentCards;
      const nextCards = currentCards.slice();
      [nextCards[index], nextCards[target]] = [nextCards[target], nextCards[index]];
      return nextCards;
    });
  }

  return (
    <section className="surface admin-control-card pdf-custom-card-editor p-4">
      <div className="pdf-custom-add-row">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-wide text-[var(--brand)]">Add Custom Card</p>
          <h3 className="mt-1 text-lg font-black text-[var(--app-text)]">Custom Sections / Cards</h3>
          <p className="mt-1 text-xs muted">Add optional cards after the fixed PDF sections. Saved PDFs render these only after Advanced Layout is enabled and the template is saved.</p>
        </div>
        <div className="pdf-custom-add-controls">
          <SelectControl label="Card type" value={newType} options={customCardTypes} disabled={disabled} onChange={setNewType} />
          <button type="button" className="btn btn-primary self-end" disabled={disabled} onClick={addCard}>
            <Plus className="h-4 w-4" />
            Add Custom Card
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-3">
        {cards.length ? cards.map((card, index) => {
          const type = card.type || 'text';
          const cardId = card.id || `custom-card-${index}`;
          const editing = editingCardId === cardId;
          const isDivider = type === 'spacer';
          const isQr = type === 'qr';
          const isSignature = type === 'signature';
          const contentLabel = isQr ? 'UPI ID or payment note' : isSignature ? 'Name / designation text' : 'Body / content';
          const variableLabel = isQr ? 'Optional QR text/value' : isSignature ? 'Signature image URL or fallback text' : 'Optional variable value';
          return (
            <article key={cardId} className="pdf-custom-card">
              <div className="pdf-custom-card-header">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="admin-control-icon h-9 w-9"><Layers className="h-4 w-4" /></div>
                  <div className="min-w-0">
                    <p className="font-black text-[var(--app-text)]">{card.title || customCardTypeLabel(type)}</p>
                    <p className="mt-1 text-xs uppercase tracking-wide text-[var(--app-text-muted)]">{customCardTypeLabel(type)}</p>
                  </div>
                </div>
                <div className="pdf-card-actions">
                  <button type="button" className="btn btn-secondary h-9 px-3 py-1.5 text-xs" disabled={disabled} onClick={() => setEditingCardId(editing ? '' : cardId)}>
                    <Edit3 className="h-3.5 w-3.5" />
                    {editing ? 'Done' : 'Edit'}
                  </button>
                  <button type="button" className="btn btn-secondary h-9 px-3 py-1.5 text-xs" disabled={disabled || index === 0} onClick={() => moveCard(index, -1)} aria-label="Move custom card up">
                    <ArrowUp className="h-4 w-4" />
                    Move Up
                  </button>
                  <button type="button" className="btn btn-secondary h-9 px-3 py-1.5 text-xs" disabled={disabled || index === cards.length - 1} onClick={() => moveCard(index, 1)} aria-label="Move custom card down">
                    <ArrowDown className="h-4 w-4" />
                    Move Down
                  </button>
                  <button type="button" className="btn btn-secondary pdf-card-delete-button h-9 px-3 py-1.5 text-xs" disabled={disabled} onClick={() => setRemoveCandidate({ ...card, index })} aria-label="Delete custom section">
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                </div>
              </div>
              <div className="pdf-custom-card-meta">
                <span className={`pdf-state-badge ${card.enabled !== false ? 'is-on' : 'is-off'}`}>{card.enabled !== false ? 'Visible' : 'Hidden'}</span>
                <span className="pdf-state-badge is-fixed">{card.width || getPath(draft, 'structured.defaultCardWidth', 'full')}</span>
              </div>
              {editing ? (
                <div className="pdf-custom-card-grid">
                  <SelectControl label="Type" value={type} options={customCardTypes} disabled={disabled} onChange={(value) => changeCardType(index, value)} />
                  <SelectControl label="Width" value={card.width || getPath(draft, 'structured.defaultCardWidth', 'full')} options={cardWidthOptions} disabled={disabled} onChange={(value) => updateCard(index, { width: value })} />
                  <label className="pdf-control-field">
                    <span className="label">{isDivider ? 'Divider label' : isSignature ? 'Signature label' : isQr ? 'Payment title' : 'Title'}</span>
                    <input className="input" value={card.title || ''} disabled={disabled} onChange={(event) => updateCard(index, { title: event.target.value })} />
                  </label>
                  <label className="pdf-control-field">
                    <span className="label">Minimum height</span>
                    <input className="input" type="number" min="8" max="260" value={card.minHeight || (isDivider ? 32 : 74)} disabled={disabled} onChange={(event) => updateCard(index, { minHeight: Number(event.target.value) })} />
                  </label>
                  <div className="pdf-field-full">
                    <label className={`pdf-toggle-row ${disabled ? 'is-disabled' : ''}`}>
                      <span className="pdf-toggle-label">Show/hide custom card</span>
                      <span className={`pdf-state-badge ${card.enabled !== false ? 'is-on' : 'is-off'}`}>{card.enabled !== false ? 'ON' : 'OFF'}</span>
                      <span className="pdf-toggle-switch-wrap">
                        <input className="sr-only" type="checkbox" checked={card.enabled !== false} disabled={disabled} onChange={(event) => updateCard(index, { enabled: event.target.checked })} />
                        <span className={`pdf-toggle-switch ${card.enabled !== false ? 'is-on' : ''}`}><span /></span>
                      </span>
                    </label>
                  </div>
                  {!isDivider ? (
                    <>
                      <label className="pdf-control-field pdf-field-full">
                        <span className="label">{contentLabel}</span>
                        <textarea className="input min-h-24" rows={4} value={card.content || ''} disabled={disabled} onChange={(event) => updateCard(index, { content: event.target.value })} />
                      </label>
                      <label className="pdf-control-field pdf-field-full">
                        <span className="label">{variableLabel}</span>
                        <input className="input" value={card.variable || ''} disabled={disabled} onChange={(event) => updateCard(index, { variable: event.target.value })} />
                      </label>
                      {customColorsEnabled ? (
                        <>
                          <ColorControl label="Accent color" value={card.accentColor} disabled={disabled} onChange={(value) => updateCard(index, { accentColor: value })} />
                          <ColorControl label="Card background" value={card.backgroundColor} disabled={disabled} onChange={(value) => updateCard(index, { backgroundColor: value })} />
                          <ColorControl label="Text color" value={card.textColor} disabled={disabled} onChange={(value) => updateCard(index, { textColor: value })} />
                          <ColorControl label="Border color" value={card.borderColor} disabled={disabled} onChange={(value) => updateCard(index, { borderColor: value })} />
                        </>
                      ) : null}
                    </>
                  ) : customColorsEnabled ? (
                    <ColorControl label="Accent color" value={card.accentColor} disabled={disabled} onChange={(value) => updateCard(index, { accentColor: value })} />
                  ) : null}
                </div>
              ) : null}
            </article>
          );
        }) : (
          <p className="rounded-card border border-dashed border-white/15 bg-white/[0.025] p-4 text-sm muted">No custom cards added.</p>
        )}
      </div>
      {removeCandidate ? (
        <ConfirmModal
          title="Remove custom card?"
          message={`Remove ${removeCandidate.title || 'this custom card'} from this template draft?`}
          confirmLabel="Remove"
          onCancel={() => setRemoveCandidate(null)}
          onConfirm={() => {
            const targetIndex = removeCandidate.index;
            setRemoveCandidate(null);
            setCards((currentCards) => currentCards.filter((_card, index) => index !== targetIndex));
          }}
        />
      ) : null}
    </section>
  );
}

function DesignModeWorkspace({
  template,
  sections,
  draft,
  designDraft,
  setDesignDraft,
  previewUrl,
  previewLoading,
  previewError,
  canEdit,
  saving,
  busyKey,
  onBack,
  onPreview,
  onDownload,
  onShowVariables
}) {
  const disabled = !canEdit || saving;
  const elements = Array.isArray(getPath(designDraft, 'elements', [])) ? getPath(designDraft, 'elements', []) : [];
  const cards = Array.isArray(getPath(draft, 'structured.customSections', [])) ? getPath(draft, 'structured.customSections', []) : [];
  const advancedEnabled = getPath(draft, 'advancedEnabled', false) === true;
  const customSectionsEnabled = getPath(draft, 'structured.customSectionsEnabled', false) === true;
  const customColorsEnabled = advancedEnabled && getPath(draft, 'structured.customColorsEnabled', false) === true;
  const customWidthEnabled = advancedEnabled && getPath(draft, 'structured.customCardWidthEnabled', false) === true;
  const twoColumnEnabled = advancedEnabled && getPath(draft, 'structured.twoColumnCards', false) === true;
  const [selectedLayerId, setSelectedLayerId] = useState('');
  const [zoom, setZoom] = useState('fit');

  function setElements(updater) {
    setDesignDraft((current) => {
      const currentElements = Array.isArray(getPath(current, 'elements', [])) ? getPath(current, 'elements', []) : [];
      const nextElements = typeof updater === 'function' ? updater(currentElements) : updater;
      return setPath(current, 'elements', nextElements);
    });
  }

  const sectionLayers = sections.map((section, index) => {
    const key = sectionKey(section, index);
    const title = cleanLayerTitle(getPath(draft, sectionOptionPath(section, index, 'title'), section.title));
    return {
      id: key,
      title,
      kind: 'Section',
      locked: true,
      editable: Boolean(visibilityField(section)),
      supportsVisibility: Boolean(visibilityField(section)),
      supportsTitle: true,
      supportsIcon: true,
      visible: sectionVisible(section, draft),
      role: designLayerRole(section.title),
      section,
      sectionIndex: index
    };
  });
  const customLayers = advancedEnabled && customSectionsEnabled
    ? cards.map((card, index) => ({
        id: card.id || `custom-card-${index}`,
        title: card.title || 'Custom Card',
        kind: 'Custom Card',
        locked: false,
        editable: true,
        supportsVisibility: true,
        supportsTitle: true,
        supportsIcon: false,
        visible: card.enabled !== false,
        role: 'custom'
      }))
    : [];
  const elementLayers = elements.map((element, index) => ({
    id: element.id || `element-${index}`,
    title: element.title || 'Text Layer',
    kind: 'Free Element',
    locked: false,
    editable: true,
    supportsVisibility: true,
    supportsTitle: true,
    supportsIcon: false,
    visible: element.enabled !== false,
    role: 'custom'
  }));
  const layers = [...sectionLayers, ...customLayers, ...elementLayers];
  const layerSignature = layers.map((layer) => layer.id).join('|');
  const selectedLayer = layers.find((layer) => layer.id === selectedLayerId) || null;
  const previewFrameUrl = previewUrl ? `${previewUrl}#toolbar=0&navpanes=0&scrollbar=0` : '';
  const zoomWidths = {
    fit: 'min(100%, 540px)',
    '75': '390px',
    '100': '520px'
  };

  useEffect(() => {
    if (selectedLayerId && !layers.some((layer) => layer.id === selectedLayerId)) setSelectedLayerId('');
  }, [selectedLayerId, layerSignature]);

  function addElement(type, title) {
    const id = `element-${Date.now()}`;
    setElements((current) => [...current, { id, type, title, content: '', x: 40, y: 120, width: 240, height: 90, enabled: true }]);
    setSelectedLayerId(id);
  }

  const tools = [
    { label: 'Add Text', type: 'text', enabled: true },
    { label: 'Add Card', type: 'card', enabled: false },
    { label: 'Add QR', type: 'qr', enabled: false },
    { label: 'Add Signature', type: 'signature', enabled: false },
    { label: 'Add Divider', type: 'spacer', enabled: false }
  ];

  return (
    <div className="grid gap-4">
      <section className="surface admin-control-card p-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-amber-300/30 bg-amber-500/15 px-3 py-1 text-xs font-black uppercase tracking-wide text-[var(--warning)]">ADVANCED MODE - CHANGES APPLY ONLY AFTER SAVE</span>
              <span className="rounded-full border border-sky-300/30 bg-sky-500/15 px-3 py-1 text-xs font-black uppercase tracking-wide text-[var(--brand)]">VISUAL EDITOR</span>
            </div>
            <h3 className="text-lg font-black text-[var(--app-text)]">Design Mode</h3>
            <p className="mt-1 text-sm leading-6 muted">Design Mode is optional. Existing PDF design will not change until you save.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-secondary admin-compact-button" disabled={saving} onClick={onBack}>
              <LayoutGrid className="h-4 w-4" />
              Back to Structured Mode
            </button>
            <button type="button" className="btn btn-secondary admin-compact-button" onClick={onShowVariables}>
              <ShieldCheck className="h-4 w-4" />
              Variables
            </button>
            <button type="button" className="btn btn-secondary admin-compact-button" disabled={saving || Boolean(busyKey)} onClick={() => onPreview(template, draft)}>
              {busyKey === `preview-${template.key}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
              Preview PDF
            </button>
            <button type="button" className="btn btn-secondary admin-compact-button" disabled={saving || Boolean(busyKey)} onClick={() => onDownload(template, draft)}>
              {busyKey === `download-${template.key}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Download Sample PDF
            </button>
            <button type="submit" className="btn btn-primary admin-compact-button" disabled={!canEdit || saving || Boolean(busyKey)}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Template
            </button>
          </div>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[260px_minmax(0,1fr)_300px]">
        <aside className="surface admin-control-card p-4 xl:sticky xl:top-4 xl:max-h-[calc(100vh-2rem)] xl:overflow-auto">
          <div className="mb-4 flex items-center gap-3">
            <div className="admin-control-icon"><Layers className="h-5 w-5" /></div>
            <div>
              <h3 className="font-black text-[var(--app-text)]">Elements / Layers</h3>
              <p className="mt-1 text-xs muted">Fixed template sections stay locked from destructive editing.</p>
            </div>
          </div>
          <div className="grid gap-2">
            {tools.map((tool) => (
              <button
                key={tool.type}
                type="button"
                className="btn btn-secondary justify-between"
                disabled={disabled || !tool.enabled}
                onClick={() => addElement(tool.type, tool.label)}
              >
                <span>{tool.label}</span>
                {tool.enabled ? <Plus className="h-4 w-4" /> : <span className="text-[10px] font-black uppercase text-slate-400">Coming later</span>}
              </button>
            ))}
          </div>
          <div className="mt-5">
            <p className="mb-2 text-xs font-black uppercase tracking-wide text-[var(--app-text-muted)]">Section Layers</p>
            <div className="grid gap-2">
              {layers.map((layer) => (
              <button
                key={layer.id}
                type="button"
                className={`rounded-card border px-3 py-2 text-left text-sm transition ${selectedLayerId === layer.id ? 'border-sky-300/50 bg-sky-500/15 shadow-[0_0_0_1px_rgba(125,211,252,0.18)]' : 'border-white/10 bg-white/[0.035] hover:border-sky-300/25 hover:bg-white/[0.055]'}`}
                onClick={() => setSelectedLayerId(layer.id)}
              >
                <span className="flex min-w-0 items-start justify-between gap-2">
                  <span className="min-w-0 font-bold text-[var(--app-text)]">{layer.title}</span>
                  <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-black uppercase ${layer.locked ? 'border-amber-300/25 bg-amber-500/10 text-amber-100' : 'border-emerald-300/25 bg-emerald-500/10 text-emerald-100'}`}>{layer.locked ? 'Locked' : 'Editable'}</span>
                </span>
                <span className="mt-2 flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-wide text-[var(--app-text-muted)]">
                  <span>{layer.kind}</span>
                  <span className={`rounded-full border px-2 py-0.5 ${layer.visible ? 'border-emerald-300/20 text-emerald-100' : 'border-slate-500/25 text-slate-300'}`}>{layer.visible ? 'Visible' : 'Hidden'}</span>
                </span>
              </button>
            ))}
            </div>
          </div>
        </aside>

        <main className="surface admin-control-card p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-black text-[var(--app-text)]">A4 Canvas</h3>
              <p className="mt-1 text-xs muted">Visual preview only. Existing PDF output changes only after Save Template.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {['fit', '75', '100'].map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`rounded-full border px-3 py-1 text-xs font-black uppercase ${zoom === option ? 'border-sky-300/35 bg-sky-500/15 text-[var(--brand)]' : 'border-white/10 bg-white/[0.04] text-[var(--app-text-muted)]'}`}
                  onClick={() => setZoom(option)}
                >
                  {option === 'fit' ? 'Fit' : `${option}%`}
                </button>
              ))}
              <span className="rounded-full border border-sky-300/25 bg-sky-500/10 px-3 py-1 text-xs font-black text-[var(--brand)]">A4 Portrait</span>
            </div>
          </div>
          <div className="overflow-x-auto rounded-card border border-white/10 bg-slate-950/35 p-4">
            <div className="mx-auto transition-all" style={{ width: zoomWidths[zoom], maxWidth: '100%' }}>
              <div className="relative aspect-[210/297] overflow-hidden rounded-card border border-white/20 bg-white shadow-2xl">
                {previewFrameUrl ? (
                  <iframe title={`${template.name} visual design preview`} src={previewFrameUrl} className="absolute inset-0 h-full w-full bg-white" />
                ) : (
                  <div className="absolute inset-0 grid place-items-center bg-white p-6 text-center text-sm font-semibold text-slate-600">
                    {previewError || 'Preparing real PDF preview...'}
                  </div>
                )}
                {previewLoading ? (
                  <div className="absolute inset-0 z-20 grid place-items-center bg-slate-950/20">
                    <Loader2 className="h-6 w-6 animate-spin text-sky-100" />
                  </div>
                ) : null}
                <div className="absolute inset-0 z-10">
                  {layers.filter((layer) => layer.kind !== 'Free Element').map((layer, index) => {
                    const active = selectedLayerId === layer.id;
                    return (
                      <button
                        key={layer.id}
                        type="button"
                        className={`absolute rounded-md border px-2 py-1 text-left text-[10px] font-black uppercase tracking-wide transition ${active ? 'border-cyan-300 bg-cyan-300/20 text-cyan-950 shadow-[0_0_0_2px_rgba(14,165,233,0.28)]' : 'border-cyan-400/35 bg-cyan-300/10 text-cyan-950/70 hover:bg-cyan-300/20'}`}
                        style={overlayStyleForLayer(layer, index)}
                        onClick={() => setSelectedLayerId(layer.id)}
                      >
                        {layer.title}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
          {previewError ? <p className="mt-3 rounded-card border border-rose-400/25 bg-rose-500/10 p-3 text-sm font-semibold text-rose-100">{previewError}</p> : null}
        </main>

        <aside className="surface admin-control-card p-4 xl:sticky xl:top-4 xl:max-h-[calc(100vh-2rem)] xl:overflow-auto">
          <div className="mb-4 flex items-center gap-3">
            <div className="admin-control-icon"><Settings2 className="h-5 w-5" /></div>
            <div>
              <h3 className="font-black text-[var(--app-text)]">Properties</h3>
              <p className="mt-1 text-xs muted">Layer properties are preview-only until saved.</p>
            </div>
          </div>
          {selectedLayer ? (
            <div className="grid gap-3">
              <label>
                <span className="label">Section name</span>
                <input className="input" value={selectedLayer.title} disabled readOnly />
              </label>
              <FieldRow field={{ type: 'toggle', path: designLayerOptionPath(selectedLayer.id, 'visible'), label: 'Visible', fallback: selectedLayer.visible }} draft={designDraft} setDraft={setDesignDraft} canEdit={canEdit && selectedLayer.supportsVisibility} saving={saving} />
              <FieldRow field={{ type: 'toggle', path: designLayerOptionPath(selectedLayer.id, 'showTitle'), label: 'Show title', fallback: true }} draft={designDraft} setDraft={setDesignDraft} canEdit={canEdit && selectedLayer.supportsTitle} saving={saving} />
              <FieldRow field={{ type: 'toggle', path: designLayerOptionPath(selectedLayer.id, 'showIcon'), label: 'Show icon', fallback: true }} draft={designDraft} setDraft={setDesignDraft} canEdit={canEdit && selectedLayer.supportsIcon} saving={saving} />
              <ColorControl label="Accent color" value={getPath(designDraft, designLayerOptionPath(selectedLayer.id, 'accentColor'), getPath(designDraft, 'colors.accentColor', getPath(draft, 'header.accentColor', '#0f2a52')))} disabled={disabled || !customColorsEnabled} onChange={(value) => setDesignDraft((current) => setPath(current, designLayerOptionPath(selectedLayer.id, 'accentColor'), value))} />
              {!customColorsEnabled ? <p className="rounded-card border border-white/10 bg-white/[0.035] p-3 text-xs font-semibold muted">Enable custom colors in Advanced Layout to edit accent color.</p> : null}
              <SelectControl label="Alignment" value={getPath(designDraft, designLayerOptionPath(selectedLayer.id, 'alignment'), 'left')} options={[['left', 'Left'], ['center', 'Center'], ['right', 'Right']]} disabled={disabled} onChange={(value) => setDesignDraft((current) => setPath(current, designLayerOptionPath(selectedLayer.id, 'alignment'), value))} />
              <SelectControl label="Width option" value={getPath(designDraft, designLayerOptionPath(selectedLayer.id, 'width'), 'full')} options={cardWidthOptions} disabled={disabled || !customWidthEnabled} onChange={(value) => setDesignDraft((current) => setPath(current, designLayerOptionPath(selectedLayer.id, 'width'), value))} />
              {!customWidthEnabled ? <p className="rounded-card border border-white/10 bg-white/[0.035] p-3 text-xs font-semibold muted">Enable custom card width in Advanced Layout to edit width.</p> : null}
              <FieldRow field={{ type: 'toggle', path: designLayerOptionPath(selectedLayer.id, 'twoColumn'), label: 'Two-column card', fallback: false }} draft={designDraft} setDraft={setDesignDraft} canEdit={canEdit && twoColumnEnabled} saving={saving} />
              {!twoColumnEnabled ? <p className="rounded-card border border-white/10 bg-white/[0.035] p-3 text-xs font-semibold muted">Enable two-column cards in Advanced Layout to use this option.</p> : null}
              <button type="button" className="btn btn-secondary justify-between" disabled>
                <span>Precise drag / snap</span>
                <span className="text-[10px] font-black uppercase text-slate-400">Coming later</span>
              </button>
              {selectedLayer.locked ? (
                <p className="rounded-card border border-amber-300/20 bg-amber-500/10 p-3 text-xs font-semibold text-amber-100">Locked section. You can adjust safe visual flags, but fixed template sections cannot be deleted or free-positioned here.</p>
              ) : null}
            </div>
          ) : (
            <p className="rounded-card border border-dashed border-white/15 bg-white/[0.025] p-4 text-sm muted">Select a section from the canvas or layers list to edit its visual settings.</p>
          )}
        </aside>
      </div>
    </div>
  );
}

function AdvancedLayoutGroup({ title, children }) {
  return (
    <section className="pdf-advanced-group">
      <h4>{title}</h4>
      <div className="pdf-advanced-grid">
        {children}
      </div>
    </section>
  );
}

function AdvancedLayoutPanel({ draft, setDraft, canEdit, saving }) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('layout');
  const disabled = !canEdit || saving;
  const advancedEnabled = getPath(draft, 'advancedEnabled', false) === true;
  const customWidthEnabled = getPath(draft, 'structured.customCardWidthEnabled', false) === true;
  const customColorsEnabled = getPath(draft, 'structured.customColorsEnabled', false) === true;
  const tabs = [
    ['layout', 'Layout'],
    ['visual', 'Visual'],
    ['extra', 'Extra Cards'],
    ['safety', 'Safety']
  ];

  function update(path, value) {
    setDraft((current) => setPath(current, path, value));
  }

  useEffect(() => {
    if (!advancedEnabled) setSettingsOpen(false);
  }, [advancedEnabled]);

  return (
    <>
      <section className="surface admin-control-card pdf-advanced-panel p-4">
        <div className="pdf-advanced-summary-header">
          <div className="flex min-w-0 items-start gap-3">
            <div className="admin-control-icon"><Settings2 className="h-5 w-5" /></div>
            <div className="min-w-0">
              <h3 className="text-lg font-black text-[var(--app-text)]">Advanced Layout</h3>
              <p className="mt-1 max-w-3xl text-sm leading-6 muted">Optional tools for section ordering, QR/payment, signature, colors, and custom cards. Existing PDF design changes only after Save.</p>
            </div>
          </div>
          <span className={`pdf-state-badge pdf-advanced-status ${advancedEnabled ? 'is-on' : 'is-off'}`}>
            {advancedEnabled ? 'ADVANCED ON' : 'ADVANCED OFF'}
          </span>
        </div>

        <div className="mt-4 grid gap-3">
          <FieldRow field={{ type: 'toggle', path: 'advancedEnabled', label: 'Enable Advanced Layout', fallback: false }} draft={draft} setDraft={setDraft} canEdit={canEdit} saving={saving} />
          <p className="rounded-card border border-sky-300/15 bg-sky-500/10 p-3 text-sm font-semibold text-[var(--brand)]">
            {advancedEnabled ? 'Advanced options are enabled. Configure them in the modal, then save the template to apply.' : 'Default templates remain unchanged unless you enable options and save.'}
          </p>
          <button type="button" className="btn btn-secondary w-full justify-center" disabled={!advancedEnabled || disabled} onClick={() => setSettingsOpen(true)}>
            <Settings2 className="h-4 w-4" />
            Configure Advanced Options
          </button>
        </div>
      </section>

      {settingsOpen && advancedEnabled ? (
        <div className="pdf-modal-overlay" role="presentation">
          <section className="pdf-advanced-modal" role="dialog" aria-modal="true" aria-label="Configure Advanced Options">
            <div className="pdf-advanced-modal-header">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-[var(--brand)]">Structured Mode</p>
                <h3 className="mt-1 text-xl font-black text-[var(--app-text)]">Configure Advanced Options</h3>
                <p className="mt-1 text-sm muted">These settings are additive and affect saved PDFs only after Save Template.</p>
              </div>
              <button type="button" className="icon-button h-10 w-10" onClick={() => setSettingsOpen(false)} aria-label="Close advanced options">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="pdf-advanced-tabs" role="tablist" aria-label="Advanced layout sections">
              {tabs.map(([tabId, label]) => (
                <button
                  key={tabId}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tabId}
                  className={`pdf-advanced-tab ${activeTab === tabId ? 'is-active' : ''}`}
                  onClick={() => setActiveTab(tabId)}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="pdf-advanced-modal-body">
              {activeTab === 'layout' ? (
                <AdvancedLayoutGroup title="Layout Controls">
                  <FieldRow field={{ type: 'toggle', path: 'structured.allowDragDrop', label: 'Enable section reordering', fallback: false }} draft={draft} setDraft={setDraft} canEdit={canEdit} saving={saving} />
                  <FieldRow field={{ type: 'toggle', path: 'structured.twoColumnCards', label: 'Allow two-column cards', fallback: false }} draft={draft} setDraft={setDraft} canEdit={canEdit} saving={saving} />
                  <FieldRow field={{ type: 'toggle', path: 'structured.customCardWidthEnabled', label: 'Enable custom card width', fallback: false }} draft={draft} setDraft={setDraft} canEdit={canEdit} saving={saving} />
                  <SelectControl label="Default custom card width" value={getPath(draft, 'structured.defaultCardWidth', 'full')} options={cardWidthOptions} disabled={disabled || !customWidthEnabled} onChange={(value) => update('structured.defaultCardWidth', value)} />
                </AdvancedLayoutGroup>
              ) : null}

              {activeTab === 'visual' ? (
                <AdvancedLayoutGroup title="Visual Controls">
                  <FieldRow field={{ type: 'toggle', path: 'structured.customColorsEnabled', label: 'Enable custom colors', fallback: false }} draft={draft} setDraft={setDraft} canEdit={canEdit} saving={saving} />
                  <ColorControl label="Accent color" value={getPath(draft, 'design.colors.accentColor', getPath(draft, 'header.accentColor', '#0f2a52'))} disabled={disabled || !customColorsEnabled} onChange={(value) => update('design.colors.accentColor', value)} />
                  <ColorControl label="Card background color" value={getPath(draft, 'design.colors.cardBackground', '#ffffff')} disabled={disabled || !customColorsEnabled} onChange={(value) => update('design.colors.cardBackground', value)} />
                  <SelectControl label="Border style" value={getPath(draft, 'structured.borderStyle', 'default')} options={borderStyleOptions} disabled={disabled} onChange={(value) => update('structured.borderStyle', value)} />
                </AdvancedLayoutGroup>
              ) : null}

              {activeTab === 'extra' ? (
                <AdvancedLayoutGroup title="Extra Cards">
                  <FieldRow field={{ type: 'toggle', path: 'structured.customSectionsEnabled', label: 'Enable custom sections/cards', fallback: false }} draft={draft} setDraft={setDraft} canEdit={canEdit} saving={saving} />
                  <FieldRow field={{ type: 'toggle', path: 'structured.qrPaymentCardEnabled', label: 'Enable QR/payment card', fallback: false }} draft={draft} setDraft={setDraft} canEdit={canEdit} saving={saving} />
                  <FieldRow field={{ type: 'toggle', path: 'structured.signatureCardEnabled', label: 'Enable signature card', fallback: false }} draft={draft} setDraft={setDraft} canEdit={canEdit} saving={saving} />
                  {getPath(draft, 'structured.qrPaymentCardEnabled', false) === true ? (
                    <>
                      <FieldRow field={{ type: 'text', path: 'structured.qrPaymentCard.title', label: 'Payment title', fallback: 'Payment Details' }} draft={draft} setDraft={setDraft} canEdit={canEdit} saving={saving} />
                      <FieldRow field={{ type: 'textarea', path: 'structured.qrPaymentCard.note', label: 'Payment note', rows: 3 }} draft={draft} setDraft={setDraft} canEdit={canEdit} saving={saving} />
                      <FieldRow field={{ type: 'text', path: 'structured.qrPaymentCard.upiText', label: 'UPI ID / payment text' }} draft={draft} setDraft={setDraft} canEdit={canEdit} saving={saving} />
                      <FieldRow field={{ type: 'text', path: 'structured.qrPaymentCard.qrValue', label: 'Optional QR image URL or QR text' }} draft={draft} setDraft={setDraft} canEdit={canEdit} saving={saving} />
                    </>
                  ) : null}
                  {getPath(draft, 'structured.signatureCardEnabled', false) === true ? (
                    <>
                      <FieldRow field={{ type: 'text', path: 'structured.signatureCard.title', label: 'Signature title', fallback: 'Authorized Signature' }} draft={draft} setDraft={setDraft} canEdit={canEdit} saving={saving} />
                      <FieldRow field={{ type: 'text', path: 'structured.signatureCard.personName', label: 'Authorized person name' }} draft={draft} setDraft={setDraft} canEdit={canEdit} saving={saving} />
                      <FieldRow field={{ type: 'text', path: 'structured.signatureCard.designation', label: 'Role / designation' }} draft={draft} setDraft={setDraft} canEdit={canEdit} saving={saving} />
                      <FieldRow field={{ type: 'text', path: 'structured.signatureCard.imageUrl', label: 'Optional signature image URL' }} draft={draft} setDraft={setDraft} canEdit={canEdit} saving={saving} />
                    </>
                  ) : null}
                  <p className="pdf-field-full rounded-card border border-white/10 bg-white/[0.035] p-3 text-sm muted">Custom cards appear in the editor after custom sections/cards are enabled.</p>
                </AdvancedLayoutGroup>
              ) : null}

              {activeTab === 'safety' ? (
                <AdvancedLayoutGroup title="Safety">
                  <FieldRow field={{ type: 'toggle', path: 'pageSettings.preferOnePage', label: 'Prefer one-page PDFs' }} draft={draft} setDraft={setDraft} canEdit={canEdit} saving={saving} />
                  <FieldRow field={{ type: 'toggle', path: 'pageSettings.safePagination', label: 'Safe pagination' }} draft={draft} setDraft={setDraft} canEdit={canEdit} saving={saving} />
                  <FieldRow field={{ type: 'toggle', path: 'pageBreaks.repeatTableHeader', label: 'Repeat table header when page breaks' }} draft={draft} setDraft={setDraft} canEdit={canEdit} saving={saving} />
                  <FieldRow field={{ type: 'toggle', path: 'pageBreaks.keepFooterAtBottom', label: 'Keep footer at bottom' }} draft={draft} setDraft={setDraft} canEdit={canEdit} saving={saving} />
                  <FieldRow field={{ type: 'toggle', path: 'pageBreaks.showPageNumbers', label: 'Show page numbers' }} draft={draft} setDraft={setDraft} canEdit={canEdit} saving={saving} />
                </AdvancedLayoutGroup>
              ) : null}
            </div>

            <div className="pdf-advanced-modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setSettingsOpen(false)}>Done</button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}

function LivePreviewPanel({ template, previewUrl, previewLoading, previewError }) {
  return (
    <section className="surface admin-control-card pdf-live-preview-panel p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 className="font-black">Live PDF Preview</h3>
          <p className="mt-1 text-xs muted">Server-rendered draft preview.</p>
        </div>
        {previewLoading ? <Loader2 className="h-4 w-4 animate-spin text-sky-100" /> : null}
      </div>
      <div className="overflow-hidden rounded-card border border-white/10 bg-slate-950/45">
        {previewUrl ? (
          <iframe title={`${template.name} preview`} src={previewUrl} className="h-[680px] w-full bg-white" />
        ) : (
          <div className="grid h-[680px] place-items-center p-6 text-center text-sm muted">
            {previewError || 'Preparing PDF preview...'}
          </div>
        )}
      </div>
      {previewError ? <p className="mt-3 rounded-card border border-rose-400/25 bg-rose-500/10 p-3 text-sm font-semibold text-rose-100">{previewError}</p> : null}
      <p className="mt-3 text-xs muted">Unsaved edits are used only for preview until you save the template.</p>
    </section>
  );
}

function SelectedSectionEditor({ section, sectionIndex, draft, setDraft, canEdit, saving }) {
  if (!section) return null;
  const Icon = section.icon || FileText;
  const visibility = visibilityField(section);
  const advancedEnabled = getPath(draft, 'advancedEnabled', false) === true;
  const customColorsEnabled = getPath(draft, 'structured.customColorsEnabled', false) === true;
  const customWidthEnabled = getPath(draft, 'structured.customCardWidthEnabled', false) === true;
  const fields = section.fields.filter((field) => {
    if (field.path === visibility?.path) return false;
    if (field.type === 'color') return advancedEnabled && customColorsEnabled;
    if (field.type === 'width' || field.type === 'layout') return advancedEnabled;
    return true;
  });

  return (
    <section className="surface admin-control-card pdf-section-editor p-5">
      <div className="mb-4 flex items-start gap-3">
        <div className="admin-control-icon"><Icon className="h-5 w-5" /></div>
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-[var(--brand)]">Selected Section</p>
          <h3 className="mt-1 text-xl font-black">{section.title}</h3>
          <p className="mt-1 text-sm muted">Fixed sections can be hidden where supported, but cannot be deleted.</p>
        </div>
      </div>

      <div className="pdf-editor-grid mb-4">
        <label className="pdf-control-field">
          <span className="label">Section title</span>
          <input
            className="input"
            value={getPath(draft, sectionOptionPath(section, sectionIndex, 'title'), section.title)}
            disabled={!canEdit || saving}
            onChange={(event) => setDraft((current) => setPath(current, sectionOptionPath(section, sectionIndex, 'title'), event.target.value))}
          />
        </label>
        {visibility ? (
          <FieldRow field={{ ...visibility, label: 'Show/hide section' }} draft={draft} setDraft={setDraft} canEdit={canEdit} saving={saving} />
        ) : (
          <label className="pdf-toggle-row is-disabled">
            <span className="pdf-toggle-label">Show/hide section</span>
            <span className="pdf-state-badge is-fixed">Fixed</span>
          </label>
        )}
        <FieldRow field={{ type: 'toggle', path: sectionOptionPath(section, sectionIndex, 'showTitle'), label: 'Show/hide title' }} draft={draft} setDraft={setDraft} canEdit={canEdit} saving={saving} />
        <FieldRow field={{ type: 'toggle', path: sectionOptionPath(section, sectionIndex, 'showIcon'), label: 'Show/hide icon' }} draft={draft} setDraft={setDraft} canEdit={canEdit} saving={saving} />
        {advancedEnabled && customWidthEnabled ? (
          <SelectControl
            label="Width / layout"
            value={getPath(draft, sectionOptionPath(section, sectionIndex, 'width'), 'full')}
            options={cardWidthOptions}
            disabled={!canEdit || saving}
            onChange={(value) => setDraft((current) => setPath(current, sectionOptionPath(section, sectionIndex, 'width'), value))}
          />
        ) : null}
      </div>

      <div className="pdf-editor-grid">
        {fields.map((field) => (
          <FieldRow key={field.path} field={field} draft={draft} setDraft={setDraft} canEdit={canEdit} saving={saving} />
        ))}
      </div>
    </section>
  );
}

function SectionsList({ items, draft, selectedKey, onSelect, canReorder, onMove }) {
  return (
    <section className="surface admin-control-card pdf-sections-panel p-4">
      <div className="mb-4 flex items-center gap-3">
        <div className="admin-control-icon"><LayoutGrid className="h-5 w-5" /></div>
        <div>
          <h3 className="font-black">Template Sections</h3>
          <p className="mt-1 text-xs muted">Fixed PDF sections in order.</p>
        </div>
      </div>
      <div className="grid gap-2">
        {items.map(({ section, index }, orderIndex) => {
          const Icon = section.icon || FileText;
          const key = sectionKey(section, index);
          const active = selectedKey === key;
          const visible = sectionVisible(section, draft);
          const group = sectionGroupLabel(section);
          const previousGroup = orderIndex > 0 ? sectionGroupLabel(items[orderIndex - 1].section) : '';
          return (
            <div key={key} className="grid gap-2">
              {group !== previousGroup ? <p className="pdf-section-group-label">{group}</p> : null}
              <article className={`pdf-section-nav-card ${active ? 'is-active' : ''}`}>
                <div className="pdf-section-nav-main">
                  <div className="admin-control-icon h-9 w-9"><Icon className="h-4 w-4" /></div>
                  <div className="min-w-0 flex-1">
                    <p className="pdf-section-nav-title">{section.title}</p>
                    <div className="pdf-section-nav-badges">
                      <span className={`pdf-state-badge ${visible ? 'is-visible' : 'is-hidden'}`}>{visible ? 'Visible' : 'Hidden'}</span>
                      <span className="pdf-state-badge is-fixed">Fixed</span>
                    </div>
                  </div>
                </div>
                <div className="pdf-section-nav-actions">
                  <button type="button" className="icon-button h-9 w-9" disabled={!canReorder || orderIndex === 0} onClick={() => onMove(orderIndex, -1)} aria-label="Move section up"><ArrowUp className="h-3.5 w-3.5" /></button>
                  <button type="button" className="icon-button h-9 w-9" disabled={!canReorder || orderIndex === items.length - 1} onClick={() => onMove(orderIndex, 1)} aria-label="Move section down"><ArrowDown className="h-3.5 w-3.5" /></button>
                  <button type="button" className="btn btn-secondary h-9 justify-center px-3 py-1.5 text-xs" onClick={() => onSelect(key)}>
                    <Eye className="h-3.5 w-3.5" />
                    Select
                  </button>
                </div>
              </article>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function StructuredBuilderWorkspace({
  sections,
  draft,
  setDraft,
  canEdit,
  saving,
  previewUrl,
  previewLoading,
  previewError,
  template,
  versions,
  restoring,
  onRestore
}) {
  function sectionKeysFromDraft() {
    const keys = sections.map((section, index) => sectionKey(section, index));
    const savedOrder = Array.isArray(getPath(draft, 'structured.sectionOrder', [])) ? getPath(draft, 'structured.sectionOrder', []) : [];
    const orderedSaved = savedOrder.filter((key) => keys.includes(key));
    return [...orderedSaved, ...keys.filter((key) => !orderedSaved.includes(key))];
  }

  const [sectionOrder, setSectionOrder] = useState(sectionKeysFromDraft);
  const [selectedKey, setSelectedKey] = useState(sectionOrder[0] || '');
  const advancedEnabled = getPath(draft, 'advancedEnabled', false) === true;
  const customSectionsEnabled = getPath(draft, 'structured.customSectionsEnabled', false) === true;
  const customColorsEnabled = advancedEnabled && getPath(draft, 'structured.customColorsEnabled', false) === true;
  const canReorder = getPath(draft, 'advancedEnabled', false) === true && getPath(draft, 'structured.allowDragDrop', false) === true;
  const sectionOrderSignature = stableJson(getPath(draft, 'structured.sectionOrder', []));

  useEffect(() => {
    const keys = sectionKeysFromDraft();
    setSectionOrder(keys);
    setSelectedKey((current) => (keys.includes(current) ? current : keys[0] || ''));
  }, [sections, template.key, sectionOrderSignature]);

  const orderedItems = sectionOrder
    .map((key) => {
      const index = sections.findIndex((section, itemIndex) => sectionKey(section, itemIndex) === key);
      return index >= 0 ? { section: sections[index], index } : null;
    })
    .filter(Boolean);
  const selectedItem = orderedItems.find((item) => sectionKey(item.section, item.index) === selectedKey) || orderedItems[0];

  function moveSection(orderIndex, direction) {
    if (!canReorder) return;
    const next = sectionOrder.slice();
    const target = orderIndex + direction;
    if (target < 0 || target >= next.length) return;
    [next[orderIndex], next[target]] = [next[target], next[orderIndex]];
    setSectionOrder(next);
    setDraft((current) => setPath(current, 'structured.sectionOrder', next));
  }

  return (
    <div className="pdf-structured-workspace">
      <div className="pdf-structured-sections">
        <SectionsList items={orderedItems} draft={draft} selectedKey={selectedKey} onSelect={setSelectedKey} canReorder={canReorder} onMove={moveSection} />
      </div>
      <main className="pdf-structured-editor">
        <SelectedSectionEditor section={selectedItem?.section} sectionIndex={selectedItem?.index || 0} draft={draft} setDraft={setDraft} canEdit={canEdit} saving={saving} />
        <AdvancedLayoutPanel draft={draft} setDraft={setDraft} canEdit={canEdit} saving={saving} />
        <CustomSectionsEditor draft={draft} setDraft={setDraft} canEdit={canEdit} saving={saving} advancedEnabled={advancedEnabled} customSectionsEnabled={customSectionsEnabled} customColorsEnabled={customColorsEnabled} />
      </main>
      <aside className="pdf-structured-preview">
        <LivePreviewPanel template={template} previewUrl={previewUrl} previewLoading={previewLoading} previewError={previewError} />
        <VersionHistoryPanel versions={versions} restoring={restoring} onRestore={onRestore} />
      </aside>
    </div>
  );
}

function headerFields(titleLabel = 'Header title') {
  return [
    { type: 'toggle', path: 'header.showLogo', label: 'Show/hide logo' },
    { type: 'toggle', path: 'header.showCompanyDetails', label: 'Show/hide company details' },
    { type: 'text', path: 'header.title', label: titleLabel },
    { type: 'color', path: 'header.accentColor', label: 'Accent color' }
  ];
}

function footerSection(title = 'Footer Section') {
  return {
    title,
    icon: FileText,
    fields: [
      ...footerFields.map(([path, label]) => ({ type: 'toggle', path, label })),
      { type: 'text', path: 'footer.thankYouMessage', label: 'Thank you message' }
    ]
  };
}

function pageBreakSection(labels = pageBreakFields) {
  return {
    title: 'Page Break Settings',
    icon: FileText,
    description: 'Controls how long tables and final sections continue across pages.',
    fields: labels.map(([path, label]) => ({ type: 'toggle', path, label }))
  };
}

const templateSectionDefinitions = {
  invoice: [
    { title: 'Header Section', icon: Palette, fields: headerFields() },
    { title: 'Invoice Details Section', icon: FileText, fields: [
      { type: 'toggle', path: 'sections.invoiceDetails.showInvoiceNumber', label: 'Show/hide invoice number' },
      { type: 'toggle', path: 'sections.invoiceDetails.showJobReference', label: 'Show/hide job reference' },
      { type: 'toggle', path: 'sections.invoiceDetails.showInvoiceDate', label: 'Show/hide invoice date' },
      { type: 'toggle', path: 'sections.invoiceDetails.showPaymentStatus', label: 'Show/hide payment status' }
    ] },
    { title: 'Customer Details Section', icon: FileText, fields: [
      { type: 'toggle', path: 'sections.customerDetails.showCustomerName', label: 'Show/hide customer name' },
      { type: 'toggle', path: 'sections.customerDetails.showPhoneNumber', label: 'Show/hide phone number' },
      { type: 'toggle', path: 'sections.customerDetails.showAddress', label: 'Show/hide address' }
    ] },
    { title: 'Service Details Section', icon: FileText, fields: [
      { type: 'toggle', path: 'sections.serviceDetails.showServiceType', label: 'Show/hide service type' },
      { type: 'toggle', path: 'sections.serviceDetails.showDevice', label: 'Show/hide device' },
      { type: 'toggle', path: 'sections.serviceDetails.showBrandModel', label: 'Show/hide brand/model' },
      { type: 'toggle', path: 'sections.serviceDetails.showProblemComplaint', label: 'Show/hide problem/complaint' },
      { type: 'toggle', path: 'sections.serviceDetails.showTechnician', label: 'Show/hide technician' }
    ] },
    { title: 'Item Table Section', icon: FileText, fields: [
      { type: 'text', path: 'sections.itemTable.labels.sno', label: 'S.No column label' },
      { type: 'text', path: 'sections.itemTable.labels.description', label: 'Description column label' },
      { type: 'text', path: 'sections.itemTable.labels.quantity', label: 'Quantity column label' },
      { type: 'text', path: 'sections.itemTable.labels.unitPrice', label: 'Unit price column label' },
      { type: 'text', path: 'sections.itemTable.labels.total', label: 'Total column label' },
      { type: 'text', path: 'sections.itemTable.labels.tax', label: 'Tax column label' },
      { type: 'toggle', path: 'sections.itemTable.showSno', label: 'Show/hide S.No' },
      { type: 'toggle', path: 'sections.itemTable.showQuantity', label: 'Show/hide quantity' },
      { type: 'toggle', path: 'sections.itemTable.showUnitPrice', label: 'Show/hide unit price' },
      { type: 'toggle', path: 'sections.itemTable.showTotal', label: 'Show/hide total' },
      { type: 'toggle', path: 'sections.itemTable.showTaxColumn', label: 'Show/hide tax column if tax is enabled' }
    ] },
    { title: 'Amount Summary Section', icon: FileText, fields: [
      { type: 'toggle', path: 'sections.amountSummary.showAmountInWords', label: 'Show/hide amount in words' },
      { type: 'toggle', path: 'sections.amountSummary.showSubtotal', label: 'Show/hide subtotal' },
      { type: 'toggle', path: 'sections.amountSummary.showFinalTotal', label: 'Show/hide final total' },
      { type: 'toggle', path: 'sections.amountSummary.showAmountPaid', label: 'Show/hide amount paid' },
      { type: 'toggle', path: 'sections.amountSummary.showBalanceDue', label: 'Show/hide balance due' }
    ] },
    { title: 'Work Completion Notice Section', icon: FileText, fields: [
      { type: 'toggle', path: 'sections.workCompletionNotice.show', label: 'Show/hide section' },
      { type: 'text', path: 'sections.workCompletionNotice.title', label: 'Title' },
      { type: 'lines', path: 'sections.workCompletionNotice.messageLines', label: 'Message lines', rows: 4 }
    ] },
    { title: 'Terms & Conditions Section', icon: FileText, fields: [
      { type: 'toggle', path: 'sections.terms.show', label: 'Show/hide section' },
      { type: 'text', path: 'sections.terms.title', label: 'Title' },
      { type: 'textarea', path: 'sections.terms.text', label: 'Terms text', rows: 6 }
    ] },
    footerSection(),
    pageBreakSection()
  ],
  quotation: [
    { title: 'Header', icon: Palette, fields: headerFields('Quotation title') },
    { title: 'Quotation Details', icon: FileText, fields: [
      { type: 'toggle', path: 'sections.quotationDetails.showJobReference', label: 'Show/hide job reference' },
      { type: 'toggle', path: 'sections.quotationDetails.showQuotationDate', label: 'Show/hide quotation date' },
      { type: 'toggle', path: 'sections.quotationDetails.showQuotationStatus', label: 'Show/hide quotation status' }
    ] },
    { title: 'Customer Details', icon: FileText, fields: [
      { type: 'toggle', path: 'sections.customerDetails.showCustomerName', label: 'Show/hide customer name' },
      { type: 'toggle', path: 'sections.customerDetails.showPhoneNumber', label: 'Show/hide phone number' },
      { type: 'toggle', path: 'sections.customerDetails.showAddress', label: 'Show/hide address' }
    ] },
    { title: 'Service / Device Details', icon: FileText, fields: [
      { type: 'toggle', path: 'sections.serviceDeviceDetails.showServiceType', label: 'Show/hide service type' },
      { type: 'toggle', path: 'sections.serviceDeviceDetails.showDevice', label: 'Show/hide device' },
      { type: 'toggle', path: 'sections.serviceDeviceDetails.showBrandModel', label: 'Show/hide brand/model' },
      { type: 'toggle', path: 'sections.serviceDeviceDetails.showTechnician', label: 'Show/hide technician' },
      { type: 'toggle', path: 'sections.serviceDeviceDetails.showSerialNumber', label: 'Show/hide serial number' }
    ] },
    { title: 'Problem / Complaint', icon: FileText, fields: [
      { type: 'toggle', path: 'sections.problemComplaint.show', label: 'Show/hide problem/complaint' },
      { type: 'text', path: 'sections.problemComplaint.label', label: 'Problem label' }
    ] },
    { title: 'Item Table', icon: FileText, fields: [
      { type: 'text', path: 'sections.itemTable.labels.sno', label: 'S.No column label' },
      { type: 'text', path: 'sections.itemTable.labels.description', label: 'Description column label' },
      { type: 'text', path: 'sections.itemTable.labels.quantity', label: 'Quantity column label' },
      { type: 'text', path: 'sections.itemTable.labels.unitPrice', label: 'Unit price column label' },
      { type: 'text', path: 'sections.itemTable.labels.total', label: 'Total column label' },
      { type: 'toggle', path: 'sections.itemTable.showSno', label: 'Show/hide S.No' },
      { type: 'toggle', path: 'sections.itemTable.showQuantity', label: 'Show/hide quantity' },
      { type: 'toggle', path: 'sections.itemTable.showUnitPrice', label: 'Show/hide unit price' },
      { type: 'toggle', path: 'sections.itemTable.showTotal', label: 'Show/hide total' },
      { type: 'toggle', path: 'sections.itemTable.showTaxColumn', label: 'Show/hide tax column if tax is enabled' }
    ] },
    { title: 'Total Summary', icon: FileText, fields: [
      { type: 'toggle', path: 'sections.totalSummary.show', label: 'Show/hide total summary' },
      { type: 'toggle', path: 'sections.totalSummary.showSubtotal', label: 'Show/hide subtotal' },
      { type: 'toggle', path: 'sections.totalSummary.showTax', label: 'Show/hide tax' },
      { type: 'toggle', path: 'sections.totalSummary.showFinalTotal', label: 'Show/hide final total' }
    ] },
    { title: 'Validity Note', icon: FileText, fields: [
      { type: 'toggle', path: 'sections.validityNote.show', label: 'Show/hide validity note' },
      { type: 'textarea', path: 'sections.validityNote.text', label: 'Validity note', rows: 3 }
    ] },
    { title: 'WhatsApp Approval Message', icon: FileText, fields: [
      { type: 'toggle', path: 'sections.whatsappApprovalMessage.show', label: 'Show/hide message card' },
      { type: 'text', path: 'sections.whatsappApprovalMessage.title', label: 'Title' },
      { type: 'lines', path: 'sections.whatsappApprovalMessage.messageLines', label: 'Message lines', rows: 4 }
    ] },
    { title: 'Terms', icon: FileText, fields: [
      { type: 'toggle', path: 'sections.terms.show', label: 'Show/hide terms' },
      { type: 'textarea', path: 'sections.terms.text', label: 'Terms text', rows: 6 }
    ] },
    footerSection('Footer'),
    pageBreakSection()
  ],
  'service-completed': [
    { title: 'Header', icon: Palette, fields: headerFields('Main title') },
    { title: 'Customer Details', icon: FileText, fields: [
      { type: 'toggle', path: 'sections.customerDetails.show', label: 'Show/hide customer greeting' },
      { type: 'toggle', path: 'sections.customerDetails.showCustomerName', label: 'Show/hide customer name' }
    ] },
    { title: 'Service Summary', icon: FileText, fields: [
      { type: 'toggle', path: 'sections.serviceSummary.show', label: 'Show/hide service summary' },
      { type: 'text', path: 'sections.serviceSummary.title', label: 'Summary title' }
    ] },
    { title: 'What We Did', icon: FileText, fields: [
      { type: 'toggle', path: 'sections.whatWeDid.show', label: 'Show/hide message body' },
      { type: 'lines', path: 'sections.whatWeDid.messageLines', label: 'Letter message lines', rows: 7 }
    ] },
    { title: 'Support Message', icon: FileText, fields: [
      { type: 'toggle', path: 'sections.supportMessage.show', label: 'Show/hide support section' },
      { type: 'lines', path: 'sections.supportMessage.highlightLines', label: 'Highlight points', rows: 4 },
      { type: 'text', path: 'sections.supportMessage.amcTitle', label: 'AMC card heading' },
      { type: 'textarea', path: 'sections.supportMessage.amcText', label: 'AMC card text', rows: 3 },
      { type: 'text', path: 'sections.supportMessage.amcFinalLine', label: 'AMC final line' }
    ] },
    { title: 'Terms', icon: FileText, fields: [
      { type: 'toggle', path: 'sections.terms.show', label: 'Show/hide terms' },
      { type: 'textarea', path: 'sections.terms.text', label: 'Terms text', rows: 4 }
    ] },
    { title: 'Thank You Footer', icon: FileText, fields: [
      { type: 'toggle', path: 'sections.thankYouFooter.show', label: 'Show/hide closing footer' },
      { type: 'text', path: 'sections.thankYouFooter.contactLabel', label: 'Contact label' },
      { type: 'text', path: 'footer.thankYouMessage', label: 'Bottom strip message' }
    ] }
  ],
  'amc-contract': [
    { title: 'Header', icon: Palette, fields: headerFields('Contract title') },
    { title: 'Customer Details', icon: FileText, fields: [
      { type: 'toggle', path: 'sections.customerDetails.showCustomerName', label: 'Show/hide customer name' },
      { type: 'toggle', path: 'sections.customerDetails.showPhoneNumber', label: 'Show/hide phone number' },
      { type: 'toggle', path: 'sections.customerDetails.showAddress', label: 'Show/hide address' }
    ] },
    { title: 'AMC Period', icon: FileText, fields: [
      { type: 'toggle', path: 'sections.amcPeriod.showAmcReference', label: 'Show/hide AMC reference' },
      { type: 'toggle', path: 'sections.amcPeriod.showContractDate', label: 'Show/hide contract date' },
      { type: 'toggle', path: 'sections.amcPeriod.showAmcPeriod', label: 'Show/hide AMC period' },
      { type: 'toggle', path: 'sections.amcPeriod.showStatus', label: 'Show/hide status' }
    ] },
    { title: 'Covered Devices', icon: FileText, fields: [
      { type: 'toggle', path: 'sections.coveredDevices.show', label: 'Show/hide covered devices table' },
      { type: 'toggle', path: 'sections.coveredDevices.showCoveredFor', label: 'Show/hide covered-for field' },
      { type: 'toggle', path: 'sections.coveredDevices.showSerialNumber', label: 'Show/hide serial number column' }
    ] },
    { title: 'Visit Frequency', icon: FileText, fields: [
      { type: 'toggle', path: 'sections.visitFrequency.show', label: 'Show/hide plan details' },
      { type: 'toggle', path: 'sections.visitFrequency.showPlanName', label: 'Show/hide plan name' },
      { type: 'toggle', path: 'sections.visitFrequency.showCoverageType', label: 'Show/hide coverage type' },
      { type: 'toggle', path: 'sections.visitFrequency.showTechnician', label: 'Show/hide technician' }
    ] },
    { title: 'Payment Details', icon: FileText, fields: [
      { type: 'toggle', path: 'sections.paymentDetails.show', label: 'Show/hide payment details' },
      { type: 'toggle', path: 'sections.paymentDetails.showContractValue', label: 'Show/hide AMC value' },
      { type: 'toggle', path: 'sections.paymentDetails.showPaymentStatus', label: 'Show/hide payment status' }
    ] },
    { title: 'AMC Terms', icon: FileText, fields: [
      { type: 'toggle', path: 'sections.amcTerms.show', label: 'Show/hide AMC terms' },
      { type: 'textarea', path: 'sections.amcTerms.text', label: 'AMC terms text', rows: 6 }
    ] },
    { title: 'Signature', icon: FileText, fields: [
      { type: 'toggle', path: 'sections.signature.show', label: 'Show/hide signature' },
      { type: 'text', path: 'sections.signature.label', label: 'Signature label' }
    ] },
    footerSection('Footer')
  ],
  'amc-service-visit': [
    { title: 'Header', icon: Palette, fields: headerFields('Report title') },
    { title: 'Visit Details', icon: FileText, fields: [
      { type: 'toggle', path: 'sections.visitDetails.showAmcReference', label: 'Show/hide AMC reference' },
      { type: 'toggle', path: 'sections.visitDetails.showVisitDate', label: 'Show/hide visit date' },
      { type: 'toggle', path: 'sections.visitDetails.showVisitStatus', label: 'Show/hide visit status' },
      { type: 'toggle', path: 'sections.visitDetails.showNextVisitDate', label: 'Show/hide next visit date' },
      { type: 'toggle', path: 'sections.visitDetails.showJobReference', label: 'Show/hide job reference' }
    ] },
    { title: 'Customer Details', icon: FileText, fields: [
      { type: 'toggle', path: 'sections.customerDetails.showCustomerName', label: 'Show/hide customer name' },
      { type: 'toggle', path: 'sections.customerDetails.showPhoneNumber', label: 'Show/hide phone number' },
      { type: 'toggle', path: 'sections.customerDetails.showAddress', label: 'Show/hide address' }
    ] },
    { title: 'Device Checked', icon: FileText, fields: [
      { type: 'toggle', path: 'sections.deviceChecked.show', label: 'Show/hide device checked section' },
      { type: 'toggle', path: 'sections.deviceChecked.showPlanName', label: 'Show/hide plan name' },
      { type: 'toggle', path: 'sections.deviceChecked.showAmcPeriod', label: 'Show/hide AMC period' },
      { type: 'toggle', path: 'sections.deviceChecked.showCoveredFor', label: 'Show/hide covered-for field' },
      { type: 'toggle', path: 'sections.deviceChecked.showTechnician', label: 'Show/hide technician' }
    ] },
    { title: 'Work Completed', icon: FileText, fields: [
      { type: 'toggle', path: 'sections.workCompleted.show', label: 'Show/hide work completed table' }
    ] },
    { title: 'Parts Used', icon: FileText, fields: [
      { type: 'toggle', path: 'sections.partsUsed.show', label: 'Show/hide additional charges/parts used' }
    ] },
    { title: 'Next Visit Note', icon: FileText, fields: [
      { type: 'toggle', path: 'sections.nextVisitNote.show', label: 'Show/hide next visit note' }
    ] },
    { title: 'Customer Acknowledgement', icon: FileText, fields: [
      { type: 'toggle', path: 'sections.customerAcknowledgement.show', label: 'Show/hide acknowledgement' },
      { type: 'textarea', path: 'sections.customerAcknowledgement.text', label: 'Acknowledgement text', rows: 3 }
    ] },
    footerSection('Footer')
  ],
  'amc-renewal-reminder': [
    { title: 'Header', icon: Palette, fields: headerFields('Reminder title') },
    { title: 'Customer Details', icon: FileText, fields: [
      { type: 'toggle', path: 'sections.customerDetails.showCustomerName', label: 'Show/hide customer name' },
      { type: 'toggle', path: 'sections.customerDetails.showPhoneNumber', label: 'Show/hide phone number' },
      { type: 'toggle', path: 'sections.customerDetails.showAddress', label: 'Show/hide address' }
    ] },
    { title: 'AMC Expiry Details', icon: FileText, fields: [
      { type: 'toggle', path: 'sections.amcExpiryDetails.showAmcReference', label: 'Show/hide AMC reference' },
      { type: 'toggle', path: 'sections.amcExpiryDetails.showReminderDate', label: 'Show/hide reminder date' },
      { type: 'toggle', path: 'sections.amcExpiryDetails.showExpiryDate', label: 'Show/hide expiry date' },
      { type: 'toggle', path: 'sections.amcExpiryDetails.showRenewalStatus', label: 'Show/hide renewal status' }
    ] },
    { title: 'Renewal Message', icon: FileText, fields: [
      { type: 'toggle', path: 'sections.renewalMessage.show', label: 'Show/hide renewal message' },
      { type: 'text', path: 'sections.renewalMessage.title', label: 'Message title' }
    ] },
    { title: 'Plan Details', icon: FileText, fields: [
      { type: 'toggle', path: 'sections.planDetails.showPlanName', label: 'Show/hide plan name' },
      { type: 'toggle', path: 'sections.planDetails.showCurrentPeriod', label: 'Show/hide current period' },
      { type: 'toggle', path: 'sections.planDetails.showRenewalPeriod', label: 'Show/hide renewal period' },
      { type: 'toggle', path: 'sections.planDetails.showCoveredFor', label: 'Show/hide covered for' }
    ] },
    { title: 'Renewal Amount', icon: FileText, fields: [
      { type: 'toggle', path: 'sections.renewalAmount.show', label: 'Show/hide renewal amount' }
    ] },
    { title: 'Contact / WhatsApp Message', icon: FileText, fields: [
      { type: 'toggle', path: 'sections.contactWhatsappMessage.show', label: 'Show/hide contact message' },
      { type: 'text', path: 'sections.contactWhatsappMessage.title', label: 'Title' },
      { type: 'textarea', path: 'sections.contactWhatsappMessage.text', label: 'Message text', rows: 3 },
      { type: 'text', path: 'sections.contactWhatsappMessage.finalLine', label: 'Final line' }
    ] },
    footerSection('Footer')
  ]
};

function StructuredTemplateEditor({
  template,
  draft,
  setDraft,
  canEdit,
  saving,
  busyKey,
  token,
  onSave,
  onCancel,
  onPreview,
  onDownload,
  onReset,
  versions,
  restoring,
  onRestore,
  onShowVariables
}) {
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const [designConfirmOpen, setDesignConfirmOpen] = useState(false);
  const [uiMode, setUiMode] = useState('structured');
  const [designDraft, setDesignDraft] = useState(() => designStateFromConfig(draft));
  const previewUrlRef = useRef('');
  const requestIdRef = useRef(0);
  const sections = templateSectionDefinitions[template.key] || [];
  const busy = Boolean(busyKey) || saving;
  const designMode = uiMode === 'design';
  const draftDesignSignature = stableJson(draft.design || {});
  const designDraftDirty = stableJson(designDraft) !== draftDesignSignature;

  useEffect(() => () => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
  }, []);

  useEffect(() => {
    setUiMode('structured');
    setDesignConfirmOpen(false);
    setDesignDraft(designStateFromConfig(draft));
  }, [template.key]);

  useEffect(() => {
    if (!designMode && !designDraftDirty) setDesignDraft(designStateFromConfig(draft));
  }, [draftDesignSignature, designMode, designDraftDirty, draft]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;
      setPreviewLoading(true);
      setPreviewError('');
      try {
        const response = await fetch(`${apiBase}/pdf-templates/${template.key}/preview`, {
          method: 'POST',
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ config: draft })
        });
        const blob = await response.blob();
        if (!response.ok) throw new Error('PDF preview failed');
        if (requestId !== requestIdRef.current) return;
        const nextUrl = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
        if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = nextUrl;
        setPreviewUrl(nextUrl);
      } catch (err) {
        if (requestId === requestIdRef.current) setPreviewError(err.message || 'PDF preview failed');
      } finally {
        if (requestId === requestIdRef.current) setPreviewLoading(false);
      }
    }, 700);
    return () => clearTimeout(timer);
  }, [draft, template.key, token]);

  function submit(event) {
    event.preventDefault();
    onSave(event, designDraftDirty ? mergeDesignStateForSave(draft, designDraft) : draft);
  }

  function switchToStructuredMode() {
    setUiMode('structured');
  }

  function activateDesignMode() {
    setUiMode('design');
  }

  function switchToDesignMode() {
    if (designMode) return;
    setDesignConfirmOpen(true);
  }

  return (
    <>
      <form className="grid gap-5" onSubmit={submit}>
        <section className="surface admin-control-card pdf-editor-hero p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <button
                type="button"
                className="btn btn-secondary admin-compact-button mb-4"
                onClick={() => {
                  if (designDraftDirty && !window.confirm('Discard unsaved design mode changes?')) return;
                  onCancel();
                }}
              >
                <X className="h-4 w-4" />
                Back to Templates
              </button>
              <p className="text-xs font-black uppercase tracking-wide text-[var(--brand)]">Structured PDF Editor</p>
              <h2 className="mt-1 text-2xl font-black">{template.name}</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 muted">Edit this fixed PDF from top to bottom using cards that follow the real PDF layout. Preview refreshes automatically after edits.</p>
              <div className="mt-4 inline-flex flex-wrap rounded-card border border-white/10 bg-slate-950/35 p-1">
                <button type="button" className={`btn admin-compact-button border-0 ${!designMode ? 'btn-primary' : 'btn-secondary'}`} disabled={busy} onClick={switchToStructuredMode}>
                  <LayoutGrid className="h-4 w-4" />
                  Structured Mode
                </button>
                <button type="button" className={`btn admin-compact-button border-0 ${designMode ? 'btn-primary' : 'btn-secondary'}`} disabled={!canEdit || busy} onClick={switchToDesignMode}>
                  <Edit3 className="h-4 w-4" />
                  Design Mode
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn btn-secondary admin-compact-button" onClick={onShowVariables}>
                <ShieldCheck className="h-4 w-4" />
                Template Variables
              </button>
              <button type="button" className="btn btn-secondary admin-compact-button" disabled={busy} onClick={() => onPreview(template, draft)}>
                {busyKey === `preview-${template.key}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                Preview PDF
              </button>
              <button type="button" className="btn btn-secondary admin-compact-button" disabled={busy} onClick={() => onDownload(template, draft)}>
                {busyKey === `download-${template.key}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Download Sample PDF
              </button>
              <button type="button" className="btn btn-secondary admin-compact-button" disabled={!canEdit || busy} onClick={() => onReset(template)}>
                <RotateCcw className="h-4 w-4" />
                Reset to Default
              </button>
              <button type="submit" className="btn btn-primary admin-compact-button" disabled={!canEdit || busy}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saving ? 'Saving...' : 'Save Template'}
              </button>
            </div>
          </div>
        </section>

      {designMode ? (
        <DesignModeWorkspace
          template={template}
          sections={sections}
          draft={draft}
          designDraft={designDraft}
          setDesignDraft={setDesignDraft}
          previewUrl={previewUrl}
          previewLoading={previewLoading}
          previewError={previewError}
          canEdit={canEdit}
          saving={saving}
          busyKey={busyKey}
          onBack={switchToStructuredMode}
          onPreview={onPreview}
          onDownload={onDownload}
          onShowVariables={onShowVariables}
        />
      ) : (
        <StructuredBuilderWorkspace
          sections={sections}
          draft={draft}
          setDraft={setDraft}
          canEdit={canEdit}
          saving={saving}
          previewUrl={previewUrl}
          previewLoading={previewLoading}
          previewError={previewError}
          template={template}
          versions={versions}
          restoring={restoring}
          onRestore={onRestore}
        />
      )}
      </form>
      {designConfirmOpen ? (
        <ConfirmModal
          title="Switch to Design Mode?"
          message="Design Mode gives visual layout control. Existing PDF design will not change until you save. Continue?"
          confirmLabel="Continue"
          onCancel={() => setDesignConfirmOpen(false)}
          onConfirm={() => {
            setDesignConfirmOpen(false);
            activateDesignMode();
          }}
        />
      ) : null}
    </>
  );
}

export function PdfTemplatesSection({ onDirtyChange = null }) {
  const { request, token, user } = useAuth();
  const { push } = useToast();
  const [editingKey, setEditingKey] = useState('');
  const [draft, setDraft] = useState({});
  const [saving, setSaving] = useState(false);
  const [busyKey, setBusyKey] = useState('');
  const [restoring, setRestoring] = useState(false);
  const [variablesOpen, setVariablesOpen] = useState(false);
  const [resetCandidate, setResetCandidate] = useState(null);
  const [restoreCandidate, setRestoreCandidate] = useState(null);
  const canEdit = hasRole(user, 'admin') && can(user, 'manage_pdf_templates');
  const { data, loading, error, reload } = useResource(() => request('/pdf-templates'), [request]);
  const templates = data?.templates || [];
  const activeTemplate = templates.find((template) => template.key === editingKey) || null;
  const editorDirty = Boolean(activeTemplate && stableJson(draft) !== stableJson(activeTemplate.config || {}));
  const grouped = useMemo(() => ({
    service: templates.filter((template) => template.category === 'service'),
    amc: templates.filter((template) => template.category === 'amc')
  }), [templates]);

  useEffect(() => {
    onDirtyChange?.(editorDirty);
  }, [editorDirty, onDirtyChange]);

  function startEdit(template) {
    if (!canEdit) {
      push('Only admin users can edit PDF templates', 'error');
      return;
    }
    setEditingKey(template.key);
    setDraft(JSON.parse(JSON.stringify(template.config || {})));
  }

  async function fetchTemplatePdf(template, config = null) {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const body = config ? JSON.stringify({ config }) : undefined;
    if (config) headers['Content-Type'] = 'application/json';
    const response = await fetch(`${apiBase}/pdf-templates/${template.key}/preview`, {
      method: 'POST',
      headers,
      body
    });
    const blob = await response.blob();
    if (!response.ok) throw new Error('PDF preview failed');
    return new Blob([blob], { type: 'application/pdf' });
  }

  async function previewTemplate(template, config = null) {
    setBusyKey(`preview-${template.key}`);
    try {
      const blob = await fetchTemplatePdf(template, config);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
      push(err.message, 'error');
    } finally {
      setBusyKey('');
    }
  }

  async function downloadTemplate(template, config = null) {
    setBusyKey(`download-${template.key}`);
    try {
      const blob = await fetchTemplatePdf(template, config);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${template.key}-sample.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
      push(err.message, 'error');
    } finally {
      setBusyKey('');
    }
  }

  async function saveTemplate(event, configOverride = null) {
    event?.preventDefault?.();
    if (!activeTemplate) return;
    if (!canEdit) {
      push('Only admin users can save PDF templates', 'error');
      return;
    }
    const configToSave = configOverride || draft;
    setSaving(true);
    try {
      const result = await request(`/pdf-templates/${activeTemplate.key}`, {
        method: 'PATCH',
        body: JSON.stringify({ config: configToSave })
      });
      push(result.message || 'PDF template saved');
      await reload({ silent: true });
      setEditingKey(result.template?.key || activeTemplate.key);
      setDraft(JSON.parse(JSON.stringify(result.template?.config || configToSave)));
    } catch (err) {
      push(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function resetTemplate(template) {
    if (!canEdit) {
      push('Only admin users can reset PDF templates', 'error');
      return;
    }
    setBusyKey(`reset-${template.key}`);
    try {
      const result = await request(`/pdf-templates/${template.key}/reset`, { method: 'POST' });
      push(result.message || 'PDF template reset');
      await reload({ silent: true });
      if (editingKey === template.key) setDraft(JSON.parse(JSON.stringify(result.template?.config || {})));
    } catch (err) {
      push(err.message, 'error');
    } finally {
      setBusyKey('');
    }
  }

  async function restoreVersion(version) {
    if (!activeTemplate || !canEdit) return;
    setRestoring(true);
    try {
      const versionId = version.id || version.version;
      const result = await request(`/pdf-templates/${activeTemplate.key}/restore/${versionId}`, { method: 'POST' });
      push(result.message || 'PDF template version restored');
      await reload({ silent: true });
      setDraft(JSON.parse(JSON.stringify(result.template?.config || {})));
    } catch (err) {
      push(err.message, 'error');
    } finally {
      setRestoring(false);
    }
  }

  if (loading) return <LoadingBlock />;
  if (error) return <ErrorBlock message={error} />;

  if (activeTemplate) {
    return (
      <>
        <StructuredTemplateEditor
          template={activeTemplate}
          draft={draft}
          setDraft={setDraft}
          canEdit={canEdit}
          saving={saving}
          busyKey={busyKey}
          token={token}
          onSave={saveTemplate}
          onCancel={() => {
            if (editorDirty && !window.confirm('Discard unsaved template changes?')) return;
            setEditingKey('');
          }}
          onPreview={previewTemplate}
          onDownload={downloadTemplate}
          onReset={(template) => setResetCandidate(template)}
          versions={activeTemplate.versions || []}
          restoring={restoring}
          onRestore={(version) => setRestoreCandidate(version)}
          onShowVariables={() => setVariablesOpen(true)}
        />
        {variablesOpen ? <TemplateVariablesModal onClose={() => setVariablesOpen(false)} /> : null}
        {resetCandidate ? (
          <ConfirmModal
            title="Reset template?"
            message={`Reset ${resetCandidate.name} to the default text and styling. Existing generated PDFs will not be changed.`}
            confirmLabel="Reset Template"
            onCancel={() => setResetCandidate(null)}
            onConfirm={async () => {
              const template = resetCandidate;
              setResetCandidate(null);
              await resetTemplate(template);
            }}
          />
        ) : null}
        {restoreCandidate ? (
          <ConfirmModal
            title="Restore template version?"
            message={`Restore version v${restoreCandidate.version}. Existing generated PDFs will not be changed.`}
            confirmLabel="Restore Version"
            onCancel={() => setRestoreCandidate(null)}
            onConfirm={async () => {
              const version = restoreCandidate;
              setRestoreCandidate(null);
              await restoreVersion(version);
            }}
          />
        ) : null}
      </>
    );
  }

  return (
    <div className="grid gap-5">
      <section className="surface admin-control-card p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <p className="text-xs font-black uppercase tracking-wide text-[var(--brand)]">DOCUMENT TEMPLATES</p>
              <span className="admin-premium-badge">6 FIXED TEMPLATES</span>
            </div>
            <h2 className="text-2xl font-black">PDF / Document Templates</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 muted">Edit the fixed Universal Systems PDF templates with structured cards and real server-rendered previews.</p>
          </div>
          <div className="rounded-card border border-sky-300/20 bg-sky-500/10 px-4 py-3 text-sm text-sky-100">
            <div className="flex items-center gap-2 font-black">
              <Palette className="h-4 w-4" />
              Fresh PDFs use current templates
            </div>
            <p className="mt-1 text-xs text-sky-100/80">Existing generated PDFs are not changed automatically.</p>
          </div>
          <button type="button" className="btn btn-secondary admin-compact-button" onClick={() => setVariablesOpen(true)}>
            <ShieldCheck className="h-4 w-4" />
            Template Variables
          </button>
        </div>
      </section>

      {Object.entries(grouped).map(([category, items]) => (
        <section key={category} className="grid gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-xl font-black">{sectionLabels[category]}</h3>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-black text-slate-200">{items.length} templates</span>
          </div>
          <div className="grid gap-4 xl:grid-cols-3">
            {items.map((template) => (
              <TemplateCard
                key={template.key}
                template={template}
                canEdit={canEdit}
                busyKey={busyKey}
                onEdit={startEdit}
                onPreview={previewTemplate}
                onDownload={downloadTemplate}
                onReset={(item) => setResetCandidate(item)}
              />
            ))}
          </div>
        </section>
      ))}
      {variablesOpen ? <TemplateVariablesModal onClose={() => setVariablesOpen(false)} /> : null}
      {resetCandidate ? (
        <ConfirmModal
          title="Reset template?"
          message={`Reset ${resetCandidate.name} to the default text and styling. Existing generated PDFs will not be changed.`}
          confirmLabel="Reset Template"
          onCancel={() => setResetCandidate(null)}
          onConfirm={async () => {
            const template = resetCandidate;
            setResetCandidate(null);
            await resetTemplate(template);
          }}
        />
      ) : null}
    </div>
  );
}
