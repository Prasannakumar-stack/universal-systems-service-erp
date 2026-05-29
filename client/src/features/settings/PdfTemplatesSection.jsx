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

const textAreas = [
  { key: 'footerText', label: 'Footer Text', rows: 3 },
  { key: 'termsAndConditions', label: 'Terms and Conditions', rows: 5 },
  { key: 'paymentBankDetails', label: 'Payment / Bank Details', rows: 4 },
  { key: 'notesWarrantyText', label: 'Notes / Warranty Text', rows: 4 }
];

function editedBy(template) {
  return template?.lastEditedBy?.name || template?.lastEditedBy?.username || 'System default';
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
          <div className="admin-control-icon">
            <FileText className="h-5 w-5" />
          </div>
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

function HelperPanel({ activeTemplate, versions, restoring, onRestore }) {
  return (
    <aside className="grid content-start gap-4 xl:sticky xl:top-4">
      <div className="surface admin-control-card p-5">
        <div className="flex items-center gap-3">
          <div className="admin-control-icon">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-black">Available Placeholders</h3>
            <p className="mt-1 text-sm muted">Database values are inserted when a PDF is generated.</p>
          </div>
        </div>
        <div className="mt-4 grid gap-2">
          {placeholders.map((item) => (
            <code key={item} className="rounded-card border border-white/10 bg-slate-950/35 px-3 py-2 text-xs font-bold text-sky-100">{item}</code>
          ))}
        </div>
      </div>
      <div className="surface admin-control-card p-5">
        <div className="flex items-center gap-3">
          <div className="admin-control-icon">
            <History className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-black">Version History</h3>
            <p className="mt-1 text-sm muted">{activeTemplate ? `Current version v${activeTemplate.version || 1}` : 'Select a template to view history.'}</p>
          </div>
        </div>
        <div className="mt-4 grid gap-2">
          {versions.length ? versions.slice(0, 6).map((version) => (
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
          )) : <p className="rounded-card border border-white/10 bg-white/[0.035] p-3 text-sm muted">Audit logs are kept for every save/reset. Previous versions will appear after the first edit.</p>}
        </div>
      </div>
    </aside>
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
            <p className="mt-2 text-sm leading-6 muted">Use these placeholders in template text. Values are filled only when a new PDF is generated.</p>
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

function TemplateEditor({ template, draft, setDraft, canEdit, saving, onSave, onCancel, onPreview, onDownload, onReset, versions, restoring, onRestore, onShowVariables }) {
  const update = (key, value) => setDraft((current) => ({ ...current, [key]: value }));
  const editorTextAreas = template.key === 'service-completed'
    ? [{ key: 'notesWarrantyText', label: 'Warranty Note', rows: 4 }]
    : textAreas;
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
      <form className="surface admin-control-card p-5" onSubmit={onSave}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-wide text-[var(--brand)]">PDF Template Editor</p>
            <h2 className="mt-1 text-2xl font-black">{template.name}</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 muted">Static template text can use placeholders. Customer, invoice, AMC, work order, and technician values come from the database during PDF generation.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-secondary admin-compact-button" onClick={onShowVariables}>
              <ShieldCheck className="h-4 w-4" />
              Template Variables
            </button>
            <button type="button" className="btn btn-secondary admin-compact-button" onClick={() => onPreview(template)}>
              <Eye className="h-4 w-4" />
              Preview PDF
            </button>
            <button type="button" className="btn btn-secondary admin-compact-button" onClick={() => onDownload(template)}>
              <Download className="h-4 w-4" />
              Download Sample PDF
            </button>
            <button type="button" className="btn btn-secondary admin-compact-button" disabled={!canEdit || saving} onClick={() => onReset(template)}>
              <RotateCcw className="h-4 w-4" />
              Reset to Default
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <label>
            <span className="label">Header Title</span>
            <input className="input" value={draft.headerTitle || ''} onChange={(event) => update('headerTitle', event.target.value)} disabled={!canEdit} />
          </label>
          <label>
            <span className="label">Color Accent</span>
            <div className="grid grid-cols-[3.25rem_minmax(0,1fr)] gap-2">
              <input className="h-12 w-full rounded-card border border-white/10 bg-transparent p-1" type="color" value={draft.colorAccent || '#0f2a52'} onChange={(event) => update('colorAccent', event.target.value)} disabled={!canEdit} />
              <input className="input" value={draft.colorAccent || ''} onChange={(event) => update('colorAccent', event.target.value)} disabled={!canEdit} />
            </div>
          </label>
          <label className="flex items-center justify-between gap-3 rounded-card border border-white/10 bg-white/[0.035] px-3 py-3">
            <span className="font-bold text-slate-100">Company logo visibility</span>
            <input type="checkbox" className="h-4 w-4 accent-[var(--brand)]" checked={draft.showCompanyLogo !== false} onChange={(event) => update('showCompanyLogo', event.target.checked)} disabled={!canEdit} />
          </label>
          <label className="flex items-center justify-between gap-3 rounded-card border border-white/10 bg-white/[0.035] px-3 py-3">
            <span className="font-bold text-slate-100">Company details visibility</span>
            <input type="checkbox" className="h-4 w-4 accent-[var(--brand)]" checked={draft.showCompanyDetails !== false} onChange={(event) => update('showCompanyDetails', event.target.checked)} disabled={!canEdit} />
          </label>
          {['quotation', 'amc-contract', 'amc-service-visit'].includes(template.key) ? (
            <>
              <label className="flex items-center justify-between gap-3 rounded-card border border-white/10 bg-white/[0.035] px-3 py-3">
                <span className="font-bold text-slate-100">Technician row visibility</span>
                <input type="checkbox" className="h-4 w-4 accent-[var(--brand)]" checked={draft.showTechnician !== false} onChange={(event) => update('showTechnician', event.target.checked)} disabled={!canEdit} />
              </label>
            </>
          ) : null}
          {['quotation', 'amc-contract'].includes(template.key) ? (
            <>
              <label className="flex items-center justify-between gap-3 rounded-card border border-white/10 bg-white/[0.035] px-3 py-3">
                <span className="font-bold text-slate-100">{template.key === 'amc-contract' ? 'Serial number column visibility' : 'Serial number row visibility'}</span>
                <input type="checkbox" className="h-4 w-4 accent-[var(--brand)]" checked={Boolean(draft.showSerialNumber)} onChange={(event) => update('showSerialNumber', event.target.checked)} disabled={!canEdit} />
              </label>
            </>
          ) : null}
          {template.key === 'amc-service-visit' ? (
            <label className="flex items-center justify-between gap-3 rounded-card border border-white/10 bg-white/[0.035] px-3 py-3">
              <span className="font-bold text-slate-100">Additional charges section visibility</span>
              <input type="checkbox" className="h-4 w-4 accent-[var(--brand)]" checked={draft.showAdditionalCharges !== false} onChange={(event) => update('showAdditionalCharges', event.target.checked)} disabled={!canEdit} />
            </label>
          ) : null}
          {template.key === 'amc-renewal-reminder' ? (
            <label className="flex items-center justify-between gap-3 rounded-card border border-white/10 bg-white/[0.035] px-3 py-3">
              <span className="font-bold text-slate-100">Renewal amount section visibility</span>
              <input type="checkbox" className="h-4 w-4 accent-[var(--brand)]" checked={draft.showRenewalAmount !== false} onChange={(event) => update('showRenewalAmount', event.target.checked)} disabled={!canEdit} />
            </label>
          ) : null}
          {editorTextAreas.map((field) => (
            <label key={field.key} className="lg:col-span-2">
              <span className="label">{field.label}</span>
              <textarea className="input min-h-24" rows={field.rows} value={draft[field.key] || ''} onChange={(event) => update(field.key, event.target.value)} disabled={!canEdit} />
            </label>
          ))}
          {template.key !== 'service-completed' ? (
            <label className="lg:col-span-2">
              <span className="label">Signature Section</span>
              <input className="input" value={draft.signatureSection || ''} onChange={(event) => update('signatureSection', event.target.value)} disabled={!canEdit} />
            </label>
          ) : null}
          {template.category === 'amc' ? (
            <label className="lg:col-span-2">
              <span className="label">AMC Terms</span>
              <textarea className="input min-h-24" rows={4} value={draft.amcTerms || ''} onChange={(event) => update('amcTerms', event.target.value)} disabled={!canEdit} />
            </label>
          ) : null}
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            <X className="h-4 w-4" />
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={!canEdit || saving}>
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save Template'}
          </button>
        </div>
      </form>
      <HelperPanel activeTemplate={template} versions={versions} restoring={restoring} onRestore={onRestore} />
    </div>
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
  const editorDirty = Boolean(activeTemplate && JSON.stringify(draft || {}) !== JSON.stringify(activeTemplate.config || {}));
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
    setDraft({ ...(template.config || {}) });
  }

  async function previewTemplate(template) {
    setBusyKey(`preview-${template.key}`);
    try {
      const response = await fetch(`${apiBase}/pdf-templates/${template.key}/preview`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const blob = await response.blob();
      if (!response.ok) throw new Error('PDF preview failed');
      const url = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
      window.open(url, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
      push(err.message, 'error');
    } finally {
      setBusyKey('');
    }
  }

  async function downloadTemplate(template) {
    setBusyKey(`download-${template.key}`);
    try {
      const response = await fetch(`${apiBase}/pdf-templates/${template.key}/preview`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const blob = await response.blob();
      if (!response.ok) throw new Error('Sample PDF download failed');
      const url = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
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
      setDraft({ ...(result.template?.config || draft) });
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
      if (editingKey === template.key) setDraft({ ...(result.template?.config || {}) });
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
      setDraft({ ...(result.template?.config || {}) });
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
        <TemplateEditor
          template={activeTemplate}
          draft={draft}
          setDraft={setDraft}
          canEdit={canEdit}
          saving={saving}
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
              <span className="admin-premium-badge">ADMIN EDITABLE</span>
            </div>
            <h2 className="text-2xl font-black">PDF / Document Templates</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 muted">Manage reusable PDF template text before invoices, quotations, service reports, and AMC documents are generated.</p>
          </div>
          <div className="rounded-card border border-sky-300/20 bg-sky-500/10 px-4 py-3 text-sm text-sky-100">
            <div className="flex items-center gap-2 font-black">
              <Palette className="h-4 w-4" />
              Fresh PDFs use current templates
            </div>
            <p className="mt-1 text-xs text-sky-100/80">Regeneration creates a new PDF output and does not overwrite old files automatically.</p>
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
