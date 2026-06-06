import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  CheckCircle2,
  GripVertical,
  Info,
  Loader2,
  LockKeyhole,
  MoreVertical,
  PencilLine,
  Plus,
  RotateCcw,
  Save,
  ShieldCheck,
  Trash2,
  Workflow,
  X,
  Zap
} from 'lucide-react';
import { EmptyState, ErrorBlock, LoadingBlock, useAuth, useResource, useToast } from '../../shared/phase1Shared.jsx';
import { can, hasRole } from '../../utils/roles.js';

const flowMeta = {
  booking: { label: 'Booking', title: 'Booking workflow', helper: 'Service intake, confirmation, cancellation, and conversion statuses.' },
  workOrder: { label: 'Work Order', title: 'Work order workflow', helper: 'Technician assignment, repair progress, approval, delivery, and terminal statuses.' },
  invoice: { label: 'Invoice', title: 'Invoice workflow', helper: 'Invoice preparation, sending, payment collection, and terminal billing states.' },
  amc: { label: 'AMC', title: 'AMC workflow', helper: 'AMC contract, visit, renewal, expiry, and cancellation lifecycle statuses.' }
};

const workflowDefaults = {
  booking: [
    { key: 'Pending', label: 'Pending', color: '#f59e0b', order: 0, active: true, protected: true, description: 'New booking received and waiting for action.' },
    { key: 'Converted', label: 'Converted', color: '#22c55e', order: 1, active: true, protected: true, description: 'Booking converted into a work order.' }
  ],
  workOrder: [
    { key: 'Pending', label: 'Pending', color: '#f59e0b', order: 0, active: true, protected: true, description: 'Job created and waiting to be assigned.' },
    { key: 'In Progress', label: 'In Progress', color: '#38bdf8', order: 1, active: true, protected: true, description: 'Technician has started the work.' },
    { key: 'Awaiting Parts', label: 'Awaiting Parts', color: '#a78bfa', order: 2, active: true, protected: true, description: 'Work is paused until required parts arrive.' },
    { key: 'Completed', label: 'Completed', color: '#22c55e', order: 3, active: true, protected: true, description: 'Service work is completed.' },
    { key: 'Delivered', label: 'Delivered', color: '#14b8a6', order: 4, active: true, protected: true, description: 'Device/product delivered to customer.' },
    { key: 'Returned', label: 'Returned', color: '#64748b', order: 5, active: true, protected: true, description: 'Device/product returned without completion or after issue.' }
  ],
  invoice: [
    { key: 'Pending', label: 'Pending', color: '#f59e0b', order: 0, active: true, protected: true, description: 'Payment is pending.' },
    { key: 'Partial', label: 'Partial', color: '#38bdf8', order: 1, active: true, protected: true, description: 'Partial payment received.' },
    { key: 'Paid', label: 'Paid', color: '#22c55e', order: 2, active: true, protected: true, description: 'Full payment received.' },
    { key: 'Void', label: 'Void', color: '#ef4444', order: 3, active: true, protected: true, description: 'Invoice cancelled and no longer valid.' }
  ],
  amc: [
    { key: 'Active', label: 'Active', color: '#22c55e', order: 0, active: true, protected: true, description: 'AMC contract is currently active.' },
    { key: 'Cancelled', label: 'Cancelled', color: '#ef4444', order: 1, active: true, protected: true, description: 'AMC contract cancelled.' },
    { key: 'Upcoming', label: 'Upcoming', color: '#38bdf8', order: 2, active: true, protected: true, description: 'AMC renewal or visit is upcoming.' },
    { key: 'Completed', label: 'Completed', color: '#14b8a6', order: 3, active: true, protected: true, description: 'AMC visit/service completed.' }
  ]
};

const suggestedStatuses = {
  booking: [
    { key: 'Confirmed', label: 'Confirmed', color: '#38bdf8', order: 1, description: 'Booking confirmed with the customer.' },
    { key: 'Cancelled', label: 'Cancelled', color: '#ef4444', order: 99, terminal: true, description: 'Booking cancelled before conversion.' }
  ],
  workOrder: [
    { key: 'Assigned', label: 'Assigned', color: '#60a5fa', order: 1, description: 'Technician has been assigned.' },
    { key: 'Customer Approval', label: 'Customer Approval', color: '#fbbf24', order: 4, description: 'Waiting for customer approval before continuing.' },
    { key: 'Ready for Delivery', label: 'Ready for Delivery', color: '#2dd4bf', order: 6, description: 'Device is ready to hand over.' },
    { key: 'Cancelled', label: 'Cancelled', color: '#ef4444', order: 99, terminal: true, description: 'Work order cancelled before completion.' }
  ],
  invoice: [
    { key: 'Draft', label: 'Draft', color: '#94a3b8', order: 0, description: 'Invoice is being prepared.' },
    { key: 'Sent', label: 'Sent', color: '#60a5fa', order: 1, description: 'Invoice sent to the customer.' },
    { key: 'Overdue', label: 'Overdue', color: '#f97316', order: 98, terminal: true, description: 'Payment is past due date.' }
  ],
  amc: [
    { key: 'Renewed', label: 'Renewed', color: '#22c55e', order: 3, description: 'AMC contract renewed for a new term.' },
    { key: 'Expired', label: 'Expired', color: '#f97316', order: 98, terminal: true, description: 'AMC contract has passed expiry date.' }
  ]
};

const visualFlowRules = {
  booking: {
    main: ['Pending', 'Confirmed', 'Converted'],
    side: ['Cancelled']
  },
  workOrder: {
    main: ['Pending', 'Assigned', 'In Progress', 'Awaiting Parts', 'Customer Approval', 'Completed', 'Ready for Delivery', 'Delivered'],
    side: ['Returned', 'Cancelled']
  },
  invoice: {
    main: ['Draft', 'Sent', 'Pending', 'Partial', 'Paid'],
    side: ['Overdue', 'Void']
  },
  amc: {
    main: ['Active', 'Upcoming', 'Renewed'],
    side: ['Completed', 'Expired', 'Cancelled']
  }
};

const automationRules = {
  booking: [
    ['Converted', 'Create Work Order'],
    ['Pending', 'Notify admin about new booking']
  ],
  workOrder: [
    ['Completed', 'Generate Service Completed PDF'],
    ['Awaiting Parts', 'Notify admin']
  ],
  invoice: [
    ['Paid', 'Send thank-you notification'],
    ['Overdue', 'Send payment reminder']
  ],
  amc: [
    ['Upcoming', 'Send renewal reminder'],
    ['Completed', 'Mark visit completed']
  ]
};

const emptyWorkflowState = { booking: [], workOrder: [], invoice: [], amc: [] };
const safeKeyPattern = /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/;
const colorPattern = /^#[0-9a-fA-F]{6}$/;

function clonePlain(value) {
  return JSON.parse(JSON.stringify(value || {}));
}

function stableJson(value) {
  return JSON.stringify(value || {});
}

function slugify(value = '') {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function statusIdentity(value = '') {
  return String(value || '').trim().toLowerCase();
}

function statusMatchesToken(status = {}, token = '') {
  const target = statusIdentity(token);
  return statusIdentity(status.key) === target || statusIdentity(status.label) === target;
}

function sortedStatuses(statuses = []) {
  return statuses
    .map((item, index) => ({ item, index }))
    .sort((left, right) => Number(left.item.order ?? left.index) - Number(right.item.order ?? right.index));
}

function defaultState() {
  return clonePlain(workflowDefaults);
}

function defaultDescription(flow, key, label = '') {
  const defaults = [...(workflowDefaults[flow] || []), ...(suggestedStatuses[flow] || [])];
  return defaults.find((item) => statusMatchesToken(item, key) || statusMatchesToken(item, label))?.description || '';
}

function normalizeStatusItem(flow, item = {}, index = 0) {
  const defaultItem = (workflowDefaults[flow] || []).find((status) => status.key === item.key);
  const key = String(item.key || item.label || defaultItem?.key || `Status ${index}`).trim();
  const protectedStatus = Boolean(defaultItem?.protected || item.protected);
  return {
    key,
    label: String(item.label || defaultItem?.label || key).trim(),
    color: String(item.color || defaultItem?.color || '#75c4ff').trim(),
    order: Number.isFinite(Number(item.order)) ? Number(item.order) : index,
    active: protectedStatus ? true : item.active !== false,
    protected: protectedStatus,
    description: String(item.description ?? defaultItem?.description ?? defaultDescription(flow, key, item.label) ?? '').trim()
  };
}

function normalizeWorkflowState(source = {}) {
  return Object.keys(flowMeta).reduce((state, flow) => {
    const incoming = Array.isArray(source?.[flow]) && source[flow].length ? source[flow] : workflowDefaults[flow];
    const normalized = incoming.map((item, index) => normalizeStatusItem(flow, item, index));
    const protectedDefaults = workflowDefaults[flow].filter((item) => item.protected);
    protectedDefaults.forEach((item) => {
      if (!normalized.some((status) => status.key === item.key)) normalized.push(clonePlain(item));
    });
    state[flow] = sortedStatuses(normalized).map(({ item }, index) => ({ ...item, order: Number(item.order ?? index) }));
    return state;
  }, clonePlain(emptyWorkflowState));
}

function nextOrder(statuses = []) {
  if (!statuses.length) return 0;
  return Math.max(...statuses.map((item, index) => Number(item.order ?? index))) + 1;
}

function buildVisualFlow(flow, statuses = []) {
  const active = sortedStatuses(statuses)
    .map(({ item, index }) => ({ ...item, originalIndex: index }))
    .filter((item) => item.active !== false);
  const used = new Set();
  const rules = visualFlowRules[flow] || { main: [], side: [] };
  const pick = (token) => {
    const match = active.find((item) => !used.has(item.originalIndex) && statusMatchesToken(item, token));
    if (match) used.add(match.originalIndex);
    return match || null;
  };
  const main = rules.main.map(pick).filter(Boolean);
  const side = rules.side.map(pick).filter(Boolean);
  const additional = active.filter((item) => !used.has(item.originalIndex));
  return { main, side, additional };
}

function validateFlow(statuses = []) {
  const errors = [];
  const keyCounts = {};
  const orderCounts = {};
  statuses.forEach((status, index) => {
    const row = index + 1;
    const key = String(status.key || '').trim();
    const label = String(status.label || '').trim();
    const color = String(status.color || '').trim();
    const order = String(status.order ?? '').trim();
    if (!label) errors.push(`Row ${row}: Label is required.`);
    if (!key) errors.push(`Row ${row}: Key is required.`);
    if (!color || !colorPattern.test(color)) errors.push(`Row ${row}: Valid color is required.`);
    if (!order) errors.push(`Row ${row}: Order is required.`);
    if (order && !Number.isFinite(Number(order))) errors.push(`Row ${row}: Order must be a valid number.`);
    keyCounts[key] = (keyCounts[key] || 0) + 1;
    orderCounts[order] = (orderCounts[order] || 0) + 1;
  });
  Object.entries(keyCounts).forEach(([key, count]) => {
    if (key && count > 1) errors.push(`Duplicate key "${key}" exists in this workflow.`);
  });
  Object.entries(orderCounts).forEach(([order, count]) => {
    if (order && count > 1) errors.push(`Order number ${order} is used more than once.`);
  });
  return errors;
}

function validateAllFlows(state = {}) {
  return Object.keys(flowMeta).reduce((result, flow) => {
    result[flow] = validateFlow(state[flow] || []);
    return result;
  }, {});
}

function missingSuggestions(flow, statuses = []) {
  const keySet = new Set(statuses.map((item) => statusIdentity(item.key)));
  const labelSet = new Set(statuses.map((item) => statusIdentity(item.label)));
  return (suggestedStatuses[flow] || []).filter((item) => !keySet.has(statusIdentity(item.key)) && !labelSet.has(statusIdentity(item.label)));
}

function WorkflowModal({ title, description, children, onClose }) {
  return (
    <div className="status-workflow-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="status-workflow-modal-title">
      <section className="surface admin-modal status-workflow-modal">
        <div className="status-workflow-modal-header">
          <div className="min-w-0">
            <h3 id="status-workflow-modal-title">{title}</h3>
            {description ? <p>{description}</p> : null}
          </div>
          <button type="button" className="icon-button h-9 w-9" onClick={onClose} aria-label="Close modal">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

function StatusWorkflowSettingsSection({ onDirtyChange = null }) {
  const { request, user } = useAuth();
  const { push } = useToast();
  const { data, loading, error, reload } = useResource(() => request('/settings/business'), [request]);
  const canEdit = hasRole(user, 'admin') && can(user, 'manage_status_workflows');
  const saved = useMemo(() => normalizeWorkflowState(data?.settings?.statusWorkflows || {}), [data?.settings?.statusWorkflows]);
  const savedJson = useMemo(() => stableJson(saved), [saved]);
  const [draft, setDraft] = useState(() => defaultState());
  const [activeFlow, setActiveFlow] = useState('booking');
  const [saving, setSaving] = useState(false);
  const [menuKey, setMenuKey] = useState('');
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addDraft, setAddDraft] = useState({ label: '', key: '', keyTouched: false, color: '#75c4ff', order: 0, description: '' });
  const [addErrors, setAddErrors] = useState([]);
  const [resetConfirm, setResetConfirm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [unsavedConfirm, setUnsavedConfirm] = useState(null);
  const [automationEnabled, setAutomationEnabled] = useState({});
  const [descriptionEditKey, setDescriptionEditKey] = useState('');
  const dirty = stableJson(draft) !== savedJson;
  const validation = useMemo(() => validateAllFlows(draft), [draft]);
  const validationErrors = Object.values(validation).flat();
  const currentStatuses = draft[activeFlow] || [];
  const currentSorted = sortedStatuses(currentStatuses);
  const visualFlow = useMemo(() => buildVisualFlow(activeFlow, currentStatuses), [activeFlow, currentStatuses]);
  const currentMissingSuggestions = missingSuggestions(activeFlow, currentStatuses);

  useEffect(() => {
    setDraft(clonePlain(saved));
  }, [savedJson]);

  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  useEffect(() => {
    if (!dirty) return undefined;
    const onBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  function requestDirtyAction(action) {
    if (dirty) {
      setUnsavedConfirm(action);
      return false;
    }
    return true;
  }

  function switchFlow(flow) {
    if (flow === activeFlow) return;
    if (!requestDirtyAction({ type: 'switch', flow })) return;
    setActiveFlow(flow);
    setMenuKey('');
    setDescriptionEditKey('');
  }

  function continueUnsavedAction() {
    const action = unsavedConfirm;
    setUnsavedConfirm(null);
    if (!action) return;
    if (action.type === 'switch') {
      setDraft(clonePlain(saved));
      setActiveFlow(action.flow);
      setMenuKey('');
      setDescriptionEditKey('');
      return;
    }
    if (action.type === 'reset') {
      setResetConfirm(true);
    }
  }

  function updateStatus(originalIndex, field, value) {
    setDraft((current) => {
      const next = clonePlain(current);
      next[activeFlow][originalIndex] = { ...next[activeFlow][originalIndex], [field]: value };
      return next;
    });
  }

  function moveStatus(position, direction) {
    setDraft((current) => {
      const next = clonePlain(current);
      const entries = sortedStatuses(next[activeFlow] || []);
      const target = position + direction;
      if (target < 0 || target >= entries.length) return current;
      const swapped = [...entries];
      [swapped[position], swapped[target]] = [swapped[target], swapped[position]];
      swapped.forEach(({ index }, order) => {
        next[activeFlow][index].order = order;
      });
      return next;
    });
    setMenuKey('');
    setDescriptionEditKey('');
  }

  function toggleActive(originalIndex) {
    const status = draft[activeFlow]?.[originalIndex];
    if (!status || status.protected) return;
    updateStatus(originalIndex, 'active', status.active === false);
    setMenuKey('');
  }

  function editDescription(menuId) {
    if (!canEdit || saving) return;
    setDescriptionEditKey(menuId);
    setMenuKey('');
  }

  function openAddModal(seed = null) {
    const order = nextOrder(draft[activeFlow] || []);
    setAddDraft({
      label: seed?.label || '',
      key: seed?.key ? slugify(seed.key) : '',
      keyTouched: Boolean(seed?.key),
      color: seed?.color || '#75c4ff',
      order,
      description: seed?.description || ''
    });
    setAddErrors([]);
    setAddModalOpen(true);
  }

  function validateAddDraft() {
    const errors = [];
    const label = addDraft.label.trim();
    const key = addDraft.key.trim();
    if (!label) errors.push('Label is required.');
    if (!key) errors.push('Key is required.');
    if (key && !safeKeyPattern.test(key)) errors.push('Key must use lowercase letters, numbers, hyphen, or underscore.');
    if (!addDraft.color || !colorPattern.test(addDraft.color)) errors.push('Valid color is required.');
    if (String(addDraft.order ?? '').trim() === '') errors.push('Order is required.');
    if (String(addDraft.order ?? '').trim() !== '' && !Number.isFinite(Number(addDraft.order))) errors.push('Order must be a valid number.');
    const statuses = draft[activeFlow] || [];
    if (statuses.some((item) => statusIdentity(item.key) === statusIdentity(key))) errors.push('Key must be unique inside this workflow.');
    if (statuses.some((item) => statusIdentity(item.label) === statusIdentity(label))) errors.push('Label already exists inside this workflow.');
    if (String(addDraft.order ?? '').trim() !== '' && statuses.some((item) => Number(item.order) === Number(addDraft.order))) errors.push('Order number is already used in this workflow.');
    return errors;
  }

  function addStatusFromModal(event) {
    event.preventDefault();
    const errors = validateAddDraft();
    setAddErrors(errors);
    if (errors.length) {
      push('Please fix validation errors before saving', 'error');
      return;
    }
    const status = {
      key: addDraft.key.trim(),
      label: addDraft.label.trim(),
      color: addDraft.color,
      order: Number(addDraft.order),
      description: addDraft.description.trim(),
      active: true,
      protected: false
    };
    setDraft((current) => ({ ...current, [activeFlow]: [...(current[activeFlow] || []), status] }));
    setAddModalOpen(false);
    push('Status added');
  }

  function confirmDelete(originalIndex) {
    const status = draft[activeFlow]?.[originalIndex];
    if (!status || status.protected) return;
    setDeleteConfirm({ flow: activeFlow, index: originalIndex, status });
    setMenuKey('');
  }

  function deleteStatus() {
    if (!deleteConfirm) return;
    setDraft((current) => {
      const next = clonePlain(current);
      next[deleteConfirm.flow] = next[deleteConfirm.flow].filter((_, index) => index !== deleteConfirm.index);
      return next;
    });
    setDeleteConfirm(null);
    push('Status deleted');
  }

  function requestResetFlow() {
    if (!requestDirtyAction({ type: 'reset' })) return;
    setResetConfirm(true);
  }

  function resetFlowToDefaults() {
    setDraft((current) => ({ ...current, [activeFlow]: clonePlain(workflowDefaults[activeFlow]) }));
    setResetConfirm(false);
    push('Workflow reset successfully');
  }

  function cancelChanges() {
    setDraft(clonePlain(saved));
    setMenuKey('');
    setDescriptionEditKey('');
  }

  async function saveWorkflow(event = null) {
    event?.preventDefault?.();
    if (!canEdit) {
      push('You do not have permission to save status workflows', 'error');
      return;
    }
    if (validationErrors.length) {
      push('Please fix validation errors before saving', 'error');
      return;
    }
    setSaving(true);
    try {
      const result = await request('/settings/business/statusWorkflows', {
        method: 'PATCH',
        body: JSON.stringify(draft)
      });
      push(result.message || 'Workflow saved successfully');
      await reload({ silent: true });
    } catch (err) {
      push(err.message || 'Failed to save workflow', 'error');
    } finally {
      setSaving(false);
    }
  }

  function setAutomationRule(flow, index, enabled) {
    setAutomationEnabled((current) => ({ ...current, [`${flow}:${index}`]: enabled }));
  }

  if (loading) return <LoadingBlock />;
  if (error) return <ErrorBlock message={error} />;

  return (
    <section className="status-workflow-settings">
      <section className="surface admin-control-card status-workflow-hero">
        <div className="status-workflow-hero-copy">
          <div className="admin-control-icon status-workflow-hero-icon"><Workflow className="h-5 w-5" /></div>
          <div>
            <span className="status-workflow-eyebrow">Workflow Builder</span>
            <h2>Status Workflow Settings</h2>
            <p>Preview and store status flows without changing the existing status buttons or backend enums.</p>
          </div>
        </div>
        <span className="admin-premium-badge">Safe configuration</span>
      </section>

      {!canEdit ? (
        <p className="status-workflow-permission">Only admin users with status workflow permission can save changes.</p>
      ) : null}

      <section className="surface admin-control-card status-workflow-tabs" aria-label="Status workflow tabs">
        {Object.entries(flowMeta).map(([flow, meta]) => {
          const count = (draft[flow] || []).filter((item) => item.active !== false).length;
          return (
            <button key={flow} type="button" className={`status-workflow-tab ${activeFlow === flow ? 'is-active' : ''}`} onClick={() => switchFlow(flow)}>
              <span>{meta.label}</span>
              <strong>{count}</strong>
            </button>
          );
        })}
      </section>

      <section className="surface admin-control-card status-workflow-preview-card">
        <div className="status-workflow-section-heading">
          <div>
            <h3>{flowMeta[activeFlow].title}</h3>
            <p>{flowMeta[activeFlow].helper}</p>
          </div>
          <div className="status-workflow-section-actions">
            {!dirty ? (
              <button type="button" className="btn btn-secondary admin-compact-button" disabled={!canEdit || saving} onClick={requestResetFlow}><RotateCcw className="h-4 w-4" /> Reset Flow</button>
            ) : null}
            <button type="button" className="btn btn-secondary admin-compact-button" disabled={!canEdit || saving} onClick={() => openAddModal()}>
              <Plus className="h-4 w-4" />
              Add Status
            </button>
          </div>
        </div>
        <div className="status-workflow-preview-shell">
          <div className="status-workflow-scroll-shell">
            <div className="status-workflow-preview-strip" aria-label={`${flowMeta[activeFlow].label} workflow preview`}>
              {visualFlow.main.length ? visualFlow.main.map((status, index) => (
                <div key={`${status.key}-${index}`} className="status-workflow-preview-step">
                  <span style={{ backgroundColor: status.color || '#75c4ff' }} />
                  <strong>{status.label}</strong>
                  {index < visualFlow.main.length - 1 ? <ArrowRight className="h-4 w-4" /> : null}
                </div>
              )) : (
                <span className="status-workflow-empty-inline">No active statuses configured.</span>
              )}
            </div>
          </div>
          {visualFlow.side.length || visualFlow.additional.length ? (
            <div className="status-workflow-side-strip">
              {visualFlow.side.length ? (
                <>
                  <span className="status-workflow-side-label">Side / terminal</span>
                  {visualFlow.side.map((status, index) => (
                    <span key={`side-${status.key}-${index}`} className="status-workflow-side-pill">
                      <i style={{ backgroundColor: status.color || '#75c4ff' }} />
                      {status.label}
                    </span>
                  ))}
                </>
              ) : null}
              {visualFlow.additional.length ? (
                <>
                  <span className="status-workflow-side-label">Additional</span>
                  {visualFlow.additional.map((status, index) => (
                    <span key={`additional-${status.key}-${index}`} className="status-workflow-side-pill">
                      <i style={{ backgroundColor: status.color || '#75c4ff' }} />
                      {status.label}
                    </span>
                  ))}
                </>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>

      {validation[activeFlow]?.length ? (
        <section className="status-workflow-validation">
          <AlertTriangle className="h-4 w-4" />
          <div>
            <strong>Please fix validation errors before saving</strong>
            {validation[activeFlow].slice(0, 4).map((message) => <p key={message}>{message}</p>)}
          </div>
        </section>
      ) : null}

      <section className="surface admin-control-card status-workflow-table-card">
        <div className="status-workflow-table-head">
          <span>Status</span>
          <span>Key</span>
          <span>Color</span>
          <span>Order</span>
          <span>Protection</span>
          <span>Actions</span>
        </div>
        <div className="status-workflow-list">
          {currentSorted.map(({ item, index }, sortedIndex) => {
            const menuId = `${activeFlow}:${index}`;
            const isDescriptionEditing = descriptionEditKey === menuId;
            const descriptionText = String(item.description || '').trim() || defaultDescription(activeFlow, item.key, item.label);
            return (
              <article key={`${item.key}-${index}`} className="status-workflow-row">
                <div className="status-workflow-drag" title="Visual drag handle. Use Move Up / Move Down to reorder."><GripVertical className="h-4 w-4" /></div>
                <div className="status-workflow-status-cell">
                  <label className="status-workflow-label-field">
                    <span className="label">Label</span>
                    <input className="input" value={item.label || ''} disabled={!canEdit || saving} onFocus={() => editDescription(menuId)} onChange={(event) => updateStatus(index, 'label', event.target.value)} />
                  </label>
                  {isDescriptionEditing ? (
                    <label className="status-workflow-description-editor">
                      <span className="label sr-only">Description</span>
                      <input className="input status-workflow-description-input" value={item.description || ''} disabled={!canEdit || saving} placeholder={descriptionText || 'No description'} onChange={(event) => updateStatus(index, 'description', event.target.value)} />
                    </label>
                  ) : (
                    <button type="button" className={`status-workflow-description-text ${descriptionText ? '' : 'is-empty'}`} disabled={!canEdit || saving} title={descriptionText || 'No description'} onClick={() => editDescription(menuId)}>
                      {descriptionText || 'No description'}
                    </button>
                  )}
                </div>
                <label className="status-workflow-key-cell">
                  <span className="label">Key</span>
                  <input className="input" value={item.key || ''} disabled title="Status keys are locked after creation to protect backend logic." readOnly />
                </label>
                <label className="status-workflow-color-cell">
                  <span className="label">Color</span>
                  <span className="status-workflow-color-control">
                    <span style={{ backgroundColor: item.color || '#75c4ff' }} />
                    <input type="color" value={colorPattern.test(item.color || '') ? item.color : '#75c4ff'} disabled={!canEdit || saving} onChange={(event) => updateStatus(index, 'color', event.target.value)} />
                  </span>
                </label>
                <label className="status-workflow-order-cell">
                  <span className="label">Order</span>
                  <input className="input" type="number" min="0" value={item.order ?? sortedIndex} disabled={!canEdit || saving} onChange={(event) => updateStatus(index, 'order', event.target.value)} />
                </label>
                <div className="status-workflow-protection-cell">
                  {item.protected ? (
                    <span className="status-workflow-core-badge"><LockKeyhole className="h-3.5 w-3.5" /> Core Status</span>
                  ) : (
                    <span className={`status-workflow-active-badge ${item.active === false ? 'is-off' : ''}`}>{item.active === false ? 'Disabled' : 'Custom'}</span>
                  )}
                </div>
                <div className="status-workflow-actions-cell">
                  <button type="button" className="icon-button h-9 w-9" aria-label={`Open actions for ${item.label}`} onClick={() => setMenuKey(menuKey === menuId ? '' : menuId)}>
                    <MoreVertical className="h-4 w-4" />
                  </button>
                  {menuKey === menuId ? (
                    <div className="status-workflow-menu">
                      <button type="button" disabled={sortedIndex === 0} onClick={() => moveStatus(sortedIndex, -1)}><ArrowUp className="h-4 w-4" /> Move Up</button>
                      <button type="button" disabled={sortedIndex === currentSorted.length - 1} onClick={() => moveStatus(sortedIndex, 1)}><ArrowDown className="h-4 w-4" /> Move Down</button>
                      <button type="button" onClick={() => editDescription(menuId)}><PencilLine className="h-4 w-4" /> Edit Description</button>
                      {item.protected ? (
                        <>
                          <span className="status-workflow-menu-note" title="Core status key is protected"><LockKeyhole className="h-4 w-4" /> Core status key is protected</span>
                          <span className="status-workflow-menu-note" title="Core status cannot be deleted"><Trash2 className="h-4 w-4" /> Core status cannot be deleted</span>
                        </>
                      ) : (
                        <>
                          <button type="button" onClick={() => toggleActive(index)}><CheckCircle2 className="h-4 w-4" /> {item.active === false ? 'Enable' : 'Disable'}</button>
                          <button type="button" className="is-danger" onClick={() => confirmDelete(index)}><Trash2 className="h-4 w-4" /> Delete</button>
                        </>
                      )}
                    </div>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
        <p className="status-workflow-core-note"><ShieldCheck className="h-4 w-4" /> Core statuses are protected because business logic depends on them.</p>
      </section>

      <section className="status-workflow-support-grid">
        <div className="surface admin-control-card status-workflow-support-card">
          <div className="status-workflow-section-heading">
            <div>
              <h3>Automation Rules</h3>
              <p>UI-ready preview only. These toggles do not change backend automation yet.</p>
            </div>
            <Zap className="h-5 w-5" />
          </div>
          <div className="status-workflow-rule-list">
            {(automationRules[activeFlow] || []).map(([trigger, action], index) => {
              const key = `${activeFlow}:${index}`;
              const enabled = automationEnabled[key] ?? true;
              return (
                <div key={key} className="status-workflow-rule-row">
                  <span>{trigger}</span>
                  <ArrowRight className="h-4 w-4" />
                  <strong>{action}</strong>
                  <button type="button" className={`status-workflow-mini-toggle ${enabled ? 'is-on' : ''}`} onClick={() => setAutomationRule(activeFlow, index, !enabled)} aria-pressed={enabled}>
                    <span />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="surface admin-control-card status-workflow-support-card">
          <div className="status-workflow-section-heading">
            <div>
              <h3>Allowed Status Movement</h3>
              <p>Use this to control which status can move to another status. This prevents wrong jumps like Pending directly to Delivered.</p>
            </div>
            <Info className="h-5 w-5" />
          </div>
          <div className="status-workflow-transition-shell">
            <div className="status-workflow-scroll-shell">
              <div className="status-workflow-transition-map">
                {visualFlow.main.length ? visualFlow.main.map((status, index) => (
                  <div key={`${status.key}-${index}`} className="status-workflow-transition-step">
                    <span style={{ backgroundColor: status.color || '#75c4ff' }} />
                    <strong>{status.label}</strong>
                    {index < visualFlow.main.length - 1 ? <ArrowRight className="h-4 w-4" /> : null}
                  </div>
                )) : <span className="status-workflow-empty-inline">No main movement path configured.</span>}
              </div>
            </div>
            {visualFlow.side.length || visualFlow.additional.length ? (
              <div className="status-workflow-side-strip status-workflow-side-strip-compact">
                {[...visualFlow.side, ...visualFlow.additional].map((status, index) => (
                  <span key={`movement-side-${status.key}-${index}`} className="status-workflow-side-pill">
                    <i style={{ backgroundColor: status.color || '#75c4ff' }} />
                    {status.label}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="surface admin-control-card status-workflow-suggestions">
        <div className="status-workflow-section-heading">
          <div>
            <h3>Suggested Statuses</h3>
            <p>Recommended additions are never auto-added. Click Add when a status is safe for your workflow.</p>
          </div>
        </div>
        {currentMissingSuggestions.length ? (
          <div className="status-workflow-suggestion-list">
            {currentMissingSuggestions.map((status) => (
              <div key={status.key} className="status-workflow-suggestion-row">
                <span style={{ backgroundColor: status.color }} />
                <div>
                  <strong>{status.label}</strong>
                  <p>{status.description}</p>
                </div>
                <button type="button" className="btn btn-secondary admin-table-button" disabled={!canEdit || saving} onClick={() => openAddModal(status)}>
                  <Plus className="h-4 w-4" />
                  Add
                </button>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState icon={CheckCircle2} title="All recommended statuses are already added." message="There are no missing suggestions for this workflow." />
        )}
      </section>

      {dirty ? (
        <div className="status-workflow-save-bar">
          <div>
            <AlertTriangle className="h-5 w-5" />
            <div>
              <strong>You have unsaved changes</strong>
            </div>
          </div>
          <div className="status-workflow-save-actions">
            <button type="button" className="btn btn-secondary" disabled={saving || !canEdit} onClick={requestResetFlow}><RotateCcw className="h-4 w-4" /> Reset Flow</button>
            <button type="button" className="btn btn-secondary" disabled={saving} onClick={cancelChanges}>Cancel Changes</button>
            <button type="button" className="btn btn-primary" disabled={!canEdit || saving || validationErrors.length > 0} title={validationErrors.length ? 'Please fix validation errors before saving' : ''} onClick={saveWorkflow}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? 'Saving...' : 'Save Workflow'}
            </button>
          </div>
        </div>
      ) : null}

      {addModalOpen ? (
        <WorkflowModal title="Add Status" description={`Add a custom status to ${flowMeta[activeFlow].label}.`} onClose={() => setAddModalOpen(false)}>
          <form className="status-workflow-add-form" onSubmit={addStatusFromModal}>
            <label>
              <span className="label">Label</span>
              <input className="input" value={addDraft.label} disabled={saving} onChange={(event) => {
                const label = event.target.value;
                setAddDraft((current) => ({ ...current, label, key: current.keyTouched ? current.key : slugify(label) }));
              }} />
            </label>
            <label>
              <span className="label">Key</span>
              <input className="input" value={addDraft.key} disabled={saving} onChange={(event) => setAddDraft((current) => ({ ...current, key: slugify(event.target.value), keyTouched: true }))} />
            </label>
            <label>
              <span className="label">Color</span>
              <input className="input" type="color" value={colorPattern.test(addDraft.color) ? addDraft.color : '#75c4ff'} disabled={saving} onChange={(event) => setAddDraft((current) => ({ ...current, color: event.target.value }))} />
            </label>
            <label>
              <span className="label">Order</span>
              <input className="input" type="number" min="0" value={addDraft.order} disabled={saving} onChange={(event) => setAddDraft((current) => ({ ...current, order: event.target.value }))} />
            </label>
            <label className="status-workflow-add-description">
              <span className="label">Description / meaning</span>
              <textarea className="input" value={addDraft.description} disabled={saving} onChange={(event) => setAddDraft((current) => ({ ...current, description: event.target.value }))} />
            </label>
            {addErrors.length ? (
              <div className="status-workflow-modal-errors">
                {addErrors.map((message) => <p key={message}>{message}</p>)}
              </div>
            ) : null}
            <div className="status-workflow-modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setAddModalOpen(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>Add Status</button>
            </div>
          </form>
        </WorkflowModal>
      ) : null}

      {resetConfirm ? (
        <WorkflowModal title="Reset this workflow?" description="Reset this workflow to default statuses? This may affect how records appear in reports and filters." onClose={() => setResetConfirm(false)}>
          <div className="status-workflow-modal-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setResetConfirm(false)}>Cancel</button>
            <button type="button" className="btn btn-primary" onClick={resetFlowToDefaults}>Reset Flow</button>
          </div>
        </WorkflowModal>
      ) : null}

      {deleteConfirm ? (
        <WorkflowModal title="Delete this status?" description="Delete this status from the workflow? Existing records using this status may not display correctly." onClose={() => setDeleteConfirm(null)}>
          <div className="status-workflow-modal-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setDeleteConfirm(null)}>Cancel</button>
            <button type="button" className="btn btn-primary" onClick={deleteStatus}>Delete Status</button>
          </div>
        </WorkflowModal>
      ) : null}

      {unsavedConfirm ? (
        <WorkflowModal title="You have unsaved changes" description="You have unsaved changes. Continue without saving?" onClose={() => setUnsavedConfirm(null)}>
          <div className="status-workflow-modal-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setUnsavedConfirm(null)}>Stay Here</button>
            <button type="button" className="btn btn-primary" onClick={continueUnsavedAction}>Continue</button>
          </div>
        </WorkflowModal>
      ) : null}
    </section>
  );
}

export default StatusWorkflowSettingsSection;
