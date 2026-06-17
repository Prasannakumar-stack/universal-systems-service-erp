import fs from 'node:fs';
import path from 'node:path';
import PDFDocument from 'pdfkit';
import PdfTemplate from '../models/PdfTemplate.js';
import { COMPANY, LOGO_FULL_PATH, PDF_DIR } from '../config.js';
import { hasRole } from '../permissions.js';
import { appError, clean } from '../utils/http.js';
import { logAudit } from './auditService.js';
import { getCompanyIdentity } from './companyProfileService.js';
import { getBusinessSettings } from './businessSettingsService.js';
import {
  renderAmcContractPdf,
  renderAmcRenewalPdf,
  renderAmcServiceVisitPdf,
  sampleAmcContractData,
  sampleAmcRenewalData,
  sampleAmcVisitData
} from './amcPdfTemplates.js';
import { renderInvoicePdf, sampleInvoiceData } from './invoicePdfTemplate.js';
import { renderQuotationPdf, sampleQuotationData } from './quotationPdfTemplate.js';
import { renderServiceCompletedPdf, sampleServiceCompletedData } from './serviceCompletedPdfTemplate.js';
import { buildPdfTemplateManifest } from './pdfTemplateManifestService.js';

export const PDF_TEMPLATE_PLACEHOLDERS = [
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

const textFields = [
  'headerTitle',
  'footerText',
  'termsAndConditions',
  'paymentBankDetails',
  'signatureSection',
  'notesWarrantyText',
  'amcTerms'
];

const advancedSectionTypes = new Set([
  'text',
  'card',
  'info',
  'notice',
  'warranty',
  'terms',
  'payment',
  'bank',
  'signature',
  'qr',
  'customer-message',
  'custom-field',
  'spacer',
  'divider',
  'image',
  'table',
  'icon'
]);

const cardWidths = new Set(['full', 'half', 'third', 'two-thirds', 'auto']);
const borderStyles = new Set(['default', 'thin', 'none', 'highlight']);

export const PDF_TEMPLATE_DEFINITIONS = [
  {
    key: 'invoice',
    category: 'service',
    name: 'Invoice PDF',
    description: 'Invoice and payment PDF template for completed service jobs.',
    defaults: {
      headerTitle: 'INVOICE',
      showCompanyLogo: true,
      showCompanyDetails: true,
      showTechnician: true,
      footerText: 'Thank you for your business. We look forward to serving you again.',
      termsAndConditions: 'Payment is required before delivery or as per company policy.\nWarranty, if applicable, covers only the parts or services mentioned in this invoice.\nProducts once delivered should be checked and verified by the customer.\nAdditional work or parts not mentioned in this invoice will be charged separately.',
      paymentBankDetails: '',
      signatureSection: '',
      notesWarrantyText: '',
      amcTerms: '',
      colorAccent: '#0f2a52'
    }
  },
  {
    key: 'quotation',
    category: 'service',
    name: 'Quotation / Estimate PDF',
    description: 'Estimate template used before a customer approves service work.',
    defaults: {
      headerTitle: 'QUOTATION',
      showCompanyLogo: true,
      showCompanyDetails: true,
      showTechnician: true,
      showSerialNumber: false,
      footerText: 'We appreciate your trust in Universal Systems. We are always here to help!',
      termsAndConditions: '1. This quotation is not an invoice; it is only an estimate for the mentioned goods/services.\n2. This quotation is valid for 7 days from the quotation date.\n3. Work will start only after customer approval.\n4. Payment is required before delivery or as per company policy.\n5. Final price may change if additional faults, parts, or services are found.\n6. Warranty, if applicable, covers only the parts or services mentioned in this quotation.',
      paymentBankDetails: '',
      signatureSection: 'Prepared By',
      notesWarrantyText: '',
      amcTerms: '',
      colorAccent: '#0f2a52'
    }
  },
  {
    key: 'service-completed',
    category: 'service',
    name: 'Thank You / Service Completed PDF',
    description: 'Simple thank-you PDF issued after a service is completed.',
    defaults: {
      headerTitle: 'SERVICE COMPLETED!',
      showCompanyLogo: true,
      showCompanyDetails: true,
      footerText: 'We appreciate your business. Visit us again!',
      termsAndConditions: '',
      paymentBankDetails: '',
      signatureSection: '',
      notesWarrantyText: '',
      amcTerms: '',
      colorAccent: '#0f2a52'
    }
  },
  {
    key: 'amc-contract',
    category: 'amc',
    name: 'AMC Contract PDF',
    description: 'AMC contract template with period, coverage, and value details.',
    defaults: {
      headerTitle: 'AMC CONTRACT',
      showCompanyLogo: true,
      showCompanyDetails: true,
      showTechnician: true,
      showSerialNumber: false,
      footerText: 'Thank you for choosing Universal Systems AMC support.',
      termsAndConditions: '',
      paymentBankDetails: '',
      signatureSection: '',
      notesWarrantyText: '',
      amcTerms: '',
      colorAccent: '#0f2a52'
    }
  },
  {
    key: 'amc-service-visit',
    category: 'amc',
    name: 'AMC Visit / Service Report PDF',
    description: 'AMC service visit report template for completed visits.',
    defaults: {
      headerTitle: 'AMC SERVICE VISIT REPORT',
      showCompanyLogo: true,
      showCompanyDetails: true,
      showTechnician: true,
      showAdditionalCharges: true,
      footerText: 'Thank you for choosing Universal Systems AMC support.',
      termsAndConditions: '',
      paymentBankDetails: '',
      signatureSection: '',
      notesWarrantyText: '',
      amcTerms: '',
      colorAccent: '#0f2a52'
    }
  },
  {
    key: 'amc-renewal-reminder',
    category: 'amc',
    name: 'AMC Renewal / Expiry Reminder PDF',
    description: 'Renewal reminder template for expiring AMC contracts.',
    defaults: {
      headerTitle: 'AMC RENEWAL REMINDER',
      showCompanyLogo: true,
      showCompanyDetails: true,
      showRenewalAmount: true,
      footerText: 'We value your trust. Stay connected for the best service!',
      termsAndConditions: '',
      paymentBankDetails: '',
      signatureSection: '',
      notesWarrantyText: '',
      amcTerms: '',
      colorAccent: '#0f2a52'
    }
  }
];

const definitionsByKey = new Map(PDF_TEMPLATE_DEFINITIONS.map((definition) => [definition.key, definition]));

function isPlainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function clonePlain(value) {
  return JSON.parse(JSON.stringify(value || {}));
}

function deepMerge(base = {}, source = {}) {
  const next = clonePlain(base);
  Object.entries(source || {}).forEach(([key, value]) => {
    if (isPlainObject(value) && isPlainObject(next[key])) {
      next[key] = deepMerge(next[key], value);
      return;
    }
    next[key] = Array.isArray(value) ? value.slice() : value;
  });
  return next;
}

function boolValue(value, fallback = true) {
  return typeof value === 'boolean' ? value : fallback;
}

function stringList(value = [], fallback = []) {
  const source = Array.isArray(value) ? value : String(value || '').split('\n');
  const rows = source.map((item) => cleanText(item, '', 800).trim()).filter(Boolean);
  return rows.length ? rows.slice(0, 12) : fallback.slice();
}

function termsList(value = '', fallback = []) {
  return stringList(value, fallback).map((line) => line.replace(/^[-*\u2022]?\s*\d*\.?\s*/, '').trim()).filter(Boolean);
}

function commonStructuredConfig(key, flat = {}) {
  const accentColor = flat.colorAccent || defaultConfigFor(key).colorAccent || '#0f2a52';
  return {
    layoutVersion: 5,
    editMode: 'structured',
    advancedEnabled: false,
    header: {
      showLogo: flat.showCompanyLogo !== false,
      showCompanyDetails: flat.showCompanyDetails !== false,
      title: flat.headerTitle || defaultConfigFor(key).headerTitle || '',
      accentColor
    },
    footer: {
      showCallWhatsapp: true,
      showEmail: true,
      showWebsite: true,
      showAddress: true,
      thankYouMessage: flat.footerText || defaultConfigFor(key).footerText || ''
    },
    pageBreaks: {
      repeatTableHeader: true,
      keepAmountSummaryTogether: true,
      keepWorkNoticeTogether: true,
      keepTermsTogether: true,
      keepFooterAtBottom: true,
      showPageNumbers: true
    },
    pageSettings: {
      preferOnePage: true,
      safePagination: true,
      avoidFooterOverlap: true,
      repeatTableHeader: true
    },
    structured: {
      mode: 'structured',
      useCurrentDefaultLayout: true,
      advancedPanelOpen: false,
      customSectionsEnabled: false,
      allowDragDrop: false,
      twoColumnCards: false,
      customCardWidthEnabled: false,
      customColorsEnabled: false,
      qrPaymentCardEnabled: false,
      signatureCardEnabled: false,
      designModeEnabled: false,
      defaultCardWidth: 'full',
      borderStyle: 'default',
      qrPaymentCard: {
        title: 'Payment Details',
        note: '',
        upiText: '',
        qrValue: ''
      },
      signatureCard: {
        title: 'Authorized Signature',
        personName: '',
        designation: '',
        imageUrl: ''
      },
      customSections: []
    },
      design: {
        enabled: false,
        confirmed: false,
        mode: 'legacy',
        published: false,
        previewDraft: false,
        baseTemplateVersion: 1,
        overrides: {},
        lockedDefaultSections: true,
        canvas: {
          size: 'A4',
          orientation: 'portrait',
          zoom: 'fit',
          gridSize: 8,
          snap: true
        },
        gridEnabled: false,
        layoutGuides: false,
        visualElementMode: true,
        snapToGrid: true,
        page: {
          size: 'A4',
          orientation: 'portrait',
        margin: 28,
        backgroundColor: '#ffffff'
      },
      colors: {
        accentColor,
        cardBackground: '#ffffff',
        textColor: '#0f172a',
          borderColor: '#d8e5f7',
          noticeBackground: '#f1f7ff'
        },
        pages: [{ id: 'page-1', name: 'Page 1', elements: [] }],
        sections: [],
        elements: [],
        customElements: []
      },
    sections: {}
  };
}

function structuredDefaultsFor(key) {
  const flat = defaultConfigFor(key);
  const config = commonStructuredConfig(key, flat);
  if (key === 'invoice') {
    config.sections = {
      invoiceDetails: {
        showInvoiceNumber: true,
        showJobReference: true,
        showInvoiceDate: true,
        showPaymentStatus: true
      },
      customerDetails: {
        showCustomerName: true,
        showPhoneNumber: true,
        showAddress: true
      },
      serviceDetails: {
        showServiceType: true,
        showDevice: true,
        showBrandModel: true,
        showProblemComplaint: true,
        showTechnician: flat.showTechnician !== false
      },
      itemTable: {
        labels: {
          sno: 'S.No.',
          description: 'Description',
          quantity: 'Qty',
          unitPrice: 'Unit Price (\u20b9)',
          total: 'Total (\u20b9)',
          tax: 'Tax (\u20b9)'
        },
        showSno: true,
        showQuantity: true,
        showUnitPrice: true,
        showTotal: true,
        showTaxColumn: false
      },
      amountSummary: {
        showAmountInWords: true,
        showSubtotal: true,
        showFinalTotal: true,
        showAmountPaid: true,
        showBalanceDue: true
      },
      workCompletionNotice: {
        show: true,
        title: 'WORK COMPLETION NOTICE',
        messageLines: [
          'Service completed successfully.',
          'You may visit our store to collect your product or arrange for delivery as per your convenience.'
        ]
      },
      terms: {
        show: true,
        title: 'TERMS & CONDITIONS',
        text: flat.termsAndConditions || ''
      }
    };
  } else if (key === 'quotation') {
    config.sections = {
      quotationDetails: {
        showJobReference: true,
        showQuotationDate: true,
        showQuotationStatus: true
      },
      customerDetails: {
        showCustomerName: true,
        showPhoneNumber: true,
        showAddress: true
      },
      serviceDeviceDetails: {
        showServiceType: true,
        showDevice: true,
        showBrandModel: true,
        showTechnician: flat.showTechnician !== false,
        showSerialNumber: flat.showSerialNumber === true
      },
      problemComplaint: {
        show: true,
        label: 'Problem / Complaint'
      },
      itemTable: {
        labels: {
          sno: 'S.No',
          description: 'Description',
          quantity: 'Qty',
          unitPrice: 'Unit Price (\u20b9)',
          total: 'Total (\u20b9)',
          tax: 'Tax (\u20b9)'
        },
        showSno: true,
        showQuantity: true,
        showUnitPrice: true,
        showTotal: true,
        showTaxColumn: false
      },
      totalSummary: {
        show: true,
        showSubtotal: true,
        showTax: true,
        showFinalTotal: true
      },
      validityNote: {
        show: true,
        text: 'This quotation is valid for 7 days from the quotation date.'
      },
      whatsappApprovalMessage: {
        show: true,
        title: 'READY TO PROCEED?',
        messageLines: [
          'Please review this quotation carefully.',
          'To continue with the service, tap "Approve Quotation" in WhatsApp.',
          'For any questions or changes, contact us before approval.'
        ]
      },
      terms: {
        show: true,
        title: 'TERMS & CONDITIONS',
        text: flat.termsAndConditions || ''
      }
    };
  } else if (key === 'service-completed') {
    config.sections = {
      customerDetails: { show: true, showCustomerName: true },
      serviceSummary: { show: true, title: 'SERVICE COMPLETED!' },
      whatWeDid: {
        show: true,
        messageLines: [
          'Thank you for choosing Universal Systems.',
          'We are delighted to have successfully completed your service and handed over your product.',
          'Your trust and support mean a lot to us.',
          'We look forward to serving you again in the future.',
          'If you need any assistance or service, feel free to contact us anytime.'
        ]
      },
      supportMessage: {
        show: true,
        highlightLines: [
          'Your satisfaction is our priority',
          'Quality service you can trust',
          'We are always here to help'
        ],
        amcTitle: 'Need regular service support?',
        amcText: 'Universal Systems also provides AMC plans for regular maintenance and priority service.',
        amcFinalLine: 'Contact us anytime to know more.'
      },
      terms: { show: false, title: 'TERMS', text: flat.termsAndConditions || '' },
      thankYouFooter: { show: true, contactLabel: 'Contact' }
    };
  } else if (key === 'amc-contract') {
    config.sections = {
      customerDetails: { showCustomerName: true, showPhoneNumber: true, showAddress: true },
      amcPeriod: { showAmcReference: true, showContractDate: true, showAmcPeriod: true, showStatus: true },
      coveredDevices: { show: true, showCoveredFor: true, showSerialNumber: flat.showSerialNumber === true },
      visitFrequency: { show: true, showPlanName: true, showCoverageType: true, showTechnician: flat.showTechnician !== false },
      paymentDetails: { show: true, showContractValue: true, showPaymentStatus: true },
      amcTerms: { show: true, text: flat.amcTerms || flat.termsAndConditions || '' },
      signature: { show: Boolean(flat.signatureSection), label: flat.signatureSection || 'Authorized Signature' }
    };
  } else if (key === 'amc-service-visit') {
    config.sections = {
      visitDetails: {
        showAmcReference: true,
        showVisitDate: true,
        showVisitStatus: true,
        showNextVisitDate: true,
        showJobReference: true
      },
      customerDetails: { showCustomerName: true, showPhoneNumber: true, showAddress: true },
      deviceChecked: { show: true, showPlanName: true, showAmcPeriod: true, showCoveredFor: true, showTechnician: flat.showTechnician !== false },
      workCompleted: { show: true },
      partsUsed: { show: flat.showAdditionalCharges !== false },
      nextVisitNote: { show: true },
      customerAcknowledgement: { show: false, text: flat.signatureSection || '' }
    };
  } else if (key === 'amc-renewal-reminder') {
    config.sections = {
      customerDetails: { showCustomerName: true, showPhoneNumber: true, showAddress: true },
      amcExpiryDetails: {
        showAmcReference: true,
        showReminderDate: true,
        showExpiryDate: true,
        showRenewalStatus: true
      },
      renewalMessage: { show: true, title: 'YOUR AMC PLAN IS EXPIRING SOON!' },
      planDetails: { showPlanName: true, showCurrentPeriod: true, showRenewalPeriod: true, showCoveredFor: true },
      renewalAmount: { show: flat.showRenewalAmount !== false },
      contactWhatsappMessage: {
        show: true,
        title: 'READY TO RENEW?',
        text: 'To continue AMC support, contact Universal Systems or confirm renewal through WhatsApp.',
        finalLine: 'Thank you for choosing Universal Systems AMC support.'
      }
    };
  }
  return config;
}

function legacyStructuredOverrides(payload = {}, key = '') {
  const overrides = {};
  if (!payload || !isPlainObject(payload)) return overrides;
  if ('headerTitle' in payload || 'showCompanyLogo' in payload || 'showCompanyDetails' in payload || 'colorAccent' in payload) {
    overrides.header = {
      title: payload.headerTitle,
      showLogo: payload.showCompanyLogo,
      showCompanyDetails: payload.showCompanyDetails,
      accentColor: payload.colorAccent
    };
  }
  if ('footerText' in payload) {
    overrides.footer = { thankYouMessage: payload.footerText };
  }
  if ('termsAndConditions' in payload) {
    overrides.sections = { terms: { text: payload.termsAndConditions } };
  }
  if ('showTechnician' in payload) {
    overrides.sections = overrides.sections || {};
    if (key === 'invoice') overrides.sections.serviceDetails = { showTechnician: payload.showTechnician };
    if (key === 'quotation') overrides.sections.serviceDeviceDetails = { showTechnician: payload.showTechnician };
    if (key === 'amc-contract') overrides.sections.visitFrequency = { showTechnician: payload.showTechnician };
    if (key === 'amc-service-visit') overrides.sections.deviceChecked = { showTechnician: payload.showTechnician };
  }
  if ('showSerialNumber' in payload) {
    overrides.sections = overrides.sections || {};
    if (key === 'quotation') overrides.sections.serviceDeviceDetails = { ...(overrides.sections.serviceDeviceDetails || {}), showSerialNumber: payload.showSerialNumber };
    if (key === 'amc-contract') overrides.sections.coveredDevices = { showSerialNumber: payload.showSerialNumber };
  }
  if ('showAdditionalCharges' in payload && key === 'amc-service-visit') {
    overrides.sections = overrides.sections || {};
    overrides.sections.partsUsed = { show: payload.showAdditionalCharges };
  }
  if ('showRenewalAmount' in payload && key === 'amc-renewal-reminder') {
    overrides.sections = overrides.sections || {};
    overrides.sections.renewalAmount = { show: payload.showRenewalAmount };
  }
  if ('amcTerms' in payload && key === 'amc-contract') {
    overrides.sections = overrides.sections || {};
    overrides.sections.amcTerms = { text: payload.amcTerms };
  }
  if ('signatureSection' in payload && key === 'amc-contract') {
    overrides.sections = overrides.sections || {};
    overrides.sections.signature = { label: payload.signatureSection, show: Boolean(payload.signatureSection) };
  }
  if (key === 'amc-contract' && isPlainObject(payload.sections?.amcPeriod)) {
    overrides.sections = overrides.sections || {};
    overrides.sections.amcPeriod = {
      showAmcReference: payload.sections.amcPeriod.showAmcReference ?? payload.sections.amcPeriod.showReference,
      showAmcPeriod: payload.sections.amcPeriod.showAmcPeriod ?? payload.sections.amcPeriod.showPeriod
    };
  }
  return overrides;
}

function sanitizeStrings(value) {
  if (Array.isArray(value)) return value.map((item) => sanitizeStrings(item));
  if (isPlainObject(value)) {
    return Object.entries(value).reduce((next, [key, item]) => {
      next[key] = sanitizeStrings(item);
      return next;
    }, {});
  }
  if (typeof value === 'string') return cleanText(value, '', 5000);
  return value;
}

function clampNumber(value, fallback, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

function sanitizeAdvancedSection(section = {}, index = 0) {
  const type = advancedSectionTypes.has(section.type) ? section.type : 'text';
  const fallbackTitle = type === 'qr'
    ? 'QR / Payment Card'
    : type === 'spacer'
      ? 'Divider'
      : type.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
  const width = cardWidths.has(section.width) ? section.width : 'full';
  return {
    id: clean(section.id || `custom-section-${index + 1}`).replace(/[^a-z0-9_-]/gi, '').slice(0, 80) || `custom-section-${index + 1}`,
    type,
    enabled: boolValue(section.enabled, true),
    title: cleanText(section.title, fallbackTitle, 120),
    content: cleanText(section.content, '', 5000),
    variable: cleanText(section.variable, '', 120),
    width,
    minHeight: clampNumber(section.minHeight, type === 'spacer' ? 24 : 74, 8, 260),
    backgroundColor: sanitizeColor(section.backgroundColor, type === 'notice' ? '#f1f7ff' : '#ffffff'),
    textColor: sanitizeColor(section.textColor, '#0f172a'),
    borderColor: sanitizeColor(section.borderColor, '#d8e5f7'),
    accentColor: sanitizeColor(section.accentColor, '#0f2a52'),
    locked: false
  };
}

function normalizeDesignElementType(type = 'text') {
  const normalized = clean(type || 'text');
  if (normalized === 'info' || normalized === 'notice' || normalized === 'custom-field') return 'card';
  if (normalized === 'bank' || normalized === 'payment' || normalized === 'customer-message') return 'card';
  if (normalized === 'warranty' || normalized === 'terms') return 'card';
  if (normalized === 'line') return 'divider';
  if (normalized === 'rectangle' || normalized === 'shape') return 'card';
  return advancedSectionTypes.has(normalized) ? normalized : 'text';
}

function isInvoiceDesignElement(element = {}) {
  return [
    element.id,
    element.sourceKey,
    element.manifestSemanticId,
    element.manifest?.semanticId
  ].some((value) => {
    const text = String(value || '');
    return text.startsWith('invoice.') || text.replace(/[^a-z0-9]/gi, '').toLowerCase().startsWith('invoice');
  });
}

function sanitizeDesignColor(value, fallback = '#0f2a52') {
  const text = clean(value || '');
  if (text.toLowerCase() === 'transparent') return 'transparent';
  return sanitizeColor(text || fallback, fallback);
}

function sanitizeDesignContent(type = 'text', content = {}, element = {}) {
  const invoiceElement = isInvoiceDesignElement(element);
  const source = isPlainObject(content) ? content : { text: cleanText(content, '', 5000) };
  const common = {
    kind: cleanText(source.kind, type === 'section' ? 'details' : type, 80),
    label: cleanText(invoiceElement ? source.label : source.label ?? element.label, '', 160),
    title: cleanText(invoiceElement ? source.title : source.title ?? element.title, '', 160),
    body: cleanText(invoiceElement ? source.body : source.body ?? element.body, '', 5000),
    text: cleanText(invoiceElement ? source.text : source.text ?? (typeof element.content === 'string' ? element.content : ''), '', 5000),
    helperText: cleanText(invoiceElement ? source.helperText : source.helperText ?? element.helperText, '', 1000),
    name: cleanText(source.name ?? element.personName, '', 160),
    designation: cleanText(source.designation, '', 160),
    iconName: cleanText(source.iconName ?? element.iconName, '', 80),
    variant: cleanText(source.variant ?? element.variant, '', 80),
    qrType: ['payment', 'contact', 'company', 'custom'].includes(source.qrType || element.qrType) ? (source.qrType || element.qrType) : 'payment',
    imageMode: ['logo', 'placeholder', 'custom', 'watermark'].includes(source.imageMode || element.imageMode) ? (source.imageMode || element.imageMode) : 'logo',
    assetPath: cleanText(source.assetPath ?? element.assetPath, '', 500),
    imageUrl: cleanText(source.imageUrl ?? element.imageUrl, '', 500),
    src: cleanText(source.src ?? element.src, '', 500),
    fitToFrame: boolValue(source.fitToFrame ?? element.fitToFrame, true),
    backgroundElement: boolValue(source.backgroundElement ?? element.backgroundElement, false),
    boxOnly: boolValue(source.boxOnly ?? element.boxOnly, false),
    renderLabel: boolValue(source.renderLabel ?? element.renderLabel, false),
    twoColumn: boolValue(source.twoColumn ?? element.twoColumn, false),
    columns: Array.isArray(source.columns) ? source.columns.map((item) => cleanText(item, '', 80)).slice(0, 8) : [],
    columnWidths: Array.isArray(source.columnWidths) ? source.columnWidths.map((item) => clampNumber(item, 1, 0.1, 999)).slice(0, 8) : [],
    previewRowCount: clampNumber(source.previewRowCount, 5, 1, 24),
    dynamicRows: boolValue(source.dynamicRows, false),
    rowTemplate: Array.isArray(source.rowTemplate) ? source.rowTemplate.map((item) => cleanText(item, '', 160)).slice(0, 8) : [],
    rows: Array.isArray(source.rows)
      ? source.rows.map((row) => (Array.isArray(row) ? row.map((item) => cleanText(item, '', 160)).slice(0, 8) : [cleanText(row, '', 160)])).slice(0, 12)
      : []
  };
  if (type === 'card' && !common.title && !common.boxOnly && !invoiceElement) common.title = cleanText(element.name, 'Card title', 160);
  if (type === 'qr' && !common.label) common.label = 'QR CODE';
  if (type === 'signature' && !common.label) common.label = 'Authorized Signature';
  if (type === 'table' && !common.title && !invoiceElement) common.title = 'Table';
  if (type === 'icon' && !common.label && !invoiceElement) common.label = cleanText(source.iconName ?? element.iconName, 'Icon', 80);
  if ((type === 'divider' || type === 'spacer' || type === 'image') && !common.label && !invoiceElement) common.label = type === 'image' ? 'Image / Logo' : type === 'spacer' ? 'Spacer' : 'Divider';
  if (type === 'text' && !common.text && !invoiceElement) common.text = cleanText(element.title, 'Text block', 160);
  return common;
}

function sanitizeDesignStyle(style = {}, element = {}) {
  const source = isPlainObject(style) ? style : {};
  const invoiceElement = isInvoiceDesignElement(element);
  return {
    accentColor: sanitizeDesignColor(source.accentColor || element.accentColor, '#0284c7'),
    backgroundColor: sanitizeDesignColor(source.backgroundColor || element.backgroundColor, '#ffffff'),
    textColor: sanitizeDesignColor(source.textColor || element.textColor, '#0f172a'),
    borderColor: sanitizeDesignColor(source.borderColor || element.borderColor, '#cbd5e1'),
    borderRadius: clampNumber(source.borderRadius, 10, 0, 32),
    borderWidth: clampNumber(source.borderWidth, 1, 0, 8),
    shadow: boolValue(source.shadow, false),
    opacity: clampNumber(source.opacity, 1, 0, 1),
    fontSize: clampNumber(source.fontSize, 13, invoiceElement ? 4 : 8, 32),
    fontWeight: clampNumber(source.fontWeight, 700, 300, 950),
    alignment: ['left', 'center', 'right'].includes(source.alignment || element.alignment) ? (source.alignment || element.alignment) : 'left',
    rowHeight: clampNumber(source.rowHeight, 18, 12, 34),
    padding: clampNumber(source.padding, 0, 0, 80),
    paddingX: clampNumber(source.paddingX, 0, 0, 80),
    paddingY: clampNumber(source.paddingY, 0, 0, 80),
    lineHeight: clampNumber(source.lineHeight, 1.16, 0.85, 2.4),
    dividerThickness: clampNumber(source.dividerThickness, 2, invoiceElement ? 0.1 : 1, 8),
    dividerStyle: ['solid', 'dashed', 'dotted'].includes(source.dividerStyle) ? source.dividerStyle : 'solid',
    headerBackgroundColor: sanitizeDesignColor(source.headerBackgroundColor, source.accentColor || '#0f2a52'),
    headerTextColor: sanitizeDesignColor(source.headerTextColor, '#ffffff'),
    rowBackgroundColor: sanitizeDesignColor(source.rowBackgroundColor, '#ffffff'),
    alternateRowBackgroundColor: sanitizeDesignColor(source.alternateRowBackgroundColor, '#f8fafc')
  };
}

function sanitizeDesignPage(page = {}, index = 0) {
  const id = clean(page.id || `page-${index + 1}`).replace(/[^a-z0-9_-]/gi, '').slice(0, 80) || `page-${index + 1}`;
  return {
    id,
    name: cleanText(page.name, `Page ${index + 1}`, 120),
    elements: Array.isArray(page.elements) ? page.elements.map((item) => cleanText(item, '', 80)).filter(Boolean).slice(0, 180) : [],
    manual: boolValue(page.manual ?? page.userAdded, false)
  };
}

function sanitizeDesignSection(section = {}, index = 0) {
  const id = clean(section.id || `section-${index + 1}`).replace(/[^a-z0-9_-]/gi, '').slice(0, 80) || `section-${index + 1}`;
  const pageId = clean(section.pageId || 'page-1').replace(/[^a-z0-9_-]/gi, '').slice(0, 80) || 'page-1';
  const content = sanitizeDesignContent('section', section.content, section);
  return {
    id,
    type: 'section',
    kind: 'section',
    name: cleanText(section.name || section.title, `Section ${index + 1}`, 160),
    title: cleanText(section.title || section.name, `Section ${index + 1}`, 160),
    pageId,
    sourceKey: cleanText(section.sourceKey, '', 120),
    sourceIndex: clampNumber(section.sourceIndex, index, 0, 999),
    role: cleanText(section.role, 'details', 80),
    visible: boolValue(section.visible, true),
    enabled: boolValue(section.enabled ?? section.visible, true),
    locked: section.locked !== false,
    system: boolValue(section.system, true),
    showTitle: boolValue(section.showTitle, true),
    showIcon: boolValue(section.showIcon, true),
    x: clampNumber(section.x, 0, 0, 595),
    y: clampNumber(section.y, 0, 0, 842),
    width: clampNumber(section.width, 520, 24, 595),
    height: clampNumber(section.height, 80, 8, 842),
    alignment: ['left', 'center', 'right'].includes(section.alignment) ? section.alignment : 'left',
    content,
    style: sanitizeDesignStyle(section.style || {}, section),
    fullWidth: boolValue(section.fullWidth, false),
    twoColumn: boolValue(section.twoColumn ?? content.twoColumn, false),
    pageBreakBefore: boolValue(section.pageBreakBefore, false),
    avoidSplit: boolValue(section.avoidSplit, true),
    printSafe: boolValue(section.printSafe, true),
    rendererFrame: boolValue(section.rendererFrame, false),
    layoutSource: ['renderer', 'custom', 'default'].includes(section.layoutSource) ? section.layoutSource : (section.rendererFrame ? 'renderer' : 'default'),
    zIndex: clampNumber(section.zIndex, index + 1, 1, 999)
  };
}

function sanitizeDesignElement(element = {}, index = 0) {
  const type = normalizeDesignElementType(element.type);
  const invoiceElement = isInvoiceDesignElement(element);
  const fallbackName = type === 'qr'
    ? 'QR Code'
    : type === 'signature'
      ? 'Signature'
      : type === 'divider'
        ? 'Divider'
        : type === 'spacer'
          ? 'Spacer'
          : type === 'image'
            ? 'Image / Logo'
            : type === 'table'
              ? 'Table'
              : type === 'icon'
                ? 'Icon'
            : type === 'card'
              ? 'Card'
              : 'Text';
  const pageId = clean(element.pageId || 'page-1').replace(/[^a-z0-9_-]/gi, '').slice(0, 80) || 'page-1';
  const content = sanitizeDesignContent(type, element.content, element);
  const minWidth = invoiceElement ? 0.1 : 24;
  const minHeight = invoiceElement ? 0.1 : 8;
  return {
    id: clean(element.id || `design-element-${index + 1}`).replace(/[^a-z0-9_-]/gi, '').slice(0, 80) || `design-element-${index + 1}`,
    type,
    name: cleanText(element.name || element.title, fallbackName, 160),
    title: cleanText(element.title || element.name, fallbackName, 160),
    pageId,
    x: clampNumber(element.x, 48, 0, 595),
    y: clampNumber(element.y, 118, 0, 842),
    width: clampNumber(element.width, type === 'divider' ? 260 : 220, minWidth, 595),
    height: clampNumber(element.height, type === 'divider' ? 22 : 76, minHeight, 842),
    widthMode: ['full', 'half', 'custom'].includes(element.widthMode) ? element.widthMode : 'custom',
    visible: boolValue(element.visible ?? element.enabled, true),
    enabled: boolValue(element.enabled ?? element.visible, true),
    locked: boolValue(element.locked, false),
    showTitle: boolValue(element.showTitle, true),
    showIcon: boolValue(element.showIcon, true),
    fullWidth: boolValue(element.fullWidth, false),
    twoColumn: boolValue(element.twoColumn ?? content.twoColumn, false),
    pageBreakBefore: boolValue(element.pageBreakBefore, false),
    avoidSplit: boolValue(element.avoidSplit, true),
    printSafe: invoiceElement ? boolValue(element.printSafe, false) : boolValue(element.printSafe, true),
    zIndex: clampNumber(element.zIndex, index + 20, 1, 999),
    sourceSectionId: cleanText(element.sourceSectionId, '', 120),
    sourceKey: cleanText(element.sourceKey, '', 120),
    manifestSemanticId: cleanText(element.manifestSemanticId || element.manifest?.semanticId, '', 160),
    manifestSource: cleanText(element.manifestSource || element.manifest?.source, '', 160),
    backgroundElement: boolValue(element.backgroundElement ?? element.content?.backgroundElement, false),
    designGenerated: boolValue(element.designGenerated, false),
    qrType: content.qrType,
    alignment: ['left', 'center', 'right'].includes(element.alignment) ? element.alignment : content.alignment || 'left',
    content,
    style: sanitizeDesignStyle(element.style || {}, element),
    backgroundColor: sanitizeDesignColor(element.backgroundColor || element.style?.backgroundColor, '#ffffff'),
    textColor: sanitizeDesignColor(element.textColor || element.style?.textColor, '#0f172a'),
    borderColor: sanitizeDesignColor(element.borderColor || element.style?.borderColor, '#d8e5f7')
  };
}

export function templateKeyForPdfType(type = '') {
  if (type === 'work' || type === 'amc-invoice') return 'invoice';
  if (type === 'quotation') return 'quotation';
  if (type === 'service-completed') return 'service-completed';
  if (type === 'amc-contract') return 'amc-contract';
  if (type === 'amc-service-visit') return 'amc-service-visit';
  if (type === 'amc-renewal-reminder') return 'amc-renewal-reminder';
  return clean(type);
}

export function templateKeyForDocumentType(type = '') {
  if (type === 'invoice') return 'invoice';
  if (type === 'quotation') return 'quotation';
  if (type === 'service') return 'service-completed';
  return clean(type);
}

function defaultConfigFor(key) {
  const definition = definitionsByKey.get(key);
  return { ...(definition?.defaults || {}) };
}

function assertTemplateKey(key) {
  const normalized = clean(key);
  if (!definitionsByKey.has(normalized)) throw appError('PDF template not found', 404);
  return normalized;
}

function assertAdmin(user) {
  if (!hasRole(user, 'admin')) throw appError('Only admin users can edit PDF templates', 403);
}

function cleanText(value, fallback = '', max = 5000) {
  const text = String(value ?? fallback ?? '').replace(/\r\n/g, '\n');
  return text.length > max ? text.slice(0, max) : text;
}

function sanitizeColor(value, fallback = '#0f2a52') {
  const text = clean(value || fallback);
  return /^#[0-9a-f]{6}$/i.test(text) ? text : fallback;
}

function sanitizeConfig(payload = {}, key = '') {
  const defaults = structuredDefaultsFor(key);
  let sanitized = deepMerge(defaults, legacyStructuredOverrides(payload, key));
  sanitized = deepMerge(sanitized, payload || {});
  sanitized = sanitizeStrings(sanitized);
  sanitized.layoutVersion = 5;
  sanitized.editMode = sanitized.editMode === 'design' ? 'design' : 'structured';
  sanitized.advancedEnabled = boolValue(sanitized.advancedEnabled, defaults.advancedEnabled);
  sanitized.header = sanitized.header || defaults.header;
  sanitized.footer = sanitized.footer || defaults.footer;
  sanitized.pageBreaks = sanitized.pageBreaks || defaults.pageBreaks;
  sanitized.pageSettings = deepMerge(defaults.pageSettings, sanitized.pageSettings || {});
  sanitized.structured = deepMerge(defaults.structured, sanitized.structured || {});
  sanitized.design = deepMerge(defaults.design, sanitized.design || {});
  sanitized.sections = sanitized.sections || defaults.sections;
  sanitized.header.showLogo = boolValue(sanitized.header.showLogo, defaults.header.showLogo);
  sanitized.header.showCompanyDetails = boolValue(sanitized.header.showCompanyDetails, defaults.header.showCompanyDetails);
  sanitized.header.title = cleanText(sanitized.header.title, defaults.header.title, 120);
  sanitized.header.accentColor = sanitizeColor(sanitized.header.accentColor, defaults.header.accentColor);
  sanitized.footer.showCallWhatsapp = boolValue(sanitized.footer.showCallWhatsapp, true);
  sanitized.footer.showEmail = boolValue(sanitized.footer.showEmail, true);
  sanitized.footer.showWebsite = boolValue(sanitized.footer.showWebsite, true);
  sanitized.footer.showAddress = boolValue(sanitized.footer.showAddress, true);
  sanitized.footer.thankYouMessage = cleanText(sanitized.footer.thankYouMessage, defaults.footer.thankYouMessage, 500);
  Object.keys(defaults.pageBreaks).forEach((field) => {
    sanitized.pageBreaks[field] = boolValue(sanitized.pageBreaks[field], defaults.pageBreaks[field]);
  });
  Object.keys(defaults.pageSettings).forEach((field) => {
    sanitized.pageSettings[field] = boolValue(sanitized.pageSettings[field], defaults.pageSettings[field]);
  });
  sanitized.structured.mode = 'structured';
  sanitized.structured.useCurrentDefaultLayout = boolValue(sanitized.structured.useCurrentDefaultLayout, true);
  sanitized.structured.advancedPanelOpen = boolValue(sanitized.structured.advancedPanelOpen, false);
  sanitized.structured.customSectionsEnabled = boolValue(sanitized.structured.customSectionsEnabled, false);
  sanitized.structured.allowDragDrop = boolValue(sanitized.structured.allowDragDrop, false);
  sanitized.structured.twoColumnCards = boolValue(sanitized.structured.twoColumnCards, false);
  sanitized.structured.customCardWidthEnabled = boolValue(sanitized.structured.customCardWidthEnabled, false);
  sanitized.structured.customColorsEnabled = boolValue(sanitized.structured.customColorsEnabled, false);
  sanitized.structured.qrPaymentCardEnabled = boolValue(sanitized.structured.qrPaymentCardEnabled, false);
  sanitized.structured.signatureCardEnabled = boolValue(sanitized.structured.signatureCardEnabled, false);
  sanitized.structured.designModeEnabled = boolValue(sanitized.structured.designModeEnabled, false);
  sanitized.structured.defaultCardWidth = cardWidths.has(sanitized.structured.defaultCardWidth) ? sanitized.structured.defaultCardWidth : 'full';
  sanitized.structured.borderStyle = borderStyles.has(sanitized.structured.borderStyle) ? sanitized.structured.borderStyle : 'default';
  sanitized.structured.customSections = Array.isArray(sanitized.structured.customSections)
    ? sanitized.structured.customSections.slice(0, 24).map((section, index) => sanitizeAdvancedSection(section, index))
    : [];
  sanitized.design.enabled = boolValue(sanitized.design.enabled, false);
  sanitized.design.confirmed = boolValue(sanitized.design.confirmed, false);
  sanitized.design.mode = sanitized.design.mode === 'manifest' ? 'manifest' : 'legacy';
  sanitized.design.published = boolValue(sanitized.design.published, false);
  sanitized.design.previewDraft = boolValue(sanitized.design.previewDraft, false);
  sanitized.design.baseTemplateVersion = clampNumber(sanitized.design.baseTemplateVersion, defaults.design.baseTemplateVersion || 1, 1, 999999);
  sanitized.design.overrides = isPlainObject(sanitized.design.overrides) ? sanitized.design.overrides : {};
  sanitized.design.lockedDefaultSections = true;
  sanitized.design.blank = boolValue(sanitized.design.blank, false);
  sanitized.design.freeLayoutMode = boolValue(sanitized.design.freeLayoutMode, false);
  sanitized.design.canvas = deepMerge(defaults.design.canvas, sanitized.design.canvas || {});
  sanitized.design.canvas.size = 'A4';
  sanitized.design.canvas.orientation = sanitized.design.canvas.orientation === 'landscape' ? 'landscape' : 'portrait';
  sanitized.design.canvas.zoom = ['fit', 'fit-width', '75', '100', '125'].includes(String(sanitized.design.canvas.zoom)) ? String(sanitized.design.canvas.zoom) : 'fit-width';
  sanitized.design.canvas.gridSize = clampNumber(sanitized.design.canvas.gridSize, 8, 4, 24);
  sanitized.design.canvas.snap = boolValue(sanitized.design.canvas.snap, true);
  sanitized.design.gridEnabled = boolValue(sanitized.design.gridEnabled, false);
  sanitized.design.layoutGuides = boolValue(sanitized.design.layoutGuides, false);
  sanitized.design.visualElementMode = boolValue(sanitized.design.visualElementMode, true);
  sanitized.design.snapToGrid = boolValue(sanitized.design.snapToGrid, sanitized.design.canvas.snap);
  sanitized.design.page = deepMerge(defaults.design.page, sanitized.design.page || {});
  sanitized.design.page.size = sanitized.design.page.size === 'A4' ? 'A4' : 'A4';
  sanitized.design.page.orientation = sanitized.design.page.orientation === 'landscape' ? 'landscape' : 'portrait';
  sanitized.design.page.margin = clampNumber(sanitized.design.page.margin, defaults.design.page.margin, 0, 80);
  sanitized.design.page.backgroundColor = sanitizeColor(sanitized.design.page.backgroundColor, '#ffffff');
  sanitized.design.colors = deepMerge(defaults.design.colors, sanitized.design.colors || {});
  sanitized.design.colors.accentColor = sanitizeColor(sanitized.design.colors.accentColor, sanitized.header.accentColor);
  sanitized.design.colors.cardBackground = sanitizeColor(sanitized.design.colors.cardBackground, '#ffffff');
  sanitized.design.colors.textColor = sanitizeColor(sanitized.design.colors.textColor, '#0f172a');
  sanitized.design.colors.borderColor = sanitizeColor(sanitized.design.colors.borderColor, '#d8e5f7');
  sanitized.design.colors.noticeBackground = sanitizeColor(sanitized.design.colors.noticeBackground, '#f1f7ff');
  const designElementSource = Array.isArray(sanitized.design.customElements) && sanitized.design.customElements.length
    ? sanitized.design.customElements
    : sanitized.design.elements;
  const designElementLimit = key === 'invoice' && sanitized.design.mode === 'manifest' ? 180 : 80;
  sanitized.design.elements = Array.isArray(designElementSource)
    ? designElementSource.slice(0, designElementLimit).map((element, index) => sanitizeDesignElement(element, index))
    : [];
  sanitized.design.customElements = sanitized.design.elements;
  sanitized.design.sections = Array.isArray(sanitized.design.sections)
    ? sanitized.design.sections.slice(0, 40).map((section, index) => sanitizeDesignSection(section, index))
    : [];
  const savedPages = Array.isArray(sanitized.design.pages) ? sanitized.design.pages : [];
  const pageIds = new Set([
    'page-1',
    ...savedPages.map((page) => page?.id).filter(Boolean),
    ...sanitized.design.elements.map((element) => element.pageId).filter(Boolean),
    ...sanitized.design.sections.map((section) => section.pageId).filter(Boolean)
  ]);
  sanitized.design.pages = [...pageIds].map((pageId, index) => {
    const savedPage = savedPages.find((page) => page?.id === pageId) || {};
    return sanitizeDesignPage({
      ...savedPage,
      id: pageId,
      elements: [
        ...sanitized.design.sections.filter((section) => section.pageId === pageId).map((section) => section.id),
        ...sanitized.design.elements.filter((element) => element.pageId === pageId).map((element) => element.id)
      ]
    }, index);
  });
  sanitized.design.sectionOptions = isPlainObject(sanitized.design.sectionOptions) ? sanitized.design.sectionOptions : {};
  if (!sanitized.design.enabled) sanitized.editMode = 'structured';

  if (key === 'invoice') {
    sanitized.sections.workCompletionNotice.messageLines = stringList(sanitized.sections.workCompletionNotice.messageLines, defaults.sections.workCompletionNotice.messageLines);
    sanitized.sections.terms.text = cleanText(sanitized.sections.terms.text, defaults.sections.terms.text, 5000);
  }
  if (key === 'quotation') {
    sanitized.sections.whatsappApprovalMessage.messageLines = stringList(sanitized.sections.whatsappApprovalMessage.messageLines, defaults.sections.whatsappApprovalMessage.messageLines);
    sanitized.sections.terms.text = cleanText(sanitized.sections.terms.text, defaults.sections.terms.text, 5000);
  }
  if (key === 'service-completed') {
    sanitized.sections.whatWeDid.messageLines = stringList(sanitized.sections.whatWeDid.messageLines, defaults.sections.whatWeDid.messageLines);
    sanitized.sections.supportMessage.highlightLines = stringList(sanitized.sections.supportMessage.highlightLines, defaults.sections.supportMessage.highlightLines);
    sanitized.sections.terms.text = cleanText(sanitized.sections.terms.text, defaults.sections.terms.text, 5000);
  }
  if (key === 'amc-contract') {
    sanitized.sections.amcTerms.text = cleanText(sanitized.sections.amcTerms.text, defaults.sections.amcTerms.text, 5000);
  }

  sanitized.headerTitle = sanitized.header.title;
  sanitized.showCompanyLogo = sanitized.header.showLogo;
  sanitized.showCompanyDetails = sanitized.header.showCompanyDetails;
  sanitized.colorAccent = sanitized.header.accentColor;
  sanitized.footerText = sanitized.footer.thankYouMessage;
  sanitized.termsAndConditions = cleanText(sanitized.sections.terms?.text ?? sanitized.termsAndConditions ?? defaultConfigFor(key).termsAndConditions ?? '', '', 5000);
  sanitized.paymentBankDetails = cleanText(sanitized.paymentBankDetails, defaultConfigFor(key).paymentBankDetails || '', 5000);
  sanitized.notesWarrantyText = cleanText(sanitized.notesWarrantyText, defaultConfigFor(key).notesWarrantyText || '', 5000);
  sanitized.amcTerms = cleanText(sanitized.sections.amcTerms?.text ?? sanitized.amcTerms ?? defaultConfigFor(key).amcTerms ?? '', '', 5000);
  sanitized.signatureSection = cleanText(sanitized.sections.signature?.label ?? sanitized.signatureSection ?? defaultConfigFor(key).signatureSection ?? '', '', 500);
  sanitized.showTechnician = Boolean(
    sanitized.sections.serviceDetails?.showTechnician
    ?? sanitized.sections.serviceDeviceDetails?.showTechnician
    ?? sanitized.sections.visitFrequency?.showTechnician
    ?? sanitized.sections.deviceChecked?.showTechnician
    ?? defaultConfigFor(key).showTechnician
  );
  sanitized.showSerialNumber = Boolean(
    sanitized.sections.serviceDeviceDetails?.showSerialNumber
    ?? sanitized.sections.coveredDevices?.showSerialNumber
    ?? defaultConfigFor(key).showSerialNumber
  );
  sanitized.showAdditionalCharges = Boolean(sanitized.sections.partsUsed?.show ?? defaultConfigFor(key).showAdditionalCharges ?? key === 'amc-service-visit');
  sanitized.showRenewalAmount = Boolean(sanitized.sections.renewalAmount?.show ?? defaultConfigFor(key).showRenewalAmount ?? key === 'amc-renewal-reminder');

  textFields.forEach((field) => {
    sanitized[field] = cleanText(sanitized[field], defaultConfigFor(key)[field] || '');
  });
  return sanitized;
}

async function ensurePdfTemplates() {
  await Promise.all(PDF_TEMPLATE_DEFINITIONS.map((definition) => PdfTemplate.findOneAndUpdate(
    { key: definition.key },
    {
      $set: {
        category: definition.category,
        name: definition.name,
        description: definition.description
      },
      $setOnInsert: {
        status: 'Active',
        version: 1,
        config: sanitizeConfig(definition.defaults, definition.key),
        versions: []
      }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  )));
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

function serializeVersion(version, key = '') {
  return {
    id: String(version._id || ''),
    version: version.version,
    editedAt: version.editedAt,
    editedBy: userSummary(version.editedBy),
    action: version.action || 'updated',
    config: sanitizeConfig(version.config || {}, key)
  };
}

function serializeTemplate(template) {
  const item = template?.toObject ? template.toObject() : template;
  return {
    id: String(item._id || item.id || ''),
    key: item.key,
    category: item.category,
    name: item.name,
    description: item.description,
    status: item.status || 'Active',
    version: item.version || 1,
    config: sanitizeConfig(item.config || {}, item.key),
    lastEditedDate: item.updatedAt || item.createdAt,
    lastEditedBy: userSummary(item.lastEditedBy),
    versions: (item.versions || []).map((version) => serializeVersion(version, item.key)).sort((a, b) => b.version - a.version),
    updatedAt: item.updatedAt,
    createdAt: item.createdAt
  };
}

async function findTemplate(key) {
  await ensurePdfTemplates();
  return PdfTemplate.findOne({ key })
    .populate('lastEditedBy', 'name username role')
    .populate('versions.editedBy', 'name username role');
}

function addVersionSnapshot(template, action = 'updated') {
  template.versions.push({
    version: template.version || 1,
    config: sanitizeConfig(template.config || {}, template.key),
    editedAt: template.updatedAt || template.createdAt || new Date(),
    editedBy: template.lastEditedBy || null,
    action
  });
  if (template.versions.length > 15) template.versions = template.versions.slice(-15);
}

export async function listPdfTemplates() {
  await ensurePdfTemplates();
  const order = PDF_TEMPLATE_DEFINITIONS.map((definition) => definition.key);
  const rows = await PdfTemplate.find({ key: { $in: order } })
    .populate('lastEditedBy', 'name username role')
    .populate('versions.editedBy', 'name username role')
    .sort({ category: -1, name: 1 });
  return rows.map(serializeTemplate).sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key));
}

export async function getPdfTemplate(key) {
  const normalized = assertTemplateKey(key);
  const template = await findTemplate(normalized);
  if (!template) throw appError('PDF template not found', 404);
  return serializeTemplate(template);
}

export async function getPdfTemplateManifest(key, options = {}) {
  const template = await getPdfTemplate(key);
  const config = options.config && isPlainObject(options.config)
    ? sanitizeConfig(options.config, template.key)
    : sanitizeConfig(template.config || {}, template.key);
  const company = await getCompanyIdentity().catch(() => COMPANY);
  return buildPdfTemplateManifest(template.key, config, { company });
}

export async function getTemplateByKey(key) {
  if (!definitionsByKey.has(key)) return null;
  const template = await findTemplate(key);
  return template ? serializeTemplate(template) : {
    key,
    config: sanitizeConfig(defaultConfigFor(key), key)
  };
}

export async function getTemplateByPdfType(type) {
  return getTemplateByKey(templateKeyForPdfType(type));
}

export async function getTemplateByDocumentType(type) {
  return getTemplateByKey(templateKeyForDocumentType(type));
}

export async function updatePdfTemplate(key, payload = {}, user = null) {
  assertAdmin(user);
  const normalized = assertTemplateKey(key);
  const template = await findTemplate(normalized);
  if (!template) throw appError('PDF template not found', 404);
  const before = sanitizeConfig(template.config || {}, normalized);
  addVersionSnapshot(template, 'updated');
  template.config = sanitizeConfig(payload.config || payload, normalized);
  template.version = (template.version || 1) + 1;
  template.lastEditedBy = user?._id || null;
  await template.save();
  await logAudit({
    userId: user?._id || null,
    action: 'pdf_template_updated',
    module: 'pdf_template',
    recordId: template._id,
    before,
    after: { key: normalized, version: template.version, config: template.config }
  });
  return getPdfTemplate(normalized);
}

export async function resetPdfTemplate(key, user = null) {
  assertAdmin(user);
  const normalized = assertTemplateKey(key);
  const template = await findTemplate(normalized);
  if (!template) throw appError('PDF template not found', 404);
  const before = sanitizeConfig(template.config || {}, normalized);
  addVersionSnapshot(template, 'reset');
  template.config = sanitizeConfig(defaultConfigFor(normalized), normalized);
  template.version = (template.version || 1) + 1;
  template.lastEditedBy = user?._id || null;
  await template.save();
  await logAudit({
    userId: user?._id || null,
    action: 'pdf_template_reset',
    module: 'pdf_template',
    recordId: template._id,
    before,
    after: { key: normalized, version: template.version, config: template.config }
  });
  return getPdfTemplate(normalized);
}

export async function restorePdfTemplateVersion(key, versionId, user = null) {
  assertAdmin(user);
  const normalized = assertTemplateKey(key);
  const template = await findTemplate(normalized);
  if (!template) throw appError('PDF template not found', 404);
  const version = template.versions.id(versionId) || template.versions.find((item) => String(item.version) === String(versionId));
  if (!version) throw appError('Template version not found', 404);
  const before = sanitizeConfig(template.config || {}, normalized);
  addVersionSnapshot(template, 'restored');
  template.config = sanitizeConfig(version.config || {}, normalized);
  template.version = (template.version || 1) + 1;
  template.lastEditedBy = user?._id || null;
  await template.save();
  await logAudit({
    userId: user?._id || null,
    action: 'pdf_template_restored',
    module: 'pdf_template',
    recordId: template._id,
    before,
    after: { key: normalized, restoredFrom: version.version, version: template.version, config: template.config }
  });
  return getPdfTemplate(normalized);
}

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-IN');
}

function formatAmount(value) {
  return `Rs. ${Number(value || 0).toFixed(2)}`;
}

function fallbackCompany(company = COMPANY) {
  return {
    name: company.name || COMPANY.name,
    address: company.address || COMPANY.address,
    phones: Array.isArray(company.phones) && company.phones.length ? company.phones : COMPANY.phones,
    email: company.email || COMPANY.email,
    website: company.website || COMPANY.website || 'usmettur.com',
    whatsappNumber: company.whatsappNumber || '',
    logoFilePath: company.logoFilePath || LOGO_FULL_PATH
  };
}

export function buildTemplateContext(source = {}, company = COMPANY) {
  const currentCompany = fallbackCompany(company);
  const invoiceNumber = source.invoiceNo || source.invoiceNumber || '-';
  const quotationNumber = source.quotationNo || source.quotationNumber || source.quotationNumberDisplay || invoiceNumber;
  const workOrderId = source.workOrderNo || source.workOrderId || '-';
  const amcReference = source.amcContractNo || source.amcReference || source.contractNumber || '-';
  const totalAmount = source.totalAmount ?? source.finalTotal ?? 0;
  const finalTotal = source.finalTotal ?? source.totalAmount ?? 0;
  const amountPaid = source.amountPaid ?? source.paidAmount ?? 0;
  const balanceDue = source.balanceDue ?? source.balance ?? Math.max(0, Number(finalTotal || 0) - Number(amountPaid || 0));
  const serviceName = source.serviceName || source.serviceType || '-';
  const brandModel = source.brandModel || [source.deviceBrand, source.deviceModel].filter(Boolean).join(' ').trim();
  const [fallbackDeviceBrand = '-', ...fallbackDeviceModelParts] = String(brandModel || '-').split(' ');
  const invoiceItems = Array.isArray(source.items)
    ? source.items.map((item, index) => ({
      item_index: String(index + 1),
      item_description: item.description || item.name || '-',
      item_quantity: String(item.quantity ?? item.qty ?? 1),
      item_unit_price: formatAmount(item.unitPrice ?? item.price ?? item.rate ?? 0),
      item_total: formatAmount(item.total ?? item.amount ?? 0)
    }))
    : [];
  return {
    company_name: currentCompany.name,
    company_phone: currentCompany.phones.join(' / '),
    company_email: currentCompany.email,
    company_website: currentCompany.website,
    company_address: currentCompany.address || '-',
    customer_name: source.customerName || '-',
    customer_phone: source.customerPhone || '-',
    customer_address: source.customerAddress || '-',
    invoice_no: invoiceNumber,
    invoice_number: invoiceNumber,
    invoice_date: formatDate(source.invoiceDate || new Date()),
    payment_status: source.paymentStatus || source.status || '-',
    quotation_no: quotationNumber,
    quotation_number: quotationNumber,
    quotation_date: formatDate(source.quotationDate || source.invoiceDate || new Date()),
    work_order_no: workOrderId,
    work_order_id: workOrderId,
    amc_contract_no: amcReference,
    amc_reference: amcReference,
    service_name: serviceName,
    service_type: source.serviceType || serviceName,
    device: source.device || '-',
    device_name: source.deviceName || source.device || '-',
    device_brand: source.deviceBrand || source.brand || (fallbackDeviceModelParts.length ? fallbackDeviceBrand : '-'),
    device_model: source.deviceModel || source.model || (fallbackDeviceModelParts.length ? fallbackDeviceModelParts.join(' ') : brandModel || '-'),
    brand_model: brandModel || '-',
    problem_complaint: source.problemComplaint || source.problemDescription || '-',
    problem_description: source.problemDescription || source.problemComplaint || '-',
    technician_name: source.technicianName || '-',
    total_amount: formatAmount(totalAmount),
    subtotal_amount: formatAmount(source.subtotalAmount ?? source.subtotal ?? totalAmount),
    final_total: formatAmount(finalTotal),
    amount_paid: formatAmount(amountPaid),
    balance_due: formatAmount(balanceDue),
    amount_in_words: source.amountInWords || source.amount_in_words || '-',
    item_index: invoiceItems[0]?.item_index || '1',
    item_description: invoiceItems[0]?.item_description || '-',
    item_quantity: invoiceItems[0]?.item_quantity || '1',
    item_unit_price: invoiceItems[0]?.item_unit_price || formatAmount(0),
    item_total: invoiceItems[0]?.item_total || formatAmount(0),
    invoice_items: invoiceItems,
    amc_start_date: formatDate(source.amcStartDate),
    amc_end_date: formatDate(source.amcEndDate),
    next_service_date: formatDate(source.nextServiceDate),
    current_date: formatDate(source.currentDate || new Date())
  };
}

export function renderTemplateText(value = '', context = {}) {
  const text = String(value || '');
  return text.replace(/\{\{([a-z0-9_]+)\}\}/gi, (_match, key) => {
    if (!Object.prototype.hasOwnProperty.call(context, key)) return '-';
    const next = context[key];
    return next === undefined || next === null || next === '' ? '-' : next;
  });
}

export function templateAccent(template, fallback = '#0f2a52') {
  return sanitizeColor(template?.config?.colorAccent, fallback);
}

export function workOrderTemplateContext(workOrder = {}, company = COMPANY) {
  const customer = workOrder.customerId || {};
  const contract = workOrder.amcContractId || {};
  const invoice = workOrder.invoiceId || contract.invoiceId || {};
  const visits = Array.isArray(contract.visits) ? contract.visits : [];
  const nextVisit = visits
    .filter((visit) => visit?.scheduledDate && new Date(visit.scheduledDate).getTime() >= Date.now())
    .sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate))[0];
  const fallbackTotal = Number(workOrder.serviceCharge || 0)
    + (workOrder.partsUsed || []).reduce((sum, part) => sum + Number(part.total || 0), 0);
  const total = invoice.total != null
    ? Number(invoice.total || 0)
    : contract.contractValue != null
      ? Number(contract.contractValue || 0)
      : fallbackTotal;
  const brandModel = [workOrder.deviceBrand, workOrder.deviceModel].map((value) => String(value || '').trim()).filter(Boolean).join(' ')
    || workOrder.brandModel
    || workOrder.deviceModel
    || workOrder.model;
  return buildTemplateContext({
    customerName: customer.name,
    customerPhone: customer.phone,
    customerAddress: customer.address,
    invoiceNumber: invoice.invoiceNumber,
    invoiceDate: invoice.createdAt || new Date(),
    workOrderId: workOrder.bookingId?.bookingCode || `WO-${String(workOrder._id || '').slice(-6).toUpperCase()}`,
    amcReference: contract.contractNumber || contract.amcReference || contract.referenceNo,
    serviceName: workOrder.serviceType || workOrder.device || contract.contractType,
    serviceType: workOrder.serviceType || contract.contractType,
    device: workOrder.device,
    brandModel,
    problemComplaint: workOrder.problemDescription || workOrder.problemComplaint || workOrder.customerComplaint,
    technicianName: workOrder.technicianId?.name || workOrder.technicianId?.username || 'Admin',
    totalAmount: total,
    finalTotal: invoice.total ?? contract.contractValue ?? total,
    amountPaid: invoice.amountPaid ?? invoice.paidAmount ?? contract.amountPaid,
    balanceDue: invoice.balance ?? contract.balance,
    amcStartDate: contract.startDate,
    amcEndDate: contract.endDate,
    nextServiceDate: nextVisit?.scheduledDate
  }, company);
}

export function documentTemplateContext(document = {}, company = COMPANY) {
  const customer = document.customerId || {};
  const workOrder = document.workOrderId || {};
  const invoice = document.invoiceId || {};
  const brandModel = [workOrder.deviceBrand, workOrder.deviceModel].map((value) => String(value || '').trim()).filter(Boolean).join(' ')
    || workOrder.brandModel
    || workOrder.deviceModel
    || workOrder.model;
  return buildTemplateContext({
    customerName: customer.name,
    customerPhone: customer.phone,
    customerAddress: customer.address,
    invoiceNumber: invoice.invoiceNumber,
    invoiceDate: invoice.createdAt || document.createdAt,
    workOrderId: workOrder.bookingId?.bookingCode || `WO-${String(workOrder._id || workOrder.id || '').slice(-6).toUpperCase()}`,
    quotationNumber: document.quotationNumber || document.documentNumber,
    serviceName: workOrder.serviceType || workOrder.device,
    serviceType: workOrder.serviceType,
    device: workOrder.device,
    brandModel,
    problemComplaint: workOrder.problemDescription || workOrder.problemComplaint || workOrder.customerComplaint,
    technicianName: workOrder.technicianId?.name || workOrder.technicianId?.username || 'Admin',
    totalAmount: document.totalAmount || invoice.total || 0,
    finalTotal: document.finalTotal || invoice.total || document.totalAmount || 0,
    amountPaid: document.amountPaid || invoice.amountPaid || invoice.paidAmount || 0,
    balanceDue: document.balanceDue || invoice.balance || 0
  }, company);
}

function sampleContextFor(key, company = COMPANY) {
  const now = new Date();
  const next = new Date(now);
  next.setDate(next.getDate() + 30);
  return buildTemplateContext({
    customerName: 'Rahul Kumar',
    customerPhone: '98427 81971',
    customerAddress: 'Mettur Dam, Salem',
    invoiceNumber: key === 'quotation' ? 'QUO-2026-0066' : 'INV-2026-0089',
    quotationNumber: 'QUO-2026-0066',
    invoiceDate: now,
    workOrderId: 'WO-2026-0123',
    amcReference: 'AMC-2026-0012',
    serviceName: key.startsWith('amc') ? 'Computer AMC Support' : 'Laptop Service',
    serviceType: key.startsWith('amc') ? 'AMC Support' : 'Laptop Service',
    device: 'Laptop',
    brandModel: 'Dell Inspiron 15',
    problemComplaint: 'System running slow and needs RAM upgrade.',
    technicianName: 'Arjun',
    totalAmount: key.startsWith('amc') ? 12500 : 2850,
    finalTotal: key.startsWith('amc') ? 12500 : 2850,
    amountPaid: key.startsWith('amc') ? 12500 : 0,
    balanceDue: key.startsWith('amc') ? 0 : 2850,
    amcStartDate: now,
    amcEndDate: new Date(now.getFullYear() + 1, now.getMonth(), now.getDate()),
    nextServiceDate: next
  }, company);
}

function drawPreviewPdf(doc, template, company = COMPANY, businessSettings = null) {
  const currentCompany = fallbackCompany(company);
  const config = template.config || {};
  const context = sampleContextFor(template.key, currentCompany);
  const accent = templateAccent(template);
  if (template.key === 'service-completed') {
    renderServiceCompletedPdf(doc, {
      company: currentCompany,
      template,
      context,
      service: sampleServiceCompletedData()
    });
    return;
  }
  if (template.key === 'invoice') {
    renderInvoicePdf(doc, {
      company: currentCompany,
      template,
      context,
      invoice: sampleInvoiceData()
    });
    return;
  }
  if (template.key === 'quotation') {
    renderQuotationPdf(doc, {
      company: currentCompany,
      template,
      context,
      taxSettings: businessSettings?.taxGst || {},
      quotation: sampleQuotationData()
    });
    return;
  }
  if (template.key === 'amc-contract') {
    renderAmcContractPdf(doc, {
      company: currentCompany,
      template,
      context,
      contract: sampleAmcContractData()
    });
    return;
  }
  if (template.key === 'amc-service-visit') {
    renderAmcServiceVisitPdf(doc, {
      company: currentCompany,
      template,
      context,
      visit: sampleAmcVisitData()
    });
    return;
  }
  if (template.key === 'amc-renewal-reminder') {
    renderAmcRenewalPdf(doc, {
      company: currentCompany,
      template,
      context,
      renewal: sampleAmcRenewalData()
    });
    return;
  }
  doc.fillColor(accent);
  const logoPath = currentCompany.logoFilePath || LOGO_FULL_PATH;
  if (config.showCompanyLogo !== false && logoPath && fs.existsSync(logoPath)) doc.image(logoPath, 42, 30, { width: 145 });
  doc.fontSize(17).fillColor(accent).text(currentCompany.name, 330, 34, { width: 210, align: 'right' });
  if (config.showCompanyDetails) {
    doc.fontSize(9).fillColor('#32445c').text(String(currentCompany.address || '').replace(/\n/g, ', '), 300, 60, { width: 240, align: 'right' });
    doc.text(`Phone: ${currentCompany.phones.join(' / ')}`, 300, 98, { width: 240, align: 'right' });
    doc.text(`Email: ${currentCompany.email}`, 300, 114, { width: 240, align: 'right' });
  }
  doc.roundedRect(40, 150, 515, 34, 4).fill(accent);
  doc.fillColor('#ffffff').fontSize(15).text(renderTemplateText(config.headerTitle, context), 52, 160);
  doc.fillColor('#0f172a').fontSize(12).text('Sample Customer Details', 52, 210);
  doc.fillColor('#334155').fontSize(10);
  doc.text(`Customer: ${context.customer_name}`, 52, 235);
  doc.text(`Phone: ${context.customer_phone}`, 52, 252);
  doc.text(`Work Order: ${context.work_order_id}`, 52, 269);
  doc.text(`Service: ${context.service_name}`, 310, 235);
  doc.text(`Technician: ${context.technician_name}`, 310, 252);
  doc.text(`Total: ${context.total_amount}`, 310, 269);
  doc.roundedRect(48, 315, 500, 28, 2).fill('#eaf1fb');
  doc.fillColor(accent).fontSize(10).text('Description', 58, 324).text('Amount', 430, 324);
  doc.fillColor('#334155').text('Template preview line item', 58, 358).text(context.total_amount, 430, 358);
  let y = 410;
  [
    ['Notes / Warranty', config.notesWarrantyText],
    ['Terms & Conditions', config.termsAndConditions],
    ['Payment / Bank Details', config.paymentBankDetails],
    ['AMC Terms', config.amcTerms]
  ].forEach(([label, value]) => {
    if (!value) return;
    doc.fillColor('#0f172a').fontSize(11).text(label, 52, y);
    doc.fillColor('#334155').fontSize(9).text(renderTemplateText(value, context), 52, y + 16, { width: 492, lineGap: 3 });
    y += Math.max(58, doc.heightOfString(renderTemplateText(value, context), { width: 492 }) + 36);
  });
  if (config.signatureSection) {
    doc.strokeColor('#94a3b8').lineWidth(0.7).moveTo(350, 700).lineTo(520, 700).stroke();
    doc.fillColor('#334155').fontSize(9).text(renderTemplateText(config.signatureSection, context), 365, 710);
  }
  doc.strokeColor('#cbd5e1').lineWidth(0.7).moveTo(40, 770).lineTo(555, 770).stroke();
  doc.fontSize(8).fillColor('#64748b').text(renderTemplateText(config.footerText, context), 40, 778, { width: 515, align: 'center' });
}

export async function generatePdfTemplatePreview(key, options = {}) {
  const template = await getPdfTemplate(key);
  if (options.config && isPlainObject(options.config)) {
    template.config = sanitizeConfig(options.config, template.key);
  }
  const [company, businessSettings] = await Promise.all([
    getCompanyIdentity(),
    getBusinessSettings().catch(() => null)
  ]);
  fs.mkdirSync(PDF_DIR, { recursive: true });
  const filename = `${template.key}-template-preview-${Date.now()}.pdf`;
  const filePath = path.join(PDF_DIR, filename);
  await new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: true });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);
    drawPreviewPdf(doc, template, company, businessSettings);
    doc.end();
    stream.on('finish', resolve);
    stream.on('error', reject);
  });
  return { filePath, filename };
}
