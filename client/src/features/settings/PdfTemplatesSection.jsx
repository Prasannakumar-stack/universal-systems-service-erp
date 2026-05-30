import { Download, Edit3, Eye, FileText, History, Loader2, Palette, RotateCcw, Save, ShieldCheck, X } from 'lucide-react';
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
  '{{customer_name}}',
  '{{customer_phone}}',
  '{{customer_address}}',
  '{{invoice_number}}',
  '{{invoice_date}}',
  '{{work_order_id}}',
  '{{service_name}}',
  '{{technician_name}}',
  '{{total_amount}}',
  '{{amc_start_date}}',
  '{{amc_end_date}}',
  '{{next_service_date}}'
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
      <div className="surface admin-modal w-full max-w-2xl p-5">
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
    <section className="surface admin-control-card p-4">
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
  const value = getPath(draft, field.path, field.type === 'toggle' ? true : '');
  const disabled = !canEdit || saving;
  function update(nextValue) {
    setDraft((current) => setPath(current, field.path, nextValue));
  }

  if (field.type === 'toggle') {
    const checked = value !== false;
    return (
      <label className="flex items-center justify-between gap-3 rounded-card border border-white/10 bg-white/[0.035] px-3 py-3">
        <span className="min-w-0 text-sm font-bold text-slate-100">{field.label}</span>
        <span className="flex items-center gap-2">
          <span className={`text-xs font-black ${checked ? 'text-sky-100' : 'text-slate-400'}`}>{checked ? 'ON' : 'OFF'}</span>
          <input className="sr-only" type="checkbox" checked={checked} disabled={disabled} onChange={(event) => update(event.target.checked)} />
          <span className={`relative h-7 w-14 rounded-full border transition ${checked ? 'border-sky-300/40 bg-sky-500/25' : 'border-white/10 bg-slate-950/50'}`}>
            <span className={`absolute top-1 h-5 w-5 rounded-full transition ${checked ? 'left-7 bg-sky-100' : 'left-1 bg-slate-500'}`} />
          </span>
        </span>
      </label>
    );
  }

  if (field.type === 'color') {
    return (
      <label>
        <span className="label">{field.label}</span>
        <div className="grid grid-cols-[3.25rem_minmax(0,1fr)] gap-2">
          <input className="h-12 w-full rounded-card border border-white/10 bg-transparent p-1" type="color" value={value || '#0f2a52'} disabled={disabled} onChange={(event) => update(event.target.value)} />
          <input className="input" value={value || ''} disabled={disabled} onChange={(event) => update(event.target.value)} />
        </div>
      </label>
    );
  }

  if (field.type === 'textarea' || field.type === 'lines') {
    const text = field.type === 'lines' ? (Array.isArray(value) ? value.join('\n') : value || '') : value || '';
    return (
      <label className="sm:col-span-2">
        <span className="label">{field.label}</span>
        <textarea className="input min-h-24" rows={field.rows || 4} value={text} disabled={disabled} onChange={(event) => update(field.type === 'lines' ? event.target.value.split('\n') : event.target.value)} />
      </label>
    );
  }

  return (
    <label>
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
      <div className="grid gap-3 sm:grid-cols-2">
        {section.fields.map((field) => (
          <FieldRow key={field.path} field={field} draft={draft} setDraft={setDraft} canEdit={canEdit} saving={saving} />
        ))}
      </div>
    </section>
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
  const previewUrlRef = useRef('');
  const requestIdRef = useRef(0);
  const sections = templateSectionDefinitions[template.key] || [];
  const busy = Boolean(busyKey) || saving;

  useEffect(() => () => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
  }, []);

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
    onSave(event);
  }

  return (
    <form className="grid gap-5" onSubmit={submit}>
      <section className="surface admin-control-card p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <button type="button" className="btn btn-secondary admin-compact-button mb-4" onClick={onCancel}>
              <X className="h-4 w-4" />
              Back to Templates
            </button>
            <p className="text-xs font-black uppercase tracking-wide text-[var(--brand)]">Structured PDF Editor</p>
            <h2 className="mt-1 text-2xl font-black">{template.name}</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 muted">Edit this fixed PDF from top to bottom using cards that follow the real PDF layout. Preview refreshes automatically after edits.</p>
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

      <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_440px]">
        <div className="grid gap-4">
          {sections.map((section) => (
            <SectionCard key={section.title} section={section} draft={draft} setDraft={setDraft} canEdit={canEdit} saving={saving} />
          ))}
        </div>
        <aside className="grid content-start gap-4 2xl:sticky 2xl:top-4">
          <section className="surface admin-control-card p-4">
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
            <p className="mt-3 text-xs muted">Unsaved edits are used only for this preview until you save the template.</p>
          </section>
          <VersionHistoryPanel versions={versions} restoring={restoring} onRestore={onRestore} />
        </aside>
      </div>
    </form>
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

  async function saveTemplate(event) {
    event.preventDefault();
    if (!activeTemplate) return;
    if (!canEdit) {
      push('Only admin users can save PDF templates', 'error');
      return;
    }
    setSaving(true);
    try {
      const result = await request(`/pdf-templates/${activeTemplate.key}`, {
        method: 'PATCH',
        body: JSON.stringify({ config: draft })
      });
      push(result.message || 'PDF template saved');
      await reload({ silent: true });
      setEditingKey(result.template?.key || activeTemplate.key);
      setDraft(JSON.parse(JSON.stringify(result.template?.config || draft)));
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
