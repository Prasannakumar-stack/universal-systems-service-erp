import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Bell,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  Edit3,
  Eye,
  FileText,
  Hash,
  HelpCircle,
  Loader2,
  Mail,
  MessageSquareText,
  MoreVertical,
  PackageCheck,
  Plus,
  RotateCcw,
  Save,
  Search,
  Send,
  Settings2,
  Smartphone,
  Trash2,
  UserRound,
  Wrench,
  X
} from 'lucide-react';
import { company, EmptyState, ErrorBlock, LoadingBlock, useAuth, useResource, useToast } from '../../shared/phase1Shared.jsx';
import { can, hasRole } from '../../utils/roles.js';

const channelOptions = [
  { id: 'whatsapp', label: 'WhatsApp', Icon: MessageSquareText, description: 'Customer-friendly message' },
  { id: 'sms', label: 'SMS', Icon: Smartphone, description: 'Short text message' },
  { id: 'email', label: 'Email', Icon: Mail, description: 'Subject and body' }
];

const categoryOptions = ['All', 'Booking', 'Work Order', 'Quotation', 'Parts', 'Billing', 'Payment', 'AMC', 'Warranty', 'Internal', 'Other'];
const statusFilterOptions = ['All', 'Enabled', 'Disabled'];
const typeFilterOptions = ['All', 'Default', 'Custom'];
const pageSizeOptions = [10, 25, 50];
const MORE_VARIABLES_GROUP = '__more_variables__';

const variableGroups = [
  {
    label: 'Customer',
    variables: ['{{customerName}}', '{{customerPhone}}', '{{customerEmail}}', '{{customerAddress}}']
  },
  {
    label: 'Booking',
    variables: ['{{bookingId}}', '{{bookingDate}}', '{{bookingTime}}', '{{serviceType}}', '{{deviceType}}', '{{deviceBrand}}', '{{issueDescription}}', '{{bookingStatus}}']
  },
  {
    label: 'Technician / Work Order',
    variables: ['{{technicianName}}', '{{technicianPhone}}', '{{workOrderId}}', '{{workOrderStatus}}', '{{serviceDate}}', '{{serviceSummary}}']
  },
  {
    label: 'Quotation',
    variables: ['{{quotationNumber}}', '{{quotationAmount}}', '{{quotationStatus}}', '{{quotationValidDays}}', '{{approvalLink}}', '{{denyLink}}']
  },
  {
    label: 'Parts',
    variables: ['{{partName}}', '{{partQuantity}}', '{{partAmount}}', '{{partStatus}}', '{{partApprovalLink}}']
  },
  {
    label: 'Billing / Invoice',
    variables: ['{{invoiceNumber}}', '{{invoiceAmount}}', '{{amount}}', '{{dueDate}}', '{{paymentLink}}', '{{paymentStatus}}']
  },
  {
    label: 'Company',
    variables: ['{{companyName}}', '{{companyPhone}}', '{{companyWhatsApp}}', '{{companyEmail}}', '{{companyAddress}}', '{{website}}']
  },
  {
    label: 'AMC',
    variables: ['{{amcId}}', '{{amcPlan}}', '{{amcStartDate}}', '{{amcExpiryDate}}', '{{amcVisitDate}}', '{{amcDaysLeft}}', '{{renewalAmount}}']
  },
  {
    label: 'Warranty',
    variables: ['{{warrantyEndDate}}', '{{warrantyDaysLeft}}']
  }
];

const validVariables = variableGroups.flatMap((group) => group.variables);
const validVariableSet = new Set(validVariables);
const legacyVariableReplacementMap = {
  phone: '{{customerPhone}}',
  whatsapp: '{{companyWhatsApp}}',
  email: '{{companyEmail}}',
  address: '{{companyAddress}}'
};
const legacyVariableSuggestions = {
  '{{phone}}': ['{{customerPhone}}', '{{companyPhone}}'],
  '{{whatsapp}}': ['{{companyWhatsApp}}', '{{customerPhone}}'],
  '{{email}}': ['{{customerEmail}}', '{{companyEmail}}'],
  '{{address}}': ['{{customerAddress}}', '{{companyAddress}}']
};

const sampleValues = {
  '{{customerName}}': 'Ravi Kumar',
  '{{customerPhone}}': '98427 81971',
  '{{customerEmail}}': 'ravi@example.com',
  '{{customerAddress}}': 'Mettur Dam',
  '{{bookingId}}': 'BK-1024',
  '{{bookingDate}}': '04 Jun 2026',
  '{{bookingTime}}': '10:30 AM',
  '{{serviceType}}': 'Laptop Service',
  '{{deviceType}}': 'Laptop',
  '{{deviceBrand}}': 'Dell',
  '{{issueDescription}}': 'Display flickering',
  '{{bookingStatus}}': 'Confirmed',
  '{{technicianName}}': 'Suresh',
  '{{technicianPhone}}': '90000 01002',
  '{{workOrderId}}': 'WO-1042',
  '{{workOrderStatus}}': 'Completed',
  '{{serviceDate}}': '05 Jun 2026',
  '{{serviceSummary}}': 'Display cable replaced and tested',
  '{{quotationNumber}}': 'QUO-1007',
  '{{quotationAmount}}': 'Rs. 4,500',
  '{{quotationStatus}}': 'Approved',
  '{{quotationValidDays}}': '7',
  '{{approvalLink}}': 'https://universal.example/approve/QUO-1007',
  '{{denyLink}}': 'https://universal.example/deny/QUO-1007',
  '{{partName}}': 'Display cable',
  '{{partQuantity}}': '1',
  '{{partAmount}}': 'Rs. 1,250',
  '{{partStatus}}': 'Awaiting approval',
  '{{partApprovalLink}}': 'https://universal.example/parts/approve',
  '{{invoiceNumber}}': 'INV-2048',
  '{{invoiceAmount}}': 'Rs. 4,500',
  '{{amount}}': 'Rs. 4,500',
  '{{dueDate}}': '10 Jun 2026',
  '{{paymentLink}}': 'https://universal.example/pay/INV-2048',
  '{{paymentStatus}}': 'Pending',
  '{{companyName}}': company.name,
  '{{companyPhone}}': company.phones.join(' / '),
  '{{companyWhatsApp}}': company.whatsapp,
  '{{companyEmail}}': company.email,
  '{{companyAddress}}': company.address,
  '{{website}}': 'https://universal-systems.example',
  '{{amcId}}': 'AMC-2301',
  '{{amcPlan}}': 'Premium Annual',
  '{{amcStartDate}}': '01 Jul 2025',
  '{{amcExpiryDate}}': '30 Jun 2026',
  '{{amcVisitDate}}': '12 Jun 2026',
  '{{amcDaysLeft}}': '30',
  '{{renewalAmount}}': 'Rs. 12,000',
  '{{warrantyEndDate}}': '31 Jul 2026',
  '{{warrantyDaysLeft}}': '57'
};

const templateSeed = [
  ['bookingReceived', 'Booking received', 'Booking', 'New service request received.', 'booking.received', 'customer', false, 'Hello {{customerName}}, your booking {{bookingId}} has been received by {{companyName}}. We will contact you shortly.', 'Booking {{bookingId}} received'],
  ['bookingConfirmed', 'Booking confirmed', 'Booking', 'Booking confirmation message.', 'booking.confirmed', 'customer', false, 'Hello {{customerName}}, your booking {{bookingId}} is confirmed for {{bookingDate}} {{bookingTime}}. Contact: {{companyPhone}}', 'Booking {{bookingId}} confirmed'],
  ['bookingRescheduled', 'Booking rescheduled', 'Booking', 'Booking schedule changed.', 'booking.rescheduled', 'customer', false, 'Hello {{customerName}}, your booking {{bookingId}} has been rescheduled to {{bookingDate}} {{bookingTime}}.', 'Booking {{bookingId}} rescheduled'],
  ['bookingCancelled', 'Booking cancelled', 'Booking', 'Booking cancellation notice.', 'booking.cancelled', 'customer', false, 'Hello {{customerName}}, your booking {{bookingId}} has been cancelled. Contact {{companyPhone}} for assistance.', 'Booking {{bookingId}} cancelled'],
  ['technicianAssigned', 'Technician assigned', 'Work Order', 'Technician assignment notice.', 'work_order.technician_assigned', 'customer', false, 'Hello {{customerName}}, {{technicianName}} has been assigned for booking {{bookingId}}.', 'Technician assigned for {{bookingId}}'],
  ['technicianOnTheWay', 'Technician on the way', 'Work Order', 'Technician travel notice.', 'work_order.technician_on_way', 'customer', false, 'Hello {{customerName}}, {{technicianName}} is on the way for your service booking {{bookingId}}.', 'Technician on the way'],
  ['workStarted', 'Work started', 'Work Order', 'Service work started.', 'work_order.started', 'customer', false, 'Hello {{customerName}}, work has started for work order {{workOrderId}}.', 'Work started for {{workOrderId}}'],
  ['workOrderCompleted', 'Work order completed', 'Work Order', 'Work order completion notice.', 'work_order.completed', 'customer', false, 'Hello {{customerName}}, your work order {{workOrderId}} is completed. Summary: {{serviceSummary}}', 'Work order {{workOrderId}} completed'],
  ['serviceCompletedPdfAttached', 'Service completed with PDF attached', 'Work Order', 'Completion notice with future PDF attachment.', 'service.completed_pdf', 'customer', true, 'Hello {{customerName}}, your service is completed. The service PDF for {{workOrderId}} is attached.', 'Service completed report'],
  ['quotationGenerated', 'Quotation generated', 'Quotation', 'Quotation generation notice.', 'quotation.generated', 'customer', true, 'Hello {{customerName}}, quotation {{quotationNumber}} for {{quotationAmount}} has been generated by {{companyName}}.', 'Quotation {{quotationNumber}} generated'],
  ['quotationApproved', 'Quotation approved', 'Quotation', 'Quotation approval confirmation.', 'quotation.approved', 'customer', false, 'Hello {{customerName}}, quotation {{quotationNumber}} has been approved. We will proceed with your service.', 'Quotation {{quotationNumber}} approved'],
  ['quotationDenied', 'Quotation denied', 'Quotation', 'Quotation denial confirmation.', 'quotation.denied', 'customer', false, 'Hello {{customerName}}, quotation {{quotationNumber}} was marked as denied. Contact {{companyPhone}} for help.', 'Quotation {{quotationNumber}} denied'],
  ['quotationRevisionRequested', 'Quotation revision requested', 'Quotation', 'Quotation revision request.', 'quotation.revision_requested', 'admin', false, 'Revision requested for quotation {{quotationNumber}} by {{customerName}}.', 'Quotation revision requested'],
  ['partApprovalRequest', 'Part approval request', 'Parts', 'Customer approval request for parts.', 'parts.approval_requested', 'customer', false, 'Hello {{customerName}}, approval is required for {{partName}} x {{partQuantity}}. Amount: {{partAmount}}. Approve: {{partApprovalLink}}', 'Part approval required'],
  ['partApproved', 'Part approved', 'Parts', 'Part approval confirmation.', 'parts.approved', 'admin', false, '{{customerName}} approved {{partName}} for work order {{workOrderId}}.', 'Part approved'],
  ['partDenied', 'Part denied', 'Parts', 'Part denial confirmation.', 'parts.denied', 'admin', false, '{{customerName}} denied {{partName}} for work order {{workOrderId}}.', 'Part denied'],
  ['partOrdered', 'Part ordered', 'Parts', 'Part ordered update.', 'parts.ordered', 'customer', false, 'Hello {{customerName}}, {{partName}} has been ordered for work order {{workOrderId}}.', 'Part ordered'],
  ['partArrived', 'Part arrived', 'Parts', 'Part arrival update.', 'parts.arrived', 'customer', false, 'Hello {{customerName}}, {{partName}} has arrived. We will continue work order {{workOrderId}}.', 'Part arrived'],
  ['invoiceGenerated', 'Invoice generated', 'Billing', 'Invoice ready notice.', 'invoice.generated', 'customer', true, 'Hello {{customerName}}, invoice {{invoiceNumber}} for {{invoiceAmount}} is ready. Payment link: {{paymentLink}}', 'Invoice {{invoiceNumber}} generated'],
  ['paymentDue', 'Payment due', 'Payment', 'Payment due reminder.', 'payment.due', 'customer', false, 'Hello {{customerName}}, payment of {{amount}} for invoice {{invoiceNumber}} is due on {{dueDate}}.', 'Payment due for {{invoiceNumber}}'],
  ['paymentOverdue', 'Payment overdue', 'Payment', 'Payment overdue reminder.', 'payment.overdue', 'customer', false, 'Hello {{customerName}}, payment of {{amount}} for invoice {{invoiceNumber}} is overdue. Please pay using {{paymentLink}}.', 'Payment overdue for {{invoiceNumber}}'],
  ['paymentReceived', 'Payment received', 'Payment', 'Payment received confirmation.', 'payment.received', 'customer', false, 'Hello {{customerName}}, payment of {{amount}} has been received. Thank you.', 'Payment received'],
  ['paymentFailed', 'Payment failed', 'Payment', 'Payment failure notice.', 'payment.failed', 'customer', false, 'Hello {{customerName}}, payment for invoice {{invoiceNumber}} failed. Please retry using {{paymentLink}}.', 'Payment failed'],
  ['amcCreated', 'AMC created', 'AMC', 'AMC contract created.', 'amc.created', 'customer', true, 'Hello {{customerName}}, AMC {{amcId}} for {{amcPlan}} has been created. Start date: {{amcStartDate}}.', 'AMC {{amcId}} created'],
  ['amcVisitScheduled', 'AMC visit scheduled', 'AMC', 'AMC visit scheduled notice.', 'amc.visit_scheduled', 'customer', false, 'Hello {{customerName}}, your AMC visit is scheduled on {{amcVisitDate}}.', 'AMC visit scheduled'],
  ['amcVisitCompleted', 'AMC visit completed', 'AMC', 'AMC visit completion notice.', 'amc.visit_completed', 'customer', false, 'Hello {{customerName}}, your AMC visit on {{amcVisitDate}} is completed.', 'AMC visit completed'],
  ['amcExpiry30Days', 'AMC expiry 30 days', 'AMC', 'AMC expiry reminder at 30 days.', 'amc.expiry_30', 'customer', false, 'Hello {{customerName}}, your AMC {{amcId}} expires in 30 days on {{amcExpiryDate}}.', 'AMC expires in 30 days'],
  ['amcExpiry15Days', 'AMC expiry 15 days', 'AMC', 'AMC expiry reminder at 15 days.', 'amc.expiry_15', 'customer', false, 'Hello {{customerName}}, your AMC {{amcId}} expires in 15 days on {{amcExpiryDate}}.', 'AMC expires in 15 days'],
  ['amcExpiry7Days', 'AMC expiry 7 days', 'AMC', 'AMC expiry reminder at 7 days.', 'amc.expiry_7', 'customer', false, 'Hello {{customerName}}, your AMC {{amcId}} expires in 7 days on {{amcExpiryDate}}.', 'AMC expires in 7 days'],
  ['amcExpired', 'AMC expired', 'AMC', 'AMC expired notice.', 'amc.expired', 'customer', false, 'Hello {{customerName}}, your AMC {{amcId}} expired on {{amcExpiryDate}}. Renewal amount: {{renewalAmount}}.', 'AMC expired'],
  ['amcRenewed', 'AMC renewed', 'AMC', 'AMC renewal confirmation.', 'amc.renewed', 'customer', true, 'Hello {{customerName}}, your AMC {{amcId}} has been renewed. New expiry date: {{amcExpiryDate}}.', 'AMC renewed'],
  ['warrantyExpiryReminder', 'Warranty expiry reminder', 'Warranty', 'Warranty expiry reminder.', 'warranty.expiry_reminder', 'customer', false, 'Hello {{customerName}}, your warranty ends on {{warrantyEndDate}}. Days left: {{warrantyDaysLeft}}.', 'Warranty expiry reminder'],
  ['newBookingInternalAlert', 'New booking internal alert', 'Internal', 'Internal alert for new bookings.', 'internal.booking_created', 'admin', false, 'New booking {{bookingId}} received from {{customerName}} for {{serviceType}}.', 'New booking alert'],
  ['technicianDelayAlert', 'Technician delay alert', 'Internal', 'Internal alert for technician delays.', 'internal.technician_delay', 'admin', false, 'Delay alert: {{technicianName}} is delayed for work order {{workOrderId}}.', 'Technician delay alert'],
  ['paymentOverdueInternalAlert', 'Payment overdue internal alert', 'Internal', 'Internal overdue payment alert.', 'internal.payment_overdue', 'admin', false, 'Payment overdue: invoice {{invoiceNumber}} for {{customerName}} is overdue by {{amount}}.', 'Payment overdue alert'],
  ['amcExpiryInternalAlert', 'AMC expiry internal alert', 'Internal', 'Internal AMC expiry alert.', 'internal.amc_expiry', 'admin', false, 'AMC {{amcId}} for {{customerName}} expires on {{amcExpiryDate}}.', 'AMC expiry alert'],
  ['lowStockPartRequiredAlert', 'Low stock / part required alert', 'Internal', 'Internal stock and parts alert.', 'internal.low_stock_part_required', 'admin', false, 'Part required: {{partName}} x {{partQuantity}} for work order {{workOrderId}}.', 'Part required alert']
];

function clonePlain(value) {
  return JSON.parse(JSON.stringify(value || {}));
}

function stableJson(value) {
  return JSON.stringify(value || {});
}

function emailBody(message) {
  return `${message}\n\nRegards,\n{{companyName}}\n{{companyPhone}} | {{companyEmail}}`;
}

function smsMessage(message) {
  return message.length > 220 ? `${message.slice(0, 217)}...` : message;
}

function normalizeLegacyVariableAliases(value = '') {
  return String(value || '').replace(/{{\s*([^{}]+?)\s*}}/g, (match, name) => {
    const replacement = legacyVariableReplacementMap[String(name || '').trim()];
    return replacement || match;
  });
}

function templateFromSeed(item) {
  const [key, name, category, description, triggerEvent, audience, supportsAttachment, message, subject] = item;
  return {
    id: key,
    key,
    name,
    category,
    description,
    enabled: true,
    channels: {
      whatsapp: { enabled: true, message },
      sms: { enabled: true, message: smsMessage(message) },
      email: { enabled: true, subject, body: emailBody(message) }
    },
    allowedVariables: validVariables,
    triggerEvent,
    audience,
    supportsAttachment: Boolean(supportsAttachment),
    isSystemDefault: true,
    isCustom: false,
    updatedAt: null,
    updatedBy: ''
  };
}

function defaultNotificationState() {
  return {
    version: 2,
    providers: {
      whatsapp: { connected: false, label: '' },
      sms: { connected: false, label: '' },
      email: { connected: false, label: '' }
    },
    legacyVariableAliases: legacyVariableSuggestions,
    templates: templateSeed.map(templateFromSeed)
  };
}

function channelField(template, channelId) {
  if (channelId === 'email') return template.channels?.email?.body || '';
  return template.channels?.[channelId]?.message || '';
}

function previewText(template) {
  return channelField(template, 'whatsapp') || channelField(template, 'sms') || channelField(template, 'email') || 'No message configured yet.';
}

function replaceVariables(value = '') {
  return String(value || '').replace(/{{\s*([^{}]+?)\s*}}/g, (match, name) => sampleValues[`{{${String(name).trim()}}}`] || match);
}

function extractVariables(value = '') {
  return Array.from(new Set(String(value || '').match(/{{[^{}]+}}/g) || []));
}

function normalizeVariable(token = '') {
  const name = String(token || '').replace(/[{}]/g, '').trim();
  return name ? `{{${name}}}` : '';
}

function invalidVariablesForTemplate(template) {
  const texts = [
    template.channels?.whatsapp?.message,
    template.channels?.sms?.message,
    template.channels?.email?.subject,
    template.channels?.email?.body
  ];
  return Array.from(new Set(texts.flatMap((text) => extractVariables(text).map(normalizeVariable)).filter((token) => token && !validVariableSet.has(token))));
}

function invalidVariableMessage(token) {
  const suggestions = legacyVariableSuggestions[token] || [];
  return suggestions.length
    ? `Invalid variable ${token}. Did you mean ${suggestions.join(' or ')}?`
    : `Invalid variable ${token}. Use a variable from the panel.`;
}

function relevantVariableGroupsForCategory(category = '') {
  const normalized = String(category || '').trim();
  if (normalized === 'Booking') return ['Customer', 'Booking', 'Company'];
  if (normalized === 'Work Order') return ['Customer', 'Technician / Work Order', 'Company'];
  if (normalized === 'Quotation') return ['Customer', 'Quotation', 'Company'];
  if (normalized === 'Billing' || normalized === 'Payment') return ['Customer', 'Billing / Invoice', 'Company'];
  if (normalized === 'AMC') return ['Customer', 'AMC', 'Company'];
  if (normalized === 'Warranty') return ['Customer', 'Warranty', 'Company'];
  return ['Customer', 'Company'];
}

function normalizeTemplate(item = {}, fallback = {}) {
  const key = String(item.key || item.id || fallback.key || `custom_${Date.now()}`).trim();
  return {
    ...fallback,
    ...item,
    id: String(item.id || fallback.id || key),
    key,
    name: String(item.name || fallback.name || 'Custom template'),
    category: String(item.category || fallback.category || 'Other'),
    description: String(item.description || fallback.description || ''),
    enabled: item.enabled ?? fallback.enabled ?? true,
    channels: {
      whatsapp: {
        enabled: item.channels?.whatsapp?.enabled ?? fallback.channels?.whatsapp?.enabled ?? true,
        message: normalizeLegacyVariableAliases(item.channels?.whatsapp?.message ?? item.whatsapp ?? fallback.channels?.whatsapp?.message ?? '')
      },
      sms: {
        enabled: item.channels?.sms?.enabled ?? fallback.channels?.sms?.enabled ?? true,
        message: normalizeLegacyVariableAliases(item.channels?.sms?.message ?? item.sms ?? fallback.channels?.sms?.message ?? '')
      },
      email: {
        enabled: item.channels?.email?.enabled ?? fallback.channels?.email?.enabled ?? true,
        subject: normalizeLegacyVariableAliases(item.channels?.email?.subject ?? item.emailSubject ?? fallback.channels?.email?.subject ?? ''),
        body: normalizeLegacyVariableAliases(item.channels?.email?.body ?? item.channels?.email?.message ?? item.email ?? fallback.channels?.email?.body ?? '')
      }
    },
    allowedVariables: Array.isArray(item.allowedVariables) && item.allowedVariables.length ? item.allowedVariables : (fallback.allowedVariables || validVariables),
    triggerEvent: String(item.triggerEvent || fallback.triggerEvent || 'manual'),
    audience: String(item.audience || fallback.audience || 'customer'),
    supportsAttachment: item.supportsAttachment ?? fallback.supportsAttachment ?? false,
    isSystemDefault: item.isSystemDefault ?? fallback.isSystemDefault ?? false,
    isCustom: item.isCustom ?? fallback.isCustom ?? true,
    updatedAt: item.updatedAt || fallback.updatedAt || null,
    updatedBy: String(item.updatedBy || fallback.updatedBy || '')
  };
}

function applyLegacyValues(template, source = {}) {
  const next = clonePlain(template);
  const whatsapp = typeof source[template.key] === 'string' ? source[template.key] : source[`${template.key}`];
  const sms = typeof source[`${template.key}Sms`] === 'string' ? source[`${template.key}Sms`] : '';
  const email = typeof source[`${template.key}Email`] === 'string' ? source[`${template.key}Email`] : '';
  if (whatsapp) {
    next.channels.whatsapp.message = whatsapp;
    next.channels.sms.message = sms || smsMessage(whatsapp);
    next.channels.email.body = email || emailBody(whatsapp);
  } else {
    if (sms) next.channels.sms.message = sms;
    if (email) next.channels.email.body = email;
  }
  if (source[`${template.key}Enabled`] !== undefined) next.enabled = source[`${template.key}Enabled`] !== false;
  return next;
}

function normalizeNotificationState(raw = {}) {
  const defaults = defaultNotificationState();
  const rawTemplates = Array.isArray(raw?.templates) ? raw.templates : [];
  const rawByKey = new Map(rawTemplates.map((item) => [String(item.key || item.id || ''), item]));
  const templates = defaults.templates.map((template) => normalizeTemplate(rawByKey.get(template.key) || applyLegacyValues(template, raw), applyLegacyValues(template, raw)));
  rawTemplates
    .filter((item) => item?.isCustom || !templates.some((template) => template.key === String(item.key || item.id || '')))
    .forEach((item) => templates.push(normalizeTemplate({ ...item, isCustom: true, isSystemDefault: false })));
  return {
    version: 2,
    providers: {
      whatsapp: { ...defaults.providers.whatsapp, ...(raw?.providers?.whatsapp || {}) },
      sms: { ...defaults.providers.sms, ...(raw?.providers?.sms || {}) },
      email: { ...defaults.providers.email, ...(raw?.providers?.email || {}) }
    },
    legacyVariableAliases: { ...legacyVariableSuggestions, ...(raw?.legacyVariableAliases || {}) },
    templates
  };
}

function categoryMeta(category = 'Other') {
  const map = {
    Booking: { Icon: CalendarClock, color: 'sky' },
    'Work Order': { Icon: Wrench, color: 'cyan' },
    Quotation: { Icon: FileText, color: 'violet' },
    Parts: { Icon: PackageCheck, color: 'amber' },
    Billing: { Icon: FileText, color: 'blue' },
    Payment: { Icon: CheckCircle2, color: 'green' },
    AMC: { Icon: Bell, color: 'teal' },
    Warranty: { Icon: CheckCircle2, color: 'lime' },
    Internal: { Icon: UserRound, color: 'rose' },
    Other: { Icon: MessageSquareText, color: 'slate' }
  };
  return map[category] || map.Other;
}

function formatLastEdited(template) {
  if (!template.updatedAt) return 'Not edited yet';
  const date = new Date(template.updatedAt);
  if (Number.isNaN(date.getTime())) return 'Edited';
  return `Last edited ${date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`;
}

function usageDescription(template) {
  const audienceLabel = template.audience === 'admin' ? 'admin users' : template.audience === 'technician' ? 'technicians' : 'customers';
  return `Used when ${template.triggerEvent || 'the configured event'} occurs, sending the ${template.category} notification to ${audienceLabel}.`;
}

function MenuButton({ children, onClick, danger = false, disabled = false, title = '' }) {
  return (
    <button type="button" className={`notification-menu-item ${danger ? 'is-danger' : ''}`} disabled={disabled} title={title} onClick={onClick}>
      {children}
    </button>
  );
}

function ModalShell({ title, subtitle, children, onClose, width = 'md' }) {
  return (
    <div className="notification-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="notification-modal-title">
      <section className={`surface admin-modal notification-modal notification-modal-${width}`}>
        <div className="notification-modal-header">
          <div className="min-w-0">
            <h3 id="notification-modal-title">{title}</h3>
            {subtitle ? <p>{subtitle}</p> : null}
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

export function NotificationTemplatesSection({ onDirtyChange = null }) {
  const { request, user } = useAuth();
  const { push } = useToast();
  const canEdit = hasRole(user, 'admin') && can(user, 'manage_notification_templates');
  const { data, loading, error, reload } = useResource(() => request('/settings/business'), [request]);
  const saved = useMemo(() => normalizeNotificationState(data?.settings?.notificationTemplates || {}), [data?.settings?.notificationTemplates]);
  const savedJson = useMemo(() => stableJson(saved), [saved]);
  const [draft, setDraft] = useState(() => defaultNotificationState());
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [editorKey, setEditorKey] = useState(null);
  const [activeChannel, setActiveChannel] = useState('whatsapp');
  const [activeEditorField, setActiveEditorField] = useState('message');
  const [previewState, setPreviewState] = useState(null);
  const [resetConfirm, setResetConfirm] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [disableConfirm, setDisableConfirm] = useState(null);
  const [usageTemplate, setUsageTemplate] = useState(null);
  const [menuKey, setMenuKey] = useState(null);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [showIntegrations, setShowIntegrations] = useState(false);
  const [openVariableGroups, setOpenVariableGroups] = useState(() => new Set(['Customer', 'Company']));
  const [variableSearch, setVariableSearch] = useState('');
  const whatsappRef = useRef(null);
  const smsRef = useRef(null);
  const emailSubjectRef = useRef(null);
  const emailBodyRef = useRef(null);
  const dirty = stableJson(draft) !== savedJson;

  useEffect(() => {
    setDraft(clonePlain(saved));
  }, [savedJson]);

  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  useEffect(() => {
    setPage(1);
  }, [search, categoryFilter, statusFilter, typeFilter, pageSize]);

  const templates = draft.templates || [];
  const activeTemplate = templates.find((template) => template.key === editorKey) || null;
  const activeTemplateKey = activeTemplate?.key || '';
  const activeTemplateCategory = activeTemplate?.category || '';
  const invalidTemplateMap = useMemo(() => new Map(templates.map((template) => [template.key, invalidVariablesForTemplate(template)])), [templates]);
  const activeInvalidVariables = activeTemplate ? (invalidTemplateMap.get(activeTemplate.key) || []) : [];
  const invalidTemplateCount = useMemo(() => Array.from(invalidTemplateMap.values()).filter((items) => items.length).length, [invalidTemplateMap]);
  const channelsPending = channelOptions.filter((channel) => !providerConnected(channel.id)).length;
  const readyTemplateCount = templates.filter((template) => template.enabled && !(invalidTemplateMap.get(template.key) || []).length).length;
  const connectedChannelCount = channelOptions.length - channelsPending;
  const filteredTemplates = useMemo(() => {
    const query = search.trim().toLowerCase();
    return templates.filter((template) => {
      const matchesSearch = !query || [
        template.name,
        template.description,
        template.category,
        template.triggerEvent,
        template.audience,
        previewText(template)
      ].join(' ').toLowerCase().includes(query);
      const matchesCategory = categoryFilter === 'All' || template.category === categoryFilter;
      const matchesStatus = statusFilter === 'All' || (statusFilter === 'Enabled' ? template.enabled : !template.enabled);
      const matchesType = typeFilter === 'All' || (typeFilter === 'Custom' ? template.isCustom : !template.isCustom);
      return matchesSearch && matchesCategory && matchesStatus && matchesType;
    });
  }, [templates, search, categoryFilter, statusFilter, typeFilter]);
  const summaryCards = [
    { label: 'Total Templates', value: templates.length, tone: 'neutral', helper: `${filteredTemplates.length} matching current filters` },
    { label: 'Ready', value: readyTemplateCount, tone: 'ready', helper: 'Enabled with supported variables' },
    { label: 'Need Fix', value: invalidTemplateCount, tone: invalidTemplateCount ? 'warning' : 'ready', helper: invalidTemplateCount ? `${invalidTemplateCount} template${invalidTemplateCount === 1 ? '' : 's'} need variable fixes` : 'No invalid variables' },
    { label: 'Channels Pending', value: channelsPending, tone: channelsPending ? 'pending' : 'ready', helper: channelsPending ? 'Integration setup pending' : 'All channels connected' }
  ];
  const variableSearchQuery = variableSearch.trim().toLowerCase();
  const relevantVariableLabels = activeTemplate ? relevantVariableGroupsForCategory(activeTemplate.category) : ['Customer', 'Company'];
  const filteredVariableGroups = useMemo(() => {
    return variableGroups
      .map((group) => ({
        ...group,
        variables: group.variables.filter((variable) => {
          if (!variableSearchQuery) return true;
          return `${group.label} ${variable}`.toLowerCase().includes(variableSearchQuery);
        })
      }))
      .filter((group) => group.variables.length);
  }, [variableSearchQuery]);
  const primaryVariableGroups = filteredVariableGroups.filter((group) => relevantVariableLabels.includes(group.label));
  const secondaryVariableGroups = filteredVariableGroups.filter((group) => !relevantVariableLabels.includes(group.label));

  useEffect(() => {
    if (!activeTemplateKey) return;
    setVariableSearch('');
    setOpenVariableGroups(new Set(relevantVariableGroupsForCategory(activeTemplateCategory)));
  }, [activeTemplateKey, activeTemplateCategory]);

  const pageCount = Math.max(1, Math.ceil(filteredTemplates.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageStart = filteredTemplates.length ? (currentPage - 1) * pageSize : 0;
  const pageTemplates = filteredTemplates.slice(pageStart, pageStart + pageSize);
  const visiblePages = useMemo(() => {
    const maxButtons = 5;
    const start = Math.max(1, Math.min(currentPage - 2, pageCount - maxButtons + 1));
    const end = Math.min(pageCount, start + maxButtons - 1);
    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  }, [currentPage, pageCount]);

  function updateTemplate(templateKey, updater) {
    setDraft((current) => ({
      ...current,
      templates: current.templates.map((template) => {
        if (template.key !== templateKey) return template;
        const next = typeof updater === 'function' ? updater(clonePlain(template)) : { ...template, ...updater };
        return {
          ...next,
          updatedAt: new Date().toISOString(),
          updatedBy: user?.name || user?.username || ''
        };
      })
    }));
  }

  function providerConnected(channelId) {
    return Boolean(draft.providers?.[channelId]?.connected);
  }

  function isVariableGroupOpen(groupLabel, hasMatches = true) {
    if (variableSearchQuery) return hasMatches;
    return openVariableGroups.has(groupLabel);
  }

  function toggleVariableGroup(groupLabel) {
    setOpenVariableGroups((current) => {
      const next = new Set(current);
      if (next.has(groupLabel)) next.delete(groupLabel);
      else next.add(groupLabel);
      return next;
    });
  }

  function templateStatus(template, invalidVariables = []) {
    if (invalidVariables.length) return { label: 'Need Fix', tone: 'fix', title: 'Unsupported variable. Replace with a supported variable from the list.' };
    if (!template.enabled) return { label: 'Disabled', tone: 'disabled', title: 'Template is disabled.' };
    return { label: 'Ready', tone: 'ready', title: 'Template is ready.' };
  }

  function setChannelValue(templateKey, channelId, field, value) {
    updateTemplate(templateKey, (template) => {
      template.channels[channelId] = { ...template.channels[channelId], [field]: value };
      return template;
    });
  }

  function requestTemplateEnabledChange(template) {
    if (!template.enabled) {
      updateTemplate(template.key, { enabled: true });
      return;
    }
    setDisableConfirm(template);
  }

  function disableTemplate(templateKey) {
    updateTemplate(templateKey, { enabled: false });
    setDisableConfirm(null);
    push('Template disabled in draft', 'info');
  }

  function activeInputRef() {
    if (activeChannel === 'sms') return smsRef.current;
    if (activeChannel === 'email' && activeEditorField === 'subject') return emailSubjectRef.current;
    if (activeChannel === 'email') return emailBodyRef.current;
    return whatsappRef.current;
  }

  function insertVariable(variable) {
    if (!activeTemplate) {
      push('Open a template editor before inserting a variable.', 'info');
      return;
    }
    if (!canEdit || saving) return;
    const field = activeChannel === 'email' ? activeEditorField : 'message';
    const currentValue = activeChannel === 'email'
      ? activeTemplate.channels.email[field] || ''
      : activeTemplate.channels[activeChannel].message || '';
    const input = activeInputRef();
    const start = input?.selectionStart ?? currentValue.length;
    const end = input?.selectionEnd ?? currentValue.length;
    const nextValue = `${currentValue.slice(0, start)}${variable}${currentValue.slice(end)}`;
    setChannelValue(activeTemplate.key, activeChannel, field, nextValue);
    requestAnimationFrame(() => {
      const target = activeInputRef();
      target?.focus();
      const position = start + variable.length;
      target?.setSelectionRange(position, position);
    });
  }

  function openEditor(templateKey, channelId = 'whatsapp') {
    setEditorKey(templateKey);
    setActiveChannel(channelId);
    setActiveEditorField(channelId === 'email' ? 'body' : 'message');
    setMenuKey(null);
  }

  function openEditorAction(event, templateKey, channelId = 'whatsapp') {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    openEditor(templateKey, channelId);
  }

  function openPreviewAction(event, template, channelId = 'whatsapp') {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    setPreviewState({ template, channelId });
  }

  function addCustomTemplate() {
    const key = `custom_${Date.now()}`;
    const template = normalizeTemplate({
      id: key,
      key,
      name: 'Custom template',
      category: 'Other',
      description: 'Manual notification template.',
      enabled: true,
      channels: {
        whatsapp: { enabled: true, message: '' },
        sms: { enabled: true, message: '' },
        email: { enabled: true, subject: '', body: '' }
      },
      allowedVariables: validVariables,
      triggerEvent: 'custom.manual',
      audience: 'customer',
      isSystemDefault: false,
      isCustom: true
    });
    setDraft((current) => ({ ...current, templates: [...current.templates, template] }));
    setEditorKey(key);
    setActiveChannel('whatsapp');
  }

  function duplicateTemplate(template) {
    const key = `custom_${Date.now()}`;
    const copy = normalizeTemplate({
      ...clonePlain(template),
      id: key,
      key,
      name: `Copy of ${template.name}`,
      isSystemDefault: false,
      isCustom: true,
      triggerEvent: 'custom.manual',
      updatedAt: new Date().toISOString(),
      updatedBy: user?.name || user?.username || ''
    });
    setDraft((current) => ({ ...current, templates: [...current.templates, copy] }));
    setEditorKey(key);
    setMenuKey(null);
  }

  function resetTemplateToDefault(templateKey) {
    const defaultTemplate = defaultNotificationState().templates.find((template) => template.key === templateKey);
    if (!defaultTemplate) return;
    updateTemplate(templateKey, () => clonePlain(defaultTemplate));
    setResetConfirm(null);
    push('Template reset to default', 'info');
  }

  function resetAllToDefaults() {
    const defaults = defaultNotificationState();
    setDraft((current) => ({ ...defaults, providers: current.providers }));
    setResetConfirm(null);
    push('Notification templates reset to defaults', 'info');
  }

  function resetActiveTemplateChanges() {
    if (!activeTemplate) return;
    const savedTemplate = saved.templates?.find((template) => template.key === activeTemplate.key);
    const defaultTemplate = defaultNotificationState().templates.find((template) => template.key === activeTemplate.key);
    const resetTemplate = savedTemplate || defaultTemplate;
    if (!resetTemplate) {
      push('No saved version is available for this custom template yet.', 'info');
      return;
    }
    setDraft((current) => ({
      ...current,
      templates: current.templates.map((template) => template.key === activeTemplate.key ? clonePlain(resetTemplate) : template)
    }));
    push('Template changes reset', 'info');
  }

  function deleteCustomTemplate(templateKey) {
    setDraft((current) => ({ ...current, templates: current.templates.filter((template) => template.key !== templateKey) }));
    if (editorKey === templateKey) setEditorKey(null);
    setDeleteConfirm(null);
  }

  async function saveChanges(event) {
    event?.preventDefault?.();
    if (!canEdit) {
      push('Only admin users with notification template permission can save changes.', 'error');
      return;
    }
    setSaving(true);
    try {
      const result = await request('/settings/business/notificationTemplates', {
        method: 'PATCH',
        body: JSON.stringify(draft)
      });
      push(result.message || 'Notification templates saved');
      await reload({ silent: true });
    } catch (err) {
      push(err.message || 'Failed to save notification templates', 'error');
    } finally {
      setSaving(false);
    }
  }

  function sendTestBlocked(channelId) {
    const channel = channelOptions.find((item) => item.id === channelId);
    push(`Connect ${channel?.label || 'provider'} integration first.`, 'info');
  }

  if (loading) return <LoadingBlock />;
  if (error) return <ErrorBlock message={error} />;

  return (
    <form className="notification-settings-root" onSubmit={saveChanges}>
      <section className="surface admin-control-card notification-header-card">
        <div className="notification-header-copy">
          <div className="admin-control-icon notification-header-icon"><MessageSquareText className="h-5 w-5" /></div>
          <div className="min-w-0">
            <div className="notification-header-title-row">
              <h2>Notification Templates</h2>
              <span className="admin-premium-badge">Future-ready defaults</span>
            </div>
            <p>Manage reusable customer, billing, service, AMC, and internal notification messages.</p>
          </div>
        </div>
        <div className="notification-header-actions">
          <button type="button" className="btn btn-secondary admin-compact-button" onClick={() => setShowHowItWorks(true)}>
            <HelpCircle className="h-4 w-4" />
            How it works
          </button>
          <button type="button" className="btn btn-secondary admin-compact-button" onClick={() => setShowIntegrations(true)}>
            <Settings2 className="h-4 w-4" />
            Configure Integrations
          </button>
        </div>
      </section>

      {!canEdit ? (
        <p className="notification-permission-warning">Only admin users with notification template permission can save changes.</p>
      ) : null}

      <section className="notification-summary-grid" aria-label="Notification template summary">
        {summaryCards.map((card) => (
          <div key={card.label} className={`notification-summary-card is-${card.tone}`}>
            <span>{card.label}</span>
            <strong>{card.value}</strong>
            <p>{card.helper}</p>
          </div>
        ))}
      </section>

      {invalidTemplateCount ? (
        <div className="notification-soft-alert is-warning">
          <AlertTriangle className="h-4 w-4" />
          <span>{invalidTemplateCount} template{invalidTemplateCount === 1 ? '' : 's'} need variable fixes</span>
        </div>
      ) : (
        <div className="notification-soft-alert is-calm">
          <CheckCircle2 className="h-4 w-4" />
          <span>No invalid variables</span>
        </div>
      )}

      <section className="notification-integration-row" aria-label="Notification integration status">
        {channelOptions.map(({ id, label, Icon }) => {
          const connected = providerConnected(id);
          return (
            <div key={id} className={`notification-integration-item ${connected ? 'is-connected' : 'is-disconnected'}`}>
              <div className="notification-integration-copy">
                <Icon className="h-4 w-4" />
                <div>
                  <span>{label}</span>
                  <strong>{connected ? 'Connected' : 'Integration setup pending'}</strong>
                </div>
              </div>
              <span className="notification-status-dot" aria-hidden="true" />
            </div>
          );
        })}
      </section>
      {!connectedChannelCount ? (
        <p className="notification-empty-note">No connected channels yet. Templates can still be prepared and saved while integrations are pending.</p>
      ) : null}

      <div className="notification-workspace">
        <main className="notification-main">
          <section className="surface admin-control-card notification-toolbar">
            <label className="notification-search">
              <Search className="h-4 w-4" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search templates..." />
            </label>
            <select className="input" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
              {categoryOptions.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <select className="input" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              {statusFilterOptions.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <select className="input" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
              {typeFilterOptions.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <button type="button" className="btn btn-primary admin-compact-button" disabled={!canEdit || saving} onClick={addCustomTemplate}>
              <Plus className="h-4 w-4" />
              Add Custom Template
            </button>
          </section>

          <section className="surface admin-control-card notification-list-card">
            <div className="notification-list-head">
              <span>Template</span>
              <span>Status</span>
              <span>Actions</span>
            </div>
            {pageTemplates.length ? (
              <div className="notification-list">
                {pageTemplates.map((template) => {
                  const meta = categoryMeta(template.category);
                  const Icon = meta.Icon;
                  const invalidVariables = invalidTemplateMap.get(template.key) || [];
                  const status = templateStatus(template, invalidVariables);
                  const anyConnected = channelOptions.some((channel) => providerConnected(channel.id) && template.channels?.[channel.id]?.enabled);
                  const sendTestTitle = anyConnected ? 'Send a test notification' : 'Connect integration first.';
                  return (
                    <article key={template.key} className="notification-row">
                      <div className="notification-row-main">
                        <div className={`notification-row-icon notification-color-${meta.color}`}><Icon className="h-4 w-4" /></div>
                        <div className="min-w-0">
                          <div className="notification-row-title">
                            <h3>{template.name}</h3>
                            <span className="notification-category-badge">{template.category}</span>
                          </div>
                          <p className="notification-row-preview">{previewText(template)}</p>
                        </div>
                      </div>
                      <div className="notification-row-status">
                        <span className={`notification-status-badge is-${status.tone}`} title={status.title}>{status.label}</span>
                        <button
                          type="button"
                          className={`notification-toggle ${template.enabled ? 'is-on' : 'is-off'}`}
                          disabled={!canEdit || saving}
                          aria-pressed={template.enabled}
                          onClick={() => requestTemplateEnabledChange(template)}
                        >
                          <span aria-hidden="true" />
                          <strong>{template.enabled ? 'Enabled' : 'Disabled'}</strong>
                        </button>
                      </div>
                      <div className="notification-row-actions">
                        <button type="button" className="btn btn-primary admin-table-button notification-row-edit-action" onMouseDown={(event) => openEditorAction(event, template.key)} onClick={(event) => openEditorAction(event, template.key)}>
                          <Edit3 className="h-4 w-4" />
                          Edit
                        </button>
                        <button type="button" className="btn btn-secondary admin-table-button" onMouseDown={(event) => openPreviewAction(event, template, 'whatsapp')} onClick={(event) => openPreviewAction(event, template, 'whatsapp')}>
                          <Eye className="h-4 w-4" />
                          Preview
                        </button>
                        <div className="notification-row-menu">
                          <button type="button" className="icon-button h-9 w-9" onClick={() => setMenuKey(menuKey === template.key ? null : template.key)} aria-label={`Open actions for ${template.name}`}>
                            <MoreVertical className="h-4 w-4" />
                          </button>
                          {menuKey === template.key ? (
                            <div className="notification-menu">
                              <MenuButton disabled={!anyConnected} title={sendTestTitle} onClick={() => anyConnected ? push('Test sending will use connected provider configuration. No test was sent from this screen.', 'info') : sendTestBlocked('whatsapp')}><Send className="h-4 w-4" /> Send Test</MenuButton>
                              <MenuButton onClick={() => duplicateTemplate(template)}><Copy className="h-4 w-4" /> Duplicate</MenuButton>
                              {!template.isCustom ? <MenuButton onClick={() => { setResetConfirm({ type: 'template', template }); setMenuKey(null); }}><RotateCcw className="h-4 w-4" /> Reset to Default</MenuButton> : null}
                              <MenuButton onClick={() => { requestTemplateEnabledChange(template); setMenuKey(null); }}>{template.enabled ? <X className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />} {template.enabled ? 'Disable' : 'Enable'}</MenuButton>
                              <MenuButton onClick={() => { setUsageTemplate(template); setMenuKey(null); }}><Hash className="h-4 w-4" /> View usage / trigger</MenuButton>
                              {template.isCustom ? <MenuButton danger onClick={() => { setDeleteConfirm(template); setMenuKey(null); }}><Trash2 className="h-4 w-4" /> Delete</MenuButton> : null}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <EmptyState icon={Search} title={templates.length ? 'No templates found' : 'No templates available'} message={templates.length ? 'Try changing the search or filters.' : 'Notification templates will appear here once settings load.'} />
            )}
            <div className="notification-pagination">
              <span>Showing {filteredTemplates.length ? pageStart + 1 : 0} to {Math.min(pageStart + pageSize, filteredTemplates.length)} of {filteredTemplates.length} templates</span>
              <div className="notification-page-controls">
                <select className="input" value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))}>
                  {pageSizeOptions.map((size) => <option key={size} value={size}>{size} / page</option>)}
                </select>
                <button type="button" className="icon-button h-9 w-9" disabled={currentPage <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} aria-label="Previous page"><ChevronLeft className="h-4 w-4" /></button>
                <div className="notification-page-buttons" aria-label="Template pages">
                  {visiblePages.map((pageNumber) => (
                    <button
                      key={pageNumber}
                      type="button"
                      className={`notification-page-number ${pageNumber === currentPage ? 'is-active' : ''}`}
                      onClick={() => setPage(pageNumber)}
                      aria-current={pageNumber === currentPage ? 'page' : undefined}
                    >
                      {pageNumber}
                    </button>
                  ))}
                </div>
                <button type="button" className="icon-button h-9 w-9" disabled={currentPage >= pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))} aria-label="Next page"><ChevronRight className="h-4 w-4" /></button>
              </div>
            </div>
          </section>
        </main>
      </div>

      {activeTemplate ? (
        <div className="notification-drawer-backdrop" role="dialog" aria-modal="true" aria-labelledby="notification-editor-title">
          <section className="surface admin-modal notification-editor-drawer">
            <div className="notification-editor-top">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-wide text-[var(--brand)]">Template Editor</p>
                <h3 id="notification-editor-title">{activeTemplate.name}</h3>
                <div className="notification-editor-badges">
                  <span className="notification-category-badge">{activeTemplate.category}</span>
                  <span className={`notification-type-badge ${activeTemplate.isCustom ? 'is-custom' : ''}`}>{activeTemplate.isCustom ? 'Custom' : 'Default'}</span>
                  <span>{activeTemplate.audience}</span>
                  <span>{activeTemplate.triggerEvent}</span>
                </div>
              </div>
              <button type="button" className="icon-button h-9 w-9" onClick={() => setEditorKey(null)} aria-label="Close editor">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="notification-editor-meta">
              <label>
                <span className="label">Template name</span>
                <input className="input" value={activeTemplate.name} disabled={!canEdit || saving || activeTemplate.isSystemDefault} onChange={(event) => updateTemplate(activeTemplate.key, { name: event.target.value })} />
              </label>
              <label>
                <span className="label">Category</span>
                <select className="input" value={activeTemplate.category} disabled={!canEdit || saving || activeTemplate.isSystemDefault} onChange={(event) => updateTemplate(activeTemplate.key, { category: event.target.value })}>
                  {categoryOptions.filter((item) => item !== 'All').map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>
              <button
                type="button"
                className={`notification-toggle ${activeTemplate.enabled ? 'is-on' : 'is-off'}`}
                disabled={!canEdit || saving}
                aria-pressed={activeTemplate.enabled}
                onClick={() => requestTemplateEnabledChange(activeTemplate)}
              >
                <span aria-hidden="true" />
                <strong>{activeTemplate.enabled ? 'Enabled' : 'Disabled'}</strong>
              </button>
            </div>

            <div className="notification-trigger-box">
              <strong>Trigger / audience</strong>
              <span>{activeTemplate.triggerEvent} {'->'} {activeTemplate.audience}</span>
              {activeTemplate.supportsAttachment ? <em>Supports future PDF attachment</em> : null}
            </div>

            <div className="notification-channel-tabs" role="tablist" aria-label="Notification channels">
              {channelOptions.map(({ id, label, Icon, description }) => (
                <button key={id} type="button" role="tab" aria-selected={activeChannel === id} className={`notification-channel-tab ${activeChannel === id ? 'is-active' : ''}`} onClick={() => { setActiveChannel(id); setActiveEditorField(id === 'email' ? 'body' : 'message'); }}>
                  <Icon className="h-4 w-4" />
                  <span>{label}</span>
                  <small>{description}</small>
                </button>
              ))}
            </div>

            <div className="notification-editor-grid">
              <div className="notification-editor-fields">
                {activeChannel === 'whatsapp' ? (
                  <label>
                    <span className="label">WhatsApp message</span>
                    <textarea ref={whatsappRef} className="input notification-editor-textarea" value={activeTemplate.channels.whatsapp.message} disabled={!canEdit || saving} onFocus={() => setActiveEditorField('message')} onChange={(event) => setChannelValue(activeTemplate.key, 'whatsapp', 'message', event.target.value)} />
                    <span className="notification-character-count">{activeTemplate.channels.whatsapp.message.length}/2500 characters</span>
                  </label>
                ) : null}
                {activeChannel === 'sms' ? (
                  <label>
                    <span className="label">SMS message</span>
                    <textarea ref={smsRef} className="input notification-editor-textarea notification-editor-textarea-sms" value={activeTemplate.channels.sms.message} disabled={!canEdit || saving} onFocus={() => setActiveEditorField('message')} onChange={(event) => setChannelValue(activeTemplate.key, 'sms', 'message', event.target.value)} />
                    <span className={`notification-character-count ${activeTemplate.channels.sms.message.length > 160 ? 'is-warning' : ''}`}>{activeTemplate.channels.sms.message.length}/160 SMS guidance</span>
                  </label>
                ) : null}
                {activeChannel === 'email' ? (
                  <div className="grid gap-3">
                    <label>
                      <span className="label">Email subject</span>
                      <input ref={emailSubjectRef} className="input" value={activeTemplate.channels.email.subject} disabled={!canEdit || saving} onFocus={() => setActiveEditorField('subject')} onChange={(event) => setChannelValue(activeTemplate.key, 'email', 'subject', event.target.value)} />
                    </label>
                    <label>
                      <span className="label">Email body</span>
                      <textarea ref={emailBodyRef} className="input notification-editor-textarea" value={activeTemplate.channels.email.body} disabled={!canEdit || saving} onFocus={() => setActiveEditorField('body')} onChange={(event) => setChannelValue(activeTemplate.key, 'email', 'body', event.target.value)} />
                      <span className="notification-character-count">{activeTemplate.channels.email.body.length}/5000 characters</span>
                    </label>
                  </div>
                ) : null}
                {activeInvalidVariables.length ? (
                  <div className="notification-invalid-box">
                    <AlertTriangle className="h-4 w-4" />
                    <div>
                      <strong>Unsupported variable. Replace with a supported variable from the list.</strong>
                      {activeInvalidVariables.map((token) => <p key={token}>{invalidVariableMessage(token)}</p>)}
                    </div>
                  </div>
                ) : (
                  <div className="notification-invalid-box is-empty">
                    <CheckCircle2 className="h-4 w-4" />
                    <div>
                      <strong>No invalid variables</strong>
                      <p>This template uses supported variable names.</p>
                    </div>
                  </div>
                )}
              </div>
              <aside className="notification-editor-side">
                <section className="notification-drawer-variables">
                  <div className="notification-variables-header">
                    <div>
                      <h3>Variables</h3>
                      <p>Search and click to insert into the active editor field.</p>
                    </div>
                  </div>
                  <label className="notification-variable-search">
                    <Search className="h-4 w-4" />
                    <input value={variableSearch} onChange={(event) => setVariableSearch(event.target.value)} placeholder="Search variables..." />
                  </label>
                  <div className="notification-variable-accordions">
                    {primaryVariableGroups.map((group) => {
                      const open = isVariableGroupOpen(group.label, group.variables.length > 0);
                      return (
                        <section key={group.label} className="notification-variable-group">
                          <button
                            type="button"
                            className="notification-variable-group-toggle"
                            onClick={() => toggleVariableGroup(group.label)}
                          >
                            <span>{group.label}</span>
                            <ChevronDown className={`h-4 w-4 ${open ? 'rotate-180' : ''}`} />
                          </button>
                          {open ? (
                            <div className="notification-variable-chip-grid">
                              {group.variables.map((variable) => (
                                <button key={variable} type="button" className="notification-variable-chip" onClick={() => insertVariable(variable)}>
                                  {variable}
                                </button>
                              ))}
                            </div>
                          ) : null}
                        </section>
                      );
                    })}
                    {secondaryVariableGroups.length ? (
                      <section className="notification-variable-group notification-more-variable-group">
                        <button
                          type="button"
                          className="notification-variable-group-toggle"
                          onClick={() => toggleVariableGroup(MORE_VARIABLES_GROUP)}
                        >
                          <span>More variables</span>
                          <ChevronDown className={`h-4 w-4 ${isVariableGroupOpen(MORE_VARIABLES_GROUP, secondaryVariableGroups.length > 0) ? 'rotate-180' : ''}`} />
                        </button>
                        {isVariableGroupOpen(MORE_VARIABLES_GROUP, secondaryVariableGroups.length > 0) ? (
                          <div className="notification-more-variable-list">
                            {secondaryVariableGroups.map((group) => {
                              const open = isVariableGroupOpen(group.label, group.variables.length > 0);
                              return (
                                <section key={group.label} className="notification-variable-subgroup">
                                  <button
                                    type="button"
                                    className="notification-variable-group-toggle notification-variable-subgroup-toggle"
                                    onClick={() => toggleVariableGroup(group.label)}
                                  >
                                    <span>{group.label}</span>
                                    <ChevronDown className={`h-4 w-4 ${open ? 'rotate-180' : ''}`} />
                                  </button>
                                  {open ? (
                                    <div className="notification-variable-chip-grid">
                                      {group.variables.map((variable) => (
                                        <button key={variable} type="button" className="notification-variable-chip" onClick={() => insertVariable(variable)}>
                                          {variable}
                                        </button>
                                      ))}
                                    </div>
                                  ) : null}
                                </section>
                              );
                            })}
                          </div>
                        ) : null}
                      </section>
                    ) : null}
                    {!primaryVariableGroups.length && !secondaryVariableGroups.length ? (
                      <div className="notification-variable-empty-state">
                        <Hash className="h-4 w-4" />
                        <span>No variables found</span>
                      </div>
                    ) : null}
                  </div>
                </section>
                <section className="notification-live-preview">
                  <h4>Live Preview</h4>
                  <p>{activeChannel === 'email' ? replaceVariables(activeTemplate.channels.email.subject) : channelOptions.find((item) => item.id === activeChannel)?.label}</p>
                  <div>{replaceVariables(activeChannel === 'email' ? activeTemplate.channels.email.body : activeTemplate.channels[activeChannel].message)}</div>
                </section>
              </aside>
            </div>

            <div className="notification-editor-actions-bar">
              <button type="button" className="btn btn-secondary" onClick={() => setEditorKey(null)}>Cancel</button>
              <button type="button" className="btn btn-secondary" onClick={() => setPreviewState({ template: activeTemplate, channelId: activeChannel })}><Eye className="h-4 w-4" /> Preview</button>
              <button type="button" className="btn btn-secondary" onClick={resetActiveTemplateChanges}><RotateCcw className="h-4 w-4" /> Reset changes</button>
              <button type="submit" className="btn btn-primary" disabled={!dirty || !canEdit || saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Template</button>
            </div>
          </section>
        </div>
      ) : null}

      {previewState ? (
        <ModalShell title={`${previewState.template.name} Preview`} subtitle={channelOptions.find((item) => item.id === previewState.channelId)?.label || 'Preview'} onClose={() => setPreviewState(null)} width="lg">
          <div className="notification-preview-panel">
            {previewState.channelId === 'email' ? <h4>{replaceVariables(previewState.template.channels.email.subject)}</h4> : null}
            <p>{replaceVariables(previewState.channelId === 'email' ? previewState.template.channels.email.body : previewState.template.channels[previewState.channelId]?.message)}</p>
          </div>
        </ModalShell>
      ) : null}

      {resetConfirm ? (
        <ModalShell title={resetConfirm.type === 'all' ? 'Reset all templates?' : 'Reset this template?'} subtitle={resetConfirm.type === 'all' ? 'This will prepare the default notification messages in this draft. Save Changes is required before the backend is updated.' : `This will prepare the default message for ${resetConfirm.template.name} in this draft. Save Changes is required before the backend is updated.`} onClose={() => setResetConfirm(null)}>
          <div className="notification-confirm-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setResetConfirm(null)}>Cancel</button>
            <button type="button" className="btn btn-primary" onClick={() => resetConfirm.type === 'all' ? resetAllToDefaults() : resetTemplateToDefault(resetConfirm.template.key)}>Reset Template</button>
          </div>
        </ModalShell>
      ) : null}

      {deleteConfirm ? (
        <ModalShell title="Remove custom template?" subtitle={`Remove ${deleteConfirm.name} from this draft. Save Changes is required before the backend is updated.`} onClose={() => setDeleteConfirm(null)}>
          <div className="notification-confirm-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setDeleteConfirm(null)}>Cancel</button>
            <button type="button" className="btn btn-primary" onClick={() => deleteCustomTemplate(deleteConfirm.key)}>Remove Template</button>
          </div>
        </ModalShell>
      ) : null}

      {disableConfirm ? (
        <ModalShell title="Disable notification template?" subtitle={`${disableConfirm.name} will be disabled in this draft. Save Changes is required before the backend is updated.`} onClose={() => setDisableConfirm(null)}>
          <div className="notification-confirm-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setDisableConfirm(null)}>Cancel</button>
            <button type="button" className="btn btn-primary" onClick={() => disableTemplate(disableConfirm.key)}>Disable</button>
          </div>
        </ModalShell>
      ) : null}

      {usageTemplate ? (
        <ModalShell title="Usage / trigger info" subtitle={usageTemplate.name} onClose={() => setUsageTemplate(null)}>
          <div className="notification-usage-grid">
            <span>Trigger</span><strong>{usageTemplate.triggerEvent}</strong>
            <span>Audience</span><strong>{usageTemplate.audience}</strong>
            <span>Category</span><strong>{usageTemplate.category}</strong>
            <span>Attachment</span><strong>{usageTemplate.supportsAttachment ? 'Supported' : 'No attachment'}</strong>
            <span>Used when</span><strong>{usageDescription(usageTemplate)}</strong>
          </div>
        </ModalShell>
      ) : null}

      {showHowItWorks ? (
        <ModalShell title="How it works" subtitle="A quick path for future-ready notification setup." onClose={() => setShowHowItWorks(false)}>
          <ol className="notification-how-list">
            <li>Choose a template.</li>
            <li>Edit WhatsApp, SMS, or Email content.</li>
            <li>Insert variables from the panel.</li>
            <li>Preview with sample data.</li>
            <li>Save changes.</li>
            <li>Connect a provider to send automatically.</li>
          </ol>
        </ModalShell>
      ) : null}

      {showIntegrations ? (
        <ModalShell title="Configure Integrations" subtitle="Provider configuration is future-ready and currently read-only here." onClose={() => setShowIntegrations(false)}>
          <div className="notification-provider-list">
            {channelOptions.map((channel) => (
              <div key={channel.id} className="notification-provider-row">
                <span>{channel.label}</span>
                <strong>{providerConnected(channel.id) ? 'Connected' : 'Integration setup pending'}</strong>
              </div>
            ))}
          </div>
        </ModalShell>
      ) : null}

      {dirty ? (
        <div className="notification-save-bar">
          <div>
            <AlertTriangle className="h-5 w-5" />
            <div>
              <strong>You have unsaved changes</strong>
              <span>Don't forget to save your updates.</span>
            </div>
          </div>
          <div className="notification-save-actions">
            <button type="button" className="btn btn-secondary" disabled={saving} onClick={() => setDraft(clonePlain(saved))}>Discard Changes</button>
            <button type="button" className="btn btn-secondary" disabled={saving || !canEdit} onClick={() => setResetConfirm({ type: 'all' })}>Reset to Defaults</button>
            <button type="submit" className="btn btn-primary" disabled={saving || !canEdit}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Changes</button>
          </div>
        </div>
      ) : null}
    </form>
  );
}
